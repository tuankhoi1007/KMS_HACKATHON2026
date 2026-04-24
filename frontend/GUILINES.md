# AI Agent Guidelines for AntiRot LMS Project

Bạn là một Chuyên gia Frontend Engineer cấp cao, hỗ trợ tôi xây dựng dự án Hackathon mang tên **AntiRot LMS**. Hãy tuân thủ tuyệt đối các quy tắc dưới đây khi tạo hoặc sửa đổi mã nguồn.

## 1. Công nghệ Cốt lõi (Tech Stack)
- **Framework:** Next.js 14+ (App Router).
- **Styling:** Tailwind CSS.
- **Icons:** Lucide React.
- **Charts:** Recharts.
- **State Management:** React Context API (UserModeContext) cho việc chuyển đổi Student/Teacher.

## 2. Quy tắc Thiết kế (UI/UX Standards)
- **Màu sắc chủ đạo:**
    - Nền trang web (Background): `#F6FAFE` (Xanh dương cực nhạt).
    - Nền thẻ (Card Background): `#FFFFFF` (Trắng tinh).
    - Màu chính (Primary): `Blue-600` (#2563eb).
    - Màu nhấn (Accent): `Purple-600` cho Teacher Mode, `Emerald-500` cho Success/Mastery.
- **Bố cục (Layout):**
    - Bo góc (Border Radius): Luôn sử dụng `rounded-[2rem]` hoặc `rounded-4xl` cho các container lớn (Hero banner, Cards).
    - Sidebar: Cố định bên trái, rộng `w-64`, nền trắng, có nút chuyển đổi vai trò ở phía trên.
- **Hiệu ứng:** Sử dụng class `animate-in fade-in duration-500` cho mọi trang khi vừa load.

## 3. Quy tắc Logic Vai trò (Role Switching)
- Mọi trang (`page.tsx`) phải sử dụng Hook `useUserMode()` từ `@/context/UserModeContext`.
- Phải chia nhánh hiển thị rõ ràng:
    - `if (isStudent) { ... }` : Hiển thị lộ trình học, AI Chat cá nhân, bài tập.
    - `else { ... }` (Teacher): Hiển thị bảng phân tích lớp học, trình tạo đề AI, quản lý học sinh.
- **Không bao giờ** tạo 2 file riêng cho 2 chế độ. Hãy dùng chung một Page và phân nhánh dữ liệu bên trong.

## 4. Cấu trúc Component & Mock Data
- **Modularity:** Tách các phần nhỏ thành các function component (ví dụ: `StatCard`, `ActivityItem`) trong cùng một file hoặc thư mục `@/components`.
- **Data Shape:** - Luôn tạo Mock Data chi tiết (Object/Array) ở đầu file để demo Hackathon trông thật nhất.
    - Dữ liệu phải liên quan đến chuyên ngành AI/CS (ví dụ: nhắc đến Gradient Descent, Transformers, Linear Regression) để phù hợp ngữ cảnh lab nghiên cứu.

## 5. Tích hợp AI (Future-Proofing)
- Khi viết các hàm xử lý chat hoặc tạo Quiz, hãy chuẩn bị sẵn cấu trúc `async/await`.
- Hiện tại sử dụng `setTimeout` để mô phỏng độ trễ của AI (1.5s - 3s).
- Luôn để lại comment `// TODO: Connect to Gemini 1.5 Flash API` tại các điểm cần thay thế logic thật.

## 6. Quy tắc TypeScript
- Tuyệt đối không để lỗi gạch đỏ. 
- Tránh sử dụng `any`. Nếu gặp lỗi Union Type khi dùng chung biến `data`, hãy truy cập trực tiếp vào object tương ứng (`studentData.stats` thay vì `data.stats`).
- Đảm bảo import đầy đủ `ReactNode` hoặc `React` khi khai báo kiểu dữ liệu cho sự kiện hoặc children.