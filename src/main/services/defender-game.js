/**
 * Windows Defender & Gaming Performance Service
 * Controla o Windows Defender e aplica otimizações de desempenho para jogos.
 *
 * Funcionalidades:
 * - Ativar / Desativar Windows Defender (via PowerShell + Registro)
 * - Verificar status atual do Defender + Tamper Protection
 * - Ativar / Desativar Modo Performance para Jogos (Game Mode)
 *   - Plano de energia: Ultimate Performance
 *   - Prioridade de CPU para jogos
 *   - Desativar Xbox Game Bar
 *   - Desativar notificações e foco
 */

const { exec } = require('child_process');

function execPowerShell(command) {
  return new Promise((resolve) => {
    // Usar -EncodedCommand para evitar problemas de escaping em comandos complexos
    const buf = Buffer.from(command, 'utf16le');
    const encoded = buf.toString('base64');
    const fullCmd = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;
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
    // 1. Verificar Tamper Protection (bloqueia desativação via API no Win11)
    // Valor 5 = Tamper Protection ATIVA (padrão Win11), 4 = desativada, 1 = desativada via GPO
    const tamperCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows Defender\\Features' -Name 'TamperProtection' -ErrorAction SilentlyContinue).TamperProtection`
    );
    const tamperVal = tamperCheck.output;
    const tamperProtectionActive = (tamperVal === '5');

    // 2. Verificar via política de registro (GPO/admin)
    const policyCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -ErrorAction SilentlyContinue).DisableAntiSpyware`
    );
    const isPolicyDisabled = policyCheck.output === '1';

    // 3. Verificar proteção em tempo real via registro
    const rtCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows Defender\\Real-Time Protection' -Name 'DisableRealtimeMonitoring' -ErrorAction SilentlyContinue).DisableRealtimeMonitoring`
    );
    const rtDisabledByReg = rtCheck.output === '1';

    // 4. Verificar tipo de inicialização do serviço WinDefend via registro
    // 2 = Automatic (normal), 4 = Disabled
    const svcCheck = await execPowerShell(
      `(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\WinDefend' -Name 'Start' -ErrorAction SilentlyContinue).Start`
    );
    const serviceDisabled = svcCheck.output === '4';

    // 5. Tentar Get-MpComputerStatus (pode falhar com Tamper Protection ligada)
    let mpEnabled = null;
    const mpCheck = await execPowerShell(
      `try { (Get-MpComputerStatus -ErrorAction Stop).AntivirusEnabled } catch { 'CIM_ERR' }`
    );
    if (mpCheck.output === 'True') mpEnabled = true;
    else if (mpCheck.output === 'False') mpEnabled = false;

    // Com Tamper Protection ativa, o Defender está protegido = ativo
    let enabled;
    if (tamperProtectionActive) {
      enabled = !isPolicyDisabled && !serviceDisabled;
    } else {
      enabled = !isPolicyDisabled && !serviceDisabled && !rtDisabledByReg && (mpEnabled !== false);
    }

    return {
      enabled,
      tamperProtectionActive,
      serviceDisabled,
      policyDisabled: isPolicyDisabled,
      rtDisabled: rtDisabledByReg,
      antivirusEnabled: mpEnabled,
      statusText: enabled ? 'Windows Defender ATIVO' : 'Windows Defender DESATIVADO',
      statusColor: enabled ? 'text-emerald-400' : 'text-rose-400'
    };
  }

  // =============================================
  // DESATIVAR WINDOWS DEFENDER
  // =============================================
  async disableDefender() {
    const status = await this.getDefenderStatus();

    if (status.tamperProtectionActive) {
      // Com Tamper Protection ativa no Windows 11, nenhum processo externo
      // consegue desativar o Defender via API, registro ou serviço.
      // A única forma é pelo próprio aplicativo da Central de Segurança do Windows.
      return {
        success: false,
        tamperBlocked: true,
        message: 'TAMPER_BLOCKED'
      };
    }

    // Sem Tamper Protection (versões mais antigas ou Enterprise com GPO):
    // Método 1: Via política de registro
    const step1 = await execPowerShell(
      `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -Value 1 -Type DWord -Force`
    );

    // Método 2: Desativar proteção em tempo real via Set-MpPreference
    const step2 = await execPowerShell(
      `Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue`
    );

    // Método 3: Via registro direto da chave Real-Time Protection
    const step3 = await execPowerShell(
      `New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Force -ErrorAction SilentlyContinue | Out-Null; Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name 'DisableRealtimeMonitoring' -Value 1 -Type DWord -Force`
    );

    const anySuccess = step1.success || step2.success || step3.success;

    return {
      success: anySuccess,
      tamperBlocked: false,
      message: anySuccess
        ? 'DEFENDER_DISABLED'
        : `Falha ao desativar: ${step1.error || step2.error || step3.error}`
    };
  }

  // =============================================
  // ATIVAR WINDOWS DEFENDER
  // =============================================
  async enableDefender() {
    const status = await this.getDefenderStatus();

    if (status.tamperProtectionActive && status.enabled) {
      return {
        success: true,
        message: '✅ Windows Defender já está ATIVO e protegido pela Tamper Protection do Windows 11.'
      };
    }

    // Remover política de desativação do registro
    const step1 = await execPowerShell(
      `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender' -Name 'DisableAntiSpyware' -Force -ErrorAction SilentlyContinue`
    );

    // Remover política de desativação de RT
    const step2 = await execPowerShell(
      `Remove-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Real-Time Protection' -Name 'DisableRealtimeMonitoring' -Force -ErrorAction SilentlyContinue`
    );

    // Reativar proteção em tempo real via API
    const step3 = await execPowerShell(
      `Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction SilentlyContinue`
    );

    // Garantir serviço iniciado automaticamente via registro
    const step4 = await execPowerShell(
      `Set-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\WinDefend' -Name 'Start' -Value 2 -Type DWord -Force -ErrorAction SilentlyContinue`
    );

    return {
      success: true,
      message: '✅ Windows Defender reativado! Proteção em tempo real restaurada.'
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

    // 5. Prioridade de CPU para aplicações em primeiro plano
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
