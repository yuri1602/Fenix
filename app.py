from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import sqlite3
import os
from datetime import datetime, timedelta
import pandas as pd
from openpyxl import load_workbook
import io
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'  # Change this!

# Session configuration for better mobile/tablet support
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Allow cookies from same site
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)  # 24 hours

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

DATABASE = 'school_inventory.db'

def get_db_connection():
    """Create database connection"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

def init_db():
    """Initialize database with tables"""
    conn = get_db_connection()
    
    # Materials table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_threshold INTEGER NOT NULL DEFAULT 5,
            max_threshold INTEGER DEFAULT 50,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Users table
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            company TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP
        )
    ''')
    
    # Books table (учебници и тетрадки)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            grade INTEGER NOT NULL,
            publisher TEXT,
            author TEXT,
            quantity INTEGER NOT NULL DEFAULT 0,
            min_threshold INTEGER NOT NULL DEFAULT 5,
            notes TEXT,
            type TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Material requests table (заявки за материали)
    conn.execute('''
        CREATE TABLE IF NOT EXISTS material_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            material_id INTEGER NOT NULL,
            requested_quantity INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            admin_notes TEXT,
            processed_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (material_id) REFERENCES materials(id),
            FOREIGN KEY (processed_by) REFERENCES users(id)
        )
    ''')
    
    # Create default admin user if no users exist
    user_count = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    if user_count == 0:
        admin_password = generate_password_hash('admin123')
        conn.execute('''
            INSERT INTO users (username, password_hash, full_name, role, company)
            VALUES (?, ?, ?, ?, ?)
        ''', ('admin', admin_password, 'Администратор', 'admin', 'Училище'))
        conn.commit()
        print("✅ Създаден администраторски акаунт: admin / admin123")
    
    # Migration: Add max_threshold column if it doesn't exist
    try:
        conn.execute('SELECT max_threshold FROM materials LIMIT 1')
    except:
        print("🔄 Добавяне на колона max_threshold...")
        conn.execute('ALTER TABLE materials ADD COLUMN max_threshold INTEGER DEFAULT 50')
        conn.commit()
        print("✅ Колоната max_threshold е добавена")
    
    # Add some sample data if table is empty
    count = conn.execute('SELECT COUNT(*) FROM materials').fetchone()[0]
    if count == 0:
        sample_data = [
            ('Маркер за дъска черен', 'Маркери и химикали', 15, 5, 50, ''),
            ('Маркер за дъска син', 'Маркери и химикали', 3, 5, 30, 'Ниско количество'),
            ('Маркер за дъска червен', 'Маркери и химикали', 0, 5, 30, 'Свършени'),
            ('Хартия А4 - пакет 500 листа', 'Хартия и тетрадки', 25, 10, 100, ''),
            ('Тетрадки широки линии', 'Хартия и тетрадки', 8, 5, 50, ''),
            ('Лепило топче 10г', 'Лепила и бои', 12, 5, 40, ''),
            ('Лепило течно 50мл', 'Лепила и бои', 2, 5, 30, 'Да се поръча'),
            ('Темперни бои комплект', 'Лепила и бои', 6, 3, 20, ''),
            ('Папка с ластик А4', 'Папки и кламери', 20, 10, 60, ''),
            ('Кламери 25мм - кутия', 'Папки и кламери', 4, 5, 30, ''),
            ('Ножица учебна', 'Инструменти', 18, 5, 40, ''),
            ('Линийка 30см', 'Инструменти', 22, 10, 50, ''),
            ('Острилка метална', 'Инструменти', 1, 5, 30, 'Спешно нужни'),
            ('Перфоратор офис', 'Инструменти', 0, 2, 10, 'Повреден'),
            ('Почистващи кърпи - пакет', 'Почистващи материали', 8, 5, 30, ''),
            ('Препарат за дъски', 'Почистващи материали', 3, 3, 20, ''),
        ]
        conn.executemany('''
            INSERT INTO materials (name, category, quantity, min_threshold, max_threshold, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', sample_data)
        conn.commit()
    
    # Add sample books if table is empty
    books_count = conn.execute('SELECT COUNT(*) FROM books').fetchone()[0]
    if books_count == 0:
        sample_books = [
            ('Български език', 1, 'Просвета', 'К. Иванова', 25, 5, '', 'Учебник'),
            ('Математика', 1, 'Булвест', 'В. Ангелов', 28, 5, '', 'Учебник'),
            ('Човекът и природата', 2, 'Просвета', '', 20, 5, '', 'Учебник'),
            ('Български език - работна тетрадка', 1, 'Просвета', 'К. Иванова', 30, 5, '', 'Учебна тетрадка'),
            ('Математика - работна тетрадка', 2, 'Булвест', 'В. Ангелов', 22, 5, '', 'Учебна тетрадка'),
            ('История и цивилизации', 5, 'Анубис', '', 3, 5, 'Ниска наличност', 'Учебник'),
            ('Английски език', 3, 'Просвета', '', 0, 5, 'Изчерпан', 'Учебник'),
        ]
        conn.executemany('''
            INSERT INTO books (subject, grade, publisher, author, quantity, min_threshold, notes, type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', sample_books)
        conn.commit()
    
    conn.close()

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/')
def index():
    """Main page - requires login"""
    if 'user_id' not in session:
        print(f"⚠️  Session check failed - no user_id in session. Session data: {dict(session)}")
        return redirect(url_for('login_page'))
    
    # Get user data from session
    user_data = {
        'id': session.get('user_id'),
        'username': session.get('username'),
        'full_name': session.get('full_name', session.get('username')),
        'role': session.get('role'),
        'company': session.get('company')
    }
    print(f"✅ Session valid for user: {user_data['username']}")
    return render_template('index.html', user=user_data)

@app.route('/login')
def login_page():
    """Login page"""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password_hash'], password):
        session.permanent = True  # Make session persistent
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['full_name'] = user['full_name']
        session['role'] = user['role']
        session['company'] = user['company']
        
        print(f"✅ User {username} logged in successfully. Session ID: {session.get('user_id')}")
        print(f"   Session permanent: {session.permanent}")
        print(f"   Session data: {dict(session)}")
        
        # Update last login
        conn = get_db_connection()
        conn.execute('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', (user['id'],))
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'full_name': user['full_name'],
                'role': user['role'],
                'company': user['company']
            }
        })
    else:
        return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/current-user', methods=['GET'])
@login_required
def get_current_user():
    """Get current user info"""
    return jsonify({
        'id': session['user_id'],
        'username': session['username'],
        'full_name': session['full_name'],
        'role': session['role'],
        'company': session.get('company')
    })

# ==================== USER MANAGEMENT ROUTES ====================

@app.route('/api/users', methods=['GET'])
@admin_required
def get_users():
    """Get all users (admin only)"""
    conn = get_db_connection()
    users = conn.execute('SELECT id, username, full_name, role, company, created_at, last_login FROM users ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify([dict(row) for row in users])

@app.route('/api/users', methods=['POST'])
@admin_required
def create_user():
    """Create new user (admin only)"""
    data = request.get_json()
    
    # Debug logging
    print(f"DEBUG: Received data: {data}")
    print(f"DEBUG: Data type: {type(data)}")
    if data:
        print(f"DEBUG: Keys in data: {data.keys()}")
    
    required = ['username', 'password', 'full_name', 'role']
    if not all(field in data for field in required):
        missing = [field for field in required if field not in data]
        print(f"DEBUG: Missing fields: {missing}")
        return jsonify({'error': f'Missing required fields: {missing}'}), 400
    
    password_hash = generate_password_hash(data['password'])
    
    try:
        conn = get_db_connection()
        cursor = conn.execute('''
            INSERT INTO users (username, password_hash, full_name, role, company)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['username'], password_hash, data['full_name'], data['role'], data.get('company', '')))
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        return jsonify({'id': user_id, 'message': 'User created successfully'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    """Update user (admin only)"""
    data = request.get_json()
    
    conn = get_db_connection()
    
    # Build update query
    updates = []
    params = []
    
    if 'full_name' in data:
        updates.append('full_name = ?')
        params.append(data['full_name'])
    if 'role' in data:
        updates.append('role = ?')
        params.append(data['role'])
    if 'company' in data:
        updates.append('company = ?')
        params.append(data['company'])
    if 'password' in data and data['password']:
        updates.append('password_hash = ?')
        params.append(generate_password_hash(data['password']))
    
    if updates:
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        conn.execute(query, params)
        conn.commit()
    
    conn.close()
    return jsonify({'message': 'User updated successfully'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user (admin only)"""
    # Prevent deleting yourself
    if user_id == session['user_id']:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    conn = get_db_connection()
    conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'User deleted successfully'})

