/**
 * Gaming Commons & Runtimes Detection and Catalog
 * Gerencia os componentes mais vitais para jogos no Windows:
 * - Visual C++ Redistributable All-in-One (2005 - 2022)
 * - DirectX End-User Runtimes (June 2010 Offline Setup)
 * - Microsoft .NET Desktop Runtime (8.0 e 9.0)
 * - OpenAL (Open Audio Library)
 * - Vulkan Runtime Loader
 * - Microsoft XNA Framework 4.0 Refresh
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function execPowerShell(command) {
  return new Promise((resolve) => {
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    exec(fullCmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stdout || '', error: stderr || error.message });
      } else {
        resolve({ success: true, output: stdout.trim(), error: null });
      }
    });
  });
}

class RuntimesService {
  constructor() {
    this.runtimesCatalog = [
      {
        id: 'vc-2015-2022-x64',
        name: 'Visual C++ 2015-2022 Redistributable (x64)',
        category: 'Visual C++',
        importance: 'Crítico',
        description: 'Essencial para 99% dos jogos modernos (Unreal Engine, Unity, jogos Steam/Epic/GamePass). Corrige erro VCRUNTIME140.dll e MSVCP140.dll.',
        downloadUrl: 'https://aka.ms/vs/17/release/vc_redist.x64.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2015-2022 Redistributable (x64)',
        matchPattern: /Visual C\+\+ (2015-2022|v14).*x64/i
      },
      {
        id: 'vc-2015-2022-x86',
        name: 'Visual C++ 2015-2022 Redistributable (x86)',
        category: 'Visual C++',
        importance: 'Crítico',
        description: 'Necessário para launchers, emuladores e jogos de 32-bits que rodam no Windows 64-bits.',
        downloadUrl: 'https://aka.ms/vs/17/release/vc_redist.x86.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2015-2022 Redistributable (x86)',
        matchPattern: /Visual C\+\+ (2015-2022|v14).*x86/i
      },
      {
        id: 'vc-2013-x64',
        name: 'Visual C++ 2013 Redistributable (x64)',
        category: 'Visual C++',
        importance: 'Alto',
        description: 'Exigido por dezenas de jogos famosos de 2013 a 2017 (GTA V, Battlefield 4, The Witcher 3). Corrige erro MSVCR120.dll.',
        downloadUrl: 'https://download.microsoft.com/download/2/E/6/2E61CFA4-993B-4DD4-91DA-3737CD5CD6E3/vcredist_x64.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2013 Redistributable (x64)',
        matchPattern: /Visual C\+\+ 2013.*x64/i
      },
      {
        id: 'vc-2013-x86',
        name: 'Visual C++ 2013 Redistributable (x86)',
        category: 'Visual C++',
        importance: 'Alto',
        description: 'Necessário para clientes de jogos e mods que utilizam compilação de 32-bits.',
        downloadUrl: 'https://download.microsoft.com/download/2/E/6/2E61CFA4-993B-4DD4-91DA-3737CD5CD6E3/vcredist_x86.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2013 Redistributable (x86)',
        matchPattern: /Visual C\+\+ 2013.*x86/i
      },
      {
        id: 'vc-2012-x64',
        name: 'Visual C++ 2012 Redistributable (x64)',
        category: 'Visual C++',
        importance: 'Médio',
        description: 'Corrige erros de falta de MSVCR110.dll e inicialização com código 0xc000007b.',
        downloadUrl: 'https://download.microsoft.com/download/1/6/B/16B037FA-FFC0-4FF2-BB34-45E15AEADD6E/vcredist_x64.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2012 Redistributable (x64)',
        matchPattern: /Visual C\+\+ 2012.*x64/i
      },
      {
        id: 'vc-2010-x86',
        name: 'Visual C++ 2010 Redistributable (x86)',
        category: 'Visual C++',
        importance: 'Médio',
        description: 'Corrige falhas ao iniciar jogos clássicos da era DirectX 9 e 10 (falta de MSVCR100.dll).',
        downloadUrl: 'https://download.microsoft.com/download/5/B/C/5BC5DBB3-652D-4DCE-B14A-475AB85EEF6E/vcredist_x86.exe',
        installerArgs: ['/q', '/norestart'],
        type: 'executable',
        checkKey: 'Microsoft Visual C++ 2010 Redistributable (x86)',
        matchPattern: /Visual C\+\+ 2010.*x86/i
      },
      {
        id: 'directx-june-2010',
        name: 'DirectX End-User Runtimes (June 2010 Offline Package)',
        category: 'DirectX',
        importance: 'Crítico',
        description: 'Instala todas as DLLs legadas do DirectX 9.0c, 10 e 11 (d3dx9_43.dll, d3dx10_43.dll, d3dx11_43.dll, XInput1_3.dll) que não vêm de fábrica no Windows 10/11.',
        downloadUrl: 'https://download.microsoft.com/download/8/4/A/84A35BF1-DAFE-4AE8-82AF-AD2AE20B6B14/directx_Jun2010_redist.exe',
        installerArgs: ['/silent'],
        type: 'directx-package',
        customCheck: 'checkDirectXLegacy'
      },
      {
        id: 'dotnet-desktop-8',
        name: 'Microsoft .NET Desktop Runtime 8.0 (x64)',
        category: '.NET Framework',
        importance: 'Alto',
        description: 'Necessário para softwares de periféricos (Logitech G Hub, Razer Synapse), gerenciadores de mods e launchers modernos.',
        downloadUrl: 'https://aka.ms/dotnet/8.0/windowsdesktop-runtime-win-x64.exe',
        installerArgs: ['/install', '/quiet', '/norestart'],
        type: 'executable',
        customCheck: 'checkDotnet8'
      },
      {
        id: 'openal-soft',
        name: 'OpenAL (Open Audio Library 2.0.7)',
        category: 'Áudio & Runtimes',
        importance: 'Médio',
        description: 'Motor de áudio 3D posicional usado por títulos clássicos e de simulação (STALKER, Amnesia, Minecraft clássico, Dirt).',
        downloadUrl: 'https://www.openal.org/downloads/oalinst.zip',
        installerArgs: ['/s'],
        type: 'zip-installer',
        innerExe: 'oalinst.exe',
        customCheck: 'checkOpenAL'
      },
      {
        id: 'vulkan-runtime',
        name: 'Vulkan Runtime (Khronos Group)',
        category: 'APIs Gráficas',
        importance: 'Alto',
        description: 'Loader da API gráfica Vulkan de baixo nível para jogos com alto framerate (Doom Eternal, Baldur\'s Gate 3, No Man\'s Sky, emuladores RPCS3/Yuzu).',
        downloadUrl: null, // Geralmente vem com o driver de vídeo, mas checamos a presença do loader
        officialSiteUrl: 'https://vulkan.lunarg.com/sdk/home',
        type: 'web',
        customCheck: 'checkVulkan'
      },
      {
        id: 'xna-framework-4',
        name: 'Microsoft XNA Framework 4.0 Refresh',
        category: 'Jogos Indie',
        importance: 'Opcional',
        description: 'Necessário para clássicos independentes como Terraria (versões clássicas), Bastion, FEZ, Dust: An Elysian Tail.',
        downloadUrl: 'https://download.microsoft.com/download/A/C/2/AC2C903B-7082-414C-A560-CD388E69F17D/xnafx40_redist.msi',
        installerArgs: ['/quiet', '/norestart'],
        type: 'msi',
        checkKey: 'Microsoft XNA Framework Redistributable 4.0 Refresh',
        matchPattern: /XNA Framework/i
      }
    ];
  }

  async getAllRuntimesStatus() {
    if (process.platform !== 'win32') {
      // Para Linux e macOS, retornamos status compatível
      return this.runtimesCatalog.map(item => ({
        ...item,
        isInstalled: false,
        statusText: 'Não aplicável para este Sistema Operacional',
        statusColor: 'text-gray-400'
      }));
    }

    // 1. Obter lista de programas instalados no Registro
    const installedSoftware = await this._getInstalledPrograms();

    // 2. Verificar cada runtime
    const results = [];
    for (const item of this.runtimesCatalog) {
      let isInstalled = false;
      let installedVersion = 'N/A';

      if (item.customCheck === 'checkDirectXLegacy') {
        const dxCheck = this._checkDirectXFiles();
        isInstalled = dxCheck.isInstalled;
        installedVersion = dxCheck.details;
      } else if (item.customCheck === 'checkOpenAL') {
        const alCheck = this._checkOpenALFiles(installedSoftware);
        isInstalled = alCheck.isInstalled;
        installedVersion = alCheck.details;
      } else if (item.customCheck === 'checkVulkan') {
        const vkCheck = this._checkVulkanFiles();
        isInstalled = vkCheck.isInstalled;
        installedVersion = vkCheck.details;
      } else if (item.customCheck === 'checkDotnet8') {
        const dotCheck = this._checkDotnet8(installedSoftware);
        isInstalled = dotCheck.isInstalled;
        installedVersion = dotCheck.details;
      } else {
        // Checagem por casamento de padrão no Registro
        const found = installedSoftware.find(sw => {
          if (item.matchPattern && item.matchPattern.test(sw.DisplayName)) return true;
          if (item.checkKey && sw.DisplayName.toLowerCase().includes(item.checkKey.toLowerCase())) return true;
          return false;
        });

        if (found) {
          isInstalled = true;
          installedVersion = found.DisplayVersion || 'Instalado';
        }
      }

      results.push({
        id: item.id,
        name: item.name,
        category: item.category,
        importance: item.importance,
        description: item.description,
        downloadUrl: item.downloadUrl,
        officialSiteUrl: item.officialSiteUrl || null,
        installerArgs: item.installerArgs || [],
        type: item.type,
        innerExe: item.innerExe || null,
        isInstalled,
        installedVersion,
        statusText: isInstalled ? 'Instalado & Atualizado' : 'Ausente (Recomendado Instalar)',
        statusColor: isInstalled ? 'text-emerald-400' : 'text-amber-400'
      });
    }

    return results;
  }

  async _getInstalledPrograms() {
    const cmd = `Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Select-Object DisplayName, DisplayVersion | Where-Object { $_.DisplayName } | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const list = [];

    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
          if (item.DisplayName) list.push(item);
        }
      } catch (e) {}
    }

    return list;
  }

  _checkDirectXFiles() {
    const sys32 = path.join(process.env.WINDIR || 'C:\\Windows', 'System32');
    const sysWow64 = path.join(process.env.WINDIR || 'C:\\Windows', 'SysWOW64');

    const keyFiles = ['d3dx9_43.dll', 'd3dx10_43.dll', 'd3dx11_43.dll', 'xinput1_3.dll'];
    let foundCount = 0;

    for (const file of keyFiles) {
      const p1 = path.join(sys32, file);
      const p2 = path.join(sysWow64, file);
      if (fs.existsSync(p1) || fs.existsSync(p2)) {
        foundCount++;
      }
    }

    const isInstalled = foundCount === keyFiles.length;
    return {
      isInstalled,
      details: isInstalled ? 'DirectX 9/10/11 Completo' : `${foundCount}/${keyFiles.length} DLLs encontradas`
    };
  }

  _checkOpenALFiles(installedSoftware) {
    const sys32 = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'OpenAL32.dll');
    const sysWow64 = path.join(process.env.WINDIR || 'C:\\Windows', 'SysWOW64', 'OpenAL32.dll');
    const inRegistry = installedSoftware.some(sw => sw.DisplayName.toLowerCase().includes('openal'));

    const isInstalled = fs.existsSync(sys32) || fs.existsSync(sysWow64) || inRegistry;
    return {
      isInstalled,
      details: isInstalled ? 'OpenAL 3D Audio Instalado' : 'Ausente'
    };
  }

  _checkVulkanFiles() {
    const sys32 = path.join(process.env.WINDIR || 'C:\\Windows', 'System32', 'vulkan-1.dll');
    const sysWow64 = path.join(process.env.WINDIR || 'C:\\Windows', 'SysWOW64', 'vulkan-1.dll');

    const isInstalled = fs.existsSync(sys32) || fs.existsSync(sysWow64);
    return {
      isInstalled,
      details: isInstalled ? 'Vulkan Runtime Loader Detectado' : 'Ausente'
    };
  }

  _checkDotnet8(installedSoftware = []) {
    const desktopShared = 'C:\\Program Files\\dotnet\\shared\\Microsoft.WindowsDesktop.App';
    if (fs.existsSync(desktopShared)) {
      try {
        const subdirs = fs.readdirSync(desktopShared);
        const match = subdirs.find(d => d.startsWith('8.'));
        if (match) {
          return { isInstalled: true, details: `v${match} (Desktop Runtime)` };
        }
      } catch (e) {}
    }

    const regMatch = installedSoftware.find(sw => /\.NET.*Runtime.*8\./i.test(sw.DisplayName));
    if (regMatch) {
      return { isInstalled: true, details: regMatch.DisplayVersion || 'v8.0' };
    }

    return { isInstalled: false, details: 'Ausente' };
  }
}

module.exports = new RuntimesService();
