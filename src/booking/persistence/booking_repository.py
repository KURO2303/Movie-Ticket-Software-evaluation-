import sqlite3
import os

class BookingRepository:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_folder = os.path.join(base_dir, '..', 'db')
        if not os.path.exists(self.db_folder):
            os.makedirs(self.db_folder)
        self.db_path = os.path.join(self.db_folder, 'booking.db')
        self.init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        conn = self._get_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                showtime_id INTEGER,
                seat_number TEXT,
                customer_email TEXT,
                amount INTEGER,
                status TEXT DEFAULT 'PENDING_PAYMENT'
            )
        ''')
        
        # Create seats table
        conn.execute('''
            CREATE TABLE IF NOT EXISTS seats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                showtime_id INTEGER,
                seat_number TEXT,
                status TEXT DEFAULT 'available',
                seat_type TEXT DEFAULT 'STANDARD',
                price_surcharge INTEGER DEFAULT 0,
                UNIQUE(showtime_id, seat_number)
            )
        ''')
        
        # Migration: Check for new columns
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(seats)")
        columns = [info[1] for info in cursor.fetchall()]
        if 'seat_type' not in columns:
            conn.execute("ALTER TABLE seats ADD COLUMN seat_type TEXT DEFAULT 'STANDARD'")
        if 'price_surcharge' not in columns:
            conn.execute("ALTER TABLE seats ADD COLUMN price_surcharge INTEGER DEFAULT 0")

        conn.commit()
        conn.close()

    def is_seat_available(self, showtime_id, seat_number):
        conn = self._get_connection()
        row = conn.execute(
            'SELECT status FROM seats WHERE showtime_id = ? AND seat_number = ?',
            (showtime_id, seat_number)
        ).fetchone()
        conn.close()
        return row and row['status'] == 'available'

    def get_seat_details(self, showtime_id, seat_number):
        conn = self._get_connection()
        row = conn.execute(
            'SELECT * FROM seats WHERE showtime_id = ? AND seat_number = ?',
            (showtime_id, seat_number)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    def get_seats_by_showtime_realistic(self, showtime_id, rows_count, seats_per_row):
        conn = self._get_connection()
        rows = conn.execute('SELECT seat_number, status, seat_type, price_surcharge FROM seats WHERE showtime_id = ?', (showtime_id,)).fetchall()
        conn.close()
        
        if not rows:
            self.create_seats_realistic(showtime_id, rows_count, seats_per_row)
            conn = self._get_connection()
            rows = conn.execute('SELECT seat_number, status, seat_type, price_surcharge FROM seats WHERE showtime_id = ?', (showtime_id,)).fetchall()
            conn.close()

        return [dict(row) for row in rows]

    def create_seats_realistic(self, showtime_id, rows_count, seats_per_row):
        conn = self._get_connection()
        # Row letters: A, B, C...
        for r in range(rows_count):
            row_letter = chr(65 + r) # 65 is 'A'
            
            # Special Handling for Row I (index 8): Couple Seats
            if r == 8:
                for s in range(1, 10, 2): # 1, 3, 5, 7, 9
                    seat_name = f"{row_letter}{s}-{s+1}"
                    conn.execute(
                        'INSERT OR IGNORE INTO seats (showtime_id, seat_number, seat_type, price_surcharge) VALUES (?, ?, ?, ?)', 
                        (showtime_id, seat_name, 'COUPLE', 50000)
                    )
                continue

            # Standard / VIP Rows (A-H)
            for s in range(1, seats_per_row + 1):
                seat_name = f"{row_letter}{s}"
                
                # Determine Type
                s_type = 'STANDARD'
                surcharge = 0
                
                # Logic: Rows E-H (indices 4-7) AND Seats 4-8 -> VIP
                if (4 <= r <= 7) and (4 <= s <= 8):
                    s_type = 'VIP'
                    surcharge = 20000
                
                conn.execute(
                    'INSERT OR IGNORE INTO seats (showtime_id, seat_number, seat_type, price_surcharge) VALUES (?, ?, ?, ?)', 
                    (showtime_id, seat_name, s_type, surcharge)
                )
        conn.commit()
        conn.close()

    def get_seats_by_showtime(self, showtime_id):
        conn = self._get_connection()
        rows = conn.execute('SELECT seat_number, status, seat_type, price_surcharge FROM seats WHERE showtime_id = ?', (showtime_id,)).fetchall()
        conn.close()
        
        # Fallback Lazy Init (Generic)
        if not rows:
            self.create_seats(showtime_id, 50)
            conn = self._get_connection()
            rows = conn.execute('SELECT seat_number, status, seat_type, price_surcharge FROM seats WHERE showtime_id = ?', (showtime_id,)).fetchall()
            conn.close()

        return [dict(row) for row in rows]

    def create_seats(self, showtime_id, total_seats):
        conn = self._get_connection()
        for i in range(1, total_seats + 1):
            conn.execute('INSERT OR IGNORE INTO seats (showtime_id, seat_number) VALUES (?, ?)', (showtime_id, f"S{i}"))
        conn.commit()
        conn.close()

    def create_booking(self, showtime_id, seat_numbers, email, amount):
        if not isinstance(seat_numbers, list):
            seat_numbers = [seat_numbers]
            
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 1. Atomic update for ALL seats
            for seat_number in seat_numbers:
                cursor.execute('''
                    UPDATE seats 
                    SET status = "booked" 
                    WHERE showtime_id = ? AND seat_number = ? AND status = "available"
                ''', (showtime_id, seat_number))
                
                if cursor.rowcount == 0:
                    raise ValueError(f"Seat {seat_number} is no longer available.")
            
            # 2. Store seat_numbers as comma separated string for simplicity in current schema
            seats_str = ",".join(seat_numbers)
            
            cursor.execute(
                'INSERT INTO bookings (showtime_id, seat_number, customer_email, amount, status) VALUES (?, ?, ?, ?, ?)',
                (showtime_id, seats_str, email, amount, 'PENDING_PAYMENT')
            )
            booking_id = cursor.lastrowid
            conn.commit()
            return booking_id
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_booking(self, booking_id):
        conn = self._get_connection()
        row = conn.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def update_booking_status(self, booking_id, status):
        conn = self._get_connection()
        conn.execute('UPDATE bookings SET status = ? WHERE id = ?', (status, booking_id))
        conn.commit()
        conn.close()
        return True

    def delete_booking(self, booking_id):
        conn = self._get_connection()
        bk = conn.execute('SELECT * FROM bookings WHERE id = ?', (booking_id,)).fetchone()
        if not bk:
            conn.close()
            raise ValueError("Booking not found")
        
        # Split seats_str back into list
        seats_str = bk['seat_number']
        seat_list = [s.strip() for s in seats_str.split(",") if s.strip()]
        
        for seat_num in seat_list:
            conn.execute('UPDATE seats SET status = "available" WHERE showtime_id = ? AND seat_number = ?', (bk['showtime_id'], seat_num))
        
        conn.execute('DELETE FROM bookings WHERE id = ?', (booking_id,))
        conn.commit()
        conn.close()

    def get_all_bookings(self):
        conn = self._get_connection()
        rows = conn.execute('SELECT * FROM bookings').fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_bookings_by_customer(self, email):
        conn = self._get_connection()
        rows = conn.execute('SELECT * FROM bookings WHERE customer_email = ?', (email,)).fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def get_affected_customers(self, showtime_id):
        conn = self._get_connection()
        rows = conn.execute('SELECT customer_email as email, seat_number FROM bookings WHERE showtime_id = ?', (showtime_id,)).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def delete_all_bookings_by_showtime(self, showtime_id):
        conn = self._get_connection()
        cursor = conn.cursor()
        
        rows = cursor.execute('''
            SELECT customer_email as email, amount, seat_number as seat 
            FROM bookings WHERE showtime_id = ?
        ''', (showtime_id,)).fetchall()
        affected_list = [dict(row) for row in rows]
        
        cursor.execute('UPDATE seats SET status = "available" WHERE showtime_id = ? AND status = "booked"', (showtime_id,))
        
        cursor.execute('DELETE FROM bookings WHERE showtime_id = ?', (showtime_id,))
        
        conn.commit()
        conn.close()
        return affected_list