# ==================== MATERIALS ROUTES ====================

@app.route('/api/materials', methods=['GET'])
@login_required
def get_materials():
    """Get all materials with optional filtering"""
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()
    low_stock = request.args.get('low_stock', '').lower() == 'true'
    
    conn = get_db_connection()
    query = 'SELECT * FROM materials WHERE 1=1'
    params = []
    
    if search:
        query += ' AND (name LIKE ? OR notes LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    
    if category:
        query += ' AND category = ?'
        params.append(category)
    
    if low_stock:
        query += ' AND quantity <= min_threshold'
    
    query += ' ORDER BY category, name'
    
    materials = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in materials])

@app.route('/api/materials/<int:material_id>', methods=['GET'])
@login_required
def get_material(material_id):
    """Get single material by ID"""
    conn = get_db_connection()
    material = conn.execute('SELECT * FROM materials WHERE id = ?', (material_id,)).fetchone()
    conn.close()
    
    if material is None:
        return jsonify({'error': 'Material not found'}), 404
    
    return jsonify(dict(material))

@app.route('/api/materials', methods=['POST'])
@login_required
def add_material():
    """Add new material"""
    data = request.get_json()
    
    if not data.get('name') or not data.get('category'):
        return jsonify({'error': 'Name and category are required'}), 400
    
    conn = get_db_connection()
    cursor = conn.execute('''
        INSERT INTO materials (name, category, quantity, min_threshold, max_threshold, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        data['name'],
        data['category'],
        data.get('quantity', 0),
        data.get('min_threshold', 5),
        data.get('max_threshold', 50),
        data.get('notes', '')
    ))
    conn.commit()
    material_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': material_id, 'message': 'Material added successfully'}), 201

@app.route('/api/materials/<int:material_id>', methods=['PUT'])
@login_required
def update_material(material_id):
    """Update existing material"""
    data = request.get_json()
    
    conn = get_db_connection()
    conn.execute('''
        UPDATE materials 
        SET name = ?, category = ?, quantity = ?, min_threshold = ?, 
            max_threshold = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data['name'],
        data['category'],
        data['quantity'],
        data.get('min_threshold', 5),
        data.get('max_threshold', 50),
        data.get('notes', ''),
        material_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Material updated successfully'})

@app.route('/api/materials/<int:material_id>/quantity', methods=['PATCH'])
@login_required
def update_quantity(material_id):
    """Update material quantity (increment/decrement)"""
    data = request.get_json()
    change = data.get('change', 0)
    
    conn = get_db_connection()
    conn.execute('''
        UPDATE materials 
        SET quantity = MAX(0, quantity + ?), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (change, material_id))
    conn.commit()
    
    # Get updated material
    material = conn.execute('SELECT * FROM materials WHERE id = ?', (material_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(material))

@app.route('/api/materials/<int:material_id>', methods=['DELETE'])
@login_required
def delete_material(material_id):
    """Delete material"""
    conn = get_db_connection()
    conn.execute('DELETE FROM materials WHERE id = ?', (material_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Material deleted successfully'})

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all unique categories"""
    conn = get_db_connection()
    categories = conn.execute('SELECT DISTINCT category FROM materials ORDER BY category').fetchall()
    conn.close()
    
    return jsonify([row['category'] for row in categories])

@app.route('/api/import', methods=['POST'])
@login_required
def import_excel():
    """Import materials from Excel file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'Only Excel files are supported'}), 400
    
    try:
        # Read Excel file
        df = pd.read_excel(file)
        
        # Normalize column names (handle different naming conventions)
        df.columns = df.columns.str.strip().str.lower()
        
        # Map possible column names
        name_cols = ['име', 'име на материал', 'name', 'материал']
        quantity_cols = ['наличност', 'quantity', 'количество', 'брой']
        category_cols = ['категория', 'category', 'тип']
        
        name_col = next((col for col in name_cols if col in df.columns), None)
        quantity_col = next((col for col in quantity_cols if col in df.columns), None)
        category_col = next((col for col in category_cols if col in df.columns), None)
        
        if not name_col:
            return jsonify({'error': 'Column for material name not found'}), 400
        
        conn = get_db_connection()
        imported = 0
        
        for _, row in df.iterrows():
            name = str(row[name_col]).strip()
            if not name or name.lower() in ['nan', 'none', '']:
                continue
            
            quantity = int(row[quantity_col]) if quantity_col and pd.notna(row[quantity_col]) else 0
            category = str(row[category_col]).strip() if category_col and pd.notna(row[category_col]) else 'Други'
            
            # Check if material already exists
            existing = conn.execute('SELECT id FROM materials WHERE name = ?', (name,)).fetchone()
            
            if existing:
                # Update existing
                conn.execute('''
                    UPDATE materials 
                    SET quantity = ?, category = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (quantity, category, existing['id']))
            else:
                # Insert new
                conn.execute('''
                    INSERT INTO materials (name, category, quantity, min_threshold)
                    VALUES (?, ?, ?, 5)
                ''', (name, category, quantity))
            
            imported += 1
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Successfully imported {imported} materials'})
    
    except Exception as e:
        return jsonify({'error': f'Error importing file: {str(e)}'}), 500

@app.route('/api/export', methods=['GET'])
@login_required
def export_excel():
    """Export materials to Excel file"""
    low_stock_only = request.args.get('low_stock', '').lower() == 'true'
    
    conn = get_db_connection()
    
    if low_stock_only:
        materials = conn.execute('''
            SELECT name, category, quantity, min_threshold, notes
            FROM materials 
            WHERE quantity <= min_threshold
            ORDER BY category, name
        ''').fetchall()
        filename = f'low_stock_materials_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    else:
        materials = conn.execute('''
            SELECT name, category, quantity, min_threshold, notes
            FROM materials 
            ORDER BY category, name
        ''').fetchall()
        filename = f'all_materials_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    conn.close()
    
    # Create DataFrame
    df = pd.DataFrame([dict(row) for row in materials])
    
    # Rename columns to Bulgarian
    df.columns = ['Име на материал', 'Категория', 'Наличност', 'Минимален праг', 'Забележки']
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Материали')
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Материали']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    """Get inventory statistics"""
    conn = get_db_connection()
    
    total = conn.execute('SELECT COUNT(*) as count FROM materials').fetchone()['count']
    out_of_stock = conn.execute('SELECT COUNT(*) as count FROM materials WHERE quantity = 0').fetchone()['count']
    low_stock = conn.execute('SELECT COUNT(*) as count FROM materials WHERE quantity > 0 AND quantity <= min_threshold').fetchone()['count']
    adequate = conn.execute('SELECT COUNT(*) as count FROM materials WHERE quantity > min_threshold').fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'total': total,
        'out_of_stock': out_of_stock,
        'low_stock': low_stock,
        'adequate': adequate
    })

