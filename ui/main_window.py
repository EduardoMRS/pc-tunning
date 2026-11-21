"""
Janela Principal da Aplicação Desktop (Tkinter + TTK Moderno)
"""

import os
import sys
import ctypes
import threading
import datetime
import tkinter as tk
from tkinter import ttk, messagebox

from ui.theme import Theme
from core.scanner import ThreatScanner
from core.cleaner import ThreatCleaner
from core.optimizer import SystemOptimizer
from core.monitor import SystemMonitor

class MainWindow:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Otimizador & Anti-Miner Pro - Windows")
        self.root.geometry("980x720")
        self.root.minsize(880, 600)
        self.root.configure(bg=Theme.BG_DARK)

        # Inicializar módulos de backend
        self.scanner = ThreatScanner()
        self.cleaner = ThreatCleaner(logger_callback=self.log)
        self.optimizer = SystemOptimizer(logger_callback=self.log)
        self.monitor = SystemMonitor()

        self.threats_found = []
        self.is_running_task = False

        self._check_admin()
        self._setup_styles()
        self._build_ui()
        self._start_metric_loop()

    def _check_admin(self):
        try:
            self.is_admin = ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            self.is_admin = False

    def _setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use("clam")

        # Configurar Notebook (Abas)
        self.style.configure("TNotebook", background=Theme.BG_DARK, borderwidth=0)
        self.style.configure("TNotebook.Tab", background=Theme.BG_CARD, foreground=Theme.TEXT_MUTED,
                             padding=[18, 8], font=Theme.FONT_SUBTITLE, borderwidth=0)
        self.style.map("TNotebook.Tab",
                       background=[("selected", Theme.PRIMARY)],
                       foreground=[("selected", Theme.TEXT_MAIN)])

        # Configurar Treeview (Tabelas)
        self.style.configure("Treeview", background=Theme.BG_CARD, foreground=Theme.TEXT_MAIN,
                             fieldbackground=Theme.BG_CARD, font=Theme.FONT_REGULAR, rowheight=28, borderwidth=0)
        self.style.configure("Treeview.Heading", background=Theme.BG_CARD_HOVER, foreground=Theme.TEXT_MAIN,
                             font=Theme.FONT_SUBTITLE, padding=[6, 6])
        self.style.map("Treeview", background=[("selected", Theme.PRIMARY_HOVER)],
                       foreground=[("selected", Theme.TEXT_MAIN)])

        # Configurar Barras de Progresso
        self.style.configure("Horizontal.TProgressbar", background=Theme.PRIMARY,
                             troughcolor=Theme.BG_CARD, borderwidth=0, thickness=10)

    def _build_ui(self):
        # 1. Header Superior
        header_frame = tk.Frame(self.root, bg=Theme.BG_CARD, height=65, bd=0)
        header_frame.pack(fill=tk.X, side=tk.TOP, padx=12, pady=(10, 6))

        title_label = tk.Label(header_frame, text="🛡️ Otimizador & Anti-Miner Pro",
                               font=Theme.FONT_TITLE, bg=Theme.BG_CARD, fg=Theme.TEXT_MAIN)
        title_label.pack(side=tk.LEFT, padx=15, pady=12)

        # Badge de Administrador
        admin_text = "🛡️ ADMINISTRADOR: ATIVO" if self.is_admin else "⚠️ MODO PADRÃO (SEM ADMIN)"
        admin_color = Theme.SUCCESS if self.is_admin else Theme.WARNING
        admin_badge = tk.Label(header_frame, text=admin_text, font=Theme.FONT_SMALL,
                               bg=admin_color, fg=Theme.BG_DARK, padx=10, pady=4)
        admin_badge.pack(side=tk.RIGHT, padx=15, pady=12)

        # 2. Painel de Métricas em Tempo Real (Cards)
        metrics_frame = tk.Frame(self.root, bg=Theme.BG_DARK)
        metrics_frame.pack(fill=tk.X, padx=12, pady=4)

        # Card CPU
        self.card_cpu = self._create_metric_card(metrics_frame, "PROCESSADOR (CPU)", "0.0%")
        self.card_cpu.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 6))

        # Card RAM
        self.card_ram = self._create_metric_card(metrics_frame, "MEMÓRIA RAM", "0 / 0 GB (0%)")
        self.card_ram.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=6)

        # Card Disco C:
        self.card_disk = self._create_metric_card(metrics_frame, "DISCO C: (SSD/HDD)", "0 GB Livres (0%)")
        self.card_disk.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(6, 0))

        # 3. Abas Principais
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=6)

        # Aba 1: Anti-Miner & Ameaças
        self.tab_threats = tk.Frame(self.notebook, bg=Theme.BG_CARD)
        self.notebook.add(self.tab_threats, text="  🛡️ Verificação de Ameaças  ")
        self._build_threats_tab()

        # Aba 2: Otimização de Desempenho
        self.tab_optimizer = tk.Frame(self.notebook, bg=Theme.BG_CARD)
        self.notebook.add(self.tab_optimizer, text="  ⚡ Otimização do Sistema  ")
        self._build_optimizer_tab()

        # Aba 3: Processos com Alto I/O
        self.tab_processes = tk.Frame(self.notebook, bg=Theme.BG_CARD)
        self.notebook.add(self.tab_processes, text="  📊 Monitor de Disco & I/O  ")
        self._build_processes_tab()

        # 4. Terminal de Logs no Rodapé
        log_frame = tk.Frame(self.root, bg=Theme.BG_TERMINAL, height=140)
        log_frame.pack(fill=tk.X, side=tk.BOTTOM, padx=12, pady=(4, 10))

        log_header = tk.Frame(log_frame, bg=Theme.BG_TERMINAL)
        log_header.pack(fill=tk.X, padx=8, pady=3)

        tk.Label(log_header, text="CONSOLE DE ATIVIDADES", font=Theme.FONT_SMALL,
                 bg=Theme.BG_TERMINAL, fg=Theme.TEXT_MUTED).pack(side=tk.LEFT)

        btn_clear_log = tk.Button(log_header, text="Limpar Console", font=Theme.FONT_SMALL,
                                  bg=Theme.BG_CARD, fg=Theme.TEXT_MUTED, bd=0, padx=6, pady=1,
                                  command=self._clear_logs)
        btn_clear_log.pack(side=tk.RIGHT)

        self.log_text = tk.Text(log_frame, bg=Theme.BG_TERMINAL, fg=Theme.TEXT_TERMINAL,
                                font=Theme.FONT_MONO, height=5, bd=0, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 6))

        self.log("[INFO] Aplicativo iniciado. Pronto para verificação e otimização.")
        if not self.is_admin:
            self.log("[AVISO] Para eliminar ameaças e executar TRIM no SSD, execute o app como Administrador.")

    def _create_metric_card(self, parent, title: str, initial_val: str) -> tk.Frame:
        card = tk.Frame(parent, bg=Theme.BG_CARD, padx=12, pady=10, relief=tk.FLAT)
        lbl_title = tk.Label(card, text=title, font=Theme.FONT_SMALL, bg=Theme.BG_CARD, fg=Theme.TEXT_MUTED)
        lbl_title.pack(anchor=tk.W)

        lbl_val = tk.Label(card, text=initial_val, font=Theme.FONT_METRIC, bg=Theme.BG_CARD, fg=Theme.TEXT_MAIN)
        lbl_val.pack(anchor=tk.W, pady=(2, 4))

        prog = ttk.Progressbar(card, style="Horizontal.TProgressbar", maximum=100)
        prog.pack(fill=tk.X)

        card.lbl_val = lbl_val
        card.prog = prog
        return card

    # ========================== ABA DE AMEAÇAS ==========================
    def _build_threats_tab(self):
        action_bar = tk.Frame(self.tab_threats, bg=Theme.BG_CARD)
        action_bar.pack(fill=tk.X, padx=12, pady=10)

        self.btn_scan = tk.Button(action_bar, text="🔍 Iniciar Varredura de Ameaças",
                                  font=Theme.FONT_SUBTITLE, bg=Theme.PRIMARY, fg=Theme.TEXT_MAIN,
                                  activebackground=Theme.PRIMARY_HOVER, bd=0, padx=14, pady=8,
                                  command=self._start_scan_thread)
        self.btn_scan.pack(side=tk.LEFT)

        self.btn_clean = tk.Button(action_bar, text="🧹 Eliminar Ameaças & Restaurar Segurança",
                                   font=Theme.FONT_SUBTITLE, bg=Theme.DANGER, fg=Theme.TEXT_MAIN,
                                   activebackground=Theme.DANGER_HOVER, bd=0, padx=14, pady=8,
                                   command=self._start_clean_thread, state=tk.DISABLED)
        self.btn_clean.pack(side=tk.LEFT, padx=10)

        self.lbl_threat_status = tk.Label(action_bar, text="Nenhuma varredura executada ainda.",
                                          font=Theme.FONT_REGULAR, bg=Theme.BG_CARD, fg=Theme.TEXT_MUTED)
        self.lbl_threat_status.pack(side=tk.RIGHT, padx=10)

        # Tabela de ameaças encontradas
        cols = ("category", "severity", "name", "details")
        self.tree_threats = ttk.Treeview(self.tab_threats, columns=cols, show="headings")
        self.tree_threats.heading("category", text="Categoria")
        self.tree_threats.heading("severity", text="Gravidade")
        self.tree_threats.heading("name", text="Nome / Identificador")
        self.tree_threats.heading("details", text="Detalhes da Detecção")

        self.tree_threats.column("category", width=120, anchor=tk.CENTER)
        self.tree_threats.column("severity", width=100, anchor=tk.CENTER)
        self.tree_threats.column("name", width=220)
        self.tree_threats.column("details", width=420)

        self.tree_threats.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 10))

    def _start_scan_thread(self):
        if self.is_running_task:
            return
        self.is_running_task = True
        self.btn_scan.config(state=tk.DISABLED)
        self.lbl_threat_status.config(text="Varrendo sistema... Aguarde.", fg=Theme.PRIMARY)
        self.log("[*] Iniciando varredura completa de malwares, mineradores e persistências...")

        # Limpar tabela
        for item in self.tree_threats.get_children():
            self.tree_threats.delete(item)

        t = threading.Thread(target=self._scan_worker, daemon=True)
        t.start()

    def _scan_worker(self):
        threats = self.scanner.scan_all()
        self.threats_found = threats
        self.root.after(0, self._scan_finished, threats)

    def _scan_finished(self, threats):
        self.is_running_task = False
        self.btn_scan.config(state=tk.NORMAL)

        if not threats:
            self.lbl_threat_status.config(text="✅ Nenhuma ameaça detectada! Sistema limpo.", fg=Theme.SUCCESS)
            self.btn_clean.config(state=tk.DISABLED)
            self.log("[SUCESSO] Varredura concluída: Nenhuma ameaça ou minerador encontrado.")
        else:
            self.lbl_threat_status.config(text=f"⚠️ {len(threats)} AMEAÇA(S) DETECTADA(S)!", fg=Theme.DANGER)
            self.btn_clean.config(state=tk.NORMAL)
            self.log(f"[ALERTA] Varredura concluída: {len(threats)} itens suspeitos/maliciosos detectados!")

            for t in threats:
                self.tree_threats.insert("", tk.END, values=(
                    t.get("category"),
                    t.get("severity"),
                    t.get("name"),
                    t.get("details")
                ))

    def _start_clean_thread(self):
        if not self.threats_found or self.is_running_task:
            return

        if not self.is_admin:
            messagebox.showwarning("Permissão Insuficiente",
                                   "É necessário executar a ferramenta como Administrador para finalizar processos e excluir serviços/tarefas.")

        if messagebox.askyesno("Confirmar Limpeza", f"Deseja eliminar as {len(self.threats_found)} ameaças encontradas e restaurar o Defender?"):
            self.is_running_task = True
            self.btn_clean.config(state=tk.DISABLED)
            self.btn_scan.config(state=tk.DISABLED)
            t = threading.Thread(target=self._clean_worker, daemon=True)
            t.start()

    def _clean_worker(self):
        total = len(self.threats_found)
        cleaned = 0
        for threat in self.threats_found:
            if self.cleaner.clean_threat(threat):
                cleaned += 1

        self.root.after(0, self._clean_finished, cleaned, total)

    def _clean_finished(self, cleaned, total):
        self.is_running_task = False
        self.btn_scan.config(state=tk.NORMAL)
        self.log(f"[RESULTADO] Limpeza finalizada: {cleaned} de {total} ameaças tratadas.")
        messagebox.showinfo("Limpeza Concluída", f"{cleaned} de {total} ameaças foram eliminadas com sucesso!")
        # Re-executar varredura rápida para conferência
        self._start_scan_thread()

    # ========================== ABA DE OTIMIZAÇÃO ==========================
    def _build_optimizer_tab(self):
        container = tk.Frame(self.tab_optimizer, bg=Theme.BG_CARD)
        container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Botão Master 1-Click
        btn_master = tk.Button(container, text="🚀 OTIMIZAÇÃO COMPLETA EM 1 CLIQUE (DISCO + RAM + TRIM)",
                               font=Theme.FONT_TITLE, bg=Theme.SUCCESS, fg=Theme.TEXT_MAIN,
                               activebackground=Theme.SUCCESS_HOVER, bd=0, pady=12,
                               command=self._start_full_optimize_thread)
        btn_master.pack(fill=tk.X, pady=(0, 20))

        # Grade de Ações Individuais
        grid_frame = tk.Frame(container, bg=Theme.BG_CARD)
        grid_frame.pack(fill=tk.BOTH, expand=True)

        # 1. Limpeza de Arquivos Temporários
        f1 = self._create_action_card(grid_frame, "🧹 Limpeza de Arquivos Temporários",
                                      "Remove cache do Windows Update, arquivos temporários do usuário e relatórios de erro.",
                                      "Limpar Lixo de Disco", self._start_disk_clean_thread)
        f1.grid(row=0, column=0, padx=8, pady=8, sticky="nsew")

        # 2. Otimização TRIM no SSD
        f2 = self._create_action_card(grid_frame, "⚡ TRIM & Otimização de SSD",
                                      "Envia instruções TRIM para a unidade C: para evitar lentidão e uso de 100% no SSD.",
                                      "Executar TRIM C:", self._start_trim_thread)
        f2.grid(row=0, column=1, padx=8, pady=8, sticky="nsew")

        # 3. Liberação de RAM
        f3 = self._create_action_card(grid_frame, "🧠 Liberação de Memória RAM",
                                      "Esvazia os Working Sets de processos inativos e recupera memória cache.",
                                      "Liberar Memória RAM", self._start_ram_clean_thread)
        f3.grid(row=1, column=0, padx=8, pady=8, sticky="nsew")

        # 4. Diagnóstico de Espaço em Disco
        f4 = self._create_action_card(grid_frame, "🩺 Diagnóstico de Saúde dos Discos",
                                      "Analisa o percentual livre de todas as unidades para prevenir quedas de performance.",
                                      "Verificar Saúde", self._check_health_click)
        f4.grid(row=1, column=1, padx=8, pady=8, sticky="nsew")

        grid_frame.columnconfigure(0, weight=1)
        grid_frame.columnconfigure(1, weight=1)

    def _create_action_card(self, parent, title: str, desc: str, btn_text: str, command) -> tk.Frame:
        card = tk.Frame(parent, bg=Theme.BG_CARD_HOVER, padx=14, pady=14, bd=0)
        lbl_title = tk.Label(card, text=title, font=Theme.FONT_SUBTITLE, bg=Theme.BG_CARD_HOVER, fg=Theme.TEXT_MAIN)
        lbl_title.pack(anchor=tk.W)

        lbl_desc = tk.Label(card, text=desc, font=Theme.FONT_REGULAR, bg=Theme.BG_CARD_HOVER,
                            fg=Theme.TEXT_MUTED, wraplength=380, justify=tk.LEFT)
        lbl_desc.pack(anchor=tk.W, pady=(4, 10))

        btn = tk.Button(card, text=btn_text, font=Theme.FONT_REGULAR, bg=Theme.PRIMARY, fg=Theme.TEXT_MAIN,
                        activebackground=Theme.PRIMARY_HOVER, bd=0, padx=12, pady=6, command=command)
        btn.pack(anchor=tk.W)
        return card

    def _start_full_optimize_thread(self):
        if self.is_running_task:
            return
        self.is_running_task = True
        threading.Thread(target=self._full_optimize_worker, daemon=True).start()

    def _full_optimize_worker(self):
        self.log("[*] Iniciando Otimização Completa do Sistema...")
        res_disk = self.optimizer.clean_disk_junk()
        self.optimizer.free_ram()
        self.optimizer.optimize_ssd_trim("C")
        self.is_running_task = False
        self.root.after(0, lambda: messagebox.showinfo(
            "Otimização Completa",
            f"Otimização finalizada com sucesso!\n\nEspaço liberado: ~{res_disk['mb_freed']} MB\nMemória RAM e TRIM do SSD otimizados."
        ))

    def _start_disk_clean_thread(self):
        if self.is_running_task:
            return
        self.is_running_task = True
        threading.Thread(target=self._disk_clean_worker, daemon=True).start()

    def _disk_clean_worker(self):
        res = self.optimizer.clean_disk_junk()
        self.is_running_task = False
        self.root.after(0, lambda: messagebox.showinfo(
            "Limpeza Concluída", f"Foram removidos {res['files_removed']} arquivos (~{res['mb_freed']} MB liberados)!"
        ))

    def _start_trim_thread(self):
        if self.is_running_task:
            return
        self.is_running_task = True
        threading.Thread(target=self._trim_worker, daemon=True).start()

    def _trim_worker(self):
        ok = self.optimizer.optimize_ssd_trim("C")
        self.is_running_task = False
        msg = "TRIM executado na unidade C: com sucesso!" if ok else "Falha ao executar TRIM. Verifique permissões de Admin."
        self.root.after(0, lambda: messagebox.showinfo("Otimização TRIM", msg))

    def _start_ram_clean_thread(self):
        if self.is_running_task:
            return
        self.is_running_task = True
        threading.Thread(target=self._ram_clean_worker, daemon=True).start()

    def _ram_clean_worker(self):
        res = self.optimizer.free_ram()
        self.is_running_task = False
        msg = f"Memória cache liberada em {res.get('processes_cleared', 0)} processos!"
        self.root.after(0, lambda: messagebox.showinfo("Liberação de Memória", msg))

    def _check_health_click(self):
        alerts = self.optimizer.check_disk_health()
        if not alerts:
            messagebox.showinfo("Saúde dos Discos", "Todas as unidades possuem espaço livre adequado (>15%).")
        else:
            msg = "\n\n".join([f"[{a['severity']}] {a['message']}" for a in alerts])
            messagebox.showwarning("Alerta de Espaço", msg)

    # ========================== ABA DE PROCESSOS I/O ==========================
    def _build_processes_tab(self):
        top_bar = tk.Frame(self.tab_processes, bg=Theme.BG_CARD)
        top_bar.pack(fill=tk.X, padx=12, pady=10)

        tk.Button(top_bar, text="🔄 Atualizar Lista de I/O", font=Theme.FONT_SUBTITLE,
                  bg=Theme.PRIMARY, fg=Theme.TEXT_MAIN, activebackground=Theme.PRIMARY_HOVER,
                  bd=0, padx=12, pady=6, command=self._refresh_io_processes).pack(side=tk.LEFT)

        tk.Button(top_bar, text="❌ Finalizar Processo Selecionado", font=Theme.FONT_SUBTITLE,
                  bg=Theme.DANGER, fg=Theme.TEXT_MAIN, activebackground=Theme.DANGER_HOVER,
                  bd=0, padx=12, pady=6, command=self._kill_selected_io_process).pack(side=tk.LEFT, padx=10)

        cols = ("pid", "name", "total_mb")
        self.tree_io = ttk.Treeview(self.tab_processes, columns=cols, show="headings")
        self.tree_io.heading("pid", text="PID")
        self.tree_io.heading("name", text="Nome do Processo")
        self.tree_io.heading("total_mb", text="Total Transferido no Disco (MB)")

        self.tree_io.column("pid", width=100, anchor=tk.CENTER)
        self.tree_io.column("name", width=300)
        self.tree_io.column("total_mb", width=200, anchor=tk.E)

        self.tree_io.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 10))

    def _refresh_io_processes(self):
        for item in self.tree_io.get_children():
            self.tree_io.delete(item)

        threading.Thread(target=self._io_worker, daemon=True).start()

    def _io_worker(self):
        procs = self.monitor.get_top_io_processes(limit=15)
        self.root.after(0, self._render_io_processes, procs)

    def _render_io_processes(self, procs):
        for p in procs:
            self.tree_io.insert("", tk.END, values=(
                p.get("Id"),
                p.get("ProcessName"),
                f"{p.get('TotalMB')} MB"
            ))

    def _kill_selected_io_process(self):
        selected = self.tree_io.selection()
        if not selected:
            messagebox.showinfo("Seleção", "Selecione um processo na tabela para finalizar.")
            return

        values = self.tree_io.item(selected[0], "values")
        pid = values[0]
        pname = values[1]

        if messagebox.askyesno("Confirmar", f"Tem certeza que deseja finalizar o processo {pname} (PID: {pid})?"):
            self.cleaner.kill_process(pid, pname)
            self._refresh_io_processes()

    # ========================== LOOP DE MONITORAMENTO ==========================
    def _start_metric_loop(self):
        def loop():
            # CPU
            cpu = self.monitor.get_cpu_usage()
            self.card_cpu.lbl_val.config(text=f"{cpu}%")
            self.card_cpu.prog["value"] = cpu

            # RAM
            ram = self.monitor.get_ram_usage()
            self.card_ram.lbl_val.config(text=f"{ram['used_gb']} / {ram['total_gb']} GB ({ram['percent']}%)")
            self.card_ram.prog["value"] = ram['percent']

            # Disco C:
            disk = self.monitor.get_disk_c_usage()
            disk_color = Theme.DANGER if disk['free_gb'] < 40 else Theme.TEXT_MAIN
            self.card_disk.lbl_val.config(text=f"{disk['free_gb']} GB Livres ({disk['percent']}%)", fg=disk_color)
            self.card_disk.prog["value"] = disk['percent']

            # Agendar próxima atualização em 2 segundos
            self.root.after(2000, loop)

        self.root.after(500, loop)

    # ========================== LOGGING & UTIL ==========================
    def log(self, message: str):
        now = datetime.datetime.now().strftime("%H:%M:%S")
        entry = f"[{now}] {message}\n"
        self.root.after(0, self._append_log, entry)

    def _append_log(self, entry: str):
        self.log_text.insert(tk.END, entry)
        self.log_text.see(tk.END)

    def _clear_logs(self):
        self.log_text.delete("1.0", tk.END)
