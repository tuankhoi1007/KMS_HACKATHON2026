# Giải thích cấu trúc cơ sở dữ liệu (Models & Schemas)

Tài liệu này giải thích vai trò của các bảng trong cơ sở dữ liệu dựa trên định nghĩa trong thư mục `models` và `schemas`. Hệ thống được thiết kế phục vụ một ứng dụng giáo dục tích hợp AI và Gamification.

## 1. Người dùng và Gamification
* **`users` (User Model)**
  * **Vai trò:** Lưu trữ thông tin tài khoản của hệ thống (bao gồm cả học sinh và giáo viên).
  * **Chi tiết đáng chú ý:** Phân quyền qua trường `role` (student/teacher). Ngoài thông tin xác thực cơ bản, bảng này còn tích hợp các trường gamification (game hóa học tập) như `total_points` (tổng điểm), `current_streak` (chuỗi ngày học liên tiếp) và `study_hours_this_week` (số giờ học trong tuần).

## 2. Học tập và Cây kỹ năng (Skill Tree)
Hệ thống sử dụng cấu trúc đồ thị (graph) để thể hiện lộ trình học tập của học sinh.
* **`skill_nodes` (SkillNode Model)**
  * **Vai trò:** Đại diện cho một khái niệm hoặc kỹ năng độc lập (VD: "Arrays & Strings", "Vòng lặp").
  * **Chi tiết đáng chú ý:** Có lưu trữ tọa độ `position_x`, `position_y` để frontend (dùng React Flow hoặc các thư viện tương tự) có thể render thành dạng đồ thị trực quan.
* **`skill_edges` (SkillEdge Model)**
  * **Vai trò:** Định nghĩa mối quan hệ liên kết giữa hai kỹ năng (node). Thường dùng để chỉ định kỹ năng nào là tiên quyết (phải học trước) cho kỹ năng nào.
* **`student_skill_status` (StudentSkillStatus Model)**
  * **Vai trò:** Bản đồ theo dõi tiến độ của **từng học sinh** trên **từng kỹ năng** trong cây kỹ năng.
  * **Chi tiết đáng chú ý:** Lưu trạng thái học tập (locked - chưa mở khóa, in-progress - đang học, mastered - đã thông thạo) và phần trăm độ thành thạo (`mastery_pct`).

## 3. Tiến độ học tập và Đánh giá (Progress & Quiz)
* **`learning_progress` (LearningProgress Model)**
  * **Vai trò:** Theo dõi tổng quan tiến độ của học sinh trên từng module/môn học.
  * **Chi tiết đáng chú ý:** Đánh giá mức độ phụ thuộc vào AI (`ai_dependency`) và mức độ rủi ro bỏ học/tụt hậu (`risk_level`), hỗ trợ cho hệ thống cảnh báo sớm.
* **`teacher_quizzes` (TeacherQuiz Model)**
  * **Vai trò:** Lưu trữ các bài kiểm tra/trắc nghiệm do giáo viên tạo ra để giao cho lớp.
  * **Chi tiết đáng chú ý:** Nội dung câu hỏi được lưu dưới dạng mảng JSON (`questions`), cho phép linh hoạt về cấu trúc câu hỏi không bị gò bó vào bảng rời.
* **`quiz_history` (QuizHistory Model)**
  * **Vai trò:** Ghi nhận lại lịch sử và kết quả các bài quiz mà học sinh đã làm.
  * **Chi tiết đáng chú ý:** Có lưu lại số lần học sinh sử dụng quyền trợ giúp từ AI (`hints_used`) và chi tiết đúng/sai của từng câu hỏi dạng JSON (`quiz_details`).

## 4. Tương tác AI (Chat & Phục hồi)
* **`chat_sessions` (ChatSession Model)**
  * **Vai trò:** Lưu trữ các phiên hỏi đáp, trò chuyện giữa học sinh và trợ lý ảo AI.
  * **Chi tiết đáng chú ý:** 
    * Lịch sử hội thoại được lưu dưới dạng JSON (`messages`).
    * Có cơ chế tự động tóm tắt nội dung (`ai_summary`).
    * Đặc biệt hỗ trợ kiến trúc **Dual-Agent** (2 AI cùng hoạt động) thông qua các trường metadata: `agent_used` (Agent nào trả lời), `retry_count` (Số lần Agent 1 phải thử lại) và `validation_score` (Điểm đánh giá chất lượng câu trả lời từ Agent 2).
* **`ai_recovery_plans` (AiRecoveryPlan Model)**
  * **Vai trò:** Lưu trữ các kế hoạch học tập bù đắp (Recovery Plan) do AI tự động tạo ra nhằm giúp học sinh vượt qua các lỗ hổng kiến thức hoặc khi có rủi ro tụt hậu.

## 5. Cảnh báo và Theo dõi (Alerts)
* **`alerts_insights` (AlertInsight Model)**
  * **Vai trò:** Chứa các thông báo, cảnh báo hoặc insight phân tích liên quan đến học sinh.
  * **Chi tiết đáng chú ý:** Có nhiều loại cảnh báo (VD: kiến thức bị mai một `knowledge_decay`, cần sự can thiệp của giáo viên `intervention_needed`, hoặc insight từ AI `ai_insight`). Giáo viên có thể theo dõi các cảnh báo này thông qua dashboard và đánh dấu là đã giải quyết (`is_resolved`).
