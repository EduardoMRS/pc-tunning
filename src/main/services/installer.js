/**
 * Installer & Download Service
 * Gerencia o download com streaming de progresso e a execução dos instaladores
 * Suporta modo silencioso (automático) e modo assistido (abre o assistente para o usuário).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');

class InstallerService {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'OtimizadorDownloads');
    if (!fs.existsSync(this.tempDir)) {
      try {
        fs.mkdirSync(this.tempDir, { recursive: true });
      } catch (e) {}
    }
  }

  downloadFile(url, targetPath, onProgress) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;

      const request = client.get(url, (response) => {
        // Tratar redirecionamentos HTTP (301, 302, 307, 308)
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return this.downloadFile(response.headers.location, targetPath, onProgress)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Falha no download (HTTP ${response.statusCode})`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let receivedBytes = 0;

        const fileStream = fs.createWriteStream(targetPath);

        response.on('data', (chunk) => {
          receivedBytes += chunk.length;
          fileStream.write(chunk);

          if (totalBytes > 0 && onProgress) {
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            onProgress({
              receivedBytes,
              totalBytes,
              percent,
              receivedMB: (receivedBytes / (1024 * 1024)).toFixed(1),
              totalMB: (totalBytes / (1024 * 1024)).toFixed(1)
            });
          }
        });

        response.on('end', () => {
          fileStream.end();
          resolve(targetPath);
        });

        response.on('error', (err) => {
          fileStream.close();
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      });

      request.on('error', (err) => {
        reject(err);
      });
    });
  }

  async installComponent(component, options = {}, onProgress, onLog) {
    const { mode = 'silent' } = options; // 'silent' ou 'assisted'
    const isSilent = mode === 'silent';

    if (!component.downloadUrl) {
      throw new Error('Este componente não possui link direto de download automático. Abra a página oficial.');
    }

    const log = (msg) => {
      if (onLog) onLog(msg);
    };

    log(`[1/3] Iniciando download de: ${component.name}...`);

    const filename = `${component.id}_${Date.now()}${path.extname(component.downloadUrl.split('?')[0]) || '.exe'}`;
    const targetFile = path.join(this.tempDir, filename);

    try {
      await this.downloadFile(component.downloadUrl, targetFile, onProgress);
      log(`[2/3] Download concluído com sucesso (${path.basename(targetFile)}).`);

      log(`[3/3] Executando instalador em modo ${isSilent ? 'SILENCIOSO (Automático)' : 'ASSISTIDO (Manual)'}...`);

      let exitCode = 0;

      if (component.type === 'directx-package') {
        exitCode = await this._installDirectXPackage(targetFile, isSilent, log);
      } else if (component.type === 'zip-installer') {
        exitCode = await this._installZipPackage(targetFile, component.innerExe, component.installerArgs, isSilent, log);
      } else if (component.type === 'msi') {
        exitCode = await this._installMsi(targetFile, isSilent, log);
      } else {
        // Executável padrão (.exe)
        exitCode = await this._installExe(targetFile, component.installerArgs, isSilent, log);
      }

      log(`Processo finalizado com código ${exitCode}.`);
      return { success: exitCode === 0 || exitCode === 3010, exitCode }; // 3010 = reinício pendente (sucesso)
    } catch (err) {
      log(`Erro durante instalação: ${err.message}`);
      throw err;
    }
  }

  _installExe(filePath, args = [], isSilent = true, log) {
    return new Promise((resolve) => {
      const finalArgs = isSilent ? args : [];
      log(`Executando: "${filePath}" ${finalArgs.join(' ')}`);

      const proc = spawn(filePath, finalArgs, {
        windowsHide: isSilent,
        detached: !isSilent
      });

      proc.on('close', (code) => {
        resolve(code || 0);
      });

      proc.on('error', (err) => {
        log(`Erro ao executar instalador: ${err.message}`);
        resolve(-1);
      });
    });
  }

  _installMsi(filePath, isSilent = true, log) {
    return new Promise((resolve) => {
      const args = ['/i', filePath];
      if (isSilent) {
        args.push('/quiet', '/norestart');
      }
      log(`Executando: msiexec ${args.join(' ')}`);

      const proc = spawn('msiexec', args, {
        windowsHide: isSilent
      });

      proc.on('close', (code) => {
        resolve(code || 0);
      });

      proc.on('error', () => resolve(-1));
    });
  }

  async _installDirectXPackage(installerPath, isSilent = true, log) {
    const extractDir = path.join(this.tempDir, `dx_extract_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    log(`Extraindo pacote redistribuível do DirectX para pasta temporária...`);

    // directx_Jun2010_redist.exe /Q /T:<path>
    await new Promise((resolve) => {
      const proc = spawn(installerPath, ['/Q', `/T:${extractDir}`], { windowsHide: true });
      proc.on('close', resolve);
      proc.on('error', resolve);
    });

    const dxSetup = path.join(extractDir, 'DXSETUP.exe');
    if (!fs.existsSync(dxSetup)) {
      throw new Error('Falha ao descompactar DXSETUP.exe');
    }

    log(`Executando DXSETUP.exe...`);
    const finalArgs = isSilent ? ['/silent'] : [];
    return new Promise((resolve) => {
      const proc = spawn(dxSetup, finalArgs, { windowsHide: isSilent });
      proc.on('close', (code) => {
        // Limpar pasta extraída
        try {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (e) {}
        resolve(code || 0);
      });
      proc.on('error', () => resolve(-1));
    });
  }

  async _installZipPackage(zipPath, innerExe, args = [], isSilent = true, log) {
    const extractDir = path.join(this.tempDir, `zip_extract_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    log(`Extraindo arquivo .zip...`);
    const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`;
    await new Promise((resolve) => exec(cmd, resolve));

    const targetExe = innerExe ? path.join(extractDir, innerExe) : null;
    if (!targetExe || !fs.existsSync(targetExe)) {
      throw new Error(`Executável interno ${innerExe} não encontrado no ZIP.`);
    }

    return await this._installExe(targetExe, args, isSilent, log);
  }
}

module.exports = new InstallerService();
