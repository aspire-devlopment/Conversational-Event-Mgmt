@echo off
REM Script to restart the backend server with correct environment

cd /d "%~dp0backend"

echo Stopping any existing Node processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

REM Small delay to ensure process cleanup
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server with fresh environment...
echo.
echo Current LLM Configuration:
echo ==========================
findstr /C:"LLM_PROVIDER" .env
findstr /C:"LLM_API_KEY" .env
findstr /C:"LLM_MODEL" .env
echo.

node server.js

pause
