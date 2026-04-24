# 🧠 BrainRoot — AI Socratic LMS Platform

> **"Don't just give answers, spark curiosity."**  
> BrainRoot là hệ thống quản lý học tập (LMS) thế hệ mới ứng dụng Trí tuệ nhân tạo Socratic để cá nhân hóa lộ trình học tập và phát triển tư duy độc lập cho sinh viên.

---

## 🌟 Tổng quan dự án (Project Overview)
Dự án được phát triển cho cuộc thi **KMS Hackathon - HCMUT**.  
BrainRoot giải quyết vấn đề "học vẹt" và sự phụ thuộc quá mức vào các công cụ AI giải bài hộ (như ChatGPT). Thay vì đưa ra đáp án ngay lập tức, BrainRoot đóng vai trò là một người dẫn dắt (Coach) giúp người học tự tìm ra giải pháp thông qua các câu hỏi gợi mở.

## 🚀 Các tính năng chính (Key Features)

### 1. 🤖 Socratic Chat Tutor
- Trình chat AI thông minh sử dụng mô hình Gemini.
- Không bao giờ đưa code hay đáp án trực tiếp.
- Phân tích lỗi sai của sinh viên và đặt câu hỏi gợi ý để sinh viên tự sửa lỗi.

### 2. 🗺️ Generative Roadmap Engine (Personalized)
- Tự động tạo lộ trình học tập cá nhân dựa trên dữ liệu làm bài thực tế.
- Hệ thống **BrainRoot Monitor** theo dõi "Độ tinh thông" (Mastery) của từng kỹ năng.
- Lập lịch trình học tập (Schedule) chi tiết từng ngày trong tuần.

### 3. 🌳 Interactive Skill Tree (Knowledge Graph)
- Trực quan hóa kiến thức dưới dạng Graph (React Flow).
- Hiển thị trạng thái các node kiến thức: Locked, In-Progress, Mastered.

### 4. 📝 Adaptive Quiz Centre
- AI tự động tạo câu hỏi trắc nghiệm dựa trên lỗ hổng kiến thức của sinh viên.
- Hệ thống gợi ý (Hints) thông minh giúp sinh viên vượt qua khó khăn mà không cần xem đáp án.

### 5. 📊 Analytics Dashboard
- Thống kê tiến độ học tập, thời gian phân bổ cho từng môn học (DSA, Hệ điều hành, LTNC...).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS (Premium Aesthetic UI)
- **Icons:** Lucide React
- **State Management:** React Context API
- **Graph UI:** React Flow

### **Backend**
- **Framework:** FastAPI (Python)
- **AI Engine:** Google GenAI SDK (Gemini 3.1 Flash lite)
- **Database:** Supabase / PostgreSQL
- **Logic:** Pydantic (Data Validation), Tenacity (Retry Logic)

---

## ⚙️ Cấu hình và Cài đặt (Installation)

### 1. Yêu cầu hệ thống
- Node.js >= 18
- Python >= 3.9
- Gemini API Key (Google AI Studio)

### 2. Cài đặt Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Tạo file `.env` trong thư mục `backend/`:
```env
GEMINI_API_KEY=your_api_key_here
SECRET_KEY=brainroot_secret
DATABASE_URL=your_supabase_url
```
Chạy server:
```bash
uvicorn main:app --reload
```

### 3. Cài đặt Frontend
```bash
cd frontend
npm install
```
Tạo file `.env.local` trong thư mục `frontend/`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```
Chạy ứng dụng:
```bash
npm run dev
```

---

## 🏆 Đội ngũ phát triển (The Team)
- Dự án được thực hiện bởi team **HCMUT Snake** tại cuộc thi KMS Hackathon.
- **Tên dự án gốc:** **BrainRoot**.

---
*© 2024 BrainRoot LMS — HCMUT Computer Science Project.*
# KMS_HACKATHON2026
