@echo off
chcp 65001 >nul 2>&1
title Go AI Quick Start
color 0A

echo.
echo ================================================================
echo         Go AI System - Quick Start
echo ================================================================
echo.

cd /d "%~dp0"

if not exist "server.py" (
    echo [ERROR] server.py not found
    pause
    exit /b 1
)

if not exist "front-ksy" (
    echo [ERROR] front-ksy directory not found
    pause
    exit /b 1
)

echo [START] Backend Service (Flask) - Port 8000
start "Flask Backend (Port 8000)" cmd /k "cd /d "%~dp0" && python server.py"

timeout /t 2 >nul

echo [START] Frontend Service (Vue3) - Port 3000
start "Vue3 Frontend (Port 3000)" cmd /k "cd /d "%~dp0front-ksy" && npm run dev"

timeout /t 3 >nul

echo [OPEN] Browser...
start http://localhost:3000

echo.
echo ================================================================
echo [DONE] Startup Complete!
echo ================================================================
echo.
echo Service Info:
echo   Backend API: http://localhost:8000
echo   Frontend App: http://localhost:3000
echo.
echo To stop: Close the two windows above
echo.

pause