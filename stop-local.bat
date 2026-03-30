@echo off
setlocal

echo Stopping local AI Conversational Event Management windows...
echo.

taskkill /FI "WINDOWTITLE eq AI-Conversational Backend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq AI-Conversational Frontend*" /T /F >nul 2>nul

echo Done.

endlocal
