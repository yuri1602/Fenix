# -*- coding: utf-8 -*-
import sqlite3
import sys

# Set UTF-8 encoding for output
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('school_inventory.db')
cursor = conn.cursor()

print("=== ТЕКУЩИ МАТЕРИАЛИ В БАЗАТА ===\n")
materials = cursor.execute('SELECT id, name, quantity FROM materials ORDER BY name').fetchall()
for m in materials:
    print(f'{m[0]:3d}. {m[1]:<50} - {m[2]:>4}бр')

print(f"\n=== ОБЩО: {len(materials)} материала ===")
conn.close()
