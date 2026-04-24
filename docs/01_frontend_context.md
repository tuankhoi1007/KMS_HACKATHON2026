# Role
Bạn là Lead Frontend Developer. Dự án: Nền tảng học tập thông minh ĐKTN (AntiRot LMS).
Nhiệm vụ: Xây dựng UI/UX bám sát Design System và kết nối trực tiếp với REST API Backend.

# Tech Stack & Rules
- Frontend Framework: React / Next.js (chọn 1).
- State Management: Sử dụng Zustand hoặc React Query để cache dữ liệu API.
- Cảnh báo Server Render: Backend deploy trên Render bản Free có thể mất 30-50s để khởi động nếu đang ngủ. BẮT BUỘC phải có UI/UX xử lý Loading state (Skeleton, Spinner với câu thông báo "Đang đánh thức hệ thống...").
- Render Text & Math: Sử dụng `react-markdown` và `remark-math` để render công thức toán học (VD: 3x + 2 = 14) từ AI trả về.

# Core Screens & API Mapping (Giao ước Dữ liệu)

1. **Student Dashboard:**
   - **UI:** Greeting header, Khối Progress (vòng tròn % hoàn thành), Khối Recommended Path. Khối Community Picks.
   - **API Connection:** - `GET /student/{id}/dashboard`: Lấy Points, Streak, Hour, tiến độ.
     - `GET /student/{id}/recovery-plan`: Render lộ trình "cai nghiện AI" nếu có.
     - `GET /student/community/curated-picks`: Đổ dữ liệu mẹo học tập.

2. **Socratic Chat Interface:**
   - **UI:** Main Panel giống Gemini (phân biệt bubble). Right Side Panel hiện mục tiêu bài học và nút Hints.
   - **API Connection:**
     - Lúc mở chat: `GET /student/{id}/chat-sessions` để load lịch sử.
     - Lúc gửi tin: `POST /student/chat` với body `{"student_id", "message", "topic_name"}`.
   - **Logic Anti-Rot:** Disable ô input trong lúc chờ AI trả lời để chống spam.

3. **Quiz Centre (Adaptive Quiz):**
   - **UI:** Main card chứa câu hỏi (hỗ trợ Math/LaTeX). Nút đáp án. Thanh Progress.
   - **API Connection:**
     - Lúc bắt đầu: Gọi `GET /student/quiz/{topic}/teacher-questions` hoặc `AI-questions`.
     - Lúc nộp bài: Gọi `POST /student/quiz/submit` để gửi điểm và số lần dùng Hint.
   - **Logic Anti-Rot:** Hiện "AI Feedback" ngay khi chọn sai. Không cho qua câu lập tức.

4. **Teacher Dashboard (Class Analytics):**
   - **UI:** KPI Cards (Sĩ số, % Hoàn thành, At Risk), Biểu đồ Donut/Bar Chart, Danh sách học sinh.
   - **API Connection:**
     - Biểu đồ: `GET /teacher/class-analytics`.
     - Thông tin tổng quan: `GET /teacher/dashboard-summary`.
     - Thanh tìm kiếm: `GET /teacher/search-students?name=...`.

5. **Student Detail Profile (Teacher View):**
   - **UI:** Biểu đồ radar đánh giá kỹ năng. Khu vực "Intervention Required" (Cảnh báo rủi ro).
   - **API Connection:** `GET /teacher/student/{id}/detail`.