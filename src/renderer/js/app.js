/**
 * Main Frontend Application Controller
 * Otimizador & Gaming Hub Pro
 */

class AppController {
  constructor() {
    this.currentView = 'view-dashboard';
    this.hardwareData = null;
    this.runtimesData = [];
    this.driversData = [];
    this.threatsData = [];
    this.appsData = [];

    this.init();
  }

  init() {
    this.bindWindowControls();
    this.bindNavigation();
    this.bindActionButtons();
    this.bindInstallerEvents();
    this.bindScannerEvents();
    this.bindGameDefenderControls();
    this.bindAppsControls();

    // Carregar dados iniciais do sistema
    this.loadSystemData();
  }

  // ================= CONTROLES DE JANELA ================= //
  bindWindowControls() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => {
      window.api?.windowMinimize();
    });

    document.getElementById('btn-maximize')?.addEventListener('click', () => {
      window.api?.windowMaximize();
    });

    document.getElementById('btn-close')?.addEventListener('click', () => {
      window.api?.windowClose();
    });
  }

  // ================= NAVEGAÇÃO ================= //
  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view');
        this.switchView(viewId);
      });
    });

    // Filtros de Runtimes
    const filterPills = document.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.getAttribute('data-filter');
        this.renderRuntimesList(filter);
      });
    });
  }

  switchView(viewId) {
    this.currentView = viewId;

    // Atualizar classe ativa nos botões da sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Alternar painel ativo
    document.querySelectorAll('.view-panel').forEach(panel => {
      if (panel.id === viewId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  // ================= BOTÕES DE AÇÃO ================= //
  bindActionButtons() {
    // Dashboard
    document.getElementById('btn-refresh-hardware')?.addEventListener('click', () => {
      this.loadSystemData();
      this.showToast('Diagnóstico de hardware atualizado.', 'info');
    });

    document.getElementById('btn-quick-optimize')?.addEventListener('click', () => {
      this.runQuickOptimization();
    });

    // Runtimes
    document.getElementById('btn-refresh-runtimes')?.addEventListener('click', () => {
      this.loadRuntimes();
    });

    document.getElementById('btn-install-missing-runtimes')?.addEventListener('click', () => {
      this.installAllMissingRuntimes();
    });

    // Drivers
    document.getElementById('btn-refresh-drivers')?.addEventListener('click', () => {
      this.loadDrivers();
    });

    // Otimizador
    document.getElementById('btn-run-trim')?.addEventListener('click', async () => {
      this.showToast('Executando TRIM na unidade C:...', 'info');
      const res = await window.api.runTrim('C');
      this.showToast(res.message, res.success ? 'success' : 'error');
    });

    document.getElementById('btn-clean-ram')?.addEventListener('click', async () => {
      this.showToast('Purgando páginas de RAM em segundo plano...', 'info');
      const res = await window.api.cleanRAM();
      this.showToast(res.message, res.success ? 'success' : 'error');
      this.loadSystemData(); // Atualiza uso de RAM
    });

    document.getElementById('btn-clean-disk')?.addEventListener('click', async () => {
      this.showToast('Limpando arquivos temporários e cache...', 'info');
      const res = await window.api.cleanDisk();
      this.showToast(res.message, res.success ? 'success' : 'error');
      this.loadSystemData();
    });

    document.getElementById('btn-flush-dns')?.addEventListener('click', async () => {
      const res = await window.api.flushDNS();
      this.showToast(res.message, res.success ? 'success' : 'error');
    });

    // Anti-Miner
    document.getElementById('btn-start-scan')?.addEventListener('click', () => {
      this.startSecurityScan();
    });

    document.getElementById('btn-fix-threats')?.addEventListener('click', () => {
      this.fixDetectedThreats();
    });

    document.getElementById('btn-clear-scan-log')?.addEventListener('click', () => {
      const body = document.getElementById('scan-log-output');
      if (body) body.innerHTML = '<div class="log-line text-muted">> Console limpo.</div>';
    });

    // Modal
    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
      document.getElementById('install-modal').style.display = 'none';
    });
  }

  // ================= CARREGAMENTO DE DADOS ================= //
  async loadSystemData() {
    try {
      this.hardwareData = await window.api.getHardwareInfo();
      this.updateDashboardMetrics();
      this.loadRuntimes();
      this.loadDrivers();
      this.loadApps();

      // Atualizar badge de admin
      const badge = document.getElementById('header-admin-badge');
      if (badge) {
        badge.innerHTML = `${window.LucideIcons?.shieldCheck(13, 'badge-icon') || ''} ADMIN ELEVADO`;
      }
    } catch (err) {
      console.error('Erro ao ler hardware:', err);
    }
  }

  updateDashboardMetrics() {
    const hw = this.hardwareData;
    if (!hw) return;

    // CPU
    if (hw.cpu) {
      document.getElementById('dash-cpu-name').innerText = hw.cpu.name || 'Processador Genérico';
      document.getElementById('dash-cpu-vendor').innerText = `Arquitetura: ${hw.cpu.brand} | ${hw.cpu.cores} Núcleos/Threads`;
      document.getElementById('cpu-cores-badge').innerText = `${hw.cpu.cores} THREADS`;
    }

    // GPU
    if (hw.gpu && hw.gpu.length > 0) {
      const mainGpu = hw.gpu[0];
      document.getElementById('dash-gpu-name').innerText = mainGpu.name;
      document.getElementById('dash-gpu-driver').innerText = `Driver: v${mainGpu.version} (${mainGpu.provider})`;
      document.getElementById('gpu-brand-badge').innerText = mainGpu.brand;
    }

    // RAM
    if (hw.ram) {
      document.getElementById('dash-ram-usage').innerText = `${hw.ram.usedGB} / ${hw.ram.totalGB}`;
      document.getElementById('dash-ram-percent').innerText = `${hw.ram.percentage}%`;
      document.getElementById('dash-ram-bar').style.width = `${hw.ram.percentage}%`;
    }

    // DISCO C:
    if (hw.disks && hw.disks.length > 0) {
      const mainDisk = hw.disks[0];
      document.getElementById('dash-disk-letter').innerText = mainDisk.letter;
      document.getElementById('dash-disk-usage').innerText = `${mainDisk.freeGB} Livres (${mainDisk.percentUsed}% Usado)`;
      document.getElementById('dash-disk-bar').style.width = `${mainDisk.percentUsed}%`;
    }
  }

  async loadRuntimes() {
    const container = document.getElementById('runtimes-list-container');
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Auditando dependências instaladas no Windows...</span>
      </div>
    `;

    try {
      this.runtimesData = await window.api.getRuntimes();
      this.updateRuntimesCounters();
      this.renderRuntimesList('all');
    } catch (err) {
      container.innerHTML = `<div class="log-line text-error">Erro ao carregar runtimes: ${err.message}</div>`;
    }
  }

  updateRuntimesCounters() {
    const total = this.runtimesData.length;
    const missing = this.runtimesData.filter(r => !r.isInstalled).length;
    const installed = total - missing;

    document.getElementById('count-runtimes-all').innerText = total;
    document.getElementById('count-runtimes-missing').innerText = missing;
    document.getElementById('count-runtimes-installed').innerText = installed;

    const navBadge = document.getElementById('badge-runtimes-missing');
    if (missing > 0) {
      navBadge.innerText = missing;
      navBadge.style.display = 'inline-block';
      document.getElementById('dash-runtimes-summary').innerText = `${missing} componentes ausentes encontrados!`;
    } else {
      navBadge.style.display = 'none';
      document.getElementById('dash-runtimes-summary').innerText = 'Todas as bibliotecas principais estão instaladas!';
    }
  }

  renderRuntimesList(filter = 'all') {
    const container = document.getElementById('runtimes-list-container');
    container.innerHTML = '';

    let items = this.runtimesData;
    if (filter === 'missing') {
      items = items.filter(r => !r.isInstalled);
    } else if (filter === 'installed') {
      items = items.filter(r => r.isInstalled);
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="loading-state">
          <span>Nenhum componente nesta categoria.</span>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const tagClass = `tag-${item.importance.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
      const statusClass = item.isInstalled ? 'status-installed' : 'status-missing';
      const dotClass = item.isInstalled ? 'dot-installed' : 'dot-missing';

      let actionButtons = '';
      if (!item.isInstalled) {
        if (item.downloadUrl) {
          actionButtons += `
            <button class="btn btn-primary btn-sm btn-install-auto" data-id="${item.id}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Instalar Auto
            </button>
            <button class="btn btn-secondary btn-sm btn-install-assist" data-id="${item.id}">
              Assistido
            </button>
          `;
        } else if (item.officialSiteUrl) {
          actionButtons += `
            <button class="btn btn-outline btn-sm btn-open-site" data-url="${item.officialSiteUrl}">
              Site Oficial
            </button>
          `;
        }
      } else {
        actionButtons += `
          <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.6;">
            ✓ Instalado
          </button>
        `;
      }

      card.innerHTML = `
        <div class="item-main">
          <div class="item-tags">
            <span class="tag ${tagClass}">${item.importance}</span>
            <span class="tag tag-opcional">${item.category}</span>
          </div>
          <div class="item-title">${item.name}</div>
          <div class="item-desc">${item.description}</div>
        </div>
        <div class="item-status-col">
          <div class="status-badge ${statusClass}">
            <span class="status-dot ${dotClass}"></span>
            ${item.statusText}
          </div>
          <div class="item-version">${item.installedVersion || ''}</div>
        </div>
        <div class="item-actions">
          ${actionButtons}
        </div>
      `;

      // Eventos dos botões
      card.querySelector('.btn-install-auto')?.addEventListener('click', () => {
        this.runInstallation(item, 'silent');
      });

      card.querySelector('.btn-install-assist')?.addEventListener('click', () => {
        this.runInstallation(item, 'assisted');
      });

      card.querySelector('.btn-open-site')?.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        window.api.openExternal(url);
      });

      container.appendChild(card);
    });
  }

  async loadDrivers() {
    const container = document.getElementById('drivers-list-container');
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Detectando adaptadores de Vídeo, Chipset, Rede e USB...</span>
      </div>
    `;

    try {
      this.driversData = await window.api.getDrivers(this.hardwareData || {});
      this.renderDriversList();
    } catch (err) {
      container.innerHTML = `<div class="log-line text-error">Erro ao mapear drivers: ${err.message}</div>`;
    }
  }

  renderDriversList() {
    const container = document.getElementById('drivers-list-container');
    container.innerHTML = '';

    if (this.driversData.length === 0) {
      container.innerHTML = `<div class="loading-state"><span>Nenhum driver pendente.</span></div>`;
      return;
    }

    document.getElementById('dash-drivers-summary').innerText = `${this.driversData.length} componentes mapeados com sucesso.`;

    this.driversData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      let actionButtons = '';
      if (item.autoInstallable && item.downloadUrl) {
        actionButtons += `
          <button class="btn btn-primary btn-sm btn-driver-auto" data-id="${item.id}">
            Instalar / Atualizar
          </button>
        `;
      }
      if (item.officialSiteUrl) {
        actionButtons += `
          <button class="btn btn-secondary btn-sm btn-driver-site" data-url="${item.officialSiteUrl}">
            Portal Oficial
          </button>
        `;
      }

      card.innerHTML = `
        <div class="item-main">
          <div class="item-tags">
            <span class="tag tag-medio">${item.category}</span>
            <span class="tag tag-opcional">${item.vendor}</span>
          </div>
          <div class="item-title">${item.name}</div>
          <div class="item-desc"><strong>Dispositivo:</strong> ${item.detectedDevice}</div>
          <div class="item-desc">${item.description}</div>
        </div>
        <div class="item-status-col">
          <div class="status-badge status-installed">
            <span class="status-dot dot-installed"></span>
            ${item.status}
          </div>
          <div class="item-version">Versão Atual: ${item.currentVersion}</div>
        </div>
        <div class="item-actions">
          ${actionButtons}
        </div>
      `;

      card.querySelector('.btn-driver-auto')?.addEventListener('click', () => {
        this.runInstallation(item, 'assisted');
      });

      card.querySelector('.btn-driver-site')?.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        window.api.openExternal(url);
      });

      container.appendChild(card);
    });
  }

  // ================= CENTRAL DE APLICATIVOS ================= //
  bindAppsControls() {
    document.getElementById('btn-refresh-apps')?.addEventListener('click', () => {
      this.loadApps();
      this.showToast('Lista de aplicativos atualizada.', 'info');
    });

    const filterPills = document.querySelectorAll('.filter-pill[data-app-filter]');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.getAttribute('data-app-filter');
        this.renderAppsList(filter);
      });
    });
  }

  async loadApps() {
    const container = document.getElementById('apps-list-container');
    if (!container) return;
    container.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Verificando softwares instalados no Windows...</span>
      </div>
    `;

    try {
      const [curatedApps, allInstalled] = await Promise.all([
        window.api.getAppsList(),
        window.api.getAllInstalledApps()
      ]);

      this.appsData = curatedApps || [];
      this.allInstalledApps = allInstalled || [];

      const countAll = document.getElementById('count-apps-all');
      if (countAll) countAll.innerText = this.appsData.length;

      const countInstalled = document.getElementById('count-apps-installed');
      if (countInstalled) countInstalled.innerText = this.allInstalledApps.length;

      // Determinar filtro ativo
      const activePill = document.querySelector('.filter-pill[data-app-filter].active');
      const activeFilter = activePill ? activePill.getAttribute('data-app-filter') : 'all';
      this.renderAppsList(activeFilter);
    } catch (err) {
      container.innerHTML = `<div class="log-line text-error">Erro ao mapear aplicativos: ${err.message}</div>`;
    }
  }

  renderAppsList(filter = 'all') {
    const container = document.getElementById('apps-list-container');
    if (!container) return;
    container.innerHTML = '';

    let items = [];
    const isShowingAllInstalled = (filter === 'installed');

    if (isShowingAllInstalled) {
      items = this.allInstalledApps || [];
    } else if (filter === 'all') {
      items = this.appsData || [];
    } else {
      items = (this.appsData || []).filter(a => a.category === filter);
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="loading-state"><span>Nenhum aplicativo encontrado nesta categoria.</span></div>`;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'item-card';

      const iconSvg = window.LucideIcons?.[item.iconName]
        ? window.LucideIcons[item.iconName](24, 'app-card-icon')
        : (window.LucideIcons?.apps ? window.LucideIcons.apps(24, 'app-card-icon') : '');

      let actionButtons = '';
      if (item.isInstalled) {
        actionButtons += `
          <button class="btn btn-danger btn-sm btn-app-uninstall" data-id="${item.id}">
            ${window.LucideIcons?.trash2 ? window.LucideIcons.trash2(14) : ''} Desinstalar
          </button>
        `;
      } else {
        if (item.downloadUrl) {
          actionButtons += `
            <button class="btn btn-primary btn-sm btn-app-install-auto" data-id="${item.id}">
              ${window.LucideIcons?.download ? window.LucideIcons.download(14) : ''} Instalar Auto
            </button>
            <button class="btn btn-secondary btn-sm btn-app-install-assist" data-id="${item.id}">
              Assistido
            </button>
          `;
        } else if (item.officialSiteUrl) {
          actionButtons += `
            <button class="btn btn-outline btn-sm btn-app-site" data-url="${item.officialSiteUrl}">
              ${window.LucideIcons?.externalLink ? window.LucideIcons.externalLink(14) : ''} Site Oficial
            </button>
          `;
        }
      }

      const versionText = item.installedVersion
        ? (item.installedVersion.toString().startsWith('v') ? item.installedVersion : `v${item.installedVersion}`)
        : '';

      card.innerHTML = `
        <div class="app-icon-wrapper">
          ${iconSvg}
        </div>
        <div class="item-main">
          <div class="item-tags">
            <span class="tag ${isShowingAllInstalled ? 'tag-critico' : 'tag-medio'}">${item.category}</span>
          </div>
          <div class="item-title">${item.name}</div>
          <div class="item-desc">${item.description}</div>
        </div>
        <div class="item-status-col">
          <div class="status-badge ${item.isInstalled ? 'status-installed' : 'status-missing'}">
            <span class="status-dot ${item.isInstalled ? 'dot-installed' : 'dot-missing'}"></span>
            ${item.isInstalled ? (versionText ? `Instalado (${versionText})` : 'Instalado') : 'Não instalado'}
          </div>
        </div>
        <div class="item-actions">
          ${actionButtons}
        </div>
      `;

      card.querySelector('.btn-app-install-auto')?.addEventListener('click', () => {
        this.runInstallation(item, 'silent');
      });

      card.querySelector('.btn-app-install-assist')?.addEventListener('click', () => {
        this.runInstallation(item, 'assisted');
      });

      card.querySelector('.btn-app-site')?.addEventListener('click', (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        window.api.openExternal(url);
      });

      card.querySelector('.btn-app-uninstall')?.addEventListener('click', () => {
        this.uninstallAppAction(item);
      });

      container.appendChild(card);
    });
  }

  async uninstallAppAction(app) {
    const confirmed = confirm(`Tem certeza que deseja desinstalar ${app.name}?`);
    if (!confirmed) return;

    this.showToast(`Iniciando desinstalação de ${app.name}...`, 'info');
    try {
      const res = await window.api.uninstallApp(app, { quiet: false });
      this.showToast(res.message, res.success ? 'success' : 'error');
      // Recarregar lista após 3 segundos
      setTimeout(() => this.loadApps(), 3000);
    } catch (err) {
      this.showToast(`Falha ao desinstalar: ${err.message}`, 'error');
    }
  }

  // ================= INSTALAÇÃO COM MODAL ================= //
  bindInstallerEvents() {
    window.api?.onInstallProgress((data) => {
      const bar = document.getElementById('modal-progress-bar');
      const bytesLabel = document.getElementById('modal-progress-bytes');
      const percentLabel = document.getElementById('modal-progress-percent');

      if (bar) bar.style.width = `${data.percent}%`;
      if (bytesLabel) bytesLabel.innerText = `${data.receivedMB} MB / ${data.totalMB} MB`;
      if (percentLabel) percentLabel.innerText = `${data.percent}%`;
    });

    window.api?.onInstallLog((data) => {
      const logBody = document.getElementById('modal-log-output');
      if (logBody) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerText = `> ${data.message}`;
        logBody.appendChild(line);
        logBody.scrollTop = logBody.scrollHeight;
      }
    });
  }

  async runInstallation(component, mode = 'silent') {
    const modal = document.getElementById('install-modal');
    modal.style.display = 'flex';

    document.getElementById('modal-title').innerText = `Instalando: ${component.name}`;
    document.getElementById('modal-desc').innerText = `Modo: ${mode === 'silent' ? 'Silencioso Automático' : 'Assistido com Interface'}`;
    document.getElementById('modal-progress-bar').style.width = '0%';
    document.getElementById('modal-progress-bytes').innerText = '0 MB / 0 MB';
    document.getElementById('modal-progress-percent').innerText = '0%';
    document.getElementById('modal-log-output').innerHTML = '';

    try {
      const res = await window.api.installComponent(component, { mode });
      if (res.success) {
        this.showToast(`${component.name} instalado com sucesso!`, 'success');
      } else {
        this.showToast(`Instalação concluída com aviso: ${res.error || 'Código ' + res.exitCode}`, 'info');
      }
    } catch (err) {
      this.showToast(`Falha na instalação: ${err.message}`, 'error');
    } finally {
      // Recarregar status dos runtimes e fechar modal após 3 segundos
      setTimeout(() => {
        this.loadRuntimes();
        modal.style.display = 'none';
      }, 2500);
    }
  }

  async installAllMissingRuntimes() {
    const missing = this.runtimesData.filter(r => !r.isInstalled && r.downloadUrl);
    if (missing.length === 0) {
      this.showToast('Nenhum runtime ausente para instalar!', 'success');
      return;
    }

    this.showToast(`Iniciando instalação em lote de ${missing.length} componentes...`, 'info');

    for (const item of missing) {
      await this.runInstallation(item, 'silent');
    }

    this.showToast('Instalação em lote concluída com sucesso!', 'success');
  }

  // ================= OTIMIZAÇÃO RÁPIDA (1-CLIQUE) ================= //
  async runQuickOptimization() {
    this.showToast('Iniciando Otimização Rápida Completa...', 'info');

    // 1. Limpeza de RAM
    await window.api.cleanRAM();

    // 2. Limpeza de Disco
    await window.api.cleanDisk();

    // 3. Flush DNS
    await window.api.flushDNS();

    // 4. TRIM SSD
    await window.api.runTrim('C');

    this.showToast('⚡ Otimização Completa Concluída! Memória, disco e TRIM acelerados.', 'success');
    this.loadSystemData();
  }

  // ================= ANTI-MINER ================= //
  bindScannerEvents() {
    window.api?.onScanLog((msg) => {
      const output = document.getElementById('scan-log-output');
      if (output) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.innerText = `> ${msg}`;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
      }
    });
  }

  async startSecurityScan() {
    const output = document.getElementById('scan-log-output');
    output.innerHTML = '';

    const statusTitle = document.getElementById('scan-status-title');
    const statusSub = document.getElementById('scan-status-subtitle');
    const fixBtn = document.getElementById('btn-fix-threats');

    statusTitle.innerText = 'Varredura em andamento...';
    statusSub.innerText = 'Auditando processos, tarefas agendadas e políticas do Defender...';
    fixBtn.style.display = 'none';

    try {
      this.threatsData = await window.api.runScan();

      if (this.threatsData.length === 0) {
        statusTitle.innerText = '✅ Nenhuma Ameaça Detectada!';
        statusSub.innerText = 'Seu computador está livre de mineradores ocultos e trojans.';
        document.getElementById('threats-results-container').style.display = 'none';
        this.showToast('Auditoria concluída: Sistema 100% limpo!', 'success');
      } else {
        statusTitle.innerText = `⚠️ ${this.threatsData.length} Ameaça(s) Crítica(s) Encontrada(s)!`;
        statusSub.innerText = 'Clique no botão abaixo para neutralizar e restaurar a segurança.';
        fixBtn.style.display = 'inline-flex';
        this.renderThreatsList();
        this.showToast(`Atenção: ${this.threatsData.length} ameaça(s) detectada(s)!`, 'error');
      }
    } catch (err) {
      statusTitle.innerText = 'Erro na Varredura';
      statusSub.innerText = err.message;
    }
  }

  renderThreatsList() {
    const container = document.getElementById('threats-results-container');
    const list = document.getElementById('threats-list');
    list.innerHTML = '';
    container.style.display = 'block';

    this.threatsData.forEach(t => {
      const item = document.createElement('div');
      item.className = 'threat-item';
      item.innerHTML = `
        <div>
          <div class="threat-title">${t.type}: ${t.target}</div>
          <div class="threat-desc">${t.details}</div>
        </div>
      `;
      list.appendChild(item);
    });
  }

  async fixDetectedThreats() {
    this.showToast('Neutralizando ameaças e restaurando segurança...', 'info');
    const res = await window.api.fixThreats(this.threatsData);
    this.showToast(`Sucesso: ${res.fixedCount} ameaça(s) neutralizada(s)!`, 'success');

    document.getElementById('scan-status-title').innerText = 'Sistema Recuperado e Seguro!';
    document.getElementById('scan-status-subtitle').innerText = 'Todas as ameaças foram eliminadas.';
    document.getElementById('btn-fix-threats').style.display = 'none';
    document.getElementById('threats-results-container').style.display = 'none';
  }

  // ================= TOASTS ================= //
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = window.LucideIcons?.info(18) || '';
    if (type === 'success') iconSvg = window.LucideIcons?.checkCircle2(18) || '';
    if (type === 'error') iconSvg = window.LucideIcons?.xCircle(18) || '';

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ================= GAME MODE & DEFENDER ================= //

  bindGameDefenderControls() {
    // Carrega status ao entrar na tela
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.getAttribute('data-view') === 'view-gamemode') {
          this.loadGameDefenderStatus();
        }
      });
    });

    // Toggle Game Mode
    const toggleGame = document.getElementById('toggle-gamemode');
    if (toggleGame) {
      toggleGame.addEventListener('change', async () => {
        toggleGame.disabled = true;
        if (toggleGame.checked) {
          this.showToast('Aplicando otimizações de jogo...', 'info');
          const res = await window.api.enableGameMode();
          this.showToast(res.message, res.success ? 'success' : 'error');
          if (res.steps) this.renderGameSteps(res.steps);
        } else {
          this.showToast('Revertendo ao modo padrão do sistema...', 'info');
          const res = await window.api.disableGameMode();
          this.showToast(res.message, res.success ? 'success' : 'error');
          if (res.steps) this.renderGameSteps(res.steps);
        }
        await this.loadGameDefenderStatus();
        toggleGame.disabled = false;
      });
    }

    // Toggle Defender
    const toggleDef = document.getElementById('toggle-defender');
    if (toggleDef) {
      toggleDef.addEventListener('change', async () => {
        // Confirmação antes de desativar
        if (!toggleDef.checked) {
          const confirmed = confirm(
            '⚠️ ATENÇÃO: Desativar o Windows Defender deixa seu computador sem proteção em tempo real!\n\n' +
            'Faça isso APENAS durante sessões de jogo e reative ao terminar.\n\n' +
            'Deseja continuar?'
          );
          if (!confirmed) {
            toggleDef.checked = true;
            return;
          }
        }

        toggleDef.disabled = true;
        if (toggleDef.checked) {
          this.showToast('Reativando Windows Defender...', 'info');
          const res = await window.api.enableDefender();
          this.showToast(res.message, res.success ? 'success' : 'error');
        } else {
          this.showToast('Desativando proteção em tempo real...', 'info');
          const res = await window.api.disableDefender();

          if (res.tamperBlocked || res.message === 'TAMPER_BLOCKED') {
            // Reverter toggle — não foi possível desativar
            toggleDef.checked = true;
            this.showDefenderTamperAlert();
          } else if (res.message === 'DEFENDER_DISABLED') {
            this.showToast('⚠️ Windows Defender desativado. Proteção em tempo real removida. Reative após jogar!', 'info');
          } else {
            this.showToast(res.message, res.success ? 'success' : 'error');
          }
        }
        await this.loadGameDefenderStatus();
        toggleDef.disabled = false;
      });
    }
  }

  async loadGameDefenderStatus() {
    // --- Game Mode Status ---
    try {
      const gmStatus = await window.api.getGameModeStatus();
      const dot = document.getElementById('gm-status-dot-game');
      const label = document.getElementById('gm-status-text-game');
      const badge = document.getElementById('gm-plan-name');
      const toggle = document.getElementById('toggle-gamemode');

      if (dot) {
        dot.className = gmStatus.active ? 'status-dot dot-installed' : 'status-dot dot-missing';
      }
      if (label) label.textContent = gmStatus.statusText;
      if (badge) badge.textContent = gmStatus.planName;
      if (toggle) toggle.checked = gmStatus.active;
    } catch (e) {
      console.error('Erro ao carregar status do Game Mode:', e);
    }

    // --- Defender Status ---
    try {
      const defStatus = await window.api.getDefenderStatus();
      const dot = document.getElementById('gm-status-dot-defender');
      const label = document.getElementById('gm-status-text-defender');
      const toggle = document.getElementById('toggle-defender');
      const warningBox = document.getElementById('gm-defender-warning');
      const tamperBadge = document.getElementById('gm-defender-tamper-badge');

      if (dot) {
        dot.className = defStatus.enabled ? 'status-dot dot-installed' : 'status-dot dot-missing';
      }
      if (label) {
        const tamperNote = defStatus.tamperProtectionActive ? ' (Tamper Protection ativa)' : '';
        label.textContent = defStatus.statusText + tamperNote;
        label.className = `gm-status-label ${defStatus.enabled ? 'text-emerald' : 'text-rose'}`;
      }
      if (toggle) {
        toggle.checked = defStatus.enabled;
        // Com Tamper Protection ativa, bloquear toggle — só a Central de Segurança do Windows pode alterar
        if (defStatus.tamperProtectionActive) {
          toggle.disabled = true;
          toggle.title = 'Tamper Protection ativa: use a Central de Segurança do Windows para alterar';
        } else {
          toggle.disabled = false;
          toggle.title = '';
        }
      }
      if (tamperBadge) {
        tamperBadge.style.display = defStatus.tamperProtectionActive ? 'inline-flex' : 'none';
      }
      if (warningBox) {
        warningBox.style.display = defStatus.enabled ? 'none' : 'flex';
      }
    } catch (e) {
      console.error('Erro ao carregar status do Defender:', e);
    }
  }

  showDefenderTamperAlert() {
    // Modal de instrução para Tamper Protection
    const existing = document.getElementById('tamper-alert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tamper-alert-modal';
    modal.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.75);display:flex;align-items:center;
      justify-content:center;z-index:9999;
    `;
    modal.innerHTML = `
      <div style="background:var(--bg-secondary,#1a1a2e);border:1px solid var(--accent-orange,#f97316);border-radius:12px;padding:28px;max-width:500px;width:90%;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <strong style="font-size:16px;color:#f97316;">Tamper Protection Ativa</strong>
        </div>
        <p style="color:#ccc;margin-bottom:16px;line-height:1.6;">
          O <strong>Windows 11</strong> bloqueia qualquer aplicativo externo de desativar o Defender automaticamente.<br><br>
          Para desativar a proteção em tempo real manualmente, siga os passos:
        </p>
        <ol style="color:#aaa;padding-left:20px;line-height:2;margin-bottom:20px;">
          <li>Abra a <strong style="color:#fff;">Central de Segurança do Windows</strong> (ícone de escudo na barra de tarefas)</li>
          <li>Clique em <strong style="color:#fff;">"Proteção contra vírus e ameaças"</strong></li>
          <li>Clique em <strong style="color:#fff;">"Gerenciar configurações"</strong></li>
          <li>Desative <strong style="color:#fff;">"Proteção em tempo real"</strong></li>
          <li>Reative ao terminar de jogar!</li>
        </ol>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="tamper-open-defender" style="background:#0ea5e9;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;">
            Abrir Central de Segurança
          </button>
          <button id="tamper-close-btn" style="background:#374151;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;">
            Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('tamper-close-btn').addEventListener('click', () => modal.remove());
    document.getElementById('tamper-open-defender').addEventListener('click', () => {
      window.api.openExternal('windowsdefender://');
      modal.remove();
    });
  }

  renderGameSteps(steps) {
    const container = document.getElementById('gm-game-steps');
    if (!container) return;
    container.style.display = 'flex';
    container.innerHTML = steps.map(s =>
      `<div class="gm-step-line ${s.ok ? 'ok' : 'fail'}">
        <span>${s.ok ? '✅' : '❌'}</span>
        <span>${s.name}</span>
      </div>`
    ).join('');
  }
}

// Inicializar aplicação
const app = new AppController();
window.app = app;
