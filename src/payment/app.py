import sys
import os
import requests
import pika
import json
import datetime
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

BOOKING_SERVICE_URL = os.getenv("BOOKING_SERVICE_URL", "http://127.0.0.1:5002")
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_URL = os.getenv('RABBITMQ_URL')

# --- Database Setup ---
def get_db_connection():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_folder = os.path.join(base_dir, 'db')
    if not os.path.exists(db_folder):
        os.makedirs(db_folder)
    
    conn = sqlite3.connect(os.path.join(db_folder, 'payments.db'))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            card_number_masked TEXT NOT NULL,
            card_holder TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- Helper Functions ---
def send_invoice_event(invoice_data):
    try:
        if RABBITMQ_URL:
             params = pika.URLParameters(RABBITMQ_URL)
        else:
             url = f"amqp://admin:admin@{RABBITMQ_HOST}:5672/%2F"
             params = pika.URLParameters(url)
        
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        
        channel.queue_declare(queue='invoice_events', durable=True)
        
        message = {
            "type": "INVOICE_PRINT",
            "customer": invoice_data['customer'],
            "amount": invoice_data['amount'],
            "booking_id": invoice_data['booking_id'],
            "date": invoice_data['date']
        }
        
        channel.basic_publish(
            exchange='',
            routing_key='invoice_events',
            body=json.dumps(message),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        connection.close()
        print(f"[RabbitMQ] Sent invoice event for Booking #{invoice_data['booking_id']}")
    except Exception as e:
        print(f"[ERROR] Failed to send RabbitMQ event: {e}")

# --- API Endpoints ---

@app.route('/api/payment-methods', methods=['GET'])
def get_payment_methods():
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    cards = conn.execute('SELECT * FROM cards WHERE user_email = ? ORDER BY id DESC', (user_email,)).fetchall()
    conn.close()
    
    return jsonify([dict(card) for card in cards])

@app.route('/api/payment-methods', methods=['POST'])
def add_payment_method():
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    card_number = data.get('card_number')
    card_holder = data.get('card_holder')
    
    if not card_number or not card_holder:
        return jsonify({"error": "Invalid card details"}), 400
        
    # Masking: Keep only last 4 digits
    masked = f"**** **** **** {card_number[-4:]}"
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO cards (user_email, card_number_masked, card_holder) VALUES (?, ?, ?)',
                 (user_email, masked, card_holder))
    card_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Card saved", "card_number": masked, "id": card_id}), 201

@app.route('/api/payment-methods/<int:card_id>', methods=['DELETE'])
def delete_payment_method(card_id):
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
    
    conn = get_db_connection()
    # Ensure user owns the card
    card = conn.execute('SELECT * FROM cards WHERE id = ? AND user_email = ?', (card_id, user_email)).fetchone()
    if not card:
        conn.close()
        return jsonify({"error": "Card not found or access denied"}), 404
        
    conn.execute('DELETE FROM cards WHERE id = ?', (card_id,))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Card deleted"}), 200

@app.route('/api/payment-methods/<int:card_id>', methods=['PUT'])
def update_payment_method(card_id):
    user_email = request.headers.get('X-User-Email')
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    new_holder = data.get('card_holder')
    if not new_holder:
        return jsonify({"error": "Missing card_holder"}), 400

    conn = get_db_connection()
    # Check ownership
    card = conn.execute('SELECT * FROM cards WHERE id = ? AND user_email = ?', (card_id, user_email)).fetchone()
    if not card:
        conn.close()
        return jsonify({"error": "Card not found or access denied"}), 404
        
    conn.execute('UPDATE cards SET card_holder = ? WHERE id = ?', (new_holder, card_id))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Card updated"}), 200

@app.route('/api/payments', methods=['POST'])
def process_payment():
    data = request.json
    booking_id = data.get('booking_id')
    
    if not booking_id:
        return jsonify({"error": "Missing booking_id"}), 400
    
    try:
        resp = requests.get(f"{BOOKING_SERVICE_URL}/api/bookings/{booking_id}")
        
        if resp.status_code == 404:
            return jsonify({"error": "Booking not found"}), 404
        if resp.status_code != 200:
            return jsonify({"error": "Cannot verify booking details"}), 500
        
        booking_info = resp.json()
        
        amount = booking_info.get('amount')
        email = booking_info.get('customer_email')
        
        if not amount or not email:
            return jsonify({"error": "Invalid booking data (missing amount or email)"}), 400

    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Booking Service is unreachable"}), 503
    except Exception as e:
        return jsonify({"error": f"Internal Error: {str(e)}"}), 500

    print(f"Processing payment of {amount} VND for Booking #{booking_id} (User: {email})")

    invoice_data = {
        "customer": email,
        "amount": amount,
        "booking_id": booking_id,
        "date": str(datetime.date.today())
    }
    
    # 1. Update Booking Status
    try:
        requests.put(f"{BOOKING_SERVICE_URL}/api/bookings/{booking_id}/status", json={"status": "confirmed"})
    except Exception as e:
        print(f"[WARNING] Could not update booking status: {e}")

    # 2. Send Invoice Event
    send_invoice_event(invoice_data)
    
    print("\n----------------------------------------")
    print("[INFO] PAYMENT SUCCESSFUL")
    print(f"   Booking:  #{booking_id}")
    print(f"   To:       {email}")
    print(f"   Amount:   {amount} VND")
    print("----------------------------------------\n")

    return jsonify({
        "message": "Payment successful",
        "amount_paid": amount,
        "booking_id": booking_id,
        "status": "PAID"
    }), 201

if __name__ == '__main__':
    print("Payment Service running on port 5003...")
    app.run(debug=True, port=5003, host='0.0.0.0')