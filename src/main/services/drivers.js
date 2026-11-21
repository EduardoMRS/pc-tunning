/**
 * Driver Catalog & Management Service
 * Mapeia hardware detectado para drivers oficiais de GPU, CPU/Chipset, Rede e USB.
 */

const { shell } = require('electron');

class DriversService {
  constructor() {
    this.catalog = {
      // Drivers de Placa de Vídeo (GPU)
      gpu: {
        nvidia: {
          id: 'driver-gpu-nvidia',
          name: 'NVIDIA GeForce Game Ready & Studio Driver',
          category: 'Vídeo (GPU)',
          vendor: 'NVIDIA Corporation',
          description: 'Drivers oficiais de alto desempenho com suporte a DLSS, Reflex, Ray Tracing e otimizações para os jogos mais recentes.',
          autoInstallable: true,
          downloadUrl: 'https://us.download.nvidia.com/GFE/GFEClient/3.28.0.417/GeForce_Experience_v3.28.0.417.exe',
          installerArgs: ['/s'],
          officialSiteUrl: 'https://www.nvidia.com.br/Download/index.aspx?lang=br',
          type: 'executable'
        },
        amd: {
          id: 'driver-gpu-amd',
          name: 'AMD Software: Adrenalin Edition (Auto-Detect)',
          category: 'Vídeo (GPU)',
          vendor: 'Advanced Micro Devices, Inc.',
          description: 'Instalador oficial da AMD que analisa sua placa Radeon (série RX) e instala os drivers mais estáveis, FSR 3 e utilitários.',
          autoInstallable: true,
          downloadUrl: 'https://drivers.amd.com/drivers/installer/amd-software-adrenalin-edition-auto-detect-install.exe',
          installerArgs: ['-install'],
          officialSiteUrl: 'https://www.amd.com/pt/support/download/drivers.html',
          type: 'executable'
        },
        intel: {
          id: 'driver-gpu-intel',
          name: 'Intel Arc & Iris Xe Graphics Driver',
          category: 'Vídeo (GPU)',
          vendor: 'Intel Corporation',
          description: 'Drivers oficiais de gráficos Intel com suporte a XeSS, DirectX 12 Ultimate e aceleração de vídeo.',
          autoInstallable: true,
          downloadUrl: 'https://downloadmirror.intel.com/838977/Intel-Driver-and-Support-Assistant-Installer.exe',
          installerArgs: ['/quiet', '/norestart'],
          officialSiteUrl: 'https://www.intel.com.br/content/www/br/pt/support/detect.html',
          type: 'executable'
        }
      },

      // Drivers de Processador & Chipset (Placa-mãe)
      chipset: {
        amd: {
          id: 'driver-chipset-amd',
          name: 'Drivers de Chipset AMD Ryzen (AM4 / AM5)',
          category: 'Processador & Chipset',
          vendor: 'AMD',
          description: 'Otimiza o plano de energia Ryzen, controle de tensão, barramento PCIe 4.0/5.0 e portas USB integradas à placa-mãe.',
          autoInstallable: true,
          downloadUrl: 'https://drivers.amd.com/drivers/installer/amd-software-adrenalin-edition-auto-detect-install.exe',
          installerArgs: ['-install'],
          officialSiteUrl: 'https://www.amd.com/pt/support/download/drivers.html',
          type: 'executable'
        },
        intel: {
          id: 'driver-chipset-intel',
          name: 'Intel Chipset Device Software (INF Update Utility)',
          category: 'Processador & Chipset',
          vendor: 'Intel Corporation',
          description: 'Configura os componentes essenciais da placa-mãe Intel (LPC, PCIe, SMBus, I2C, Serial IO e gerenciamento de energia).',
          autoInstallable: true,
          downloadUrl: 'https://downloadmirror.intel.com/838977/Intel-Driver-and-Support-Assistant-Installer.exe',
          installerArgs: ['/quiet', '/norestart'],
          officialSiteUrl: 'https://www.intel.com.br/content/www/br/pt/download-center/home.html',
          type: 'executable'
        }
      },

      // Drivers de Rede (Ethernet, Wi-Fi e Bluetooth)
      network: {
        realtek: {
          id: 'driver-net-realtek',
          name: 'Realtek PCIe GbE / 2.5GbE Gaming LAN Driver',
          category: 'Rede & Conectividade',
          vendor: 'Realtek Semiconductor',
          description: 'Driver oficial de alto desempenho para placas de rede Realtek (RTL8111, RTL8125, RTL8153) para menor latência e estabilidade.',
          autoInstallable: false,
          downloadUrl: null,
          officialSiteUrl: 'https://www.realtek.com/en/component/zoo/category/network-interface-controllers-10-100-1000m-gigabit-ethernet-pci-express-software',
          type: 'web'
        },
        intel: {
          id: 'driver-net-intel',
          name: 'Intel Ethernet Connection & Killer Wi-Fi Suite',
          category: 'Rede & Conectividade',
          vendor: 'Intel / Killer Networking',
          description: 'Pacote de drivers oficiais para adaptadores de rede Intel (I219-V, I225-V, Wi-Fi 6 AX200/AX210/BE200).',
          autoInstallable: true,
          downloadUrl: 'https://downloadmirror.intel.com/838977/Intel-Driver-and-Support-Assistant-Installer.exe',
          installerArgs: ['/quiet', '/norestart'],
          officialSiteUrl: 'https://www.intel.com.br/content/www/br/pt/download-center/home.html',
          type: 'executable'
        }
      },

      // Controladoras USB
      usb: {
        xhci: {
          id: 'driver-usb-xhci',
          name: 'Atualização e Diagnóstico de Controladoras USB 3.0/3.1 xHCI',
          category: 'Controladoras USB',
          vendor: 'Microsoft / Fabricantes',
          description: 'Verifica a integridade das portas USB 3.0/3.1/3.2 e soluciona desconexões de periféricos, fones e volantes em jogos.',
          autoInstallable: false,
          downloadUrl: null,
          officialSiteUrl: 'https://support.microsoft.com/pt-br/windows/atualizar-drivers-manualmente-no-windows-ec62f46c-ff14-c91d-eead-d7126dc1f7b6',
          type: 'web'
        }
      }
    };
  }

