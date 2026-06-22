import unittest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

class MovieTicketBookingSeleniumTest(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Thiết lập Chrome Options (ví dụ: chạy ẩn danh hoặc headless nếu muốn)
        chrome_options = Options()
        # chrome_options.add_argument("--headless") # Bỏ comment nếu muốn chạy ngầm không hiện trình duyệt
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Khởi tạo Web Driver Chrome
        # Nếu chưa có WebDriver Manager, Selenium 4+ sẽ tự động tải chromedriver tương thích
        cls.driver = webdriver.Chrome(options=chrome_options)
        cls.driver.implicitly_wait(10) # Thời gian chờ ngầm định 10 giây
        cls.base_url = "http://localhost:5173" # Địa chỉ Frontend của dự án (Vite Server)

    @classmethod
    def tearDownClass(cls):
        # Đóng trình duyệt sau khi chạy xong tất cả kiểm thử
        cls.driver.quit()

    def test_01_login_chuc_nang(self):
        """Kiểm thử Chức năng 1: Đăng nhập thành viên"""
        driver = self.driver
        driver.get(f"{self.base_url}/login")

        print("\n--- Khởi chạy Test Case 1: Đăng nhập ---")
        
        # Chờ và định vị các trường nhập liệu
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "username"))
        )
        password_input = driver.find_element(By.ID, "password")
        login_btn = driver.find_element(By.ID, "login-btn")

        # Điền thông tin tài khoản test hợp lệ từ DB
        email_input.clear()
        email_input.send_keys("user@example.com")
        password_input.clear()
        password_input.send_keys("password123")

        # Click nút Đăng nhập
        login_btn.click()

        # Đợi hệ thống xử lý đăng nhập và chuyển hướng về trang chủ
        WebDriverWait(driver, 10).until(
            EC.url_to_be(f"{self.base_url}/")
        )

        # Xác minh đăng nhập thành công bằng cách kiểm tra sự xuất hiện của nút Tìm kiếm phim
        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "search-input"))
        )
        self.assertTrue(search_input.is_displayed(), "Đăng nhập thất bại: Không tìm thấy trường tìm kiếm ở Trang chủ.")
        print("=> Test Case 1: Đăng nhập thành công!")

    def test_02_search_movie_chuc_nang(self):
        """Kiểm thử Chức năng 2: Tìm kiếm phim"""
        driver = self.driver
        driver.get(f"{self.base_url}/") # Về trang chủ

        print("\n--- Khởi chạy Test Case 2: Tìm kiếm phim ---")

        # Tìm kiếm ô nhập liệu
        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "search-input"))
        )
        
        # Nhập từ khóa phim "Inception"
        search_input.clear()
        search_input.send_keys("Inception")

        # Hệ thống sử dụng Debounce 500ms + thời gian gọi API Gateway, ta sẽ đợi 2 giây
        time.sleep(2)

        # Định vị danh sách phim
        movies_list = driver.find_element(By.ID, "movies-list")
        movie_titles = movies_list.find_elements(By.TAG_NAME, "h6")

        # Kiểm tra xem có bộ phim nào khớp với từ khóa tìm kiếm không
        found = False
        for title_element in movie_titles:
            if "inception" in title_element.text.lower():
                found = True
                break

        self.assertTrue(found, "Tìm kiếm thất bại: Không tìm thấy phim 'Inception' trong kết quả.")
        print("=> Test Case 2: Tìm kiếm phim 'Inception' thành công!")

    def test_03_view_movie_details_chuc_nang(self):
        """Kiểm thử Chức năng 3: Xem chi tiết phim & Lịch chiếu"""
        driver = self.driver
        driver.get(f"{self.base_url}/")

        print("\n--- Khởi chạy Test Case 3: Xem chi tiết phim & Lịch chiếu ---")

        # Đợi danh sách phim hiển thị đầy đủ
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "movies-list"))
        )

        # Định vị nút "Details" đầu tiên trên danh sách phim
        details_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "#movies-list .btn-outline-primary"))
        )
        
        # Click xem chi tiết phim
        details_link.click()

        # Đợi trang chi tiết phim tải xong (định vị container chi tiết phim)
        movie_detail_container = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "movie-detail-container"))
        )
        
        # Xác minh tiêu đề phim và phần lịch chiếu (schedule-container) xuất hiện trên màn hình
        self.assertTrue(movie_detail_container.is_displayed(), "Không hiển thị khung thông tin chi tiết phim.")
        
        schedule_container = driver.find_element(By.ID, "schedule-container")
        self.assertTrue(schedule_container.is_displayed(), "Không hiển thị phần lịch chiếu phim.")
        
        print("=> Test Case 3: Xem chi tiết phim & Lịch chiếu thành công!")

if __name__ == "__main__":
    unittest.main()
