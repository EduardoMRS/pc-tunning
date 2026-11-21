"""
Módulo de Monitoramento (Monitor)
Coleta métricas em tempo real de CPU, Memória RAM, Discos e processos com alto I/O.
"""

import os
import ctypes
import subprocess
from typing import Dict, Any, List

class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", ctypes.c_ulong),
        ("dwMemoryLoad", ctypes.c_ulong),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]

class SystemMonitor:
    def __init__(self):
        self._prev_idle = 0
        self._prev_kernel = 0
        self._prev_user = 0

    def get_ram_usage(self) -> Dict[str, Any]:
        """Obtém o uso atual de memória RAM através da API do Windows GlobalMemoryStatusEx."""
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            total_gb = round(stat.ullTotalPhys / (1024**3), 2)
            avail_gb = round(stat.ullAvailPhys / (1024**3), 2)
            used_gb = round(total_gb - avail_gb, 2)
            pct = stat.dwMemoryLoad
            return {
                "total_gb": total_gb,
                "used_gb": used_gb,
                "avail_gb": avail_gb,
                "percent": pct
            }
        return {"total_gb": 0, "used_gb": 0, "avail_gb": 0, "percent": 0}

    def get_cpu_usage(self) -> float:
        """Calcula a porcentagem de uso de CPU via GetSystemTimes."""
        idle_time = ctypes.c_ulonglong()
        kernel_time = ctypes.c_ulonglong()
        user_time = ctypes.c_ulonglong()

        if ctypes.windll.kernel32.GetSystemTimes(
            ctypes.byref(idle_time),
            ctypes.byref(kernel_time),
            ctypes.byref(user_time)
        ):
            idle = idle_time.value
            kernel = kernel_time.value
            user = user_time.value

            d_idle = idle - self._prev_idle
            d_kernel = kernel - self._prev_kernel
            d_user = user - self._prev_user

            self._prev_idle = idle
            self._prev_kernel = kernel
            self._prev_user = user

            sys_time = d_kernel + d_user
            if sys_time > 0:
                cpu = (sys_time - d_idle) * 100.0 / sys_time
                return max(0.0, min(100.0, round(cpu, 1)))

        return 0.0

    def get_disk_c_usage(self) -> Dict[str, Any]:
        """Obtém uso da partição C: via GetDiskFreeSpaceExW."""
        free_bytes = ctypes.c_ulonglong()
        total_bytes = ctypes.c_ulonglong()
        total_free_bytes = ctypes.c_ulonglong()

        if ctypes.windll.kernel32.GetDiskFreeSpaceExW(
            "C:\\",
            ctypes.byref(free_bytes),
            ctypes.byref(total_bytes),
            ctypes.byref(total_free_bytes)
        ):
            total_gb = round(total_bytes.value / (1024**3), 1)
            free_gb = round(total_free_bytes.value / (1024**3), 1)
            used_gb = round(total_gb - free_gb, 1)
            pct = round((used_gb / total_gb) * 100, 1) if total_gb > 0 else 0
            return {
                "total_gb": total_gb,
                "used_gb": used_gb,
                "free_gb": free_gb,
                "percent": pct
            }
        return {"total_gb": 0, "used_gb": 0, "free_gb": 0, "percent": 0}

    def get_top_io_processes(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Retorna os processos que mais consom I/O de disco atualmente."""
        ps_cmd = (
            f"Get-Process | Where-Object {{ $_.ReadTransferLength -gt 0 -or $_.WriteTransferLength -gt 0 }} | "
            f"Sort-Object @{{Expression={{$_.ReadTransferLength + $_.WriteTransferLength}}}} -Descending | "
            f"Select-Object -First {limit} Id, ProcessName, "
            f"@{{N='TotalMB';E={{[math]::Round(($_.ReadTransferLength + $_.WriteTransferLength)/1MB,1)}}}} | "
            f"ConvertTo-Json -Compress"
        )
        try:
            res = self._run_powershell(ps_cmd)
            if res:
                import json
                data = json.loads(res)
                if isinstance(data, dict):
                    data = [data]
                return data
        except Exception:
            pass
        return []

    def _run_powershell(self, command: str) -> str:
        try:
            proc = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
                capture_output=True,
                text=True,
                timeout=10,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            return proc.stdout.strip()
        except Exception:
            return ""
