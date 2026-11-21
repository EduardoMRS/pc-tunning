@echo off
:: ============================================================================
:: Otimizador & Gaming Hub Pro - Compilador de Instalador Oficial (.EXE NSIS)
:: ============================================================================
title Compilar Instalador - Otimizador ^& Gaming Hub Pro

cd /d "%~dp0"

echo ============================================================
echo   GERANDO INSTALADOR OFICIAL DO WINDOWS (.EXE NSIS)
echo ============================================================
echo.
echo Este processo vai empacotar a aplicacao completa em um instalador
echo instalavel com assistente passo a passo, atalho no Menu Iniciar,
echo atalho na Area de Trabalho e desinstalador automatico.
echo.

if not exist "node_modules" (
    echo [1/2] Instalando modulos necessarios...
    call npm install
)

echo [2/2] Compilando instalador para Windows...
call npm run dist:win

if %errorLevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCESSO! O instalador foi gerado na pasta:
    echo   %~dp0dist\
    echo ============================================================
    explorer "%~dp0dist"
) else (
    echo.
    echo [ERRO] Ocorreu uma falha durante a compilacao do instalador.
)

pause
