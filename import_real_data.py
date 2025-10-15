import sqlite3
import re

# Your provided materials list
new_materials_raw = """
Маркер за дъска Черен	36бр
Маркер за дъска Червен	11бр
Маркер за дъска Син	13бр
Маркер за дъска Зелен	12бр
Цветни комплектни маркери за Дъска	8бр
Сухо лепило	24бр
Гланцови блокчета	42бр
Син химикал	214бр
Черен химикал	22бр
Червен химикал	13бр
Подварзия Голяма	64бр
Подварзия малка	30бр
Течно лепило	8бр
Картон за табло	74бр
Цветни моливи Комплект	18бр
Флумастри Комплект	12 бр
Тиксо	20бр
Хайлайтър Комплекти	5бр
Блокче за рисуване А4	5бр
Ножица	14бр
Линия	18бр
Транспортир	2бр
Цветна хартия (Пакет)	2бр
Плейдо Пластелин	1бр
Дъска за Пластелин	1бр
Пакт Мокри кърпи	5бр
Острилки	17бр
Папки за джобове	7бр
Пакет джобове (Пакети)	14бр
Коректор на лента	5бр
Течен коректор	4бр
Папки със цип	10бр
Гумички	9бр
Рафтчета за учебници	6 бр
Моливници	1бр
1 ел.устрилка	1бр
Човали за смет 50л.	5 бр
Човали за смет 20л.	0 бр
Човали за смет 35л.	1бр
Човали за смет 70л.	0бр
Кламери (Кутийка)	5бр
Телбот (Кутийки)	11бр
Лепящи листчета за отбелязване	4бр
Гъби за дъска	15бр
Папки класьор	11бр
Несесер	17бр
Розови Химикали	10бр
Лилави Химикали	10бр
Зелени Химикали	11бр
Оранжеви Химикали	10бр
Органайзер за бюро	1бр
Темперни бои Комплект от 6бр	3бр
Темперни бои Комплект от 12бр	3бр
Перфоратори	2бр
Тънкописец Син	7бр
Тънкописец Черен	3бр
Тънкописец Розов	4бр
Тънкописец червени	7бр
Габърчета Кутия	19бр
Пермаменти маркери	11бр
Телбот Устройство	4 бр
Водни Бои	6бр
Етикети	2бр
Четки за боя пакет	2бр
Гумички за молив	46бр
Графитни Моливи	8бр
Чашки за боя	6бр
Пиро моливи	8бр
Глина	1бр
Пастели комплект	1бр
Папки с копче	34бр
Торбички 10л	8бр
Хартия за Принтер(Пакети)	10бр
Гъби за миене на съдове	19бр
Тетрадки (Малък формат, малки квадрати)	29бр
Тетрадки (Малък формат, големи квадрати)	94бр
Тетрадки (Малък формат, тесни и широки редове)	97бр
Тетрадки (Малък формат, Речник)	9бр
Тетрадки (Голям формат, широки редове)	41бр
Тетрадки (Малък формат, широки редове)	41бр
Нотна тетрадка	1бр
"""

# Parse the materials
def parse_quantity(qty_str):
    """Extract quantity number from string like '36бр' or '12 бр'"""
    match = re.search(r'(\d+)', qty_str)
    return int(match.group(1)) if match else 0

new_materials = {}
for line in new_materials_raw.strip().split('\n'):
    if not line.strip():
        continue
    parts = line.split('\t')
    if len(parts) >= 2:
        name = parts[0].strip()
        qty = parse_quantity(parts[1].strip())
        new_materials[name] = qty

# Category mapping function
def get_category(name):
    """Determine category based on material name"""
    name_lower = name.lower()
    
    if any(word in name_lower for word in ['маркер', 'химикал', 'молив', 'флумастри', 'тънкописец', 'пермаменти', 'пиро', 'графитни']):
        return 'Маркери и химикали'
    elif any(word in name_lower for word in ['хартия', 'тетрадки', 'тетрадка', 'блокче', 'блокчета', 'нотна']):
        return 'Хартия и тетрадки'
    elif any(word in name_lower for word in ['лепило', 'бои', 'боя', 'пластелин', 'глина', 'пастели', 'четки']):
        return 'Лепила и бои'
    elif any(word in name_lower for word in ['папки', 'папка', 'кламер', 'телбот', 'джоб', 'класьор', 'файлове']):
        return 'Папки и кламери'
    elif any(word in name_lower for word in ['ножица', 'линия', 'транспортир', 'острилки', 'устрилка', 'перфоратор', 'коректор', 'тиксо', 'хайлайтър', 'дъска']):
        return 'Инструменти'
    elif any(word in name_lower for word in ['човали', 'гъби', 'почист', 'кърпи', 'миене']):
        return 'Почистващи материали'
    else:
        return 'Други'

