import unittest
from unittest.mock import patch
import os
import sqlite3
from user.app import app, init_db, get_db_connection

class TestUserWhitebox(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Thiết lập đường dẫn cho file database test tạm thời
        cls.test_db_path = os.path.join(os.path.dirname(__file__), 'test_users.db')
        
        # Xóa file cũ nếu có để đảm bảo chạy từ đầu
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception as e:
                pass
        
        # Giả lập hàm get_db_connection để trỏ tới database test
        def mock_get_db_connection():
            conn = sqlite3.connect(cls.test_db_path)
            conn.row_factory = sqlite3.Row
            return conn
            
        cls.db_patcher = patch('user.app.get_db_connection', side_effect=mock_get_db_connection)
        cls.db_patcher.start()
        
        # Thiết lập Flask Test Client
        cls.client = app.test_client()

    @classmethod
    def tearDownClass(cls):
        # Dừng patcher
        cls.db_patcher.stop()
        
        # Xóa database test nếu tồn tại
        if os.path.exists(cls.test_db_path):
            try:
                os.remove(cls.test_db_path)
            except Exception as e:
                pass

    def setUp(self):
        # Dọn dẹp dữ liệu cũ bằng cách drop các bảng thay vì xóa file (tránh lỗi file lock trên Windows)
        try:
            conn = get_db_connection()
            conn.execute("DROP TABLE IF EXISTS users")
            conn.execute("DROP TABLE IF EXISTS tokens")
            conn.commit()
            conn.close()
        except Exception as e:
            pass
        init_db()

    def test_register_success(self):
        """Path 1: Đăng ký tài khoản mới thành công -> Trả về 201"""
        payload = {"email": "newuser@example.com", "password": "password123"}
        response = self.client.post('/api/auth/register', json=payload)
        
        self.assertEqual(response.status_code, 201)
        self.assertIn("User registered successfully", response.get_json()["message"])

    def test_register_missing_fields(self):
        """Path 2: Thiếu trường thông tin đăng ký -> Trả về 400"""
        # Thiếu mật khẩu
        payload = {"email": "missing@example.com"}
        response = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Email and password required", response.get_json()["error"])

    def test_register_duplicate_email(self):
        """Path 3: Đăng ký với email đã tồn tại -> Trả về 400"""
        # Đăng ký lần đầu
        payload = {"email": "duplicate@example.com", "password": "password123"}
        self.client.post('/api/auth/register', json=payload)
        
        # Đăng ký lần hai trùng email
        response = self.client.post('/api/auth/register', json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Email already exists", response.get_json()["error"])

    def test_login_missing_fields(self):
        """Path 4: Đăng nhập thiếu thông tin -> Trả về 400"""
        payload = {"email": "login@example.com"}
        response = self.client.post('/api/auth/login', json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("password required", response.get_json()["error"])

    def test_login_invalid_user(self):
        """Path 5: Đăng nhập với tài khoản chưa đăng ký -> Trả về 401"""
        payload = {"email": "nonexistent@example.com", "password": "password123"}
        response = self.client.post('/api/auth/login', json=payload)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid credentials", response.get_json()["error"])

    def test_login_wrong_password(self):
        """Path 6: Đăng nhập đúng email nhưng sai mật khẩu -> Trả về 401"""
        # Tạo người dùng trước
        payload_reg = {"email": "user@example.com", "password": "correct_password"}
        self.client.post('/api/auth/register', json=payload_reg)
        
        # Đăng nhập sai mật khẩu
        payload_login = {"email": "user@example.com", "password": "wrong_password"}
        response = self.client.post('/api/auth/login', json=payload_login)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid credentials", response.get_json()["error"])

    def test_login_success_and_verify(self):
        """Path 7: Đăng nhập thành công -> Trả về Token và xác thực (Verify) token đó hợp lệ"""
        # Đăng ký
        payload_reg = {"email": "authuser@example.com", "password": "mypassword"}
        self.client.post('/api/auth/register', json=payload_reg)
        
        # Đăng nhập
        payload_login = {"email": "authuser@example.com", "password": "mypassword"}
        login_response = self.client.post('/api/auth/login', json=payload_login)
        
        self.assertEqual(login_response.status_code, 200)
        data = login_response.get_json()
        self.assertIn("token", data)
        self.assertEqual(data["email"], "authuser@example.com")
        self.assertEqual(data["role"], "customer") # Default role
        
        # Xác thực Token qua endpoint /api/auth/verify
        token = data["token"]
        verify_response = self.client.get(f'/api/auth/verify?token={token}')
        self.assertEqual(verify_response.status_code, 200)
        verify_data = verify_response.get_json()
        self.assertTrue(verify_data["valid"])
        self.assertEqual(verify_data["email"], "authuser@example.com")
        self.assertEqual(verify_data["role"], "customer")

    def test_verify_invalid_token(self):
        """Path 8: Xác thực với token không tồn tại -> Trả về 401"""
        response = self.client.get('/api/auth/verify?token=nonexistent-token-uuid')
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.get_json()["valid"])

if __name__ == "__main__":
    unittest.main()