# ==================== BOOKS ROUTES (УЧЕБНИЦИ) ====================

@app.route('/api/books', methods=['GET'])
@login_required
def get_books():
    """Get all books with optional filtering"""
    search = request.args.get('search', '').strip()
    grade = request.args.get('grade', '').strip()
    book_type = request.args.get('type', '').strip()
    publisher = request.args.get('publisher', '').strip()
    low_stock = request.args.get('low_stock', '').lower() == 'true'
    
    conn = get_db_connection()
    query = 'SELECT * FROM books WHERE 1=1'
    params = []
    
    if search:
        query += ' AND (subject LIKE ? OR author LIKE ? OR notes LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
    
    if grade:
        query += ' AND grade = ?'
        params.append(int(grade))
    
    if book_type:
        query += ' AND type = ?'
        params.append(book_type)
    
    if publisher:
        query += ' AND publisher = ?'
        params.append(publisher)
    
    if low_stock:
        query += ' AND quantity <= min_threshold'
    
    query += ' ORDER BY grade, subject'
    
    books = conn.execute(query, params).fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in books])

@app.route('/api/books/<int:book_id>', methods=['GET'])
@login_required
def get_book(book_id):
    """Get single book by ID"""
    conn = get_db_connection()
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    conn.close()
    
    if book is None:
        return jsonify({'error': 'Book not found'}), 404
    
    return jsonify(dict(book))

