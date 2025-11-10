@echo off
cls
echo ============================================================
echo    FENIX - System Installation
echo ============================================================
echo.
echo This script will install all required components.
echo.
echo ============================================================
echo.

if not exist "app.py" (
    echo ERROR: Cannot find app.py file!
    echo Please run this script from the Fenix project folder.
    pause
    exit /b 1
)

echo Step 1/3: Checking Python...
echo ============================================================
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is NOT installed!
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo IMPORTANT: Check "Add Python to PATH" during installation
    echo.
    timeout /t 3 >nul
    start https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo OK: %PYTHON_VERSION% is installed!
echo.

echo Step 2/3: Upgrading pip...
echo ============================================================
python -m pip install --upgrade pip
echo.

echo Step 3/3: Installing dependencies...
echo ============================================================
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo WARNING: Some packages failed. Trying one by one...
    python -m pip install Flask==3.0.0
    python -m pip install openpyxl==3.1.2
    python -m pip install Werkzeug==3.0.0
    python -m pip install "pandas>=2.0.0"
)

echo.
echo ============================================================
echo    INSTALLATION COMPLETED!
echo ============================================================
echo.
echo Your system is ready to use!
echo.
echo To start: Double-click start.bat
echo Or open: http://localhost:5000
echo.
echo Default login:
echo   Username: admin
echo   Password: admin
echo.
echo ============================================================
echo.

set /p START_NOW="Start server now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo Starting server...
    timeout /t 2 >nul
    call start.bat
) else (
    echo.
    echo Run start.bat later to start the server.
    pause
)
