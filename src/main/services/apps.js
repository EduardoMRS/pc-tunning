/**
 * Application Manager Service (Central de Aplicativos)
 * Gerencia catálogo, detecção de instalação, download/instalação e desinstalação
 * de softwares essenciais (Brave, Chrome, WinRAR, VS Code, Docker, Git, etc.)
 */

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const installerService = require('./installer');

function execPowerShell(command) {
  return new Promise((resolve) => {
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}; exit 0"`;
    exec(fullCmd, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        success: Boolean(stdout && stdout.trim()),
        output: stdout ? stdout.trim() : '',
        error: stderr ? stderr.trim() : (error ? error.message : null)
      });
    });
  });
}

class AppsService {
  constructor() {
    this.appsCatalog = [
      // ================= NAVEGADORES =================
      {
        id: 'app-brave',
        name: 'Brave Browser',
        category: 'Navegadores',
        iconName: 'shield',
        description: 'Navegador focado em privacidade, velocidade e bloqueio nativo de anúncios e rastreadores.',
        downloadUrl: 'https://laptop-updates.brave.com/latest/winx64',
        installerArgs: ['/silent', '/install'],
        type: 'executable',
        registryPattern: /^Brave$/i
      },
      {
        id: 'app-chrome',
        name: 'Google Chrome',
        category: 'Navegadores',
        iconName: 'globe',
        description: 'O navegador mais popular do mundo, com sincronização em nuvem e milhares de extensões.',
        downloadUrl: 'https://dl.google.com/chrome/install/standalone/service/ChromeStandaloneSetup64.exe',
        installerArgs: ['/silent', '/install'],
        type: 'executable',
        registryPattern: /^Google Chrome$/i
      },

      // ================= UTILIDADES =================
      {
        id: 'app-winrar',
        name: 'WinRAR',
        category: 'Utilidades',
        iconName: 'folder-archive',
        description: 'Poderoso compactador e descompactador de arquivos RAR, ZIP e 7Z com criptografia.',
        downloadUrl: 'https://www.win-rar.com/fileadmin/winrar-versions/winrar/winrar-x64-701br.exe',
        installerArgs: ['/s'],
        type: 'executable',
        registryPattern: /WinRAR/i
      },
      {
        id: 'app-7zip',
        name: '7-Zip',
        category: 'Utilidades',
        iconName: 'archive',
        description: 'Compactador de código aberto de altíssima taxa de compressão e formato 7z nativo.',
        downloadUrl: 'https://www.7-zip.org/a/7z2408-x64.exe',
        installerArgs: ['/S'],
        type: 'executable',
        registryPattern: /^7-Zip/i
      },

      // ================= DEV & FERRAMENTAS =================
      {
        id: 'app-vscode',
        name: 'Visual Studio Code',
        category: 'Desenvolvimento',
        iconName: 'code-2',
        description: 'Editor de código-fonte profissional da Microsoft com depurador, controle Git integrado e suporte a extensões.',
        downloadUrl: 'https://update.code.visualstudio.com/latest/win32-x64-user/stable',
        installerArgs: ['/VERYSILENT', '/NORESTART', '/MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath'],
        type: 'executable',
        registryPattern: /Visual Studio Code/i
      },
      {
        id: 'app-git',
        name: 'Git for Windows',
        category: 'Desenvolvimento',
        iconName: 'git-branch',
        description: 'Sistema de controle de versão distribuído mais utilizado no mundo, essencial para programadores.',
        downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe',
        installerArgs: ['/VERYSILENT', '/NORESTART'],
        type: 'executable',
        registryPattern: /^Git$/i
      },
      {
        id: 'app-nodejs',
        name: 'Node.js LTS',
        category: 'Desenvolvimento',
        iconName: 'server',
        description: 'Ambiente de execução JavaScript assíncrono orientado a eventos, acompanhado do gerenciador NPM.',
        downloadUrl: 'https://nodejs.org/dist/v22.11.0/node-v22.11.0-x64.msi',
        installerArgs: ['/quiet', '/norestart'],
        type: 'msi',
        registryPattern: /^Node\.js/i
      },
      {
        id: 'app-docker',
        name: 'Docker Desktop',
        category: 'Desenvolvimento',
        iconName: 'container',
        description: 'Ambiente líder para criação, compartilhamento e execução de contêineres e microsserviços.',
        downloadUrl: 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe',
        installerArgs: ['install', '--quiet', '--accept-license'],
        type: 'executable',
        officialSiteUrl: 'https://www.docker.com/products/docker-desktop/',
        registryPattern: /Docker Desktop/i
      },

      // ================= GAMER & SOCIAL =================
      {
        id: 'app-discord',
        name: 'Discord',
        category: 'Gamer & Chat',
        iconName: 'message-square',
        description: 'Plataforma oficial de comunicação por voz, vídeo e texto para comunidades e equipes gamer.',
        downloadUrl: 'https://discord.com/api/download?platform=win',
        installerArgs: [],
        type: 'executable',
        registryPattern: /^Discord$/i
      },
      {
        id: 'app-steam',
        name: 'Steam',
        category: 'Gamer & Chat',
        iconName: 'gamepad-2',
        description: 'A maior plataforma de distribuição digital de jogos para PC do mundo.',
        downloadUrl: 'https://cdn.cloudflare.steamstatic.com/client/installer/SteamSetup.exe',
        installerArgs: ['/S'],
        type: 'executable',
        registryPattern: /^Steam$/i
      },
      {
        id: 'app-epic',
        name: 'Epic Games Launcher',
        category: 'Gamer & Chat',
        iconName: 'zap',
        description: 'Plataforma da Epic Games com jogos exclusivos, Fortnite, e títulos gratuitos toda semana.',
        downloadUrl: 'https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/EpicGamesLauncherInstaller.msi',
        installerArgs: ['/quiet', '/norestart'],
        type: 'msi',
        officialSiteUrl: 'https://store.epicgames.com/pt-BR/download',
        registryPattern: /Epic Games Launcher/i
      }
    ];
  }

