"""
Módulo de Varredura (Scanner)
Detecta trojans, mineradores, tarefas agendadas suspeitas, pastas maliciosas e alterações de segurança.
"""

import os
import subprocess
import winreg
from typing import List, Dict, Any

class ThreatScanner:
    # Nomes conhecidos de processos maliciosos e mineradores
    KNOWN_BAD_PROCESSES = [
        "audioservices", "audioservicesperform", "audioservicemonitor", "erro_audio",
        "xmrig", "minerd", "ethminer", "phoenixminer", "nbminer", "t-rex",
        "lolminer", "nanominer", "wildrig", "xmr-stak", "ccminer", "cpuminer"
    ]

    # Palavras-chave em argumentos de linha de comando de mineradores
    MINER_KEYWORDS = [
        "randomx", "stratum+tcp", "stratum+ssl", "nicehash", "portaupdate",
        "winring0", "rdmsr", "wrmsr", "worker-id", "audiosrv.bin"
    ]

    # Pastas e caminhos tradicionalmente usados por droppers e trojans
    SUSPICIOUS_PATHS = [
        r"C:\runtime",
        r"C:\cache",
        r"C:\perfdata",
        r"C:\rescache",
        r"C:\diagnostics",
        r"C:\Sound",
        os.path.expandvars(r"%APPDATA%\Sound")
    ]

    # Nomes de tarefas agendadas maliciosas conhecidas
    KNOWN_BAD_TASKS = [
        "driverupdate", "graphicscardengineupdater", "microsoftdriverupdate"
    ]

    def __init__(self):
        self.threats: List[Dict[str, Any]] = []

    def scan_all(self) -> List[Dict[str, Any]]:
        """Executa todas as rotinas de varredura e retorna a lista de ameaças encontradas."""
        self.threats = []
        self.scan_processes()
        self.scan_scheduled_tasks()
        self.scan_suspicious_directories()
        self.scan_startup_entries()
        self.scan_security_settings()
        return self.threats

    def scan_processes(self):
        """Verifica processos ativos à procura de mineradores ou executáveis suspeitos."""
        ps_cmd = (
            "Get-CimInstance Win32_Process | "
            "Select-Object ProcessId, Name, ExecutablePath, CommandLine | "
            "ConvertTo-Json -Compress"
        )
        try:
            output = self._run_powershell(ps_cmd)
            if not output:
                return

            import json
            data = json.loads(output)
            if isinstance(data, dict):
                data = [data]

            for proc in data:
                pid = proc.get("ProcessId")
                name = (proc.get("Name") or "").lower()
                path = proc.get("ExecutablePath") or ""
                cmdline = (proc.get("CommandLine") or "").lower()

                base_name = name.replace(".exe", "")
                is_bad = False
                reason = ""

                # 1. Checagem por nome conhecido
                if any(bad in base_name for bad in self.KNOWN_BAD_PROCESSES):
                    is_bad = True
                    reason = f"Processo corresponde a minerador ou trojan conhecido: {name}"

                # 2. Checagem por argumentos de linha de comando
                if not is_bad and cmdline:
                    for kw in self.MINER_KEYWORDS:
                        if kw in cmdline:
                            is_bad = True
                            reason = f"Linha de comando suspeita contendo flag de mineração: '{kw}'"
                            break

                # 3. Checagem por execução a partir de pastas maliciosas
                if not is_bad and path:
                    for susp in self.SUSPICIOUS_PATHS:
                        if susp.lower() in path.lower():
                            is_bad = True
                            reason = f"Processo em execução a partir de pasta suspeita: {path}"
                            break

                if is_bad:
                    self.threats.append({
                        "category": "Processo",
                        "severity": "Alta",
                        "name": f"{proc.get('Name')} (PID: {pid})",
                        "target": pid,
                        "path": path,
                        "details": reason,
                        "type": "process"
                    })
        except Exception as e:
            pass

    def scan_scheduled_tasks(self):
        """Varre o Agendador de Tarefas do Windows em busca de scripts ou executáveis suspeitos."""
        ps_cmd = (
            "Get-ScheduledTask | ForEach-Object { "
            "  [PSCustomObject]@{ "
            "    TaskName = $_.TaskName; "
            "    TaskPath = $_.TaskPath; "
            "    State = $_.State.ToString(); "
            "    Execute = $_.Actions.Execute; "
            "    Arguments = $_.Actions.Arguments "
            "  } "
            "} | ConvertTo-Json -Compress"
        )
        try:
            output = self._run_powershell(ps_cmd)
            if not output:
                return

            import json
            data = json.loads(output)
            if isinstance(data, dict):
                data = [data]

            for t in data:
                tname = (t.get("TaskName") or "").lower()
                tpath = t.get("TaskPath") or ""
                execute = (t.get("Execute") or "").lower()
                args = (t.get("Arguments") or "").lower()

                is_bad = False
                reason = ""

                # 1. Tarefas com nomes maliciosos conhecidos
                if any(bad == tname for bad in self.KNOWN_BAD_TASKS):
                    is_bad = True
                    reason = f"Tarefa agendada associada a malware: '{t.get('TaskName')}'"

                # 2. Tarefas na raiz rodando VBS, BAT ou executando de pastas suspeitas
                if not is_bad:
                    for susp in self.SUSPICIOUS_PATHS:
                        if susp.lower() in execute or susp.lower() in args:
                            is_bad = True
                            reason = f"Tarefa aponta para diretório malicioso: {execute} {args}"
                            break

                if not is_bad and tpath == "\\" and any(ext in execute for ext in [".vbs", ".bat", ".cmd"]):
                    is_bad = True
                    reason = f"Script não padrão executando como tarefa agendada na raiz: {execute}"

                if is_bad:
                    self.threats.append({
                        "category": "Tarefa Agendada",
                        "severity": "Alta",
                        "name": t.get("TaskName"),
                        "target": t.get("TaskName"),
                        "path": f"{t.get('Execute')} {t.get('Arguments') or ''}".strip(),
                        "details": reason,
                        "type": "task"
                    })
        except Exception as e:
            pass

    def scan_suspicious_directories(self):
        """Verifica a existência de diretórios e arquivos conhecidos de malware/miners."""
        for path in self.SUSPICIOUS_PATHS:
            if os.path.exists(path):
                # Calcular quantidade de arquivos
                try:
                    files = [os.path.join(r, f) for r, _, fs in os.walk(path) for f in fs]
                    count = len(files)
                    self.threats.append({
                        "category": "Pasta Maliciosa",
                        "severity": "Alta",
                        "name": os.path.basename(path) or path,
                        "target": path,
                        "path": path,
                        "details": f"Diretório de malware/minerador encontrado com {count} arquivos.",
                        "type": "directory"
                    })
                except Exception:
                    self.threats.append({
                        "category": "Pasta Maliciosa",
                        "severity": "Alta",
                        "name": path,
                        "target": path,
                        "path": path,
                        "details": "Diretório de persistência maliciosa encontrado.",
                        "type": "directory"
                    })

    def scan_startup_entries(self):
        """Verifica atalhos e scripts na pasta Inicializar (Startup) e chaves Run do registro."""
        startup_folders = [
            os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"),
            os.path.expandvars(r"%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup")
        ]

        for sdir in startup_folders:
            if os.path.exists(sdir):
                for item in os.listdir(sdir):
                    fpath = os.path.join(sdir, item)
                    lower = item.lower()
                    if lower.endswith((".vbs", ".bat", ".cmd")) or "netsetup" in lower:
                        self.threats.append({
                            "category": "Inicialização",
                            "severity": "Alta",
                            "name": item,
                            "target": fpath,
                            "path": fpath,
                            "details": f"Script ou atalho suspeito encontrado na pasta Inicializar: {item}",
                            "type": "startup_file"
                        })

    def scan_security_settings(self):
        """Verifica se o Microsoft Defender foi desativado ou sabotado no Registro."""
        # Verificar se WinDefend foi desativado (Start = 4)
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\WinDefend") as key:
                start_val, _ = winreg.QueryValueEx(key, "Start")
                if start_val == 4:
                    self.threats.append({
                        "category": "Segurança",
                        "severity": "Crítica",
                        "name": "Serviço Microsoft Defender Desativado",
                        "target": "WinDefend",
                        "path": r"HKLM\SYSTEM\CurrentControlSet\Services\WinDefend",
                        "details": "O serviço do antivírus foi desativado no registro (Start=4).",
                        "type": "security_service"
                    })
        except Exception:
            pass

        # Verificar policies desativando o Defender
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Policies\Microsoft\Windows Defender") as key:
                try:
                    dis, _ = winreg.QueryValueEx(key, "DisableAntiSpyware")
                    if dis == 1:
                        self.threats.append({
                            "category": "Segurança",
                            "severity": "Crítica",
                            "name": "Política DisableAntiSpyware Ativa",
                            "target": "DisableAntiSpyware",
                            "path": r"HKLM\SOFTWARE\Policies\Microsoft\Windows Defender",
                            "details": "O Windows Defender foi bloqueado via política de grupo local.",
                            "type": "security_policy"
                        })
                except FileNotFoundError:
                    pass
        except Exception:
            pass

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
