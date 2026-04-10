# Movie Booking System - Frontend

Dự án Frontend được xây dựng bằng **Vanilla JS (JavaScript thuần)** kết hợp với **Vite** để tối ưu hóa việc phát triển. Hệ thống sử dụng một Router tự chế đơn giản để quản lý các trang.

## 🚀 Khởi động nhanh (Sử dụng Docker - Khuyên dùng)

Đây là cách dễ nhất để chạy toàn bộ hệ thống (Frontend + Backend + Database + Gateway + Seeding dữ liệu).

1. Mở Terminal tại thư mục gốc của dự án.
2. Chạy lệnh:
   ```powershell
   docker-compose up --build
   ```
3. Truy cập vào trình duyệt: [http://localhost:5173](http://localhost:5173)

## 🛠 Khởi động thủ công (Dành cho phát triển)

Nếu bạn muốn chạy riêng Frontend để chỉnh sửa giao diện:

1. **Di chuyển vào thư mục frontend:**
   ```bash
   cd frontend
   ```
2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```
3. **Chạy ứng dụng:**
   ```bash
   npm run dev
   ```
4. **Lưu ý quan trọng:** Để các tính năng (Đăng nhập, Đặt vé, Quản trị) hoạt động, bạn phải đảm bảo **API Gateway** đang chạy trên Port **5000**.

## 🔐 Tài khoản dùng thử

Hệ thống đã được nạp sẵn dữ liệu mẫu (Seeding). Bạn có thể sử dụng các tài khoản sau:

| Quyền hạn | Username / Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `111111` |
| **User** | `user@example.com` | `password123` |

---
*Ghi chú: Nếu gặp lỗi "Fail to fetch", hãy kiểm tra xem API Gateway (Cổng 5000) đã được khởi động chưa.*
