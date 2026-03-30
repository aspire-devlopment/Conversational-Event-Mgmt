@echo off
setlocal

set ROOT=%~dp0
set BACKEND_DIR=%ROOT%backend
set FRONTEND_DIR=%ROOT%frontend

echo Starting AI Conversational Event Management locally...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not available in PATH.
  echo Install Node.js first, then run this file again.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
  echo Backend .env file is missing at:
  echo %BACKEND_DIR%\.env
  echo.
  echo Create it first, then run this file again.
  pause
  exit /b 1
)

if not exist "%BACKEND_DIR%\node_modules" (
  echo Installing backend dependencies...
  pushd "%BACKEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo Backend dependency installation failed.
    popd
    pause
    exit /b 1
  )
  popd
)

if not exist "%FRONTEND_DIR%\node_modules" (
  echo Installing frontend dependencies...
  pushd "%FRONTEND_DIR%"
  call npm install
  if errorlevel 1 (
    echo Frontend dependency installation failed.
    popd
    pause
    exit /b 1
  )
  popd
)

echo Launching backend...
start "AI-Conversational Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && npm start"

echo Launching frontend...
start "AI-Conversational Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm start"

echo Waiting a few seconds before opening the app...
timeout /t 8 /nobreak >nul

start "" http://localhost:3000

echo.
echo Local app launch started.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Use stop-local.bat to close the local app windows.

endlocal
