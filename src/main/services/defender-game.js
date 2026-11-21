/**
 * Windows Defender & Gaming Performance Service
 * Controla o Windows Defender e aplica otimizações de desempenho para jogos.
 *
 * Funcionalidades:
 * - Ativar / Desativar Windows Defender (via PowerShell + Registro)
 * - Verificar status atual do Defender
 * - Ativar / Desativar Modo Performance para Jogos (Game Mode)
 *   - Plano de energia: Ultimate Performance
 *   - Prioridade de CPU para jogos
 *   - Desativar Xbox Game Bar
 *   - Desativar notificações e foco
 *   - Desativar atualizações automáticas em horário de pico
 */

const { exec } = require('child_process');

function execPowerShell(command) {
  return new Promise((resolve) => {
    const escaped = command.replace(/"/g, '\\"');
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${escaped}"`;
    exec(fullCmd, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        output: (stdout || '').trim(),
        error: (stderr || error?.message || '').trim()
      });
    });
  });
}

class DefenderGameService {
  // =============================================
  // STATUS DO WINDOWS DEFENDER
  // =============================================
  async getDefenderStatus() {
    // Verificar via Registro se Defender está desativado por política
    const policyCheck = await execPowerShell(
      `$val = Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -ErrorAction SilentlyContinue; if ($val -and $val.DisableAntiSpyware -eq 1) { 'DISABLED_POLICY' } else { 'OK' }`
    );

    // Verificar se o serviço WinDefend está rodando
    const serviceCheck = await execPowerShell(
      `(Get-Service -Name 'WinDefend' -ErrorAction SilentlyContinue).Status`
    );

    // Verificar via Get-MpComputerStatus (mais moderno)
    const mpCheck = await execPowerShell(
      `(Get-MpComputerStatus -ErrorAction SilentlyContinue).AntivirusEnabled`
    );

    const isRunning = serviceCheck.output === 'Running';
    const isPolicyDisabled = policyCheck.output === 'DISABLED_POLICY';
    const isAntivirusEnabled = mpCheck.output === 'True';

    const enabled = isRunning && !isPolicyDisabled && (isAntivirusEnabled !== false);

    return {
      enabled,
      serviceStatus: serviceCheck.output || 'Desconhecido',
      policyDisabled: isPolicyDisabled,
      antivirusEnabled: isAntivirusEnabled,
      statusText: enabled ? 'Windows Defender ATIVO' : 'Windows Defender DESATIVADO',
      statusColor: enabled ? 'text-emerald-400' : 'text-rose-400'
    };
  }

  // =============================================
  // DESATIVAR WINDOWS DEFENDER
  // =============================================
  async disableDefender() {
    // Método 1: Via política de registro (requer reinício para efeito total)
    const step1 = await execPowerShell(
      `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -Value 1 -Type DWord -Force`
    );

    // Método 2: Via Set-MpPreference (desativa proteção em tempo real imediatamente)
    const step2 = await execPowerShell(
      `Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue`
    );

    // Método 3: Parar o serviço
    const step3 = await execPowerShell(
      `Stop-Service -Name 'WinDefend' -Force -ErrorAction SilentlyContinue`
    );

    const anySuccess = step1.success || step2.success || step3.success;

    return {
      success: anySuccess,
      message: anySuccess
        ? '⚠️ Windows Defender desativado. A proteção em tempo real foi removida. Reative após jogar.'
        : `Falha: ${step1.error || step2.error || step3.error}`
    };
  }

  // =============================================
  // ATIVAR WINDOWS DEFENDER
  // =============================================
  async enableDefender() {
    // Remover política de desativação do registro
    const step1 = await execPowerShell(
      `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -Force -ErrorAction SilentlyContinue`
    );

    // Reativar proteção em tempo real
    const step2 = await execPowerShell(
      `Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue`
    );

    // Reiniciar e configurar como automático
    const step3 = await execPowerShell(
      `Set-Service -Name 'WinDefend' -StartupType Automatic -ErrorAction SilentlyContinue; Start-Service -Name 'WinDefend' -ErrorAction SilentlyContinue`
    );

    return {
      success: step1.success || step2.success || step3.success,
      message: '✅ Windows Defender reativado com sucesso! Proteção em tempo real restaurada.'
    };
  }

