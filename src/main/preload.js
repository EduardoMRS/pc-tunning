const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Controle de Janela
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  // Hardware & Sistema
  getHardwareInfo: () => ipcRenderer.invoke('hardware:get-info'),

  // Drivers
  getDrivers: (hardwareInfo) => ipcRenderer.invoke('drivers:get-list', hardwareInfo),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),

  // Game Runtimes & Commons
  getRuntimes: () => ipcRenderer.invoke('runtimes:get-list'),

  // Download & Instalação
  installComponent: (component, options) => ipcRenderer.invoke('installer:install', component, options),
  onInstallProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('installer:progress', handler);
    return () => ipcRenderer.removeListener('installer:progress', handler);
  },
  onInstallLog: (callback) => {
    const handler = (event, msg) => callback(msg);
    ipcRenderer.on('installer:log', handler);
    return () => ipcRenderer.removeListener('installer:log', handler);
  },

  // Otimizador
  runTrim: (drive) => ipcRenderer.invoke('optimizer:trim', drive),
  cleanRAM: () => ipcRenderer.invoke('optimizer:ram'),
  cleanDisk: () => ipcRenderer.invoke('optimizer:disk'),
  flushDNS: () => ipcRenderer.invoke('optimizer:dns'),

  // Anti-Miner
  runScan: () => ipcRenderer.invoke('scanner:scan'),
  fixThreats: (threats) => ipcRenderer.invoke('scanner:fix', threats),
  onScanLog: (callback) => {
    const handler = (event, msg) => callback(msg);
    ipcRenderer.on('scanner:log', handler);
    return () => ipcRenderer.removeListener('scanner:log', handler);
  },

  // Windows Defender
  getDefenderStatus: () => ipcRenderer.invoke('defender:status'),
  enableDefender: () => ipcRenderer.invoke('defender:enable'),
  disableDefender: () => ipcRenderer.invoke('defender:disable'),

  // Game Performance Mode
  getGameModeStatus: () => ipcRenderer.invoke('gamemode:status'),
  enableGameMode: () => ipcRenderer.invoke('gamemode:enable'),
  disableGameMode: () => ipcRenderer.invoke('gamemode:disable'),

  // Central de Aplicativos
  getAppsList: () => ipcRenderer.invoke('apps:get-list'),
  getAllInstalledApps: () => ipcRenderer.invoke('apps:get-all-installed'),
  uninstallApp: (app, options) => ipcRenderer.invoke('apps:uninstall', app, options)
});
