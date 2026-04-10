from tests.base import TestBase, Colors
import uuid

class TestUser(TestBase):
    
    def test_07_user_register(self):
        """TC_USER_01: Register a new user via Gateway"""
        print(f"\n{Colors.BOLD}--- User: Register ---{Colors.RESET}")
        uid = str(uuid.uuid4())[:8]
        email = f"user_{uid}@test.com"
        # Register doesn't require JWT or API-KEY (actually Gateway requires API-KEY for all)
        # _req adds API-KEY by default
        self._req('POST', endpoint='/api/auth/register', payload={"email": email, "password": "123"}, status=201)
        self.state['user_email'] = email

    def test_08_user_login(self):
        """TC_USER_03: Login via Gateway"""
        print(f"\n{Colors.BOLD}--- User: Login ---{Colors.RESET}")
        # Note: API Gateway auth_proxy expects email/password
        payload = {"email": self.state['user_email'], "password": "123"}
        resp = self._req('POST', endpoint='/api/auth/login', payload=payload, status=200)
        self.state['user_token'] = resp.json().get('token')
        self.assertIsNotNone(self.state['user_token'])

    def test_09_get_profile(self):
        """TC_USER_05: Get user profile (me)"""
        print(f"\n{Colors.BOLD}--- User: Profile ---{Colors.RESET}")
        resp = self._req('GET', endpoint='/api/users/me', headers=self.get_auth_headers(), status=200)
        self.assertEqual(resp.json().get('email'), self.state['user_email'])

    def test_10_admin_list_users(self):
        """TC_USER_06: Admin list all users"""
        print(f"\n{Colors.BOLD}--- User: Admin List ---{Colors.RESET}")
        # We need admin token
        login_resp = self._req('POST', endpoint='/api/auth/login', payload={"email": "admin@system.com", "password": "111111"}, status=200)
        self.state['admin_token'] = login_resp.json().get('token')
        
        resp = self._req('GET', endpoint='/api/users', headers=self.get_admin_headers(), status=200)
        users = resp.json()
        self.assertIsInstance(users, list)
        self.assertTrue(any(u['email'] == "admin@system.com" for u in users))
