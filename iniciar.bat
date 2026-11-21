@echo off
:: ============================================================================
:: Otimizador & Anti-Miner Pro - Inicializador com Elevacao de Administrador
:: ============================================================================
title Otimizador ^& Anti-Miner Pro

:: Verificar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Solicitando privilegios de Administrador...
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: Mudar diretorio para o local do script
cd /d "%~dp0"

:: Executar a aplicacao Desktop com Python
where python >nul 2>&1
if %errorLevel% equ 0 (
    start "" pythonw main.py
    exit /b
)

where py >nul 2>&1
if %errorLevel% equ 0 (
    start "" pyw main.py
    exit /b
)

echo [ERRO] Python nao foi encontrado no sistema!
echo Por favor, instale o Python ou adicione-o ao PATH do Windows.
pause
