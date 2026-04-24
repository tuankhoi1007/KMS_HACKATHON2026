-- ============================================================================
-- AntiRot LMS — Supabase SQL Migration Script
-- Tạo tất cả các bảng cần thiết cho hệ thống
-- Chạy script này tại: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================================

-- Bật extension UUID nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. XOÁ BẢNG CŨ (nếu đã tồn tại) — Cần thiết để cập nhật schema mới
-- Thứ tự DROP ngược với thứ tự tạo (bảng con trước, bảng cha sau)
-- ============================================================================
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS student_skill_status CASCADE;
DROP TABLE IF EXISTS skill_edges CASCADE;
DROP TABLE IF EXISTS skill_nodes CASCADE;
DROP TABLE IF EXISTS ai_recovery_plans CASCADE;
DROP TABLE IF EXISTS alert_insights CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS quiz_history CASCADE;
DROP TABLE IF EXISTS teacher_quizzes CASCADE;
DROP TABLE IF EXISTS learning_progress CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 1. BẢNG USERS (Đăng nhập, Đăng ký, Phân quyền)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR UNIQUE NOT NULL,           -- Tên đăng nhập (viết liền, không dấu)
    password_hash VARCHAR NOT NULL,             -- Mật khẩu đã mã hoá bcrypt
    role VARCHAR NOT NULL DEFAULT 'student',    -- 'student' hoặc 'teacher'
    full_name VARCHAR NOT NULL,                 -- Họ tên hiển thị (có dấu)
    grade VARCHAR,
    avatar_url VARCHAR,
    total_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    study_hours_this_week FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 1.1. BẢNG COURSES (Khóa học do giáo viên tạo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,                      -- VD: "[DSA] Graph Search (BFS/DFS)"
    subject VARCHAR NOT NULL,                   -- VD: "dsa", "ltnc", "hdh"
    description TEXT,
    target_grade VARCHAR,                       -- Lớp mục tiêu (VD: "K22 - CSE")
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 1.2. BẢNG COURSE_ENROLLMENTS (Đăng ký học sinh vào khóa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. BẢNG LEARNING_PROGRESS (Tiến độ học tập)
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_module_name VARCHAR,
    progress_pct INTEGER DEFAULT 0,
    mastery_score INTEGER DEFAULT 0,
    ai_dependency VARCHAR DEFAULT 'none',       -- none | low | moderate | high
    risk_level VARCHAR DEFAULT 'optimal',       -- optimal | moderate | high_risk
    time_spent_mins INTEGER DEFAULT 0,
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. BẢNG CHAT_SESSIONS (Lịch sử chat Socratic AI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR,
    messages JSONB DEFAULT '[]'::jsonb,          -- [{role, content}, ...]
    ai_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. BẢNG QUIZ_HISTORY (Lịch sử làm Quiz)
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR,
    difficulty_level VARCHAR,
    score INTEGER,
    hints_used INTEGER DEFAULT 0,
    quiz_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4.1. BẢNG TEACHER_QUIZZES (Lưu đề thi do giáo viên tạo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_name VARCHAR NOT NULL,
    difficulty_level VARCHAR NOT NULL,
    target_grade VARCHAR,
    expires_at TIMESTAMPTZ,
    questions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BẢNG ALERT_INSIGHTS (Cảnh báo & AI Insights)
-- ============================================================================
CREATE TABLE IF NOT EXISTS alert_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR,                               -- knowledge_decay | intervention_needed | ai_insight
    title VARCHAR,
    content TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. BẢNG AI_RECOVERY_PLANS (Lộ trình phục hồi AI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recovery_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_details JSONB DEFAULT '{}'::jsonb,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. BẢNG SKILL_NODES (Cây kỹ năng - Knowledge Graph)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- Cây riêng cho mỗi học sinh
    course_name VARCHAR,                        -- Tên khóa học
    key VARCHAR,                                -- Key ngắn gọn (VD: "big_o")
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL DEFAULT 'dsa',    -- dsa | ltnc | hdh ...
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. BẢNG SKILL_EDGES (Liên kết tiên quyết giữa các SkillNode)
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE
);

-- ============================================================================
-- 9. BẢNG STUDENT_SKILL_STATUS (Trạng thái học của từng sinh viên)
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_skill_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_node_id UUID REFERENCES skill_nodes(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'locked',            -- locked | in-progress | mastered
    mastery_pct INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. SEED DATA — Reset & Insert đầy đủ dữ liệu mock
-- ============================================================================

-- 10a. XOÁ DỮ LIỆU CŨ (theo thứ tự FK)
TRUNCATE course_enrollments, courses,
         student_skill_status, skill_edges, skill_nodes,
         ai_recovery_plans, alert_insights, chat_sessions,
         quiz_history, teacher_quizzes, learning_progress, users
         CASCADE;

-- 10b. USERS (2 học sinh + 1 giáo viên) — Password chung: 123456
-- Hash: $2b$12$oz03gdYfyPU8utJ/3RUlW.Hcur.LkeyLjJk8rSB2w2t16WN2gm71u
INSERT INTO users (id, username, password_hash, role, full_name, grade, avatar_url, total_points, current_streak, study_hours_this_week) VALUES
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', 'kemda',      '$2b$12$oz03gdYfyPU8utJ/3RUlW.Hcur.LkeyLjJk8rSB2w2t16WN2gm71u', 'student', 'Kem Đá',      'K22 - CSE', 'https://ui-avatars.com/api/?name=Kem+Da',    4100,  3, 24.5),
    ('b222f1ee-6c54-4b01-90e6-d701748f0855', 'tuankhoi',   '$2b$12$oz03gdYfyPU8utJ/3RUlW.Hcur.LkeyLjJk8rSB2w2t16WN2gm71u', 'student', 'Tuấn Khôi',   'K22 - CSE', 'https://ui-avatars.com/api/?name=Tuan+Khoi',  8900, 45, 14.0),
    ('c333f1ee-6c54-4b01-90e6-d701748f0856', 'thayminh',   '$2b$12$oz03gdYfyPU8utJ/3RUlW.Hcur.LkeyLjJk8rSB2w2t16WN2gm71u', 'teacher', 'Thầy Minh',   NULL,        'https://ui-avatars.com/api/?name=Thay+Minh',     0,  0,  0.0);

-- 10c. COURSES (Khóa học do Thầy Minh tạo)
INSERT INTO courses (id, teacher_id, name, subject, description, target_grade) VALUES
    ('d001f1ee-0000-0000-0000-000000000001', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[DSA] Graph Search (BFS/DFS)',          'dsa',  'Module tìm kiếm đồ thị: BFS, DFS và ứng dụng.', 'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000002', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[DSA] Dynamic Programming',             'dsa',  'Quy hoạch động cơ bản đến nâng cao.',            'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000003', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[LTNC] Memory Allocation & Pointers',   'ltnc', 'Cấp phát bộ nhớ và con trỏ trong C++.',          'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000004', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[LTNC] STL Containers & Iterators',     'ltnc', 'Thư viện chuẩn STL: vector, map, set...',        'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000005', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Deadlock & Synchronization',     'hdh',  'Đồng bộ hóa tiến trình và bế tắc.',              'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000006', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Memory Management (Paging)',      'hdh',  'Quản lý bộ nhớ: phân trang, phân đoạn.',         'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000007', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Virtual Memory & TLB',            'hdh',  'Bộ nhớ ảo, TLB, Page Replacement.',              'K22 - CSE');

-- 10d. COURSE ENROLLMENTS (Gán học sinh vào khóa)
INSERT INTO course_enrollments (course_id, student_id) VALUES
    -- Kem Đá: 4 khóa
    ('d001f1ee-0000-0000-0000-000000000001', 'a111f1ee-6c54-4b01-90e6-d701748f0854'),
    ('d001f1ee-0000-0000-0000-000000000003', 'a111f1ee-6c54-4b01-90e6-d701748f0854'),
    ('d001f1ee-0000-0000-0000-000000000005', 'a111f1ee-6c54-4b01-90e6-d701748f0854'),
    ('d001f1ee-0000-0000-0000-000000000006', 'a111f1ee-6c54-4b01-90e6-d701748f0854'),
    -- Tuấn Khôi: 3 khóa
    ('d001f1ee-0000-0000-0000-000000000002', 'b222f1ee-6c54-4b01-90e6-d701748f0855'),
    ('d001f1ee-0000-0000-0000-000000000004', 'b222f1ee-6c54-4b01-90e6-d701748f0855'),
    ('d001f1ee-0000-0000-0000-000000000007', 'b222f1ee-6c54-4b01-90e6-d701748f0855');

-- 10e. LEARNING PROGRESS
INSERT INTO learning_progress (student_id, course_module_name, progress_pct, mastery_score, ai_dependency, risk_level, time_spent_mins) VALUES
    -- Kem Đá (rủi ro cao, phụ thuộc AI nhiều)
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[HĐH] Deadlock & Synchronization',      100, 35, 'high', 'high_risk', 120),
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[HĐH] Memory Management (Paging)',       80,  40, 'high', 'high_risk', 150),
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[DSA] Graph Search (BFS/DFS)',            95,  50, 'high', 'high_risk', 200),
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[LTNC] Memory Allocation & Pointers',    100, 20, 'high', 'high_risk',  90),
    -- Tuấn Khôi (ổn định, tự học tốt)
    ('b222f1ee-6c54-4b01-90e6-d701748f0855', '[HĐH] Virtual Memory & TLB',             90,  88, 'low',  'optimal',   180),
    ('b222f1ee-6c54-4b01-90e6-d701748f0855', '[DSA] Dynamic Programming',               75,  92, 'none', 'optimal',   300),
    ('b222f1ee-6c54-4b01-90e6-d701748f0855', '[LTNC] STL Containers & Iterators',      100, 90, 'low',  'optimal',   140);

-- 10f. QUIZ HISTORY
INSERT INTO quiz_history (student_id, topic_name, difficulty_level, score, hints_used, quiz_details) VALUES
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[LTNC] Pointers & References', 'advanced', 60, 5,
        '{"questions": [{"q": "Dangling pointer", "result": "incorrect", "hint": true}], "ai_feedback": "Yếu con trỏ, lạm dụng hint."}'::jsonb),
    ('b222f1ee-6c54-4b01-90e6-d701748f0855', '[DSA] Dynamic Programming', 'advanced', 100, 0,
        '{"questions": [{"q": "State transition", "result": "correct", "hint": false}], "ai_feedback": "Tư duy sắc bén."}'::jsonb);

-- 10g. CHAT SESSIONS
INSERT INTO chat_sessions (student_id, topic_name, messages, ai_summary) VALUES
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', '[LTNC] Segmentation Fault',
        '[{"role": "user", "content": "Code bị Segmentation fault rồi, sửa hàm delete này với."}, {"role": "ai", "content": "Lỗi này do truy cập vùng nhớ không hợp lệ. Bạn free(temp) rồi lại gọi temp->next?"}]'::jsonb,
        'Học sinh đòi fix bug hộ. AI dùng Socratic.');

-- 10h. ALERTS
INSERT INTO alert_insights (student_id, type, title, content, is_resolved) VALUES
    ('a111f1ee-6c54-4b01-90e6-d701748f0854', 'intervention_needed', 'SOS: Lỗ hổng LTNC', 'AI Dependency: 95%. Cần can thiệp gấp.', FALSE);

-- 10i. RECOVERY PLANS
INSERT INTO ai_recovery_plans (student_id, plan_details, status) VALUES
    ('a111f1ee-6c54-4b01-90e6-d701748f0854',
        '{"plan_name": "Chinh phục Con trỏ", "phases": [{"name": "Phase 1: Memory Map", "status": "in_progress"}]}'::jsonb,
        'active');

-- ============================================================================
-- DONE! 11 bảng đã được tạo + seed data đầy đủ.
--
-- TÀI KHOẢN ĐĂNG NHẬP MẪU:
--   Học sinh 1:  username: kemda       | password: 123456
--   Học sinh 2:  username: tuankhoi    | password: 123456
--   Giáo viên:   username: thayminh    | password: 123456
-- ============================================================================
