# 🛡️ Otimizador & Gaming Hub PRO

Uma aplicação desktop moderna, de alto desempenho e multiplataforma desenvolvida para **detecção e remoção de trojans mineradores ocultos**, **instalação e atualização de drivers de hardware (Vídeo, Chipset, Rede e USB)**, **instalação em 1 clique de bibliotecas e runtimes essenciais para jogos (DirectX, Visual C++ All-in-One, .NET, Vulkan)** e **otimização de SSDs e memória RAM**.

Construído sobre **Electron** com arquitetura desacoplada em serviços, pronto para suporte a **Windows**, **Linux** e **macOS**, e empacotável em **instalador oficial com assistente (`.exe` NSIS)**.

---

## 🚀 Como Iniciar a Aplicação

### Método 1: Inicializador Automático (Recomendado)
Dê um duplo clique no arquivo **`iniciar.bat`**.
> O script solicita permissão de Administrador automaticamente (UAC), verifica e baixa as dependências (se for a primeira execução) e abre o aplicativo.

### Método 2: Via Terminal (CMD / PowerShell como Administrador)
```bash
# Entrar no diretório do projeto
cd E:\Projetos\Otimizador

# Instalar dependências (apenas na 1ª vez)
npm install

# Iniciar a aplicação
npm start
```

---

## 📦 Como Gerar o Instalador Oficial (.EXE NSIS)

Deseja transformar o projeto em um instalador distribuível para instalar no seu computador ou no de amigos?

1. Dê um duplo clique no arquivo **`gerar_instalador.bat`** (ou execute `npm run dist:win`).
2. O compilador criará o arquivo na pasta:
   ```text
   E:\Projetos\Otimizador\dist\Otimizador & Gaming Hub Pro Setup 2.0.0.exe
   ```
3. O instalador inclui:
   - Assistente de instalação personalizável (NSIS).
   - Criação de atalho na Área de Trabalho e no Menu Iniciar.
   - Solicitação automática de permissões de Administrador.
   - Desinstalador limpo no Painel de Controle do Windows.

---

## 🎯 Principais Recursos & Telas

### 1. 🎮 Runtimes & Bibliotecas de Jogos (Gaming Commons)
Resolve 99% dos erros de inicialização de jogos na Steam, Epic Games, Game Pass e emuladores:
- **Visual C++ Redistributable All-in-One (2005 a 2022 x86 e x64)**: Corrige falta de `vcruntime140.dll`, `msvcp140.dll`, `msvcr120.dll` e o erro `0xc000007b`.
- **DirectX End-User Runtimes (June 2010 Offline Package)**: Adiciona todas as DLLs legadas do DirectX 9.0c, 10 e 11 (`d3dx9_43.dll`, `d3dx10_43.dll`, `d3dx11_43.dll`, `XInput1_3.dll`).
- **Microsoft .NET Desktop Runtime (8.0 e 9.0 x64)**: Necessário para mod managers e softwares de periféricos gamer.
- **OpenAL (Open Audio Library 2.0.7)**: Áudio 3D posicional para jogos clássicos e de simulação.
- **Vulkan Runtime**: Suporte a APIs gráficas de baixo overhead.
- **Opções de Instalação**:
  - **Instalação Silenciosa Automática**: Baixa e instala em segundo plano com um clique.
  - **Instalação Assistida**: Abre o instalador oficial para acompanhamento manual.

### 2. ⚙️ Central de Drivers
Detecta o hardware real do computador e fornece acesso direto aos instaladores oficiais das fabricantes:
- **Placas de Vídeo (GPU)**: NVIDIA GeForce Game Ready/Studio, AMD Software Adrenalin e Intel Arc.
- **Processadores & Chipset**: Drivers de chipset AMD Ryzen (AM4/AM5) e Intel Chipset Device Software (INF Update).
- **Adaptadores de Rede**: Controladoras Realtek Gaming GbE / 2.5GbE e placas Intel Ethernet / Killer Wi-Fi.
- **Controladoras USB**: Diagnóstico e atualização de barramentos xHCI / USB 3.0/3.1.

### 3. ⚡ Otimizador de Desempenho
- **Comando TRIM para SSDs**: Envia comandos ReTrim diretamente aos blocos NAND Flash da unidade C:, prevenindo o bug de 100% de uso de disco.
- **Liberação de Memória RAM**: Chama a API `EmptyWorkingSet` para esvaziar cache inativo de processos sem encerrar suas aplicações.
- **Limpeza de Disco**: Elimina arquivos temporários, logs, Prefetch e arquivos obsoletos do Windows Update (`SoftwareDistribution\Download`).
- **Flush DNS**: Limpa o cache do resolvedor DNS para restaurar conexões instáveis em jogos online.

### 4. 🛡️ Defesa & Anti-Miner Oculto
- **Detecção de Mineradores de Criptomoeda**: Varre processos ativos buscando argumentos de mineração (`xmrig`, `randomx`, `stratum`, etc.).
- **Auditoria de Tarefas Agendadas**: Localiza tarefas suspeitas na raiz do Agendador de Tarefas do Windows que apontam para scripts ocultos.
- **Limpeza de Pastas Dropper**: Varre e elimina pastas conhecidas de persistência (`C:\runtime`, `C:\cache`, `C:\diagnostics`, etc.).
- **Restauração do Microsoft Defender**: Remove políticas de registro maliciosas (`DisableAntiSpyware`) e reativa o serviço `WinDefend`.

---

## 📁 Estrutura do Projeto

```text
E:\Projetos\Otimizador\
├── package.json               # Configurações e dependências do Electron
├── iniciar.bat                # Inicializador automático com elevação UAC
├── gerar_instalador.bat       # Compilador do instalador .exe do Windows
├── assets/                    # Ícones e identidade visual do projeto
│   └── icon.png
│
├── src/
│   ├── main/
│   │   ├── index.js           # Processo Principal do Electron & IPC Handlers
│   │   ├── preload.js         # ContextBridge com APIs seguras expostas ao frontend
│   │   └── services/
│   │       ├── hardware.js    # Detecção de hardware (Windows / Linux / Mac)
│   │       ├── drivers.js     # Catálogo e mapeamento de drivers oficiais
│   │       ├── runtimes.js    # Detecção e catálogo de runtimes de jogos
│   │       ├── installer.js   # Gerenciador de download com streaming e instaladores
│   │       ├── optimizer.js   # Comandos TRIM, RAM, Limpeza de Disco e DNS
│   │       └── scanner.js     # Motor de varredura e neutralização Anti-Miner
│   │
│   └── renderer/
│       ├── index.html         # Interface gráfica moderna com abas e console
│       ├── css/
│       │   └── style.css      # Design System Cyber/Dark com animações e glassmorphism
│       └── js/
│           └── app.js         # Controlador da interface, roteamento e eventos
│
└── core/                      # (Legado) Motores em Python puro
```