@app.route('/api/books', methods=['POST'])
@login_required
def add_book():
    """Add new book"""
    data = request.get_json()
    
    if not data.get('subject') or not data.get('grade') or not data.get('type'):
        return jsonify({'error': 'Subject, grade and type are required'}), 400
    
    conn = get_db_connection()
    cursor = conn.execute('''
        INSERT INTO books (subject, grade, publisher, author, quantity, min_threshold, notes, type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data['subject'],
        data['grade'],
        data.get('publisher', ''),
        data.get('author', ''),
        data.get('quantity', 0),
        data.get('min_threshold', 5),
        data.get('notes', ''),
        data['type']
    ))
    conn.commit()
    book_id = cursor.lastrowid
    conn.close()
    
    return jsonify({'id': book_id, 'message': 'Book added successfully'}), 201

@app.route('/api/books/<int:book_id>', methods=['PUT'])
@login_required
def update_book(book_id):
    """Update existing book"""
    data = request.get_json()
    
    conn = get_db_connection()
    conn.execute('''
        UPDATE books 
        SET subject = ?, grade = ?, publisher = ?, author = ?, 
            quantity = ?, min_threshold = ?, notes = ?, type = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        data['subject'],
        data['grade'],
        data.get('publisher', ''),
        data.get('author', ''),
        data['quantity'],
        data.get('min_threshold', 5),
        data.get('notes', ''),
        data['type'],
        book_id
    ))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Book updated successfully'})

