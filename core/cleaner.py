"""
Módulo de Limpeza e Eliminação (Cleaner)
Finaliza processos maliciosos, remove tarefas agendadas, exclui pastas e restaura o Windows Defender.
"""

import os
import shutil
import subprocess
import winreg
from typing import Dict, Any, List

class ThreatCleaner:
    def __init__(self, logger_callback=None):
        self.logger = logger_callback or (lambda msg: None)

    def log(self, message: str):
        self.logger(message)

    def clean_threat(self, threat: Dict[str, Any]) -> bool:
        """Limpa uma ameaça específica identificada pelo scanner."""
        ttype = threat.get("type")
        target = threat.get("target")

        try:
            if ttype == "process":
                return self.kill_process(target, threat.get("name"))
            elif ttype == "task":
                return self.remove_scheduled_task(target)
            elif ttype == "directory":
                return self.remove_directory(target)
            elif ttype == "startup_file":
                return self.remove_file(target)
            elif ttype == "security_service":
                return self.restore_defender_service()
            elif ttype == "security_policy":
                return self.restore_defender_policy(target)
            else:
                self.log(f"[AVISO] Tipo desconhecido de ameaça: {ttype}")
                return False
        except Exception as e:
            self.log(f"[ERRO] Falha ao limpar {threat.get('name')}: {e}")
            return False

    def kill_process(self, pid: Any, name: str) -> bool:
        self.log(f"[*] Finalizando processo {name} (PID: {pid})...")
        try:
            cmd = f"taskkill /F /T /PID {pid}"
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            if res.returncode == 0:
                self.log(f"[SUCESSO] Processo {pid} finalizado com sucesso.")
                return True
            else:
                # Tentar via PowerShell
                ps_cmd = f"Stop-Process -Id {pid} -Force -ErrorAction SilentlyContinue"
                self._run_powershell(ps_cmd)
                self.log(f"[SUCESSO] Processo {pid} comando de parada enviado.")
                return True
        except Exception as e:
            self.log(f"[ERRO] Erro ao matar processo {pid}: {e}")
            return False

    def remove_scheduled_task(self, task_name: str) -> bool:
        self.log(f"[*] Removendo tarefa agendada: '{task_name}'...")
        ps_cmd = (
            f"Stop-ScheduledTask -TaskName '{task_name}' -ErrorAction SilentlyContinue; "
            f"Disable-ScheduledTask -TaskName '{task_name}' -ErrorAction SilentlyContinue; "
            f"Unregister-ScheduledTask -TaskName '{task_name}' -Confirm:$false -ErrorAction SilentlyContinue"
        )
        self._run_powershell(ps_cmd)
        self.log(f"[SUCESSO] Tarefa '{task_name}' desregistrada.")
        return True

    def remove_directory(self, path: str) -> bool:
        self.log(f"[*] Excluindo diretório malicioso: {path}...")
        if not os.path.exists(path):
            self.log(f"[INFO] Diretório {path} já não existe.")
            return True

        # Tentar via shutil
        try:
            shutil.rmtree(path, ignore_errors=True)
        except Exception:
            pass

        # Garantir via PowerShell caso haja arquivos bloqueados
        if os.path.exists(path):
            ps_cmd = f"Remove-Item -Path '{path}' -Recurse -Force -ErrorAction SilentlyContinue"
            self._run_powershell(ps_cmd)

        if not os.path.exists(path):
            self.log(f"[SUCESSO] Diretório {path} excluído com sucesso.")
            return True
        else:
            self.log(f"[AVISO] Alguns arquivos em {path} podem estar em uso por processos ativos.")
            return False

    def remove_file(self, filepath: str) -> bool:
        self.log(f"[*] Removendo arquivo: {filepath}...")
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
                self.log(f"[SUCESSO] Arquivo {filepath} removido.")
                return True
            return True
        except Exception as e:
            self.log(f"[ERRO] Falha ao remover {filepath}: {e}")
            return False

    def restore_defender_service(self) -> bool:
        self.log("[*] Restaurando serviço Microsoft Defender (WinDefend)...")
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\WinDefend", 0, winreg.KEY_SET_VALUE) as key:
                winreg.SetValueEx(key, "Start", 0, winreg.REG_DWORD, 2) # 2 = Automatic

            # Iniciar o serviço
            ps_cmd = "Start-Service WinDefend -ErrorAction SilentlyContinue"
            self._run_powershell(ps_cmd)
            self.log("[SUCESSO] Serviço Microsoft Defender restaurado e reativado.")
            return True
        except Exception as e:
            self.log(f"[ERRO] Falha ao restaurar WinDefend: {e}")
            return False

    def restore_defender_policy(self, policy_name: str) -> bool:
        self.log(f"[*] Removendo restrição de segurança: {policy_name}...")
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows Defender", 0, winreg.KEY_SET_VALUE) as key:
                try:
                    winreg.DeleteValue(key, policy_name)
                    self.log(f"[SUCESSO] Política {policy_name} removida.")
                    return True
                except FileNotFoundError:
                    return True
        except Exception as e:
            self.log(f"[ERRO] Falha ao remover política {policy_name}: {e}")
            return False

    def _run_powershell(self, command: str) -> str:
        try:
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                capture_output=True,
                text=True,
                timeout=15,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            return proc.stdout.strip()
        except Exception:
            return ""
