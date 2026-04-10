# Movie Ticket Booking System

A Microservices-based Movie Ticket Booking System featuring automated seat management, grouped bookings, and a dedicated Admin Dashboard.

## 🚀 Quick Start

The fastest way to run the entire system (Frontend, Backend, and Database) is using Docker:

1. **Start everything**:

   ```bash
   docker compose up --build
   ```

2. **Open the App**:
   Go to **[http://localhost:5173](http://localhost:5173)**

---

## 🏗 Architecture & Services

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | `5005` | Entry point; handles routing, security (API Keys), and Auth. |
| **Movie Service** | `5001` | Manages movie details, rooms, and showtime schedules. |
| **Booking Service** | `5002` | Handles grouped ticket reservations and real-time seat status. |
| **Payment Service** | `5003` | Processes payments and manages user payment methods. |
| **User Service** | `5004` | Manages user accounts, authentication, and profiles. |
| **Notification Service** | - | Consumer service for email alerts via RabbitMQ. |
| **Frontend** | `5173` | React (Vite) Single Page Application. |

---

## 📂 Database & Seed Management

Use these commands to manage your local data state.

### Using Docker (Recommended)

```bash
# To Seed (Reset + Add Fresh Data)
docker compose run --rm db_seeder

# To Reset (Clear all data)
docker compose run --rm gateway python reset_db.py
```

### Manual Setup (Local Python)

```bash
# To Seed
python seed_db.py

# To Reset
python reset_db.py
```

---

## 🧪 Running Tests

We use a comprehensive integration test suite that verifies the entire system flow through the API Gateway.

### Via Docker

```bash
# Run all API tests
docker compose run --rm gateway python tests/test_api.py
```

### Locally

Ensure all backend services are running (`python src/run_app.py`), then:

```bash
# Windows
$env:PYTHONPATH = "src"; python tests/test_api.py

# Linux / MacOS
export PYTHONPATH=src && python tests/test_api.py
```

---

## 💻 Manual Setup (Local Development)

If you prefer to run services manually (**RabbitMQ required**):

### 1. Backend

```bash
pip install -r requirements.txt
python seed_db.py
python src/run_app.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 API Usage & Grouped Bookings

### Security Headers

All requests to the API Gateway must include:

- `peko-key`: `BO_CHIKA`

### Grouped Bookings

The system supports booking **multiple seats in a single transaction**. A single Booking ID represents the entire group.

**Example Request (POST /api/bookings):**

```json
{
  "showtime_id": 1,
  "seat_numbers": ["A1", "A2", "A3"]
}
```

**Response Example:**

```json
{
  "booking_id": 842,
  "seats": "A1, A2, A3",
  "total_price": 150000,
  "message": "Booking successful"
}
```