  async getAppsWithStatus() {
    const installed = await this._scanInstalledApps();

    return this.appsCatalog.map(app => {
      let isInstalled = false;
      let installedVersion = null;
      let uninstallString = null;
      let quietUninstallString = null;

      for (const item of installed) {
        if (app.registryPattern.test(item.DisplayName)) {
          isInstalled = true;
          installedVersion = item.DisplayVersion || 'Instalado';
          uninstallString = item.UninstallString || null;
          quietUninstallString = item.QuietUninstallString || null;
          break;
        }
      }

      return {
        ...app,
        isInstalled,
        installedVersion,
        uninstallString,
        quietUninstallString
      };
    });
  }

  async getAllInstalledApps() {
    const list = await this._scanInstalledApps();
    // Ordenar alfabeticamente por DisplayName
    list.sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));

    return list.map((item, index) => ({
      id: `system-app-${index}`,
      name: item.DisplayName,
      category: 'Instalado no Windows',
      iconName: 'apps',
      description: item.Publisher ? `Fornecedor: ${item.Publisher}` : 'Software registrado no sistema Windows.',
      installedVersion: item.DisplayVersion || 'Instalado',
      isInstalled: true,
      uninstallString: item.UninstallString,
      quietUninstallString: item.QuietUninstallString
    }));
  }

  async _scanInstalledApps() {
    const cmd = `Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Select-Object DisplayName, DisplayVersion, Publisher, UninstallString, QuietUninstallString | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const list = [];
    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const it of items) {
          if (it.DisplayName) list.push(it);
        }
      } catch (e) {}
    }
    return list;
  }

  async uninstallApp(app, options = {}) {
    const { quiet = false } = options;
    const rawCmd = quiet && app.quietUninstallString ? app.quietUninstallString : app.uninstallString;

    if (!rawCmd) {
      throw new Error(`Não foi encontrado o comando de desinstalação para ${app.name} no Registro.`);
    }

    // Executar o comando de desinstalação
    const runCmd = `Start-Process cmd.exe -ArgumentList '/c', "${rawCmd.replace(/"/g, '\"')}" -Verb RunAs -Wait`;
    const res = await execPowerShell(runCmd);

    return {
      success: res.success,
      message: res.success
        ? `Desinstalação de ${app.name} concluída ou iniciada.`
        : `Erro ao desinstalar: ${res.error}`
    };
  }
}

module.exports = new AppsService();
