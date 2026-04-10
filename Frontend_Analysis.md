# Phân Tích Kiến Trúc Frontend & Cấu Trúc Component

## Kiến Trúc Tổng Thể (Overall Architecture)
Webapp sử dụng kiến trúc **Vanilla JavaScript SPA (Single Page Application)** được build bằng **Vite**. Ứng dụng tuân theo cấu trúc module đơn giản, tách biệt giữa pages, components và API client.

- **Pages (`frontend/src/pages/`)**: Các module cho từng trang riêng biệt.
- **Components (`frontend/src/components/`)**: Các thành phần tái sử dụng (hiện tại chủ yếu là Header).
- **API Client (`frontend/src/api/`)**: Giao tiếp API tập trung.
- **Main Entry (`frontend/src/main.js`)**: Khởi tạo Router và ứng dụng.

## Hệ Thống Routing
Sử dụng Router client-side tự xây dựng bằng **History API**:
- **Định nghĩa Route**: Map đường dẫn (path) tới các module page. Hỗ trợ tham số động (như `:id`).
- **Phân tích URL**: Parse URL thành `resource`, `id`, `verb`.
- **Luồng điều hướng**:
  1. Parse URL hiện tại.
  2. Match với route đã định nghĩa.
  3. Render `Header` component.
  4. Render nội dung page (`render()`).
  5. Gọi lifecycle hook (`afterRender()`).
- **Link Handling**: Chặn click vào link nội bộ và dùng `pushState` để điều hướng mà không reload trang.

## Pattern Component của Page
Mỗi page module tuân thủ 2 phương thức chính:
1. **`render()`**: Trả về chuỗi HTML (có thể async).
2. **`afterRender()`**: Gán event listeners và xử lý logic động sau khi HTML được chèn vào DOM.

## Cấu Trúc `AdminMoviesPage.js` (Phân tích chi tiết)
*Lưu ý: Mô tả dưới đây phản ánh cấu trúc nền tảng. Các tính năng CRUD thực tế đã được cập nhật để hoạt động đầy đủ thay vì chỉ là TODO.*

### Cấu trúc Component
Sử dụng mô hình lifecycle 2 phương thức, không dùng React hooks hay state management phức tạp.

**1. Phương thức `render()`**
Trả về template HTML tĩnh gồm:
- Tiêu đề quản lý.
- Nút "Thêm Phim Mới".
- Danh sách `<ul>` (ban đầu hiển thị loading).
- Link quay lại Dashboard.
- *(Cập nhật mới: Đã bao gồm Modal form ẩn để Thêm/Sửa)*.

**2. Phương thức `afterRender()`**
Xử lý logic:
- **Fetch API**: Gọi `getMovies()` lấy dữ liệu.
- **Render List**: Map dữ liệu ra HTML và chèn vào DOM.
- **Event Handlers**: Xử lý click cho nút Thêm, Sửa, Xóa.
- *(Cập nhật mới: Đã bao gồm logic đóng/mở Modal và gọi API Create/Update/Delete thực tế)*.

### State Management
- **Trực tiếp trên DOM**: Dữ liệu hiển thị được cập nhật thẳng vào `innerHTML`.
- **Local Variable**: Sử dụng biến cục bộ (như `moviesData`) trong closure của `afterRender` để lưu tạm dữ liệu cho các thao tác sửa/xóa.
- **Fresh Data**: Mỗi lần render lại trang là một lần fetch API mới.

## Hệ Thống Xác Thực (Authentication)
### 1. Đăng Nhập & Token
- **Credentials**: Admin (`admin`/`111111`) hoặc User thường.
- **Lưu trữ**: Response đăng nhập (chứa `token`, `role`, `email`) được lưu vào `localStorage` với key `'user'`.

### 2. Sử Dụng Token trong Request
- **`apiClient.js`**: Tự động lấy token từ `localStorage`.
- **Headers**:
  - `Authorization`: `Bearer <token>`
  - `X-User-Email`: `<email>`
  - `peko-key`: `BO_CHIKA` (API Key tĩnh)

### 3. API Gateway Validation
Gateway kiểm tra 2 lớp bảo mật:
1. **API Key (`peko-key`)**: Phải khớp.
2. **Token & Role**: Validate token và kiểm tra quyền (ví dụ: tạo phim yêu cầu role `admin`).

### 4. Hiển thị & Đăng xuất
- **Header**: Kiểm tra `localStorage` để hiển thị menu Admin hoặc nút Login/Logout.
- **Logout**: Xóa key `'user'` khỏi `localStorage`.

## Ghi chú Bảo Mật & Giới hạn
- **Token**: Định dạng UUID v4 đơn giản, lưu vĩnh viễn trong DB (không hết hạn tự động).
- **Route Protection**: Frontend hiện chưa chặn truy cập vào URL `/admin/...` nếu chưa đăng nhập (nhưng API sẽ chặn dữ liệu).
