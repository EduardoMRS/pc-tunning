/**
 * System Optimizer Service
 * Executa comandos de otimização de alta performance:
 * - ReTrim para SSDs NVMe e SATA
 * - Liberação de Working Set de memória RAM
 * - Limpeza profunda de caches e arquivos temporários em múltiplos discos
 * - Limpeza de shader caches de GPUs (DirectX, NVIDIA, AMD)
 * - Esvaziamento de lixeira em todas as unidades
 * - Liberação de cache DNS
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function execPowerShell(command) {
  return new Promise((resolve) => {
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    exec(fullCmd, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout ? stdout.trim() : '',
        error: stderr ? stderr.trim() : (error ? error.message : null)
      });
    });
  });
}

class OptimizerService {
  async runTrim(driveLetter = 'C') {
    const letter = driveLetter.replace(':', '');
    const cmd = `Optimize-Volume -DriveLetter ${letter} -ReTrim -Verbose`;
    const res = await execPowerShell(cmd);
    return {
      success: res.success,
      message: res.success ? `Comando TRIM executado com sucesso na unidade ${letter}:.` : `Não foi possível executar TRIM: ${res.error}`
    };
  }

  async cleanRAM() {
    // Chama a API Win32 EmptyWorkingSet para todos os processos acessíveis
    const script = `
      $procList = Get-Process
      $cleaned = 0
      $code = @'
        [System.Runtime.InteropServices.DllImport("psapi.dll")]
        public static extern int EmptyWorkingSet(IntPtr hwProc);
'@
      $type = Add-Type -MemberDefinition $code -Name "MemCleaner" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue
      foreach ($p in $procList) {
        try {
          [Win32.MemCleaner]::EmptyWorkingSet($p.Handle) | Out-Null
          $cleaned++
        } catch {}
      }
      Write-Output "RAM purgada em $cleaned processos."
    `;
    const res = await execPowerShell(script);
    return {
      success: res.success,
      message: res.output || 'Memória RAM liberada.'
    };
  }

  async cleanDiskTemp() {
    const script = `
      $deletedCount = 0
      [long]$freedBytes = 0

      # 1. Pastas temporárias do sistema e de usuários
      $tempPaths = @(
        "$env:TEMP\\*",
        "C:\\Windows\\Temp\\*",
        "C:\\Windows\\Prefetch\\*",
        "C:\\Windows\\SoftwareDistribution\\Download\\*",
        "C:\\Windows\\SoftwareDistribution\\DeliveryOptimization\\*",
        "C:\\Windows\\Minidump\\*",
        "C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportArchive\\*",
        "C:\\ProgramData\\Microsoft\\Windows\\WER\\ReportQueue\\*",
        "C:\\ProgramData\\Microsoft\\Windows\\WER\\Temp\\*"
      )

      # 2. Shader caches de jogos (DirectX, NVIDIA e AMD)
      $localAppData = $env:LOCALAPPDATA
      if ($localAppData) {
        $tempPaths += "$localAppData\\D3DSCache\\*"
        $tempPaths += "$localAppData\\NVIDIA\\DXCache\\*"
        $tempPaths += "$localAppData\\NVIDIA\\GLCache\\*"
        $tempPaths += "$localAppData\\AMD\\DxCache\\*"
      }

      # 3. Cache em outros discos locais detectados
      $drives = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Free -ne $null }
      foreach ($d in $drives) {
        $root = $d.Root
        $tempPaths += (Join-Path $root "Temp\\*")
        $tempPaths += (Join-Path $root "$Recycle.Bin\\*")
      }

      foreach ($pattern in $tempPaths) {
        Get-ChildItem -Path $pattern -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
          try {
            $len = $_.Length
            Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $deletedCount++
            if ($len) { $freedBytes += $len }
          } catch {}
        }
      }

      # Esvaziar lixeira oficial de todos os discos
      try {
        Clear-RecycleBin -Force -ErrorAction SilentlyContinue | Out-Null
      } catch {}

      $mb = [math]::Round($freedBytes / 1MB, 2)
      $gb = [math]::Round($freedBytes / 1GB, 2)
      if ($gb -ge 1.0) {
        Write-Output "$deletedCount arquivos/caches removidos ($gb GB liberados nos discos)."
      } else {
        Write-Output "$deletedCount arquivos/caches removidos ($mb MB liberados nos discos)."
      }
    `;
    const res = await execPowerShell(script);
    return {
      success: res.success,
      message: res.output || 'Limpeza de temporários e caches de disco concluída.'
    };
  }

  async flushDNS() {
    return new Promise((resolve) => {
      exec('ipconfig /flushdns', (error, stdout) => {
        resolve({
          success: !error,
          message: stdout ? stdout.trim() : 'Cache do resolvedor DNS limpo com sucesso.'
        });
      });
    });
  }
}

module.exports = new OptimizerService();
