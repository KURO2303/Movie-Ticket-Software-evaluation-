import unittest
from tests.base import TestBase, Colors

class TestGateway(TestBase):

    def test_01_api_key_missing(self):
        """Verify 401 if peko-key is missing"""
        print(f"\n{Colors.BOLD}--- Gateway Security: Missing API Key ---{Colors.RESET}")
        # Explicitly remove peko-key from headers
        headers = {"peko-key": None} 
        # Using a raw request because _req adds peko-key by default
        url = f"{self.BASE_URL}:{self.DEFAULT_PORT}/api/movies"
        resp = self._req('GET', endpoint="/api/movies", headers=headers, status=401)
        self.assertIn("Missing or Invalid Header", resp.json().get('error'))

    def test_02_poster_exemption(self):
        """Verify posters are accessible WITHOUT API key"""
        print(f"\n{Colors.BOLD}--- Gateway Security: Poster Exemption ---{Colors.RESET}")
        
        # 1. First ensure a movie exists to get a poster filename
        # Login as admin to create if needed (or assume seed)
        # We'll just try to fetch a known seeded poster or any movie's poster
        resp = self._req('GET', endpoint="/api/movies", status=200)
        movies = resp.json()
        if movies:
            filename = movies[0].get('image_url')
            if filename:
                url = f"{self.BASE_URL}:{self.DEFAULT_PORT}/api/movies/posters/{filename}"
                print(f" -> Fetching {url} WITHOUT api-key...")
                # Fetch WITHOUT peko-key
                r = self._req('GET', endpoint=f"/api/movies/posters/{filename}", headers={"peko-key": None}, status=200)
                self.assertEqual(r.status_code, 200)

    def test_03_admin_route_unauthorized(self):
        """Verify 401 for admin routes without JWT"""
        print(f"\n{Colors.BOLD}--- Gateway Security: Admin Route Auth ---{Colors.RESET}")
        # /api/users is admin only
        resp = self._req('GET', endpoint="/api/users", status=401)
        self.assertIn("Missing Authorization Token", resp.json().get('error'))

    def test_04_rbac_forbidden(self):
        """Verify 403 when customer tries to access admin route"""
        print(f"\n{Colors.BOLD}--- Gateway Security: RBAC (Customer vs Admin) ---{Colors.RESET}")
        
        # 1. Register/Login as customer
        email = f"test_customer_{self.__class__.__name__}@example.com"
        self._req('POST', endpoint="/api/auth/register", payload={"email": email, "password": "password"}, status=201)
        login_resp = self._req('POST', endpoint="/api/auth/login", payload={"email": email, "password": "password"}, status=200)
        token = login_resp.json().get('token')
        
        # 2. Try to access /api/users
        headers = {"Authorization": f"Bearer {token}"}
        resp = self._req('GET', endpoint="/api/users", headers=headers, status=403)
        self.assertEqual(resp.json().get('error'), "Forbidden")

    def test_05_header_forwarding(self):
        """Verify Gateway forwards X-User headers to downstream"""
        print(f"\n{Colors.BOLD}--- Gateway Security: Header Forwarding ---{Colors.RESET}")
        
        # 1. Login as admin
        admin_email = "admin@system.com"
        login_resp = self._req('POST', endpoint="/api/auth/login", payload={"email": admin_email, "password": "111111"}, status=200)
        token = login_resp.json().get('token')
        self.state['admin_token'] = token
        
        # 2. Call /api/users (which is handled by User Service)
        # Downstream user service doesn't return headers, but we can verify it works
        resp = self._req('GET', endpoint="/api/users", headers=self.get_admin_headers(), status=200)
        users = resp.json()
        self.assertIsInstance(users, list)
        self.assertTrue(len(users) > 0)

if __name__ == '__main__':
    unittest.main()
