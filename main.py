"""
Ponto de Entrada da Aplicação Otimizador & Anti-Miner Pro
"""

import sys
import os
import ctypes
import tkinter as tk

# Ajustar sys.path para garantir importações relativas limpas
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from ui.main_window import MainWindow

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def elevate_if_needed():
    """Se o usuário passar a flag --elevate ou se quisermos forçar admin, eleva via UAC."""
    if not is_admin() and "--elevate" in sys.argv:
        # Relançar como Administrador via UAC
        params = " ".join([f'"{arg}"' for arg in sys.argv if arg != "--elevate"])
        ret = ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, f'"{__file__}" {params}', None, 1
        )
        if ret > 32:
            sys.exit(0)

def set_high_dpi_awareness():
    """Ativa suporte a High-DPI para fontes nítidas no Windows 10/11."""
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

def main():
    elevate_if_needed()
    set_high_dpi_awareness()

    root = tk.Tk()
    app = MainWindow(root)
    root.mainloop()

if __name__ == "__main__":
    main()
