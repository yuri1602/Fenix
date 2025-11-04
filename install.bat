@echo off
cls
echo ============================================================
echo    FENIX - System Installation
echo ============================================================
echo.
echo This script will install all required components
echo for the Fenix school inventory system.
echo.
echo ============================================================
echo.

REM Check if running from correct directory
if not exist "app.py" (
    echo ERROR: Cannot find app.py file!
    echo.
    echo Please run this script from the Fenix project folder.
    echo.
    pause
    exit /b 1
)

echo Step 1/4: Checking Python...
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is NOT found on this computer!
    echo.
    echo Please install Python before continuing:
    echo.
    echo    1. Open: https://www.python.org/downloads/
    echo    2. Download the latest version of Python
    echo    3. IMPORTANT: Check "Add Python to PATH" during installation
    echo    4. Run this script again
    echo.
    echo Opening download page...
    timeout /t 3 >nul
    start https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Show Python version
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo OK: %PYTHON_VERSION% is installed!
echo.

echo Step 2/4: Checking pip...
echo ============================================================
echo.

REM Check if pip is installed
python -m pip --version >nul 2>&1
if errorlevel 1 (
    echo pip not found!
    echo.
    echo Installing pip...
    python -m ensurepip --default-pip
    if errorlevel 1 (
        echo ERROR installing pip!
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('python -m pip --version') do set PIP_VERSION=%%i
echo OK: %PIP_VERSION%
echo.

echo Step 3/4: Upgrading pip...
echo ============================================================
echo.

python -m pip install --upgrade pip --quiet
if errorlevel 1 (
    echo WARNING: Could not upgrade pip, continuing with current version
) else (
    echo OK: pip upgraded successfully!
)
echo.

echo Step 4/4: Installing dependencies...
echo ============================================================
echo.

REM Check if requirements.txt exists
if exist "requirements.txt" (
    echo Installing from requirements.txt...
    python -m pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo.
        echo WARNING: Error during installation! Trying manual install...
        goto MANUAL_INSTALL
    )
    echo OK: All packages installed from requirements.txt!
    goto CHECK_INSTALL
) else (
    echo WARNING: requirements.txt not found. Manual installation...
    goto MANUAL_INSTALL
)

:MANUAL_INSTALL
echo.
echo Installing Flask...
python -m pip install Flask==3.0.0 --quiet
if errorlevel 1 goto INSTALL_ERROR

echo Installing openpyxl...
python -m pip install openpyxl==3.1.2 --quiet
if errorlevel 1 goto INSTALL_ERROR

echo Installing Werkzeug...
python -m pip install Werkzeug==3.0.0 --quiet
if errorlevel 1 goto INSTALL_ERROR

echo OK: All packages installed manually!
goto CHECK_INSTALL

:INSTALL_ERROR
echo.
echo ERROR installing package!
echo.
echo Possible causes:
echo   - No internet connection
echo   - Firewall blocking pip
echo   - Insufficient permissions
echo.
echo Try running Command Prompt as Administrator
echo and execute this script again.
echo.
pause
exit /b 1

:CHECK_INSTALL
echo.
echo Verifying installation...
echo ============================================================
echo.

REM Check if Flask is installed successfully
python -c "import flask; print('OK: Flask ' + flask.__version__)" 2>nul
if errorlevel 1 (
    echo ERROR: Flask not installed correctly!
    goto INSTALL_ERROR
)

python -c "import openpyxl; print('OK: openpyxl ' + openpyxl.__version__)" 2>nul
if errorlevel 1 (
    echo ERROR: openpyxl not installed correctly!
    goto INSTALL_ERROR
)

python -c "import werkzeug; print('OK: Werkzeug ' + werkzeug.__version__)" 2>nul
if errorlevel 1 (
    echo ERROR: Werkzeug not installed correctly!
    goto INSTALL_ERROR
)

echo.
echo ============================================================
echo    INSTALLATION COMPLETED SUCCESSFULLY!
echo ============================================================
echo.
echo Your system is ready to use!
echo.
echo To start the application:
echo    1. Double-click start.bat
echo    2. Or open browser at: http://localhost:5000
echo.
echo Default credentials:
echo    Username: admin
echo    Password: admin
echo.
echo WARNING: Change the password after first login!
echo.
echo ============================================================
echo.

REM Ask if user wants to start the server now
set /p START_NOW="Start the server now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo.
    echo Starting server...
    echo.
    timeout /t 2 >nul
    call start.bat
) else (
    echo.
    echo You can start the server later by double-clicking start.bat
    echo.
    pause
)