@app.route('/api/books/<int:book_id>/quantity', methods=['PATCH'])
@login_required
def update_book_quantity(book_id):
    """Update book quantity (increment/decrement)"""
    data = request.get_json()
    change = data.get('change', 0)
    
    conn = get_db_connection()
    conn.execute('''
        UPDATE books 
        SET quantity = MAX(0, quantity + ?), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (change, book_id))
    conn.commit()
    
    # Get updated book
    book = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
    conn.close()
    
    return jsonify(dict(book))

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
@login_required
def delete_book(book_id):
    """Delete book"""
    conn = get_db_connection()
    conn.execute('DELETE FROM books WHERE id = ?', (book_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Book deleted successfully'})

@app.route('/api/books/grades', methods=['GET'])
@login_required
def get_grades():
    """Get all unique grades"""
    conn = get_db_connection()
    grades = conn.execute('SELECT DISTINCT grade FROM books ORDER BY grade').fetchall()
    conn.close()
    
    return jsonify([row['grade'] for row in grades])

@app.route('/api/books/publishers', methods=['GET'])
@login_required
def get_publishers():
    """Get all unique publishers"""
    conn = get_db_connection()
    publishers = conn.execute('SELECT DISTINCT publisher FROM books WHERE publisher != "" ORDER BY publisher').fetchall()
    conn.close()
    
    return jsonify([row['publisher'] for row in publishers])

@app.route('/api/books/import', methods=['POST'])
@login_required
def import_books_excel():
    """Import books from Excel file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'Only Excel files are supported'}), 400
    
    try:
        df = pd.read_excel(file)
        df.columns = df.columns.str.strip().str.lower()
        
        # Map column names
        subject_cols = ['предмет', 'subject', 'име']
        grade_cols = ['клас', 'grade', 'класс']
        publisher_cols = ['издателство', 'publisher']
        author_cols = ['автор', 'author']
        quantity_cols = ['наличност', 'quantity', 'количество', 'брой']
        type_cols = ['тип', 'type', 'вид']
        
        subject_col = next((col for col in subject_cols if col in df.columns), None)
        grade_col = next((col for col in grade_cols if col in df.columns), None)
        publisher_col = next((col for col in publisher_cols if col in df.columns), None)
        author_col = next((col for col in author_cols if col in df.columns), None)
        quantity_col = next((col for col in quantity_cols if col in df.columns), None)
        type_col = next((col for col in type_cols if col in df.columns), None)
        
        if not subject_col or not grade_col:
            return jsonify({'error': 'Required columns not found (subject, grade)'}), 400
        
        conn = get_db_connection()
        imported = 0
        
        for _, row in df.iterrows():
            subject = str(row[subject_col]).strip()
            if not subject or subject.lower() in ['nan', 'none', '']:
                continue
            
            try:
                grade = int(row[grade_col]) if grade_col and pd.notna(row[grade_col]) else 1
            except:
                grade = 1
            
            publisher = str(row[publisher_col]).strip() if publisher_col and pd.notna(row[publisher_col]) else ''
            author = str(row[author_col]).strip() if author_col and pd.notna(row[author_col]) else ''
            quantity = int(row[quantity_col]) if quantity_col and pd.notna(row[quantity_col]) else 0
            book_type = str(row[type_col]).strip() if type_col and pd.notna(row[type_col]) else 'Учебник'
            
            # Check if book already exists
            existing = conn.execute('''
                SELECT id FROM books 
                WHERE subject = ? AND grade = ? AND type = ?
            ''', (subject, grade, book_type)).fetchone()
            
            if existing:
                conn.execute('''
                    UPDATE books 
                    SET quantity = ?, publisher = ?, author = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (quantity, publisher, author, existing['id']))
            else:
                conn.execute('''
                    INSERT INTO books (subject, grade, publisher, author, quantity, min_threshold, type)
                    VALUES (?, ?, ?, ?, ?, 5, ?)
                ''', (subject, grade, publisher, author, quantity, book_type))
            
            imported += 1
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Successfully imported {imported} books'})
    
    except Exception as e:
        return jsonify({'error': f'Error importing file: {str(e)}'}), 500

