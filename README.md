# 🛡️ Otimizador & Anti-Miner Pro

Aplicação desktop leve e nativa para Windows desenvolvida para **detecção e remoção de trojans mineradores ocultos**, **otimização de disco (SSD/HDD)**, **limpeza de memória RAM** e **monitoramento de processos em tempo real**.

Construído em **Python puro (sem dependências externas de pip)** para funcionar em qualquer máquina sem necessidade de instalar bibliotecas adicionais.

---

## 🚀 Como Executar

### Método 1: Dois cliques (Recomendado)
Dê um duplo clique no arquivo **`iniciar.bat`**.
> O script solicita permissão de Administrador automaticamente (UAC) para garantir acesso à finalização de processos de sistema, limpeza de tarefas agendadas e otimização TRIM do SSD.

### Método 2: Via Terminal (PowerShell / CMD como Administrador)
```powershell
cd E:\Projetos\Otimizador
python main.py
```

---

## 🎯 Principais Funcionalidades

### 1. 🛡️ Varredura Anti-Trojan & Miners
- **Detecção de Mineradores de Criptomoeda**: Identifica processos conhecidos (`AudioServices`, `xmrig`, `minerd`, etc.) e analisa linhas de comando à procura de flags de mineração (`randomx`, `stratum`, `winring0`, etc.).
- **Varredura do Agendador de Tarefas**: Detecta e desregistra tarefas na raiz do Windows que executam scripts ocultos (`.vbs`, `.bat`, `.cmd`) ou apontam para pastas maliciosas.
- **Detecção de Pastas Ocultas de Persistência**: Varre e limpa diretórios conhecidos criados por droppers (`C:\runtime`, `C:\cache`, `C:\diagnostics`, `C:\perfdata`, `C:\rescache`, `%APPDATA%\Sound`).
- **Restauração de Segurança do Windows**: Detecta se o serviço do **Microsoft Defender** (`WinDefend`) foi desativado no registro ou bloqueado via políticas locais (`DisableAntiSpyware`) e restaura seu funcionamento automático.

### 2. ⚡ Otimização de Desempenho
- **Limpeza de Disco**: Elimina com segurança cache de atualizações do Windows Update (`SoftwareDistribution\Download`), arquivos temporários (`%TEMP%`, `C:\Windows\Temp`) e logs de erro.
- **Otimização TRIM para SSDs**: Envia comandos de ReTrim diretamente para o controlador SATA/NVMe da unidade C:, prevenindo lentidões e o bug de 100% de uso de disco.
- **Liberação de Memória RAM**: Chama a API do Windows `EmptyWorkingSet` para liberar páginas de memória inativas mantidas por processos de segundo plano.
- **Diagnóstico de Saúde dos Discos**: Alerta quando o espaço livre cai abaixo de 15%, o que costuma saturar o cache SLC de SSDs SATA.

### 3. 📊 Monitor de Disco & I/O
- Monitora em tempo real a taxa de leitura e gravação por processo.
- Permite finalizar processos travados ou anômalos diretamente pela interface gráfica.

---

## 📁 Estrutura do Projeto

```text
E:\Projetos\Otimizador\
├── main.py                   # Ponto de entrada com suporte a High-DPI
├── iniciar.bat               # Inicializador com elevação UAC automática
├── .gitignore                # Arquivo gitignore para repositório Git
├── README.md                 # Documentação
│
├── core/
│   ├── scanner.py            # Motor de detecção de ameaças e alterações
│   ├── cleaner.py            # Motor de eliminação e restauração
│   ├── optimizer.py          # Limpeza de disco, RAM e comando TRIM
│   └── monitor.py            # Monitor de hardware (CPU, RAM, Discos)
│
└── ui/
    ├── theme.py              # Paleta de cores moderna (Dark Mode)
    └── main_window.py        # Interface gráfica com abas e console de logs
```

---

## 📦 Como Salvar no seu Repositório Privado (Git)

Abra o terminal dentro da pasta `E:\Projetos\Otimizador` e execute:

```bash
git init
git add .
git commit -m "feat: implementacao inicial do otimizador e anti-miner"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```
