"""
Скрипт за обновяване на сигурността на системата:
1. Създава таблица security_logs
2. Променя паролите на admin и user
3. Показва статистика
"""

import sqlite3
from werkzeug.security import generate_password_hash
import os
from datetime import datetime

DATABASE = 'school_inventory.db'

def update_security():
    """Обновява сигурността на системата"""
    
    if not os.path.exists(DATABASE):
        print("❌ Файлът school_inventory.db не съществува!")
        print("   Моля, първо стартирайте app.py")
        return
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    print("=" * 60)
    print("🔒 ОБНОВЯВАНЕ НА СИГУРНОСТТА")
    print("=" * 60)
    print()
    
    # 1. Създаване на security_logs таблица
    print("1️⃣  Създаване на таблица security_logs...")
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                username TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                user_agent TEXT,
                success INTEGER NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("   ✅ Таблицата security_logs е създадена")
    except Exception as e:
        print(f"   ⚠️  Грешка: {e}")
    
    # 2. Промяна на паролите
    print("\n2️⃣  Промяна на пароли...")
    
    # Нови силни пароли
    new_admin_password = 'Fenix@Admin2025!'
    new_user_password = 'Fenix@User2025!'
    
    # Хеширане на паролите
    admin_hash = generate_password_hash(new_admin_password)
    user_hash = generate_password_hash(new_user_password)
    
    # Проверка дали потребителите съществуват
    cursor.execute("SELECT username FROM users WHERE username = 'admin'")
    admin_exists = cursor.fetchone() is not None
    
    cursor.execute("SELECT username FROM users WHERE username = 'user'")
    user_exists = cursor.fetchone() is not None
    
    # Обновяване или създаване на admin
    if admin_exists:
        cursor.execute('''
            UPDATE users 
            SET password_hash = ? 
            WHERE username = 'admin'
        ''', (admin_hash,))
        print("   ✅ Паролата на 'admin' е обновена")
    else:
        cursor.execute('''
            INSERT INTO users (username, password_hash, full_name, role, company)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', admin_hash, 'Администратор', 'admin', 'Училище'))
        print("   ✅ Създаден потребител 'admin'")
    
    # Обновяване или създаване на user
    if user_exists:
        cursor.execute('''
            UPDATE users 
            SET password_hash = ? 
            WHERE username = 'user'
        ''', (user_hash,))
        print("   ✅ Паролата на 'user' е обновена")
    else:
        cursor.execute('''
            INSERT INTO users (username, password_hash, full_name, role, company)
            VALUES (?, ?, ?, ?, ?)
        ''', ('user', user_hash, 'Потребител', 'user', 'Училище'))
        print("   ✅ Създаден потребител 'user'")
    
    conn.commit()
    
    # 3. Показване на статистика
    print("\n3️⃣  Статистика на системата:")
    print("-" * 60)
    
    # Брой потребители
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"   Потребители: {user_count}")
    
    # Брой материали
    cursor.execute("SELECT COUNT(*) FROM materials")
    materials_count = cursor.fetchone()[0]
    print(f"   Материали: {materials_count}")
    
    # Брой учебници
    cursor.execute("SELECT COUNT(*) FROM books")
    books_count = cursor.fetchone()[0]
    print(f"   Учебници/Тетрадки: {books_count}")
    
    # Брой заявки
    cursor.execute("SELECT COUNT(*) FROM material_requests")
    requests_count = cursor.fetchone()[0]
    print(f"   Заявки: {requests_count}")
    
    # Списък на всички потребители
    print("\n   Списък на потребителите:")
    cursor.execute("SELECT id, username, full_name, role FROM users ORDER BY role DESC, username")
    users = cursor.fetchall()
    for user in users:
        role_icon = "👑" if user[3] == 'admin' else "👤"
        print(f"      {role_icon} {user[1]:15} | {user[2]:20} | {user[3]}")
    
    conn.close()
    
    # 4. Нови креденции
    print("\n" + "=" * 60)
    print("🎉 ОБНОВЯВАНЕТО ЗАВЪРШИ УСПЕШНО!")
    print("=" * 60)
    print("\n📝 НОВИ КРЕДЕНЦИИ (запазете ги на сигурно място!):\n")
    print("   ┌─────────────────────────────────────────────────────────┐")
    print("   │ 👑 АДМИНИСТРАТОР                                        │")
    print("   ├─────────────────────────────────────────────────────────┤")
    print(f"   │ Потребител: admin                                      │")
    print(f"   │ Парола:     {new_admin_password:40} │")
    print("   └─────────────────────────────────────────────────────────┘")
    print()
    print("   ┌─────────────────────────────────────────────────────────┐")
    print("   │ 👤 ПОТРЕБИТЕЛ                                           │")
    print("   ├─────────────────────────────────────────────────────────┤")
    print(f"   │ Потребител: user                                       │")
    print(f"   │ Парола:     {new_user_password:40} │")
    print("   └─────────────────────────────────────────────────────────┘")
    print()
    print("⚠️  ВАЖНО: Сменете тези пароли ВЕДНАГА след първия вход!")
    print("   Използвайте бутона 'Смяна на парола' в навигацията.")
    print()
    print("🔐 НОВИ ФУНКЦИИ ЗА СИГУРНОСТ:")
    print("   ✓ Логване на всички опити за вход (IP, време, резултат)")
    print("   ✓ Защита срещу brute-force атаки (5 опита, 5 мин блокиране)")
    print("   ✓ Промяна на парола от потребителя")
    print("   ✓ Промяна на парола от администратора")
    print("   ✓ Преглед на логовете за сигурност (само админ)")
    print("   ✓ Експорт на логовете в CSV файл")
    print()
    print("📊 Логовете се записват в:")
    print("   • База данни: school_inventory.db (таблица security_logs)")
    print("   • Файл: logs/security.log")
    print()
    print("=" * 60)

if __name__ == '__main__':
    try:
        update_security()
    except Exception as e:
        print(f"\n❌ ГРЕШКА: {e}")
        import traceback
        traceback.print_exc()
