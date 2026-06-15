import sqlite3
import uuid
import datetime
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

def get_db_connection():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_folder = os.path.join(base_dir, 'db')
    if not os.path.exists(db_folder):
        os.makedirs(db_folder)
    
    conn = sqlite3.connect(os.path.join(db_folder, 'users.db'))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Migration: Check for role column
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'role' not in columns:
        print("[User Service] Migrating: Adding 'role' column to users table...")
        conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'")

    conn.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Seed default admin if not exists
    cursor.execute('SELECT COUNT(*) FROM users WHERE email = ?', ('admin@system.com',))
    if cursor.fetchone()[0] == 0:
        hashed_admin_pass = generate_password_hash('111111')
        conn.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
                     ('admin@system.com', hashed_admin_pass, 'admin'))
    
    conn.commit()
    conn.close()

init_db()


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, hashed_password))
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    # Chấp nhận cả email hoặc username để tăng tính tương thích
    username = data.get('username') or data.get('email')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Email/Username and password required"}), 400

    conn = get_db_connection()
    # Kiểm tra email hoặc nếu username là 'admin' thì ánh xạ tới admin@system.com
    target_email = username
    if username == "admin":
        target_email = "admin@system.com"
        
    user = conn.execute('SELECT * FROM users WHERE email = ?', (target_email,)).fetchone()
    
    if not user or not check_password_hash(user['password'], password):
        conn.close()
        return jsonify({"error": "Invalid credentials"}), 401
    
    user_role = user['role']
    user_email = user['email']
    conn.close()

    token = str(uuid.uuid4()) 

    conn = get_db_connection()
    conn.execute('INSERT INTO tokens (token, email, role) VALUES (?, ?, ?)', (token, user_email, user_role))
    conn.commit()
    conn.close()
    
    return jsonify({
        "token": token,
        "role": user_role,
        "email": user_email
    })

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    token = request.args.get('token')
    
    conn = get_db_connection()
    session = conn.execute('SELECT * FROM tokens WHERE token = ?', (token,)).fetchone()
    conn.close()

    if session:
        return jsonify({
            "valid": True,
            "email": session['email'],
            "role": session['role']
        })
    else:
        return jsonify({"valid": False}), 401

@app.route('/api/users/me', methods=['GET'])
def get_me():
    token = request.headers.get('Authorization')
    if not token or not token.startswith("Bearer "):
         return jsonify({"error": "Missing token"}), 401
    
    token = token.split(" ")[1]
    conn = get_db_connection()
    session = conn.execute('SELECT * FROM tokens WHERE token = ?', (token,)).fetchone()
    
    if not session:
        conn.close()
        return jsonify({"error": "Invalid token"}), 401
        
    user = conn.execute('SELECT id, email, role FROM users WHERE email = ?', (session['email'],)).fetchone()
    conn.close()
    
    return jsonify(dict(user))

@app.route('/api/users', methods=['GET'])
def get_all_users():
    conn = get_db_connection()
    users = conn.execute('SELECT id, email, role FROM users').fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in users])

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    user = conn.execute('SELECT id, email, role FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    
    if user:
        return jsonify(dict(user))
    return jsonify({"error": "User not found"}), 404

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    role = data.get('role')
    password = data.get('password')
    
    conn = get_db_connection()
    
    if role:
        conn.execute('UPDATE users SET role = ? WHERE id = ?', (role, user_id))
    
    if password:
        hashed_password = generate_password_hash(password)
        conn.execute('UPDATE users SET password = ? WHERE id = ?', (hashed_password, user_id))
        
    conn.commit()
    conn.close()
    
    return jsonify({"message": "User updated successfully"}), 200

if __name__ == '__main__':
    print("User Service (Auth) running on port 5004...")
    app.run(debug=True, port=5004, host='0.0.0.0')