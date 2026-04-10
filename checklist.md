# Checklist: Dự án Movie Ticket Booking System (Kiến trúc Phần mềm)

Tài liệu theo dõi tiến độ thực hiện bài tập lớn, chuyển đổi từ mô hình Monolith sang Microservices theo lộ trình Lab của môn học.

**Tech Stack:**

- **Ngôn ngữ:** Python3
- **Framework:** Flask
- **Database:** SQLite
- **Message Broker:** RabbitMQ
- **Tools:** Postman/cURL, Draw.io

## Giai đoạn 1: Kiến trúc Phân lớp (Layered Monolith)

*Mục tiêu: Xây dựng Core Logic xử lý phim và suất chiếu dưới dạng một khối thống nhất (Lab 2 & Lab 3).*

### Lab 2: Thiết kế Kiến trúc (Logical View)

- [x] **Xác định 4 tầng (Layers):**
  - [x] Presentation Layer (API Controllers)
  - [x] Business Logic Layer (Services)
  - [x] Persistence Layer (Repositories)
  - [x] Data Layer (Database)
- [x] **Vẽ sơ đồ Component (Component Diagram):**
  - [x] Minh họa flow: `MovieController` -> `MovieService` -> `MovieRepository`.
  - [x] Định nghĩa Interface cho các component này.

### Lab 3: Hiện thực hóa (Implementation)

- [x] **Setup Project Python Flask:**
  - [x] Cấu trúc thư mục: `presentation/`, `business_logic/`, `persistence/`.
  - [x] Cài đặt môi trường ảo (venv) và thư viện Flask.
- [x] **Database & Models:**
  - [x] Tạo Class `Movie` (id, title, genre, duration, release_date).
  - [x] Tạo `MovieRepository`: Kết nối DB, xử lý query (SQL/ORM).
- [x] **Business Logic:**
  - [x] Tạo `MovieService`: Validate dữ liệu (ví dụ: phim phải có tên, thời lượng > 0).
- [x] **API Endpoints (Presentation):**
  - [x] `POST /api/movies`: Thêm phim mới.
  - [x] `GET /api/movies`: Lấy danh sách phim.
  - [x] `GET /api/movies/{id}`: Xem chi tiết phim.
- [x] **Test:** Kiểm thử API bằng Postman.

## Giai đoạn 2: Thiết kế Microservices

*Mục tiêu: "Đập" khối Monolith ra thành các dịch vụ nhỏ (Lab 4).*

### Lab 4: Phân rã & Giao tiếp (Decomposition)

- [x] **Xác định các Microservices:**
  - [x] **Movie Service:** Quản lý phim, lịch chiếu (Tách từ module Lab 3).
  - [x] **Booking Service:** Quản lý đặt vé, chọn ghế (Core nghiệp vụ).
  - [x] **Notification Service:** Gửi vé điện tử, email xác nhận.
- [x] **Thiết kế API Contract (Đặc tả API):**
  - [x] Định nghĩa input/output JSON cho từng service.
- [x] **Vẽ sơ đồ C4 Model (Level 1 - System Context):**
  - [x] Thể hiện Web App, Admin, Payment Gateway và Hệ thống đặt vé.

## Giai đoạn 3: Triển khai Microservices & Gateway

*Mục tiêu: Code các service độc lập và tạo cổng giao tiếp chung (Lab 5 & Lab 6).*

### Lab 5: Xây dựng Movie Service độc lập

- [x] **Tách Project:** Tạo folder riêng cho `movie_service`.
- [x] **Database riêng:** Setup Database riêng cho Movie (tách khỏi DB chung cũ).
- [x] **Code API hoàn chỉnh:**
  - [x] Tìm kiếm phim theo tên/thể loại.
  - [x] CRUD suất chiếu (Showtimes).

### Lab 6: API Gateway Pattern

- [x] **Setup Gateway Project:** Tạo một Flask app mới làm Gateway (chạy port 5000).
- [x] **Routing (Định tuyến):**
  - [x] Request `/api/movies` -> Chuyển tiếp sang `Movie Service` (port 5001).
  - [x] Request `/api/bookings` -> Chuyển tiếp sang `Booking Service` (port 5002).
- [x] **Security (Giả lập):**
  - [x] Check Header `Authorization`.
  - [x] Chặn request nếu token không hợp lệ trước khi vào service con.

## Giai đoạn 4: Kiến trúc Hướng sự kiện (Event-Driven)

*Mục tiêu: Xử lý bất đồng bộ cho việc gửi vé/thông báo (Lab 7).*

### Lab 7: Tích hợp RabbitMQ

- [x] **Setup RabbitMQ:** Chạy bằng Docker hoặc cài trực tiếp.
- [x] **Booking Service (Producer):**
  - [x] Khi đặt vé thành công -> Gửi message `OrderPlacedEvent` vào hàng đợi (Queue).
  - [x] Message chứa: `ticket_id`, `email`, `movie_name`.
- [x] **Notification Service (Consumer):**
  - [x] Lắng nghe hàng đợi `ticket_events`.
  - [x] Nhận message -> Giả lập in vé gửi email (print log ra màn hình).
  - [x] Đảm bảo Booking Service không bị treo khi chờ gửi email.

## Giai đoạn 5: Hoàn thiện & Triển khai

*Mục tiêu: Đóng gói và đánh giá kiến trúc (Lab 8).*

### Lab 8: Deployment & Đánh giá (ATAM)

- [ ] **Deployment Diagram:**
  - [ ] Vẽ sơ đồ triển khai: Client -> Load Balancer -> API Gateway -> Services -> Databases.
  - [ ] Thể hiện rõ mỗi service có DB riêng.
- [x] **Dockerize (Optional nhưng nên làm):**
  - [x] Viết `Dockerfile` for từng service.
  - [x] Viết `docker-compose.yml` để chạy toàn bộ hệ thống bằng 1 lệnh.
- [ ] **Phân tích ATAM:**
  - [ ] Đánh giá lại ASRs (Scalability, Availability) đã nêu ở Lab 1.
  - [ ] So sánh kiến trúc Monolith (Giai đoạn 1) vs Microservices (Giai đoạn hiện tại).
