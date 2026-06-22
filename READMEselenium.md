BÁO CÁO KIỂM THỰ GIAO DIỆN VỚI SELENIUM WEBDRIVER
1. Giới thiệu
Selenium WebDriver (Python) là một framework kiểm thử tự động mạnh mẽ cho phép người kiểm thử viết các kịch bản kiểm thử bằng code để tương tác trực tiếp với các phần tử giao diện trình duyệt web (điền thông tin, click chuột, cuộn trang...). Khác với Selenium IDE là tiện ích ghi - phát lại (record & playback) trên trình duyệt vốn dễ bị lỗi khi cấu trúc trang thay đổi, Selenium WebDriver sử dụng mã nguồn Python kết hợp với thư viện unittest giúp kiểm soát chính xác các bước kiểm thử, xử lý tốt các tác vụ bất đồng bộ và kiểm tra tính nhất quán dữ liệu của trang web.

Trong dự án Hệ thống đặt vé xem phim trực tuyến (Movie Ticket Booking System), Selenium WebDriver được sử dụng để tự động hóa kiểm thử giao diện người dùng (E2E GUI Testing) cho 3 chức năng cốt lõi: Đăng nhập thành viên, Tìm kiếm phim động, và Xem chi tiết thông tin kèm lịch chiếu phim trên nền tảng Frontend SPA (Vite + Vanilla JS). Bộ test script giúp đảm bảo các chức năng này hoạt động ổn định và không phát sinh lỗi hồi quy (regression) sau mỗi lần cập nhật hệ thống.

2. Môi trường thực hiện
Thư viện: Selenium WebDriver (Python)
Test Framework: unittest (Python)
Test Script: tests/selenium_test.py
Trang kiểm thử: http://localhost:5173 (Vite Frontend Server)
API Gateway: http://localhost:5005 (Microservices Backend)
Trình duyệt: Google Chrome / ChromeDriver
Hệ điều hành: Windows 11
3. Quy trình thực hiện
Thiết lập môi trường: Cài đặt thư viện Selenium (pip install selenium) và khởi động các dịch vụ backend thông qua Docker (docker compose up -d) cùng server frontend (npm run dev).
Khởi chạy kịch bản kiểm thử bằng lệnh: python tests/selenium_test.py.
Trình duyệt Chrome tự động được khởi tạo ẩn qua WebDriver với thiết lập thời gian chờ ngầm định 10 giây (implicitly_wait(10)).
Thực hiện Test case 1 - Đăng nhập: Điều hướng tới /login, điền tài khoản test có sẵn (user@example.com / password123) vào các trường id="username" và id="password", nhấn click nút Đăng nhập id="login-btn" và xác nhận trình duyệt được chuyển hướng về trang chủ thành công.
Thực hiện Test case 2 - Tìm kiếm phim: Tại trang chủ, định vị ô nhập liệu id="search-input", điền từ khóa "Inception", chờ hệ thống thực thi debounce và gọi API, quét danh sách phim id="movies-list" và kiểm tra xem phim "Inception" có hiển thị trong kết quả tìm kiếm không.
Thực hiện Test case 3 - Xem chi tiết & Lịch chiếu: Tìm kiếm và click nút Details của bộ phim đầu tiên trên trang chủ, chờ container chi tiết phim id="movie-detail-container" tải xong, xác minh hiển thị đầy đủ thông tin mô tả phim và lịch chiếu id="schedule-container".
Trình duyệt tự động đóng lại (driver.quit()) sau khi hoàn tất chuỗi kiểm thử.
4. Nhận xét
Selenium WebDriver kết hợp Python giúp kiểm thử giao diện tự động E2E nhanh chóng, chính xác, đặc biệt hiệu quả trong việc kiểm tra sự tương tác thực tế của người dùng cuối trên hệ thống Single Page Application (SPA).
Một số hạn chế và cách khắc phục:
Do hệ thống là Single Page Application tải bất đồng bộ (Asynchronous Loading), các phần tử HTML cần thời gian render. Sử dụng thời gian chờ cứng (time.sleep) dễ làm chậm test case hoặc gây lỗi nếu mạng chậm.
Khắc phục: Sử dụng cơ chế chờ đợi linh hoạt WebDriverWait kết hợp expected_conditions để chờ phần tử hiển thị hoặc click được rồi mới thực hiện thao tác.
Các selector định danh phần tử dễ bị lỗi nếu thiết kế HTML/CSS của trang thay đổi (ví dụ: đổi class CSS hoặc đổi vị trí thẻ div).
Khắc phục: Nên bổ sung các thuộc tính tĩnh cụ thể như id (ví dụ: id="search-input", id="login-btn") hoặc data-testid để Selenium định vị phần tử bền vững, không phụ thuộc vào cấu trúc CSS của trang.