import sqlite3
import os
import datetime
import random
from werkzeug.security import generate_password_hash

# --- UTILS ---
def get_db_path(service_name, db_name):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, 'src', service_name, 'db', db_name)

def get_connection(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

# --- SEED USERS ---
def seed_users():
    print("Seeding Users...")
    db_path = get_db_path('user', 'users.db')
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    
    # Check for 'role' column (Migration)
    cursor.execute("PRAGMA table_info(users)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'role' not in columns:
        print("  - Migrating: Adding 'role' column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'")

    # Tokens table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 1. The Single Admin
    users = [
        ('admin@system.com', '111111', 'admin'),
        ('user@example.com', 'password123', 'customer'), # Keep default test user
    ]

    # 2. Generate 50 Customers
    first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

    for i in range(50):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        email = f"{fn.lower()}.{ln.lower()}{i}@example.com"
        users.append((email, 'password', 'customer'))
    
    count_new = 0
    for email, password, role in users:
        hashed = generate_password_hash(password)
        try:
            cursor.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', (email, hashed, role))
            count_new += 1
        except sqlite3.IntegrityError:
            pass # Skip if exists

    print(f"  - Processed {len(users)} users (Inserted new: {count_new})")
    conn.commit()
    conn.close()

# --- SEED MOVIES & SHOWTIMES ---
def seed_movies():
    print("Seeding Movies and Showtimes...")
    db_path = get_db_path('movie', 'movies.db')
    conn = get_connection(db_path)
    cursor = conn.cursor()
    
    # Tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            genre TEXT NOT NULL,
            duration INTEGER NOT NULL,
            release_date TEXT NOT NULL,
            image_url TEXT,
            description TEXT
        )
    ''')

    # Migration Check
    cursor.execute("PRAGMA table_info(movies)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'description' not in columns:
        cursor.execute("ALTER TABLE movies ADD COLUMN description TEXT")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            rows INTEGER NOT NULL,
            seats_per_row INTEGER NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS showtimes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER NOT NULL,
            room_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            price INTEGER DEFAULT 50000,
            FOREIGN KEY(movie_id) REFERENCES movies(id),
            FOREIGN KEY(room_id) REFERENCES rooms(id)
        )
    ''')

    # Migration Check
    cursor.execute("PRAGMA table_info(showtimes)")
    columns = [info[1] for info in cursor.fetchall()]
    if 'room_id' not in columns:
        cursor.execute("ALTER TABLE showtimes ADD COLUMN room_id INTEGER")
    if 'price' not in columns:
        print("  - Migrating: Adding 'price' column to showtimes table...")
        cursor.execute("ALTER TABLE showtimes ADD COLUMN price INTEGER DEFAULT 50000")

    # --- SEED ROOMS (Fixed Size 9x11) ---
    rooms = [
        ("Standard Hall 1", 9, 11),
        ("Standard Hall 2", 9, 11),
        ("Standard Hall 3", 9, 11),
        ("IMAX Hall 1", 9, 11),
        ("IMAX Hall 2", 9, 11),
        ("IMAX Hall 3", 9, 11),
    ]
    
    room_map = {} # name -> id
    for name, rows, seats in rooms:
        cursor.execute('SELECT id FROM rooms WHERE name = ?', (name,))
        row = cursor.fetchone()
        if not row:
            cursor.execute('INSERT INTO rooms (name, rows, seats_per_row) VALUES (?, ?, ?)', (name, rows, seats))
            print(f"  - Created Room: {name}")
            room_map[name] = cursor.lastrowid
        else:
            room_map[name] = row[0]

    # --- SEED MOVIES (~20) ---
    movies_data = [
        ("Inception", "Sci-Fi", 148, "2010-07-16", "Inception.jpg", "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O."),
        ("The Dark Knight", "Action", 152, "2008-07-18", "The_Dark_Knight.jpg", "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice."),
        ("Interstellar", "Adventure", 169, "2014-11-07", "Interstellar.webp", "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival."),
        ("The Matrix", "Sci-Fi", 136, "1999-03-31", "The_Matrix.jpg", "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers."),
        ("Avengers: Endgame", "Action", 181, "2019-04-26", "Avenger_Endgame.jpg", "After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to restore balance to the universe."),
        ("Parasite", "Drama", 132, "2019-05-30", "Parasite.jpg", "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan."),
        ("Spirited Away", "Animation", 125, "2001-07-20", "Spirited_Away.jpg", "During her family's move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts."),
        ("The Godfather", "Crime", 175, "1972-03-24", "The_Godfather.jpg", "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son."),
        ("Pulp Fiction", "Crime", 154, "1994-10-14", "Pulp_Fiction.jpg", "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption."),
        ("Forrest Gump", "Drama", 142, "1994-07-06", "Forest_Gump.jpg", "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75, whose only desire is to be reunited with his childhood sweetheart."),
        ("Dune: Part Two", "Sci-Fi", 166, "2024-03-01", "Dune_Part_Two.jpg", "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family."),
        ("Oppenheimer", "Biography", 180, "2023-07-21", "Oppenheimer.jpg", "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb."),
        ("Barbie", "Comedy", 114, "2023-07-21", "Barbie.jpg", "Barbie suffers a crisis that leads her to question her world and her existence."),
        ("Spider-Man: Across the Spider-Verse", "Animation", 140, "2023-06-02", "Spiderman.jpg", "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence."),
        ("The Shawshank Redemption", "Drama", 142, "1994-09-23", "The_Shawshank_Redemption.jpg", "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion."),
        ("Schindler's List", "Biography", 195, "1993-11-30", "Schindler's_List.jpg", "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis."),
        ("Fight Club", "Drama", 139, "1999-10-15", "Fight_Club.jpg", "An insomniac office worker and a devil-may-care shoemaker form an underground fight club that evolves into much more."),
        ("Goodfellas", "Crime", 146, "1990-09-19", "Goodfellas.jpg", "The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito in the Italian-American crime syndicate."),
        ("The Silence of the Lambs", "Thriller", 118, "1991-02-14", "The_Silence_of_the_Lambs.jpg", "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer, a madman who skins his victims."),
        ("Seven Samurai", "Action", 207, "1954-04-26", "Seven_Samurai.jpg", "Farmers from a village exploited by bandits hire seven unemployed samurai for protection.")
    ]
    
    today = datetime.date.today()
    created_showtimes = [] # List of (id, price, start_time_str)

    for title, genre, duration, release_date, image_url, description in movies_data:
        cursor.execute('SELECT id FROM movies WHERE title = ?', (title,))
        row = cursor.fetchone()
        if not row:
            cursor.execute('INSERT INTO movies (title, genre, duration, release_date, image_url, description) VALUES (?, ?, ?, ?, ?, ?)',
                           (title, genre, duration, release_date, image_url, description))
            movie_id = cursor.lastrowid
        else:
            movie_id = row[0]
            
        # --- SEED SHOWTIMES (Past & Future) ---
        # Generate schedule for Past 30 Days and Future 7 Days
        cursor.execute('SELECT count(*) FROM showtimes WHERE movie_id = ?', (movie_id,))
        count = cursor.fetchone()[0]
        
        # If we have less than ~100 showtimes for this movie, generate more
        if count < 50: 
            # Range: -30 to +7
            for day_offset in range(-30, 8): 
                current_date = today + datetime.timedelta(days=day_offset)
                
                # 2-3 shows per day per movie
                num_shows = random.randint(2, 3)
                start_hours = sorted(random.sample(range(9, 23), num_shows))
                
                for hour in start_hours:
                    minute = random.choice([0, 15, 30, 45])
                    start_dt = datetime.datetime.combine(current_date, datetime.time(hour, minute))
                    end_dt = start_dt + datetime.timedelta(minutes=duration)
                    
                    # Random Room
                    room_id = random.choice(list(room_map.values()))
                    
                    # Pricing logic
                    base_price = 50000
                    if "IMAX" in [k for k,v in room_map.items() if v == room_id][0]:
                        base_price = 100000
                    elif hour >= 18: # Peak hours
                        base_price = 70000
                    
                    cursor.execute('''
                        INSERT INTO showtimes (movie_id, room_id, start_time, end_time, price)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (movie_id, room_id, start_dt.strftime('%Y-%m-%d %H:%M'), end_dt.strftime('%Y-%m-%d %H:%M'), base_price))
                    
                    created_showtimes.append((cursor.lastrowid, base_price, start_dt.strftime('%Y-%m-%d %H:%M')))

    conn.commit()
    conn.close()
    print(f"  - Generated movies & showtimes (History: 30 days, Future: 7 days)")
    return created_showtimes

# --- SEED BOOKINGS ---
def seed_bookings(showtimes_info):
    # showtimes_info: list of (id, price, start_time)
    print("Seeding Bookings (Full Seat Map)...")
    
    # 1. Get Users
    user_db_path = get_db_path('user', 'users.db')
    u_conn = get_connection(user_db_path)
    users = [row['email'] for row in u_conn.execute('SELECT email FROM users WHERE role="customer"').fetchall()]
    u_conn.close()
    
    if not users:
        print("  - No customers found, skipping booking seed.")
        return

    # 2. Setup Booking DB
    bk_db_path = get_db_path('booking', 'booking.db')
    conn = get_connection(bk_db_path)
    
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
    # Check Columns
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(seats)")
    cols = [c[1] for c in cursor.fetchall()]
    if 'seat_type' not in cols: conn.execute("ALTER TABLE seats ADD COLUMN seat_type TEXT DEFAULT 'STANDARD'")
    if 'price_surcharge' not in cols: conn.execute("ALTER TABLE seats ADD COLUMN price_surcharge INTEGER DEFAULT 0")
    conn.commit()

    # 3. Fetch Showtimes if not provided (re-query for safety)
    if not showtimes_info:
        mv_db_path = get_db_path('movie', 'movies.db')
        m_conn = get_connection(mv_db_path)
        # Fetch up to 2000 recent/future showtimes
        rows = m_conn.execute('SELECT id, price, start_time FROM showtimes ORDER BY id DESC LIMIT 2000').fetchall()
        showtimes_info = [(r['id'], r['price'], r['start_time']) for r in rows]
        m_conn.close()

    # 4. Generate Seats & Bookings for EACH Showtime
    # We want to ensure EVERY showtime has a full seat map, not just random ones.
    # And we want some of them to have bookings.
    
    total_bookings = 0
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    
    print(f"  - Generating seats for {len(showtimes_info)} showtimes...")

    for sid, price, start_time in showtimes_info:
        # Determine if we should generate bookings for this showtime (e.g. 70% chance)
        should_book = random.random() < 0.7
        
        # Decide occupancy (0 to 20 seats)
        occupancy = random.randint(1, 20) if should_book else 0
        
        # Track booked seats for this showtime to avoid double booking
        booked_seats = set()
        
        # Pre-select random seats to be booked
        if occupancy > 0:
            # We need to pick from valid seats. 
            # Total seats approx 9 * 11 = 99. 
            # Let's generate the map first, then pick.
            pass

        # --- GENERATE FULL SEAT MAP ---
        # Rows A-I (9 rows). 
        # Rows A-H: 11 seats.
        # Row I: 5 Couple Seats (1-2, 3-4, 5-6, 7-8, 9-10).
        
        seats_batch = [] # List of (seat_num, status, type, surcharge)
        
        # 1. Standard / VIP Rows (A-H -> 0-7)
        for r in range(8):
            row_letter = chr(65 + r)
            for s in range(1, 12): # 1 to 11
                seat_num = f"{row_letter}{s}"
                
                # Determine Type
                s_type = 'STANDARD'
                s_surcharge = 0
                
                # VIP Logic: Rows E-H (indices 4-7) AND Seats 4-8
                if (4 <= r <= 7) and (4 <= s <= 8):
                    s_type = 'VIP'
                    s_surcharge = 20000
                
                seats_batch.append({
                    "num": seat_num,
                    "type": s_type,
                    "surcharge": s_surcharge,
                    "status": "available"
                })

        # 2. Couple Row (I -> 8)
        # Seats 1-2, 3-4, 5-6, 7-8, 9-10
        row_letter = 'I'
        for s in range(1, 10, 2):
            seat_num = f"{row_letter}{s}-{s+1}"
            seats_batch.append({
                "num": seat_num,
                "type": "COUPLE",
                "surcharge": 50000,
                "status": "available"
            })
            
        # --- ASSIGN BOOKINGS ---
        booked_indices = []
        if occupancy > 0:
            # Randomly pick indices to book
            booked_indices = random.sample(range(len(seats_batch)), min(occupancy, len(seats_batch)))
            for idx in booked_indices:
                seats_batch[idx]['status'] = 'booked'
        
        # --- INSERT SEATS ---
        for seat in seats_batch:
            conn.execute('''
                INSERT OR IGNORE INTO seats (showtime_id, seat_number, status, seat_type, price_surcharge)
                VALUES (?, ?, ?, ?, ?)
            ''', (sid, seat['num'], seat['status'], seat['type'], seat['surcharge']))
            
        # --- CREATE GROUPED BOOKINGS ---
        if booked_indices:
            # Group seats into random "orders" (1-4 seats per order)
            idx = 0
            while idx < len(booked_indices):
                group_size = random.randint(1, 4)
                chunk = booked_indices[idx : idx + group_size]
                idx += group_size
                
                email = random.choice(users)
                is_past = start_time < today_str
                bk_status = 'confirmed' if is_past else random.choice(['confirmed', 'confirmed', 'PENDING_PAYMENT'])
                
                seat_nums = [seats_batch[i]['num'] for i in chunk]
                seats_str = ",".join(seat_nums)
                
                # Calculate total amount for this group
                total_amount = 0
                for i in chunk:
                    total_amount += (price + seats_batch[i]['surcharge'])
                
                conn.execute('''
                    INSERT INTO bookings (showtime_id, seat_number, customer_email, amount, status)
                    VALUES (?, ?, ?, ?, ?)
                ''', (sid, seats_str, email, total_amount, bk_status))
                total_bookings += 1

    conn.commit()
    conn.close()
    print(f"  - Created {total_bookings} bookings across {len(showtimes_info)} showtimes.")


if __name__ == "__main__":
    seed_users()
    new_showtimes = seed_movies()
    seed_bookings(new_showtimes)
    
    print("\nDatabase seeding completed successfully!")
