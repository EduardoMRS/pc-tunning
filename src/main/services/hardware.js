/**
 * Hardware Detection Service
 * Detecta componentes de hardware (CPU, GPU, RAM, Discos, Rede, USB)
 * Suporta Windows e arquitetura preparada para Linux e macOS.
 */

const os = require('os');
const { exec } = require('child_process');

function execPowerShell(command) {
  return new Promise((resolve) => {
    // Usamos powershell com codificação UTF-8
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

class HardwareService {
  constructor() {
    this.platform = process.platform; // 'win32', 'linux', 'darwin'
  }

  async getAllHardwareInfo() {
    if (this.platform === 'win32') {
      return await this._getWindowsHardware();
    } else if (this.platform === 'linux') {
      return await this._getLinuxHardware();
    } else if (this.platform === 'darwin') {
      return await this._getMacHardware();
    }
    return this._getFallbackHardware();
  }

  async _getWindowsHardware() {
    const results = {
      platform: 'win32',
      cpu: await this._getWindowsCPU(),
      gpu: await this._getWindowsGPU(),
      ram: this._getSystemRAM(),
      disks: await this._getWindowsDisks(),
      network: await this._getWindowsNetwork(),
      usb: await this._getWindowsUSB()
    };
    return results;
  }

  async _getWindowsCPU() {
    // Leitura rápida direto do Registro do Windows
    const cmd = `Get-ItemProperty -Path 'HKLM:\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0' -ErrorAction SilentlyContinue | Select-Object -Property ProcessorNameString, VendorIdentifier | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    let name = os.cpus()[0]?.model || 'Processador Desconhecido';
    let vendor = 'Desconhecido';

    if (res.success && res.output) {
      try {
        const data = JSON.parse(res.output);
        if (data.ProcessorNameString) name = data.ProcessorNameString.trim();
        if (data.VendorIdentifier) vendor = data.VendorIdentifier.trim();
      } catch (e) {}
    }

    const cores = os.cpus().length;
    let brand = 'Outro';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('intel') || vendor.toLowerCase().includes('intel')) brand = 'Intel';
    else if (lowerName.includes('amd') || vendor.toLowerCase().includes('amd')) brand = 'AMD';

    return {
      name,
      vendor,
      brand,
      cores,
      speedMHz: os.cpus()[0]?.speed || 0
    };
  }

  async _getWindowsGPU() {
    // Leitura via Registro de Adaptadores de Vídeo
    const cmd = `Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\000*' -ErrorAction SilentlyContinue | Where-Object { $_.DriverDesc } | Select-Object DriverDesc, DriverVersion, ProviderName | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const gpus = [];

    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
          if (!item.DriverDesc) continue;
          let brand = 'Outro';
          const desc = item.DriverDesc.toLowerCase();
          const prov = (item.ProviderName || '').toLowerCase();

          if (desc.includes('nvidia') || prov.includes('nvidia')) brand = 'NVIDIA';
          else if (desc.includes('amd') || desc.includes('radeon') || prov.includes('amd') || prov.includes('advanced micro devices')) brand = 'AMD';
          else if (desc.includes('intel') || prov.includes('intel')) brand = 'Intel';

          gpus.push({
            name: item.DriverDesc,
            version: item.DriverVersion || 'N/A',
            provider: item.ProviderName || 'N/A',
            brand
          });
        }
      } catch (e) {}
    }

    if (gpus.length === 0) {
      gpus.push({
        name: 'Adaptador de Vídeo Genérico',
        version: 'N/A',
        provider: 'Microsoft',
        brand: 'Outro'
      });
    }

    return gpus;
  }

  _getSystemRAM() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const totalGB = (totalBytes / (1024 ** 3)).toFixed(1);
    const usedGB = (usedBytes / (1024 ** 3)).toFixed(1);
    const freeGB = (freeBytes / (1024 ** 3)).toFixed(1);
    const percentage = Math.round((usedBytes / totalBytes) * 100);

    return {
      totalBytes,
      freeBytes,
      usedBytes,
      totalGB: `${totalGB} GB`,
      usedGB: `${usedGB} GB`,
      freeGB: `${freeGB} GB`,
      percentage
    };
  }

  async _getWindowsDisks() {
    const cmd = `Get-Volume | Where-Object { $_.DriveLetter } | Select-Object DriveLetter, FileSystemLabel, DriveType, SizeRemaining, Size | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const disks = [];

    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
          if (!item.DriveLetter || !item.Size) continue;
          const totalGB = (item.Size / (1024 ** 3)).toFixed(1);
          const freeGB = (item.SizeRemaining / (1024 ** 3)).toFixed(1);
          const usedGB = ((item.Size - item.SizeRemaining) / (1024 ** 3)).toFixed(1);
          const percentUsed = Math.round(((item.Size - item.SizeRemaining) / item.Size) * 100);

          disks.push({
            letter: `${item.DriveLetter}:`,
            label: item.FileSystemLabel || 'Disco Local',
            totalGB: `${totalGB} GB`,
            freeGB: `${freeGB} GB`,
            usedGB: `${usedGB} GB`,
            percentUsed,
            isLowSpace: (item.SizeRemaining / item.Size) < 0.15
          });
        }
      } catch (e) {}
    }

    return disks;
  }

  async _getWindowsNetwork() {
    const cmd = `Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\000*' -ErrorAction SilentlyContinue | Where-Object { $_.DriverDesc -and $_.DriverDesc -notlike '*WAN Miniport*' -and $_.DriverDesc -notlike '*Virtual*' -and $_.DriverDesc -notlike '*Kernel Debug*' } | Select-Object DriverDesc, ProviderName, DriverVersion | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const adapters = [];

    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
          if (!item.DriverDesc) continue;
          let type = 'Ethernet';
          const desc = item.DriverDesc.toLowerCase();
          if (desc.includes('wi-fi') || desc.includes('wireless') || desc.includes('802.11') || desc.includes('wlan')) {
            type = 'Wi-Fi';
          } else if (desc.includes('bluetooth')) {
            type = 'Bluetooth';
          }

          let brand = 'Outro';
          if (desc.includes('realtek') || (item.ProviderName || '').toLowerCase().includes('realtek')) brand = 'Realtek';
          else if (desc.includes('intel') || (item.ProviderName || '').toLowerCase().includes('intel')) brand = 'Intel';
          else if (desc.includes('killer')) brand = 'Killer / Intel';
          else if (desc.includes('qualcomm') || desc.includes('atheros')) brand = 'Qualcomm';
          else if (desc.includes('mediatek') || desc.includes('ralink')) brand = 'MediaTek';

          adapters.push({
            name: item.DriverDesc,
            provider: item.ProviderName || 'N/A',
            version: item.DriverVersion || 'N/A',
            type,
            brand
          });
        }
      } catch (e) {}
    }

    return adapters;
  }

  async _getWindowsUSB() {
    const cmd = `Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{36fc9e60-c465-11cf-8056-444553540000}\\000*' -ErrorAction SilentlyContinue | Where-Object { $_.DriverDesc -like '*Host Controller*' -or $_.DriverDesc -like '*xHCI*' -or $_.DriverDesc -like '*USB 3*' } | Select-Object DriverDesc, ProviderName, DriverVersion | ConvertTo-Json`;
    const res = await execPowerShell(cmd);
    const controllers = [];

    if (res.success && res.output) {
      try {
        let items = JSON.parse(res.output);
        if (!Array.isArray(items)) items = [items];
        for (const item of items) {
          if (!item.DriverDesc) continue;
          controllers.push({
            name: item.DriverDesc,
            provider: item.ProviderName || 'Microsoft',
            version: item.DriverVersion || 'N/A'
          });
        }
      } catch (e) {}
    }

    return controllers;
  }

  async _getLinuxHardware() {
    // Arquitetura preparada para Linux futuro
    return {
      platform: 'linux',
      cpu: {
        name: os.cpus()[0]?.model || 'Linux CPU',
        cores: os.cpus().length,
        brand: os.cpus()[0]?.model?.toLowerCase().includes('amd') ? 'AMD' : 'Intel'
      },
      gpu: [{ name: 'Vulkan / Mesa Linux Driver', brand: 'Mesa', version: 'Auto' }],
      ram: this._getSystemRAM(),
      disks: [],
      network: [],
      usb: []
    };
  }

  async _getMacHardware() {
    // Arquitetura preparada para macOS futuro
    return {
      platform: 'darwin',
      cpu: {
        name: os.cpus()[0]?.model || 'Apple Silicon / Intel',
        cores: os.cpus().length,
        brand: 'Apple'
      },
      gpu: [{ name: 'Apple Metal Graphics', brand: 'Apple', version: 'Nativo' }],
      ram: this._getSystemRAM(),
      disks: [],
      network: [],
      usb: []
    };
  }

  _getFallbackHardware() {
    return {
      platform: this.platform,
      cpu: { name: os.cpus()[0]?.model || 'Processador Genérico', cores: os.cpus().length, brand: 'Outro' },
      gpu: [],
      ram: this._getSystemRAM(),
      disks: [],
      network: [],
      usb: []
    };
  }
}

module.exports = new HardwareService();
