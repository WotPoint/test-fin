@echo off
title FinTrack — Dev Server
echo.
echo  FinTrack - Personal Finance App
echo  Starting development server...
echo.
cd /d "%~dp0"
start "" "http://localhost:5174"
npx vite --port 5174 --host
pause
