"""
Módulo de Otimização (Optimizer)
Limpeza de disco, liberação de memória RAM, execução de TRIM em SSDs e diagnóstico de saúde.
"""

import os
import ctypes
import subprocess
from typing import Dict, Any, List

class SystemOptimizer:
    def __init__(self, logger_callback=None):
        self.logger = logger_callback or (lambda msg: None)

    def log(self, message: str):
        self.logger(message)

    def clean_disk_junk(self) -> Dict[str, Any]:
        """Limpa arquivos temporários, logs antigos e cache do Windows Update."""
        self.log("[*] Iniciando limpeza de arquivos temporários e lixo de disco...")

        folders_to_clean = [
            os.path.expandvars(r"%TEMP%"),
            r"C:\Windows\Temp",
            r"C:\Windows\SoftwareDistribution\Download",
            r"C:\Windows\Minidump",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\WER")
        ]

        deleted_files = 0
        deleted_bytes = 0

        for folder in folders_to_clean:
            if not os.path.exists(folder):
                continue

            self.log(f"[*] Limpando: {folder}")
            for root, dirs, files in os.walk(folder, topdown=False):
                for name in files:
                    filepath = os.path.join(root, name)
                    try:
                        size = os.path.getsize(filepath)
                        os.remove(filepath)
                        deleted_bytes += size
                        deleted_files += 1
                    except Exception:
                        pass # Arquivo pode estar em uso no momento

                for name in dirs:
                    dirpath = os.path.join(root, name)
                    try:
                        os.rmdir(dirpath)
                    except Exception:
                        pass

        mb_freed = round(deleted_bytes / (1024 * 1024), 2)
        self.log(f"[SUCESSO] Limpeza concluída: {deleted_files} arquivos removidos (~{mb_freed} MB liberados).")

        return {
            "files_removed": deleted_files,
            "bytes_freed": deleted_bytes,
            "mb_freed": mb_freed
        }

    def optimize_ssd_trim(self, drive_letter: str = "C") -> bool:
        """Executa a operação TRIM no SSD para restaurar a velocidade de gravação."""
        self.log(f"[*] Executando otimização TRIM na unidade {drive_letter}:...")
        ps_cmd = f"Optimize-Volume -DriveLetter {drive_letter} -ReTrim -ErrorAction Stop"
        try:
            res = self._run_powershell(ps_cmd)
            self.log(f"[SUCESSO] TRIM executado com sucesso na unidade {drive_letter}:.")
            return True
        except Exception as e:
            self.log(f"[AVISO] Não foi possível executar TRIM em {drive_letter}: ({e})")
            return False

    def free_ram(self) -> Dict[str, Any]:
        """Libera memória RAM liberando os Working Sets de processos inativos do Windows."""
        self.log("[*] Solicitando liberação de memória RAM (Working Sets)...")

        freed_processes = 0
        try:
            # Pegar lista de PIDs
            ps_cmd = "Get-Process | Select-Object -ExpandProperty Id"
            pids_str = self._run_powershell(ps_cmd)
            pids = [int(p.strip()) for p in pids_str.splitlines() if p.strip().isdigit()]

            PROCESS_SET_QUOTA = 0x0100
            PROCESS_QUERY_INFORMATION = 0x0400

            kernel32 = ctypes.windll.kernel32
            psapi = ctypes.windll.psapi

            for pid in pids:
                h_process = kernel32.OpenProcess(PROCESS_SET_QUOTA | PROCESS_QUERY_INFORMATION, False, pid)
                if h_process:
                    try:
                        # EmptyWorkingSet(hProcess)
                        if psapi.EmptyWorkingSet(h_process):
                            freed_processes += 1
                    finally:
                        kernel32.CloseHandle(h_process)

            self.log(f"[SUCESSO] Cache de memória liberado em {freed_processes} processos.")
            return {"status": "ok", "processes_cleared": freed_processes}
        except Exception as e:
            self.log(f"[ERRO] Falha ao liberar memória: {e}")
            return {"status": "error", "error": str(e)}

    def check_disk_health(self) -> List[Dict[str, Any]]:
        """Verifica a saúde e o espaço dos discos do sistema."""
        alerts = []
        ps_cmd = (
            "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | "
            "Select-Object DeviceID, FreeSpace, Size | ConvertTo-Json -Compress"
        )
        try:
            output = self._run_powershell(ps_cmd)
            if output:
                import json
                data = json.loads(output)
                if isinstance(data, dict):
                    data = [data]

                for d in data:
                    dev = d.get("DeviceID")
                    size = d.get("Size") or 1
                    free = d.get("FreeSpace") or 0
                    pct_free = round((free / size) * 100, 1)
                    free_gb = round(free / (1024**3), 1)

                    if pct_free < 15.0:
                        alerts.append({
                            "type": "low_space",
                            "severity": "Alta" if pct_free < 10.0 else "Média",
                            "message": f"Unidade {dev} tem apenas {free_gb} GB ({pct_free}%) livres. SSDs precisam de pelo menos 15% para evitar congelamentos e 100% de uso contínuo."
                        })
        except Exception:
            pass

        return alerts

    def _run_powershell(self, command: str) -> str:
        try:
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                capture_output=True,
                text=True,
                timeout=30,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            return proc.stdout.strip()
        except Exception:
            return ""
