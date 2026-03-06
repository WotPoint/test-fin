@echo off
title FinTrack — Dev Server
echo.
echo  FinTrack - Personal Finance App
echo  Starting backend + frontend...
echo.
cd /d "%~dp0"

:: Kill any process already using port 3001 or 5173
echo  Freeing ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1

timeout /t 1 /nobreak >nul

:: Start backend in a new window
start "FinTrack Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Start frontend in a new window, open browser after delay
start "FinTrack Frontend" cmd /k "cd /d "%~dp0" && timeout /t 5 /nobreak >nul && start "" "http://localhost:5173" && npm run dev"

echo.
echo  Both servers are starting in separate windows.
echo  Browser will open at http://localhost:5173 in ~5 seconds.
echo.
pause