  getMatchedDrivers(hardwareInfo) {
    const list = [];

    // 1. Mapeamento de Placa de Vídeo (GPU)
    const gpus = hardwareInfo.gpu || [];
    for (const gpu of gpus) {
      const brand = (gpu.brand || '').toLowerCase();
      let matched = null;

      if (brand === 'nvidia') {
        matched = { ...this.catalog.gpu.nvidia };
      } else if (brand === 'amd') {
        matched = { ...this.catalog.gpu.amd };
      } else if (brand === 'intel') {
        matched = { ...this.catalog.gpu.intel };
      }

      if (matched) {
        matched.detectedDevice = gpu.name;
        matched.currentVersion = gpu.version;
        matched.provider = gpu.provider;
        matched.status = 'Pronto para Atualização / Verificação';
        list.push(matched);
      }
    }

    // 2. Mapeamento de Chipset / CPU
    const cpu = hardwareInfo.cpu || {};
    const cpuBrand = (cpu.brand || '').toLowerCase();
    if (cpuBrand === 'amd') {
      const matched = { ...this.catalog.chipset.amd };
      matched.detectedDevice = cpu.name;
      matched.currentVersion = 'Drivers Nativos do SO';
      matched.status = 'Recomendado para Máximo Desempenho';
      list.push(matched);
    } else if (cpuBrand === 'intel') {
      const matched = { ...this.catalog.chipset.intel };
      matched.detectedDevice = cpu.name;
      matched.currentVersion = 'Drivers Nativos do SO';
      matched.status = 'Recomendado para Máximo Desempenho';
      list.push(matched);
    }

    // 3. Mapeamento de Adaptadores de Rede
    const networks = hardwareInfo.network || [];
    for (const net of networks) {
      const netBrand = (net.brand || '').toLowerCase();
      let matched = null;

      if (netBrand.includes('realtek')) {
        matched = { ...this.catalog.network.realtek };
      } else if (netBrand.includes('intel') || netBrand.includes('killer')) {
        matched = { ...this.catalog.network.intel };
      }

      if (matched && !list.find(item => item.id === matched.id)) {
        matched.detectedDevice = net.name;
        matched.currentVersion = net.version;
        matched.status = 'Ativo no Sistema';
        list.push(matched);
      }
    }

    // 4. Mapeamento de USB
    const usbs = hardwareInfo.usb || [];
    if (usbs.length > 0) {
      const matched = { ...this.catalog.usb.xhci };
      matched.detectedDevice = `${usbs.length} Controladoras xHCI/USB detectadas`;
      matched.currentVersion = usbs[0]?.version || 'Padrão Windows';
      matched.status = 'Operacional';
      list.push(matched);
    }

    return list;
  }

  openOfficialSite(url) {
    if (url) {
      shell.openExternal(url);
    }
  }
}

module.exports = new DriversService();
