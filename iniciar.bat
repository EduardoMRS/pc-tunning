@echo off
:: ============================================================================
:: Otimizador & Gaming Hub Pro - Inicializador com Elevacao Automatica UAC
:: ============================================================================
title Otimizador ^& Gaming Hub Pro

:: Verificar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Solicitando privilegios de Administrador...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Mudar diretorio para a raiz do projeto
cd /d "%~dp0"

echo ============================================================
echo   Otimizador ^& Gaming Hub Pro - Verificando ambiente...
echo ============================================================

:: Verificar se Node.js esta instalado
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Node.js e npm nao foram encontrados no sistema!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b
)

:: Instalar dependencias apenas se node_modules nao existir
if not exist "node_modules" (
    echo [INFO] Primeira execucao: instalando dependencias do Electron...
    echo [INFO] Aguarde, isso pode levar alguns minutos...
    npm install
    if %errorLevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b
    )
)

echo [OK] Dependencias verificadas!
echo [OK] Iniciando Otimizador ^& Gaming Hub Pro...
echo.
echo ============================================================
echo   A janela da aplicacao deve aparecer em instantes.
echo   Voce pode fechar este terminal apos o app abrir.
echo ============================================================

:: Iniciar o Electron como processo separado (nao bloqueia o bat)
start "" "node_modules\electron\dist\electron.exe" .

:: Aguardar 4 segundos e fechar o bat
timeout /t 4 /nobreak >nul
