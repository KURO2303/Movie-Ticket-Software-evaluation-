import unittest
import requests
import time
import random
import sys

# Cấu hình màu sắc
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

# Cấu hình Services
SERVICES_CONFIG = {
    "user":         {"port": 5004, "path": "src/user/app.py"},
    "movie":        {"port": 5001, "path": "src/movie/app.py"},
    "booking":      {"port": 5002, "path": "src/booking/app.py"},
    "payment":      {"port": 5003, "path": "src/payment/app.py"},
    "notification": {"path": "src/notification/app.py"}, # Pure consumer, no port
    "gateway":      {"port": 5005, "path": "src/gateway/app.py"}
}

class TestBase(unittest.TestCase):
    BASE_URL = "http://127.0.0.1"
    DEFAULT_PORT = 5005 # Gateway is the default entry point
    API_KEY = "BO_CHIKA"
    
    # Shared State
    state = {
        "user_email": None, 
        "user_token": None,
        "admin_token": None,
        "movie_id": None, 
        "showtime_id": None,
        "booking_id": None, 
        "card_id": None
    }

    def _req(self, method, port=None, endpoint="", payload=None, headers=None, status=200):
        """Hàm gửi request thông minh qua Gateway mặc định"""
        target_port = port if port else self.DEFAULT_PORT
        url = f"{self.BASE_URL}:{target_port}{endpoint}"
        
        # Default Headers
        req_headers = {
            "peko-key": self.API_KEY,
            "Content-Type": "application/json"
        }
        if headers:
            req_headers.update(headers)

        print(f"{Colors.BLUE}[{method}] {url}{Colors.RESET}")
        
        for attempt in range(3):
            try:
                time.sleep(0.2) 
                kwargs = {'json': payload, 'headers': req_headers, 'timeout': 15}
                
                if method == 'GET': resp = requests.get(url, **kwargs)
                elif method == 'POST': resp = requests.post(url, **kwargs)
                elif method == 'PUT': resp = requests.put(url, **kwargs)
                elif method == 'DELETE': resp = requests.delete(url, **kwargs)
                
                if resp.status_code == status:
                    return resp
                
                if resp.status_code == 500 and "database is locked" in resp.text:
                    print(f"{Colors.YELLOW} -> DB Locked. Retrying ({attempt+1}/3)...{Colors.RESET}")
                    time.sleep(2)
                    continue

                print(f"{Colors.RED}FAIL: Got {resp.status_code}, Expected {status}. Body: {resp.text[:200]}{Colors.RESET}")
                self.assertEqual(resp.status_code, status)
                return resp

            except Exception as e:
                print(f"{Colors.RED} -> Connection error: {e}. Retrying...{Colors.RESET}")
                time.sleep(1)
        
        self.fail(f"Request failed after 3 attempts to {url}")

    def get_auth_headers(self, token=None):
        t = token if token else self.state['user_token']
        return {"Authorization": f"Bearer {t}"} if t else {}

    def get_admin_headers(self):
        t = self.state.get('admin_token')
        return {"Authorization": f"Bearer {t}"} if t else {}

    def get_real_available_seat(self, showtime_id):
        """Lấy danh sách ghế thực tế qua Gateway"""
        resp = self._req('GET', endpoint=f"/api/showtimes/{showtime_id}/seats", status=200)
        all_seats = resp.json()
        available = []
        for s in all_seats:
            if isinstance(s, dict):
                if s.get('status') == 'available' or s.get('available') == True:
                    available.append(s.get('seat_number'))
            else:
                available.append(str(s))
        
        if not available:
            self.fail(f"Showtime {showtime_id} has NO available seats!")
        
        chosen_seat = random.choice(available)
        print(f"{Colors.CYAN} -> Picked random seat: {chosen_seat}{Colors.RESET}")
        return chosen_seat

    def create_dedicated_showtime(self):
        """Tạo suất chiếu riêng qua Gateway (Admin)"""
        if not self.state['movie_id']: return None
        day = random.randint(10, 28)
        p = {
            "movie_id": self.state['movie_id'], 
            "start_time": f"2026-12-{day} 10:00",
            "end_time": f"2026-12-{day} 12:00",
            "price": 100000, 
            "total_seats": 50 
        }
        # Use Gateway port + Admin headers
        r = self._req('POST', endpoint='/api/showtimes', payload=p, headers=self.get_admin_headers(), status=201)
        return r.json().get('id')
