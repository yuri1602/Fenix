@echo off
cls
echo ============================================================
echo    FENIX - School Inventory Management System
echo ============================================================
echo.
echo Starting server...
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo.
    echo Please install Python from https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Flask not installed. Installing dependencies...
    echo.
    pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
    echo OK: Dependencies installed successfully!
    echo.
)

echo OK: Starting Flask server...
echo.
echo Server will start at: http://localhost:5000
echo To stop the server press Ctrl+C
echo.
echo ============================================================
echo.

python app.py

if errorlevel 1 (
    echo.
    echo ERROR: Failed to start server!
    echo.
    pause
)
