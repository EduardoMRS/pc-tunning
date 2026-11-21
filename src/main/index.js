const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const hardwareService = require('./services/hardware');
const driversService = require('./services/drivers');
const runtimesService = require('./services/runtimes');
const installerService = require('./services/installer');
const optimizerService = require('./services/optimizer');
const scannerService = require('./services/scanner');
const defenderGameService = require('./services/defender-game');
const appsService = require('./services/apps');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 680,
    frame: false, // Frame moderno customizado com controles de janela integrados
    backgroundColor: '#0B0E14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Abrir links externos no navegador padrão do SO
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ================= IPC HANDLERS ================= //

// Controle de Janela
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('app:open-external', (event, url) => {
  if (url) shell.openExternal(url);
});

// Hardware
ipcMain.handle('hardware:get-info', async () => {
  return await hardwareService.getAllHardwareInfo();
});

// Drivers
ipcMain.handle('drivers:get-list', async (event, hardwareInfo) => {
  return driversService.getMatchedDrivers(hardwareInfo);
});

// Game Commons / Runtimes
ipcMain.handle('runtimes:get-list', async () => {
  return await runtimesService.getAllRuntimesStatus();
});

// Download & Instalação
ipcMain.handle('installer:install', async (event, component, options) => {
  try {
    const result = await installerService.installComponent(
      component,
      options,
      (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('installer:progress', { componentId: component.id, ...progress });
        }
      },
      (logMsg) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('installer:log', { componentId: component.id, message: logMsg });
        }
      }
    );
    return result;
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Otimizador
ipcMain.handle('optimizer:trim', async (event, drive) => {
  return await optimizerService.runTrim(drive || 'C');
});

ipcMain.handle('optimizer:ram', async () => {
  return await optimizerService.cleanRAM();
});

ipcMain.handle('optimizer:disk', async () => {
  return await optimizerService.cleanDiskTemp();
});

ipcMain.handle('optimizer:dns', async () => {
  return await optimizerService.flushDNS();
});

// Scanner Anti-Miner
ipcMain.handle('scanner:scan', async () => {
  return await scannerService.runFullScan((msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scanner:log', msg);
    }
  });
});

ipcMain.handle('scanner:fix', async (event, threats) => {
  return await scannerService.fixThreats(threats, (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('scanner:log', msg);
    }
  });
});

// =============================================
// Defender & Game Mode
// =============================================
ipcMain.handle('defender:status', async () => {
  return await defenderGameService.getDefenderStatus();
});

ipcMain.handle('defender:enable', async () => {
  return await defenderGameService.enableDefender();
});

ipcMain.handle('defender:disable', async () => {
  return await defenderGameService.disableDefender();
});

ipcMain.handle('gamemode:status', async () => {
  return await defenderGameService.getGameModeStatus();
});

ipcMain.handle('gamemode:enable', async () => {
  return await defenderGameService.enableGameMode();
});

ipcMain.handle('gamemode:disable', async () => {
  return await defenderGameService.disableGameMode();
});

// =============================================
// Central de Aplicativos (Instalação e Desinstalação)
// =============================================
ipcMain.handle('apps:get-list', async () => {
  return await appsService.getAppsWithStatus();
});

ipcMain.handle('apps:get-all-installed', async () => {
  return await appsService.getAllInstalledApps();
});

ipcMain.handle('apps:uninstall', async (event, app, options) => {
  return await appsService.uninstallApp(app, options);
});
