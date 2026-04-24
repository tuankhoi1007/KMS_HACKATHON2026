# Changelog: Backend Schema & Model Updates (23/04/2026)

Tài liệu này ghi lại chi tiết tất cả những thay đổi đã thực hiện ở folder `backend/` nhằm đồng bộ hoá Backend với Frontend đã được xây dựng trước đó (Trang đăng nhập, Skill Tree, Phân quyền Giáo viên/Học sinh).

---

## 1. `models/user_model.py` — Bảng `users`

**Thêm 2 cột mới:**

| Cột | Kiểu | Mô tả |
|---|---|---|
| `username` | `String`, `UNIQUE`, `NOT NULL` | Tên đăng nhập (viết liền, không dấu). Dùng ở trang Login. |
| `password_hash` | `String`, `NOT NULL` | Mật khẩu đã mã hoá bằng bcrypt. |

**Thay đổi khác:**
- Cột `role` thêm `nullable=False` và `default="student"`.
- Cột `full_name` thêm `nullable=False`.

> **Lý do:** Frontend trang Login (`LoginScreen.tsx`) yêu cầu 2 trường: Tên đăng nhập (`username`) khác biệt với Tên hiển thị (`full_name`), và Mật khẩu (`password`).

---

## 2. `schemas/user_schema.py` — Pydantic Schemas cho User

**Thêm 3 schema mới:**

| Schema | Mục đích |
|---|---|
| `UserRegister` | Payload đăng ký: `username`, `password`, `full_name`, `role`, `grade` |
| `UserLogin` | Payload đăng nhập: `username`, `password` |
| `AuthResponse` | Response trả về sau đăng ký/đăng nhập: `{ user: UserResponse, token: str? }` |

**Sửa `UserResponse`:**
- Thêm trường `username: str` để Frontend hiển thị tên đăng nhập.

---

## 3. `schemas/enums_schema.py` — Enum dùng chung

**Thay đổi:**

| Enum | Thay đổi |
|---|---|
| `AIDependency` | Thêm giá trị `MODERATE = "moderate"` (Frontend type `api.ts` có dùng `"moderate"`) |
| `SkillNodeStatus` *(MỚI)* | `LOCKED`, `IN_PROGRESS`, `MASTERED` — dùng cho Skill Tree |

---

## 4. `schemas/recovery_schema.py` — Xoá trùng lặp

**Xoá:**
- Class `AlertResponse` bị trùng lặp với class cùng tên trong `alert_schema.py`, gây conflict khi import `*`. Đã xoá bản trong `recovery_schema.py`, giữ lại bản chính trong `alert_schema.py`.

---

## 5. `routers/auth_route.py` — *(MỚI)* Router Xác thực

**Tạo mới hoàn toàn** router với prefix `/auth`:

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản mới. Hash mật khẩu bằng bcrypt. Trả về `AuthResponse`. |
| `POST` | `/auth/login` | Đăng nhập. Verify mật khẩu. Trả về `AuthResponse` nếu đúng, `401` nếu sai. |

**Thư viện sử dụng:** `passlib[bcrypt]` — đã thêm vào `requirements.txt`.

---

## 6. `main.py` — Đăng ký Router mới

**Thêm:**
```python
from routers.auth_route import auth
app.include_router(auth)
```

---

## 7. `routers/__init__.py` — Export Router mới

**Thêm:**
```python
from .auth_route import auth
```

---

## 8. `requirements.txt` — Dependencies

**Thêm:**
```
passlib[bcrypt]
```

**Ghi chú:** File gốc bị encode UTF-16, đã chuyển lại về UTF-8 chuẩn.

---

## Tổng hợp: Mapping Frontend ↔ Backend

| Frontend Feature | Backend Thay Đổi |
|---|---|
| Trang Login (`LoginScreen.tsx`) — trường Username + Password | `User.username`, `User.password_hash`, `POST /auth/login` |
| Phân quyền Giáo viên/Học sinh tại Login | `UserRole` enum, `User.role`, `POST /auth/register` với `role` param |
| Hiển thị `full_name` trên Dashboard | `User.full_name` giữ nguyên, `UserResponse.username` thêm mới |
| Skill Tree (`knowledge-graph/page.tsx`) | `SkillNode`, `SkillEdge`, `StudentSkillStatus` models + `/skill-tree/*` routes |
| Frontend type `ai_dependency: "moderate"` | `AIDependency.MODERATE` enum value |