@app.route('/api/books/export', methods=['GET'])
@login_required
def export_books_excel():
    """Export books to Excel file"""
    low_stock_only = request.args.get('low_stock', '').lower() == 'true'
    book_type = request.args.get('type', '').strip()
    
    conn = get_db_connection()
    
    query = 'SELECT subject, grade, publisher, author, quantity, min_threshold, notes, type FROM books WHERE 1=1'
    params = []
    
    if low_stock_only:
        query += ' AND quantity <= min_threshold'
    
    if book_type:
        query += ' AND type = ?'
        params.append(book_type)
    
    query += ' ORDER BY grade, subject'
    
    books = conn.execute(query, params).fetchall()
    conn.close()
    
    # Create DataFrame
    df = pd.DataFrame([dict(row) for row in books])
    
    # Rename columns to Bulgarian
    df.columns = ['Предмет', 'Клас', 'Издателство', 'Автор', 'Наличност', 'Минимален праг', 'Забележки', 'Тип']
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Учебници')
        worksheet = writer.sheets['Учебници']
        for idx, col in enumerate(df.columns):
            max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
            worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
    
    output.seek(0)
    
    if low_stock_only:
        filename = f'low_stock_books_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    elif book_type:
        filename = f'{book_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    else:
        filename = f'all_books_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@app.route('/api/books/stats', methods=['GET'])
@login_required
def get_books_stats():
    """Get books statistics"""
    book_type = request.args.get('type', '').strip()
    
    conn = get_db_connection()
    
    where_clause = f" WHERE type = '{book_type}'" if book_type else ""
    
    total = conn.execute(f'SELECT COUNT(*) as count FROM books{where_clause}').fetchone()['count']
    out_of_stock = conn.execute(f'SELECT COUNT(*) as count FROM books{where_clause} {"AND" if book_type else "WHERE"} quantity = 0').fetchone()['count']
    low_stock = conn.execute(f'SELECT COUNT(*) as count FROM books{where_clause} {"AND" if book_type else "WHERE"} quantity > 0 AND quantity <= min_threshold').fetchone()['count']
    adequate = conn.execute(f'SELECT COUNT(*) as count FROM books{where_clause} {"AND" if book_type else "WHERE"} quantity > min_threshold').fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'total': total,
        'out_of_stock': out_of_stock,
        'low_stock': low_stock,
        'adequate': adequate
    })

# ==================== ADMIN ENDPOINTS ====================

