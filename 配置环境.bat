@echo off
chcp 65001 >nul 2>&1
title Go AI - Environment Setup
color 0B

echo.
echo ================================================================
echo         Go AI System - Environment Setup
echo ================================================================
echo.

cd /d "%~dp0"

echo [CHECK] Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found, please install Python 3.9+
    pause
    exit /b 1
)
python --version
echo [OK] Python check passed
echo.

echo [CHECK] Node.js environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found, please install Node.js 16+
    pause
    exit /b 1
)
node --version
echo [OK] Node.js check passed
echo.

echo [CHECK] Python virtual environment...
if not exist ".venv" (
    echo [CREATE] Creating virtual environment...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment exists
)
echo.

echo [ACTIVATE] Activating virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

echo [INSTALL] Python dependencies...
if exist "requirements.txt" (
    echo Installing Python packages (may take a few minutes)...
    pip install -q -r requirements.txt
    if errorlevel 1 (
        echo [WARN] Some Python packages may have installation issues
    ) else (
        echo [OK] Python dependencies installed
    )
) else (
    echo [WARN] requirements.txt not found, skipping
)
echo.

echo [INSTALL] Frontend dependencies...
if not exist "front-ksy\node_modules" (
    echo Installing npm packages (may take a few minutes)...
    cd front-ksy
    call npm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependency installation failed
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies exist
)
echo.

echo ================================================================
echo [DONE] Environment setup complete!
echo ================================================================
echo.
echo You can now run "Æô¶¯.bat" to start the services
echo.

pause