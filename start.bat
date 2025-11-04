@echo off@echo off

clschcp 65001 >nul

echo ============================================================cls

echo    FENIX - School Inventory Management Systemecho ============================================================

echo ============================================================echo    🎓 FENIX - Система за управление на училищни материали

echo.echo ============================================================

echo Starting server...echo.

echo.echo Стартиране на сървъра...

echo.

REM Check if Python is installed

python --version >nul 2>&1REM Проверка дали Python е инсталиран

if errorlevel 1 (python --version >nul 2>&1

    echo ERROR: Python not found!if errorlevel 1 (

    echo.    echo ❌ ГРЕШКА: Python не е намерен!

    echo Please install Python from https://www.python.org/downloads/    echo.

    echo.    echo Моля инсталирайте Python от https://www.python.org/downloads/

    pause    echo.

    exit /b 1    pause

)    exit /b 1

)

REM Check if Flask is installed

python -c "import flask" >nul 2>&1REM Проверка дали Flask е инсталиран

if errorlevel 1 (python -c "import flask" >nul 2>&1

    echo WARNING: Flask is not installed. Installing dependencies...if errorlevel 1 (

    echo.    echo ⚠️  Flask не е инсталиран. Инсталиране на зависимости...

    pip install -r requirements.txt    echo.

    if errorlevel 1 (    pip install -r requirements.txt

        echo.    if errorlevel 1 (

        echo ERROR: Failed to install dependencies!        echo.

        pause        echo ❌ Грешка при инсталиране на зависимостите!

        exit /b 1        pause

    )        exit /b 1

    echo OK: Dependencies installed successfully!    )

    echo.    echo ✅ Зависимостите са инсталирани успешно!

)    echo.

)

REM Start Flask application

echo OK: Starting Flask server...REM Стартиране на Flask приложението

echo.echo ✅ Стартиране на Flask сървъра...

echo Server will start at: http://localhost:5000echo.

echo To stop the server, press Ctrl+Cecho 📌 Сървърът ще стартира на: http://localhost:5000

echo.echo 📌 За да спрете сървъра, натиснете Ctrl+C

echo ============================================================echo.

echo.echo ============================================================

echo.

python app.py

python app.py

REM If there is an error

if errorlevel 1 (REM Ако има грешка

    echo.if errorlevel 1 (

    echo ERROR: Failed to start server!    echo.

    echo.    echo ❌ Грешка при стартиране на сървъра!

    pause    echo.

)    pause

)