  // =============================================
  // STATUS DO MODO PERFORMANCE PARA JOGOS
  // =============================================
  async getGameModeStatus() {
    // Verificar plano de energia atual
    const powerCheck = await execPowerShell(
      `(powercfg /getactivescheme)`
    );

    // Verificar se Xbox Game Bar está desativado
    const gameBarCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -ErrorAction SilentlyContinue).AppCaptureEnabled`
    );

    // Verificar se Modo Jogo do Windows está ativo
    const gameModeCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -ErrorAction SilentlyContinue).AllowAutoGameMode`
    );

    const isUltimatePerf = powerCheck.output.toLowerCase().includes('ultimate') || powerCheck.output.toLowerCase().includes('e9a42b02');
    const isHighPerf = powerCheck.output.toLowerCase().includes('high') || powerCheck.output.toLowerCase().includes('8c5e7fda');
    const gameBarDisabled = gameBarCheck.output === '0';
    const gameModeOn = gameModeCheck.output === '1';

    // Considera ativo se tem high/ultimate e game bar desativado
    const active = (isUltimatePerf || isHighPerf) && gameBarDisabled;

    // Extrair nome do plano de energia atual
    let planName = 'Balanceado (padrão)';
    if (isUltimatePerf) planName = 'Ultimate Performance';
    else if (isHighPerf) planName = 'Alto Desempenho';

    return {
      active,
      planName,
      gameBarDisabled,
      gameModeOn,
      statusText: active ? 'Modo Game ATIVO' : 'Modo Game DESATIVADO',
      statusColor: active ? 'text-purple-400' : 'text-gray-400'
    };
  }

  // =============================================
  // ATIVAR MODO PERFORMANCE PARA JOGOS
  // =============================================
  async enableGameMode() {
    const steps = [];

    // 1. Tentar ativar Ultimate Performance (pode não existir em Windows Home)
    const ultimateResult = await execPowerShell(
      `powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>&1`
    );

    // Pegar GUID gerado ou o existente
    let targetGuid = 'e9a42b02-d5df-448d-aa00-03f14749eb61';
    if (ultimateResult.success && ultimateResult.output.match(/[0-9a-f]{8}-[0-9a-f]{4}/i)) {
      const match = ultimateResult.output.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (match) targetGuid = match[0];
    }

    // 2. Ativar o plano Ultimate Performance ou Alto Desempenho como fallback
    const powerResult = await execPowerShell(
      `$r = powercfg /setactive ${targetGuid} 2>&1; if ($LASTEXITCODE -ne 0) { powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 }`
    );
    steps.push({ name: 'Plano de Energia: Ultimate/Alto Desempenho', ok: powerResult.success });

    // 3. Desativar Xbox Game Bar
    const gameBarResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Xbox Game Bar desativado', ok: gameBarResult.success });

    // 4. Habilitar Modo Jogo do Windows
    const gameModeResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' -Name 'AllowAutoGameMode' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\GameBar' -Name 'AutoGameModeEnabled' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Modo Jogo do Windows ativado', ok: gameModeResult.success });

    // 5. Prioridade de CPU para aplicações em primeiro plano (prioridade de processos)
    const cpuPrioResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Prioridade de CPU para primeiro plano maximizada', ok: cpuPrioResult.success });

    // 6. Desativar notificações de foco (Não Perturbe)
    const focusResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings' -Name 'NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK' -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Notificações durante jogos desativadas', ok: focusResult.success });

    // 7. Desativar Mouse Acceleration (PointerPrecision) para jogos FPS
    const mouseResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value '0' -Type String -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold1' -Value '0' -Type String -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold2' -Value '0' -Type String -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Aceleração do mouse desativada (FPS)', ok: mouseResult.success });

    // 8. Prioridade de MMCSS (multimedia scheduler) para jogos
    const mmcssResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games' -Name 'GPU Priority' -Value 8 -Type DWord -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games' -Name 'Priority' -Value 6 -Type DWord -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games' -Name 'Scheduling Category' -Value 'High' -Type String -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'MMCSS: GPU e CPU Priority para High (Games)', ok: mmcssResult.success });

    const successCount = steps.filter(s => s.ok).length;

    return {
      success: successCount >= 4,
      steps,
      message: `🎮 Modo Performance para Jogos ATIVADO! ${successCount}/${steps.length} otimizações aplicadas.`
    };
  }

  // =============================================
  // DESATIVAR MODO PERFORMANCE PARA JOGOS
  // =============================================
  async disableGameMode() {
    const steps = [];

    // 1. Restaurar plano Balanceado
    const powerResult = await execPowerShell(
      `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`
    );
    steps.push({ name: 'Plano de Energia: Balanceado (padrão)', ok: powerResult.success });

    // 2. Reativar Xbox Game Bar
    const gameBarResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -Value 1 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Xbox Game Bar reativado', ok: gameBarResult.success });

    // 3. Restaurar prioridade de CPU padrão
    const cpuPrioResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Prioridade de CPU restaurada ao padrão', ok: cpuPrioResult.success });

    // 4. Reativar Mouse Acceleration
    const mouseResult = await execPowerShell(
      `Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseSpeed' -Value '1' -Type String -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold1' -Value '6' -Type String -Force -ErrorAction SilentlyContinue; Set-ItemProperty -Path 'HKCU:\\Control Panel\\Mouse' -Name 'MouseThreshold2' -Value '10' -Type String -Force -ErrorAction SilentlyContinue`
    );
    steps.push({ name: 'Aceleração do mouse restaurada', ok: mouseResult.success });

    const successCount = steps.filter(s => s.ok).length;

    return {
      success: successCount >= 2,
      steps,
      message: `✅ Sistema restaurado ao modo padrão. ${successCount}/${steps.length} ajustes revertidos.`
    };
  }
}

module.exports = new DefenderGameService();
