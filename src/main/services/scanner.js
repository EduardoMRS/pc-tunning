/**
 * Anti-Trojan & Hidden Miner Scanner Service
 * Detecta e neutraliza ameaças, tarefas agendadas maliciosas e droppers.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function execPowerShell(command) {
  return new Promise((resolve) => {
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${command.replace(/"/g, '\\"')}"`;
    exec(fullCmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: stdout ? stdout.trim() : '',
        error: stderr ? stderr.trim() : (error ? error.message : null)
      });
    });
  });
}

class ScannerService {
  constructor() {
    this.minerKeywords = [
      'xmrig', 'minerd', 'cpuminer', 'ethminer', 'stratum+tcp',
      'stratum+ssl', 'randomx', 'cryptonight', 'winring0',
      'nicehash', 'pool.supportxmr', 'hashvault', 'nanopool'
    ];

    this.suspiciousFolderNames = [
      'C:\\runtime',
      'C:\\cache',
      'C:\\diagnostics',
      'C:\\perfdata',
      'C:\\rescache',
      path.join(process.env.APPDATA || 'C:\\', 'Sound')
    ];
  }

  async runFullScan(onLog) {
    const log = (msg) => { if (onLog) onLog(msg); };
    const threats = [];

    log('Iniciando varredura detalhada no sistema...');

    // 1. Varredura de Processos e Linhas de Comando
    log('[1/4] Analisando processos ativos e argumentos de linha de comando...');
    const procScript = `
      Get-CimInstance Win32_Process | Select-Object ProcessId, Name, CommandLine, ExecutablePath | ConvertTo-Json
    `;
    const procRes = await execPowerShell(procScript);
    if (procRes.success && procRes.output) {
      try {
        let procs = JSON.parse(procRes.output);
        if (!Array.isArray(procs)) procs = [procs];

        for (const p of procs) {
          const name = (p.Name || '').toLowerCase();
          const cmdLine = (p.CommandLine || '').toLowerCase();

          for (const kw of this.minerKeywords) {
            if (name.includes(kw) || cmdLine.includes(kw)) {
              threats.push({
                type: 'Processo Minerador',
                target: `${p.Name} (PID: ${p.ProcessId})`,
                details: `Flag detectada: "${kw}". Caminho: ${p.ExecutablePath || 'Desconhecido'}`,
                pid: p.ProcessId,
                path: p.ExecutablePath
              });
              break;
            }
          }
        }
      } catch (e) {}
    }

    // 2. Varredura de Pastas Ocultas de Dropper
    log('[2/4] Verificando diretórios de persistência ocultos...');
    for (const folder of this.suspiciousFolderNames) {
      if (fs.existsSync(folder)) {
        threats.push({
          type: 'Pasta Dropper Suspeita',
          target: folder,
          details: 'Diretório associado a droppers de mineração de criptomoeda.',
          path: folder
        });
      }
    }

    // 3. Varredura do Agendador de Tarefas
    log('[3/4] Auditando tarefas agendadas do Windows...');
    const taskScript = `
      Get-ScheduledTask | Where-Object { $_.TaskPath -eq '\\' -and $_.Author -ne 'Microsoft Corporation' } | Select-Object TaskName, TaskPath | ConvertTo-Json
    `;
    const taskRes = await execPowerShell(taskScript);
    if (taskRes.success && taskRes.output) {
      try {
        let tasks = JSON.parse(taskRes.output);
        if (!Array.isArray(tasks)) tasks = [tasks];
        for (const t of tasks) {
          if (t.TaskName) {
            // Verificar se o nome da tarefa é aleatório ou suspeito
            if (t.TaskName.length > 20 || /^[a-zA-Z0-9]{12,}$/.test(t.TaskName)) {
              threats.push({
                type: 'Tarefa Agendada Oculta',
                target: t.TaskName,
                details: `Tarefa na raiz sem assinatura da Microsoft: ${t.TaskName}`,
                taskName: t.TaskName
              });
            }
          }
        }
      } catch (e) {}
    }

    // 4. Verificação de Integridade do Windows Defender
    log('[4/4] Verificando se o Microsoft Defender foi sabotado no Registro...');
    const defScript = `
      $val = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -ErrorAction SilentlyContinue
      if ($val -and $val.DisableAntiSpyware -eq 1) { Write-Output "TAMPERED" } else { Write-Output "OK" }
    `;
    const defRes = await execPowerShell(defScript);
    if (defRes.output.includes('TAMPERED')) {
      threats.push({
        type: 'Política de Segurança Bloqueada',
        target: 'Windows Defender DisableAntiSpyware',
        details: 'O Microsoft Defender foi desativado via Registro por software malicioso.',
        action: 'repair-defender'
      });
    }

    log(`Varredura concluída. ${threats.length} ameaça(s) encontrada(s).`);
    return threats;
  }

  async fixThreats(threats, onLog) {
    const log = (msg) => { if (onLog) onLog(msg); };
    let fixed = 0;

    for (const t of threats) {
      log(`Neutralizando ameaça: ${t.target}...`);

      if (t.pid) {
        // Matar processo
        await execPowerShell(`Stop-Process -Id ${t.pid} -Force -ErrorAction SilentlyContinue`);
        fixed++;
      } else if (t.taskName) {
        // Remover tarefa
        await execPowerShell(`Unregister-ScheduledTask -TaskName '${t.taskName}' -Confirm:$false -ErrorAction SilentlyContinue`);
        fixed++;
      } else if (t.action === 'repair-defender') {
        // Restaurar Defender
        await execPowerShell(`Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -Force -ErrorAction SilentlyContinue`);
        await execPowerShell(`Set-Service -Name 'WinDefend' -StartupType Automatic -ErrorAction SilentlyContinue`);
        await execPowerShell(`Start-Service -Name 'WinDefend' -ErrorAction SilentlyContinue`);
        fixed++;
      } else if (t.path && fs.existsSync(t.path)) {
        // Deletar pasta
        try {
          fs.rmSync(t.path, { recursive: true, force: true });
          fixed++;
        } catch (e) {}
      }
    }

    log(`Ação concluída: ${fixed} de ${threats.length} ameaça(s) neutralizada(s).`);
    return { success: true, fixedCount: fixed };
  }
}

module.exports = new ScannerService();