# Connect to database
conn = sqlite3.connect('school_inventory.db')
cursor = conn.cursor()

# Get existing materials
existing = cursor.execute('SELECT name FROM materials').fetchall()
existing_names = {row[0] for row in existing}

print("=" * 70)
print("📋 АНАЛИЗ НА МАТЕРИАЛИТЕ")
print("=" * 70)

# Compare and categorize
materials_to_add = []
materials_to_update = []
materials_already_exist = []

for name, qty in new_materials.items():
    # Check if similar name exists (case-insensitive, strip whitespace)
    found = False
    for existing_name in existing_names:
        if existing_name.lower().strip() == name.lower().strip():
            materials_to_update.append((name, existing_name, qty))
            found = True
            break
    
    if not found:
        category = get_category(name)
        materials_to_add.append((name, category, qty))

print(f"\n✅ В базата данни: {len(existing_names)} материала")
print(f"📝 Нови от вашия списък: {len(new_materials)} материала")
print(f"➕ Ще се добавят: {len(materials_to_add)} нови материала")
print(f"🔄 Ще се обновят: {len(materials_to_update)} съществуващи материала")

# Show materials to add
if materials_to_add:
    print("\n" + "=" * 70)
    print("➕ НОВИ МАТЕРИАЛИ ЗА ДОБАВЯНЕ:")
    print("=" * 70)
    for name, category, qty in materials_to_add:
        print(f"  • {name} ({qty}бр) → Категория: {category}")

# Show materials to update
if materials_to_update:
    print("\n" + "=" * 70)
    print("🔄 МАТЕРИАЛИ ЗА ОБНОВЯВАНЕ:")
    print("=" * 70)
    for new_name, existing_name, qty in materials_to_update:
        old_qty = cursor.execute('SELECT quantity FROM materials WHERE name = ?', (existing_name,)).fetchone()[0]
        print(f"  • {existing_name}: {old_qty}бр → {qty}бр")

# Ask for confirmation
print("\n" + "=" * 70)
response = input("\n❓ Искате ли да импортирате тези материали? (yes/no): ").lower()

if response in ['yes', 'y', 'да']:
    # Add new materials
    for name, category, qty in materials_to_add:
        cursor.execute('''
            INSERT INTO materials (name, category, quantity, min_threshold, notes)
            VALUES (?, ?, ?, 5, '')
        ''', (name, category, qty))
    
    # Update existing materials
    for new_name, existing_name, qty in materials_to_update:
        cursor.execute('''
            UPDATE materials 
            SET quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE name = ?
        ''', (qty, existing_name))
    
    conn.commit()
    
    print("\n✅ Успешно!")
    print(f"   ➕ Добавени: {len(materials_to_add)} материала")
    print(f"   🔄 Обновени: {len(materials_to_update)} материала")
    
    # Show final stats
    total = cursor.execute('SELECT COUNT(*) FROM materials').fetchone()[0]
    out_of_stock = cursor.execute('SELECT COUNT(*) FROM materials WHERE quantity = 0').fetchone()[0]
    low_stock = cursor.execute('SELECT COUNT(*) FROM materials WHERE quantity > 0 AND quantity <= min_threshold').fetchone()[0]
    
    print(f"\n📊 СТАТИСТИКА НА БАЗАТА:")
    print(f"   Общо материали: {total}")
    print(f"   🔴 Изчерпани (0 бр): {out_of_stock}")
    print(f"   🟠 Ниски (≤5 бр): {low_stock}")
    print(f"   🟢 Достатъчни: {total - out_of_stock - low_stock}")
else:
    print("\n❌ Импортът е отказан.")

conn.close()
print("\n" + "=" * 70)
