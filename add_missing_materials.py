# -*- coding: utf-8 -*-
import sqlite3
import sys

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('school_inventory.db')
cursor = conn.cursor()

# Добави липсващите материали
missing = [
    ("Маркер за дъска Черен", "Други", 36, 5),
    ("Маркер за дъска Червен", "Други", 11, 5),
    ("Маркер за дъска Син", "Други", 13, 5),
    ("1 ел.устрилка", "Други", 1, 1),
]

print("=== ДОБАВЯНЕ НА ЛИПСВАЩИ МАТЕРИАЛИ ===\n")
for name, category, quantity, min_threshold in missing:
    # Проверка дали вече съществува
    existing = cursor.execute('SELECT id FROM materials WHERE name = ?', (name,)).fetchone()
    if existing:
        print(f"⚠ Вече съществува: {name}")
    else:
        cursor.execute('''
            INSERT INTO materials (name, category, quantity, min_threshold)
            VALUES (?, ?, ?, ?)
        ''', (name, category, quantity, min_threshold))
        print(f"✓ Добавен: {name} - {quantity}бр")

conn.commit()
conn.close()

print("\n✅ ГОТОВО!")
