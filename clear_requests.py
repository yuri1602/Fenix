# -*- coding: utf-8 -*-
import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('school_inventory.db')
cursor = conn.cursor()

# Брой заявки преди изтриване
count_before = cursor.execute('SELECT COUNT(*) FROM material_requests').fetchone()[0]
print(f"📋 Брой заявки преди изтриване: {count_before}")

if count_before == 0:
    print("\n✅ Няма заявки за изтриване.")
    conn.close()
    exit()

# Покажи статистика
stats = cursor.execute('''
    SELECT status, COUNT(*) 
    FROM material_requests 
    GROUP BY status
''').fetchall()

print("\n📊 Статистика:")
for status, count in stats:
    status_text = {'pending': 'Чакащи', 'approved': 'Одобрени', 'rejected': 'Отказани'}.get(status, status)
    print(f"  - {status_text}: {count}")

# Потвърждение
print(f"\n⚠️  ЩЕ БЪДАТ ИЗТРИТИ ВСИЧКИ {count_before} ЗАЯВКИ!")
confirm = input("Сигурни ли сте? (напишете 'ДА' за потвърждение): ")

if confirm.strip().upper() == 'ДА':
    cursor.execute('DELETE FROM material_requests')
    conn.commit()
    print(f"\n✅ ГОТОВО! Изтрити са {count_before} заявки.")
    
    # Нулиране на автоинкремента
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="material_requests"')
    conn.commit()
    print("✅ Брояча за ID е нулиран.")
else:
    print("\n❌ Операцията е отказана.")

conn.close()
