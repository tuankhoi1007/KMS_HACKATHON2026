# Yêu Cầu Cập Nhật Backend: Hệ Thống Authentication (Xác thực)

Hiện tại Frontend đã được xây dựng UI hoàn chỉnh cho phần Đăng nhập (Login) có bao gồm **Tên đăng nhập** và **Mật khẩu**. Tuy nhiên, Backend hiện tại chỉ đang có `full_name` và không có cơ chế Auth thực sự. 

Tài liệu này liệt kê các công việc cần làm ở Backend (FastAPI + PostgreSQL/Supabase) để đồng bộ với Frontend.

---

## 1. Cập nhật Database Schema (Bảng `users`)

Cần thêm 2 cột mới để phân biệt rõ ràng giữa tên dùng để đăng nhập và tên hiển thị trên UI.

| Tên cột | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
| :--- | :--- | :--- | :--- |
| `username` | `VARCHAR` | `UNIQUE`, `NOT NULL` | **Tên đăng nhập** (Viết liền không dấu, dùng để login). |
| `password_hash`| `VARCHAR` | `NOT NULL` | **Mật khẩu đã mã hoá** (Bắt buộc dùng bcrypt hoặc thuật toán băm tương tự, không lưu plaintext). |
| `full_name` | `VARCHAR` | `NOT NULL` | **Họ và Tên hiển thị** (Có dấu, dùng trên Dashboard, bảng xếp hạng). Chữ này đã có sẵn trong schema hiện tại. |

*Lưu ý: Schema trả về cho Frontend ở các API hiện tại KHÔNG được chứa `password_hash`.*

---

## 2. Các API Endpoints Cần Tạo Mới

### 2.1. Đăng ký tài khoản (Register)
- **Endpoint:** `POST /auth/register`
- **Mục đích:** Tạo tài khoản mới.
- **Payload (Request Body):**
  ```json
  {
    "username": "tuankhoi_k24",
    "password": "my_secure_password",
    "full_name": "Tuấn Khôi",
    "role": "student" // hoặc "teacher"
  }
  ```
- **Xử lý Backend:**
  1. Check xem `username` đã tồn tại chưa (Nếu có trả về `400 Bad Request`).
  2. Băm mật khẩu (Hash password).
  3. Lưu vào database.
- **Response (201 Created):**
  Trả về thông tin User object giống cấu trúc hiện tại (không kèm password).

### 2.2. Đăng nhập (Login)
- **Endpoint:** `POST /auth/login`
- **Mục đích:** Xác thực người dùng và trả về User object (hoặc Access Token nếu có làm JWT).
- **Payload (Request Body):**
  ```json
  {
    "username": "tuankhoi_k24",
    "password": "my_secure_password",
    "role": "student" // Tuỳ chọn, để phân quyền
  }
  ```
- **Xử lý Backend:**
  1. Tìm user theo `username` trong database.
  2. Dùng thư viện (như `passlib`) để verify mật khẩu người dùng gửi lên với `password_hash` trong DB.
  3. Nếu sai tên đăng nhập hoặc mật khẩu, trả về `401 Unauthorized` kèm message "Sai tên đăng nhập hoặc mật khẩu".
  4. Nếu đúng, trả về thông tin User object.

- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "b222f1ee-...",
        "username": "tuankhoi_k24",
        "full_name": "Tuấn Khôi",
        "role": "student",
        "total_points": 8900,
        ...
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5c..." // (Nếu có triển khai JWT)
    }
  }
  ```

---

## 3. Chỉnh sửa code ở Frontend sau khi Backend hoàn thành

Khi Backend đã release các API trên, team Frontend chỉ cần vào file `frontend/components/LoginScreen.tsx` làm các bước sau để tháo Mocking:

1. Thay thế hàm `searchStudents(name)` bằng việc gọi API `POST /auth/login` thực sự.
2. Xóa các đoạn `setTimeout` đang dùng để giả lập độ trễ.
3. Thay vì truyền `name`, sẽ truyền object `{ username: name, password: password, role: role }` lên Backend.
4. Nhận `user_id` thật từ Backend thay vì fix cứng.

## 4. (Tuỳ chọn nâng cao) Triển khai JWT Token
Nếu Hackathon yêu cầu cao về bảo mật, Backend nên:
1. Trả về `access_token` khi gọi `POST /auth/login`.
2. Yêu cầu truyền token đó vào header `Authorization: Bearer <token>` ở mọi API gọi sau này (Dashboard, Quiz, Chat).
3. Tại Frontend, lưu token vào `localStorage` cùng với thông tin user.


Về Data: Hiện tại database chưa có bảng lưu "Các Node của Skill Tree". Tôi sẽ giả lập (mock) một cây kỹ năng Môn Cấu trúc Dữ liệu & Giải thuật (DSA) ngay trên Frontend để làm demo cho Hackathon. Bao gồm: Array, Linked List, Tree, Graph, Dynamic Programming.