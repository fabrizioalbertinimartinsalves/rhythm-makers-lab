@echo off
setlocal
echo ============================================================
echo   Kineos App - Build e Deploy (VPS)
echo ============================================================
echo.

echo [1/2] Limpando pasta dist anterior...
if exist dist (
    rd /s /q dist
)
echo OK.
echo.

echo [2/2] Iniciando Build e Upload via SSH...
echo.
echo Chamando npm run deploy...
call npm run deploy

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O deploy falhou. Verifique as mensagens acima.
    pause
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   DEPLOY CONCLUIDO COM SUCESSO!
echo ============================================================
echo.
pause
