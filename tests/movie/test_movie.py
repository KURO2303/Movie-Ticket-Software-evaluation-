from tests.base import TestBase, Colors

class TestMovie(TestBase):
    
    def test_11_movie_create(self):
        """TC_MOVIE_01: Create movie via Gateway (Admin)"""
        print(f"\n{Colors.BOLD}--- Movie: Create ---{Colors.RESET}")
        payload = {"title": "Test Movie", "genre": "Action", "duration": 120, "release_date": "2025-05-01"}
        resp = self._req('POST', endpoint='/api/movies', payload=payload, headers=self.get_admin_headers(), status=201)
        self.state['movie_id'] = resp.json()['id']

    def test_12_movie_get_all(self):
        """TC_MOVIE_02: Get all movies (Public)"""
        print(f"\n{Colors.BOLD}--- Movie: Get All ---{Colors.RESET}")
        self._req('GET', endpoint='/api/movies', status=200)

    def test_13_movie_get_detail(self):
        """TC_MOVIE_03: Get movie detail (Public)"""
        print(f"\n{Colors.BOLD}--- Movie: Detail ---{Colors.RESET}")
        self._req('GET', endpoint=f"/api/movies/{self.state['movie_id']}", status=200)

    def test_14_movie_search(self):
        """TC_MOVIE_07: Search movies"""
        print(f"\n{Colors.BOLD}--- Movie: Search ---{Colors.RESET}")
        self._req('GET', endpoint='/api/movies?query=Test', status=200)

    def test_15_room_list(self):
        """TC_MOVIE_08: List all rooms"""
        print(f"\n{Colors.BOLD}--- Movie: List Rooms ---{Colors.RESET}")
        resp = self._req('GET', endpoint='/api/rooms', status=200)
        self.assertIsInstance(resp.json(), list)

    def test_16_showtime_create(self):
        """TC_SHOWTIME_01: Create showtime (Admin)"""
        print(f"\n{Colors.BOLD}--- Movie: Create Showtime ---{Colors.RESET}")
        # Get a room id first
        rooms = self._req('GET', endpoint='/api/rooms', status=200).json()
        room_id = rooms[0]['id']
        
        payload = {
            "movie_id": self.state['movie_id'], 
            "room_id": room_id,
            "start_time": "2026-12-01 10:00", 
            "end_time": "2026-12-01 12:00", 
            "price": 100000
        }
        resp = self._req('POST', endpoint='/api/showtimes', payload=payload, headers=self.get_admin_headers(), status=201)
        self.state['showtime_id'] = resp.json()['id']

    def test_17_showtime_list(self):
        """TC_SHOWTIME_02: List showtimes for movie"""
        print(f"\n{Colors.BOLD}--- Movie: List Showtimes ---{Colors.RESET}")
        self._req('GET', endpoint=f"/api/showtimes?movie_id={self.state['movie_id']}", status=200)
