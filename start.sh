#!/bin/bash

# Fenix School Inventory System - Startup Script
# Цветове за терминала
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo "============================================================"
echo "   🎓 FENIX - Система за управление на училищни материали"
echo "============================================================"
echo ""
echo "Стартиране на сървъра..."
echo ""

# Проверка дали Python3 е инсталиран
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ ГРЕШКА: Python3 не е намерен!${NC}"
    echo ""
    echo "На Ubuntu изпълнете: sudo apt install python3 python3-pip"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Python3 версия: $(python3 --version)${NC}"

# Проверка дали Flask е инсталиран
if ! python3 -c "import flask" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Flask не е инсталиран. Инсталиране на зависимости...${NC}"
    echo ""
    
    # Опитай с pip
    if command -v pip3 &> /dev/null; then
        pip3 install -r requirements.txt
    else
        # Ако няма pip, инсталирай локално с --break-system-packages
        echo -e "${YELLOW}Installing with --user flag...${NC}"
        python3 -m pip install --user --break-system-packages Flask openpyxl Werkzeug
        
        # Добави в PATH ако не е
        export PATH="$HOME/.local/bin:$PATH"
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Зависимостите са инсталирани успешно!${NC}"
        echo ""
    else
        echo -e "${RED}❌ Грешка при инсталиране на зависимостите!${NC}"
        exit 1
    fi
fi

# Проверка дали базата данни съществува
if [ ! -f "school_inventory.db" ]; then
    echo -e "${YELLOW}⚠️  База данни не е намерена. Ще бъде създадена автоматично.${NC}"
    echo ""
fi

# Стартиране на Flask приложението
echo -e "${GREEN}✅ Стартиране на Flask сървъра...${NC}"
echo ""
echo -e "${BLUE}📌 Сървърът ще стартира на: http://localhost:5000${NC}"
echo -e "${BLUE}📌 За да спрете сървъра, натиснете Ctrl+C${NC}"
echo ""
echo "============================================================"
echo ""

# Добави PATH за локални пакети (ако са инсталирани с --user)
export PATH="$HOME/.local/bin:$PATH"

# Стартирай приложението
python3 app.py

# Ако има грешка
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ Грешка при стартиране на сървъра!${NC}"
    echo ""
    read -p "Натиснете Enter за да затворите..."
fi