@app.route('/api/admin/categories', methods=['GET'])
@admin_required
def get_categories_admin():
    """Get all categories with material count (admin only)"""
    conn = get_db_connection()
    
    categories = conn.execute('''
        SELECT category as name, COUNT(*) as count 
        FROM materials 
        GROUP BY category 
        ORDER BY category
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict(row) for row in categories])

@app.route('/api/admin/categories', methods=['POST'])
@admin_required
def add_category():
    """Add new category (admin only)"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    conn = get_db_connection()
    
    # Check if category already exists
    existing = conn.execute('SELECT COUNT(*) as count FROM materials WHERE category = ?', (name,)).fetchone()
    
    if existing['count'] > 0:
        conn.close()
        return jsonify({'error': 'Категорията вече съществува'}), 400
    
    conn.close()
    
    return jsonify({'message': 'Category added successfully', 'name': name}), 201

@app.route('/api/admin/categories', methods=['PUT'])
@admin_required
def update_category():
    """Update category name (admin only) - updates all materials with this category"""
    data = request.get_json()
    old_name = data.get('old_name', '').strip()
    new_name = data.get('name', '').strip()
    
    if not old_name or not new_name:
        return jsonify({'error': 'Old and new category names are required'}), 400
    
    if old_name == new_name:
        return jsonify({'message': 'No changes made'}), 200
    
    conn = get_db_connection()
    
    # Check if new name already exists
    existing = conn.execute('SELECT COUNT(*) as count FROM materials WHERE category = ?', (new_name,)).fetchone()
    
    if existing['count'] > 0:
        conn.close()
        return jsonify({'error': 'Категорията вече съществува'}), 400
    
    # Update all materials with this category
    conn.execute('UPDATE materials SET category = ? WHERE category = ?', (new_name, old_name))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Category updated successfully'})

@app.route('/api/admin/categories', methods=['DELETE'])
@admin_required
def delete_category():
    """Delete category (admin only) - only if no materials use it"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Category name is required'}), 400
    
    conn = get_db_connection()
    
    # Check if any materials use this category
    count = conn.execute('SELECT COUNT(*) as count FROM materials WHERE category = ?', (name,)).fetchone()
    
    if count['count'] > 0:
        conn.close()
        return jsonify({'error': 'Не може да се изтрие категория с материали'}), 400
    
    conn.close()
    
    return jsonify({'message': 'Category deleted successfully'})

@app.route('/api/admin/publishers', methods=['GET'])
@admin_required
def get_publishers_admin():
    """Get all publishers with book count (admin only)"""
    conn = get_db_connection()
    
    publishers = conn.execute('''
        SELECT publisher as name, COUNT(*) as count 
        FROM books 
        GROUP BY publisher 
        ORDER BY publisher
    ''').fetchall()
    
    conn.close()
    
    return jsonify([dict(row) for row in publishers])

@app.route('/api/admin/publishers', methods=['POST'])
@admin_required
def add_publisher():
    """Add new publisher (admin only)"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Publisher name is required'}), 400
    
    conn = get_db_connection()
    
    # Check if publisher already exists
    existing = conn.execute('SELECT COUNT(*) as count FROM books WHERE publisher = ?', (name,)).fetchone()
    
    if existing['count'] > 0:
        conn.close()
        return jsonify({'error': 'Издателството вече съществува'}), 400
    
    conn.close()
    
    return jsonify({'message': 'Publisher added successfully', 'name': name}), 201

@app.route('/api/admin/publishers', methods=['PUT'])
@admin_required
def update_publisher():
    """Update publisher name (admin only) - updates all books with this publisher"""
    data = request.get_json()
    old_name = data.get('old_name', '').strip()
    new_name = data.get('name', '').strip()
    
    if not old_name or not new_name:
        return jsonify({'error': 'Old and new publisher names are required'}), 400
    
    if old_name == new_name:
        return jsonify({'message': 'No changes made'}), 200
    
    conn = get_db_connection()
    
    # Check if new name already exists
    existing = conn.execute('SELECT COUNT(*) as count FROM books WHERE publisher = ?', (new_name,)).fetchone()
    
    if existing['count'] > 0:
        conn.close()
        return jsonify({'error': 'Издателството вече съществува'}), 400
    
    # Update all books with this publisher
    conn.execute('UPDATE books SET publisher = ? WHERE publisher = ?', (new_name, old_name))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Publisher updated successfully'})

@app.route('/api/admin/publishers', methods=['DELETE'])
@admin_required
def delete_publisher():
    """Delete publisher (admin only) - only if no books use it"""
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Publisher name is required'}), 400
    
    conn = get_db_connection()
    
    # Check if any books use this publisher
    count = conn.execute('SELECT COUNT(*) as count FROM books WHERE publisher = ?', (name,)).fetchone()
    
    if count['count'] > 0:
        conn.close()
        return jsonify({'error': 'Не може да се изтрие издателство с учебници'}), 400
    
    conn.close()
    
    return jsonify({'message': 'Publisher deleted successfully'})

# ==================== MATERIAL REQUESTS ENDPOINTS ====================

@app.route('/api/requests', methods=['GET'])
@login_required
def get_requests():
    """Get material requests (filtered by role)"""
    conn = get_db_connection()
    
    if session.get('role') == 'admin':
        # Admin sees all requests
        requests = conn.execute('''
            SELECT 
                r.*,
                u.username,
                u.full_name,
                m.name as material_name,
                m.category as material_category,
                m.quantity as current_quantity,
                admin.full_name as processed_by_name
            FROM material_requests r
            JOIN users u ON r.user_id = u.id
            JOIN materials m ON r.material_id = m.id
            LEFT JOIN users admin ON r.processed_by = admin.id
            ORDER BY 
                CASE r.status 
                    WHEN 'pending' THEN 1 
                    WHEN 'approved' THEN 2 
                    WHEN 'rejected' THEN 3 
                END,
                r.created_at DESC
        ''').fetchall()
    else:
        # Regular users see only their own requests
        requests = conn.execute('''
            SELECT 
                r.*,
                u.username,
                u.full_name,
                m.name as material_name,
                m.category as material_category,
                m.quantity as current_quantity,
                admin.full_name as processed_by_name
            FROM material_requests r
            JOIN users u ON r.user_id = u.id
            JOIN materials m ON r.material_id = m.id
            LEFT JOIN users admin ON r.processed_by = admin.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        ''', (session['user_id'],)).fetchall()
    
    conn.close()
    
    return jsonify([dict(row) for row in requests])

@app.route('/api/requests', methods=['POST'])
@login_required
def create_request():
    """Create new material request"""
    data = request.get_json()
    material_id = data.get('material_id')
    requested_quantity = data.get('requested_quantity')
    notes = data.get('notes', '').strip()
    
    if not material_id or not requested_quantity:
        return jsonify({'error': 'Material and quantity are required'}), 400
    
    if requested_quantity <= 0:
        return jsonify({'error': 'Quantity must be positive'}), 400
    
    conn = get_db_connection()
    
    # Check if material exists
    material = conn.execute('SELECT * FROM materials WHERE id = ?', (material_id,)).fetchone()
    if not material:
        conn.close()
        return jsonify({'error': 'Material not found'}), 404
    
    # Create request
    conn.execute('''
        INSERT INTO material_requests (user_id, material_id, requested_quantity, notes, status)
        VALUES (?, ?, ?, ?, 'pending')
    ''', (session['user_id'], material_id, requested_quantity, notes))
    
    conn.commit()
    request_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
    conn.close()
    
    return jsonify({
        'message': 'Request created successfully',
        'id': request_id
    }), 201

@app.route('/api/requests/<int:request_id>', methods=['PUT'])
@admin_required
def process_request(request_id):
    """Process material request (approve/reject) - admin only"""
    data = request.get_json()
    status = data.get('status')  # 'approved' or 'rejected'
    admin_notes = data.get('admin_notes', '').strip()
    
    if status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400
    
    conn = get_db_connection()
    
    # Get request details
    req = conn.execute('''
        SELECT r.*, m.quantity as current_quantity
        FROM material_requests r
        JOIN materials m ON r.material_id = m.id
        WHERE r.id = ?
    ''', (request_id,)).fetchone()
    
    if not req:
        conn.close()
        return jsonify({'error': 'Request not found'}), 404
    
    if req['status'] != 'pending':
        conn.close()
        return jsonify({'error': 'Request already processed'}), 400
    
    # If approved, check if enough quantity and deduct
    if status == 'approved':
        if req['current_quantity'] < req['requested_quantity']:
            conn.close()
            return jsonify({'error': 'Insufficient quantity available'}), 400
        
        # Deduct quantity from materials
        conn.execute('''
            UPDATE materials 
            SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (req['requested_quantity'], req['material_id']))
    
    # Update request status
    conn.execute('''
        UPDATE material_requests 
        SET status = ?, 
            admin_notes = ?, 
            processed_by = ?, 
            processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (status, admin_notes, session['user_id'], request_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({'message': f'Request {status} successfully'})

@app.route('/api/requests/<int:request_id>', methods=['DELETE'])
@login_required
def delete_request(request_id):
    """Delete material request (only own pending requests)"""
    conn = get_db_connection()
    
    # Get request
    req = conn.execute('SELECT * FROM material_requests WHERE id = ?', (request_id,)).fetchone()
    
    if not req:
        conn.close()
        return jsonify({'error': 'Request not found'}), 404
    
    # Check permissions
    if req['user_id'] != session['user_id'] and session.get('role') != 'admin':
        conn.close()
        return jsonify({'error': 'Permission denied'}), 403
    
    # Only pending requests can be deleted by regular users
    if req['status'] != 'pending' and session.get('role') != 'admin':
        conn.close()
        return jsonify({'error': 'Cannot delete processed request'}), 400
    
    conn.execute('DELETE FROM material_requests WHERE id = ?', (request_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Request deleted successfully'})

@app.route('/api/requests/stats', methods=['GET'])
@admin_required
def get_requests_stats():
    """Get requests statistics (admin only)"""
    conn = get_db_connection()
    
    stats = {
        'pending': conn.execute("SELECT COUNT(*) as count FROM material_requests WHERE status = 'pending'").fetchone()['count'],
        'approved': conn.execute("SELECT COUNT(*) as count FROM material_requests WHERE status = 'approved'").fetchone()['count'],
        'rejected': conn.execute("SELECT COUNT(*) as count FROM material_requests WHERE status = 'rejected'").fetchone()['count'],
        'total': conn.execute("SELECT COUNT(*) as count FROM material_requests").fetchone()['count']
    }
    
    conn.close()
    
    return jsonify(stats)

@app.route('/api/requests/history/<int:user_id>', methods=['GET'])
@login_required
def get_user_request_history(user_id):
    """Get user's approved requests history"""
    # Users can only see their own history, admins can see anyone's
    if user_id != session['user_id'] and session.get('role') != 'admin':
        return jsonify({'error': 'Permission denied'}), 403
    
    conn = get_db_connection()
    
    history = conn.execute('''
        SELECT 
            r.*,
            m.name as material_name,
            m.category as material_category,
            admin.full_name as processed_by_name
        FROM material_requests r
        JOIN materials m ON r.material_id = m.id
        LEFT JOIN users admin ON r.processed_by = admin.id
        WHERE r.user_id = ? AND r.status = 'approved'
        ORDER BY r.processed_at DESC
    ''', (user_id,)).fetchall()
    
    conn.close()
    
    return jsonify([dict(row) for row in history])

if __name__ == '__main__':
    init_db()
    print("🎓 Система за управление на училищни материали")
    print("=" * 50)
    print("Сървърът стартира на: http://127.0.0.1:5000")
    print("Отворете този адрес в браузъра си.")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
