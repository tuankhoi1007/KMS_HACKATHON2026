-- ============================================================================
-- AntiRot LMS — INCREMENTAL Migration Script
-- Dùng khi DB đã có data nhưng chưa update schema mới
-- Chạy tại: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================================

-- 1. Thêm cột mới vào skill_nodes (cho Knowledge Graph cá nhân hóa)
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS course_name VARCHAR;
ALTER TABLE skill_nodes ADD COLUMN IF NOT EXISTS key VARCHAR;

-- 2. Thêm cột mới vào chat_sessions (cho Dual-Agent)
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS agent_used VARCHAR DEFAULT 'agent_1';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 0;

-- 3. Tạo bảng courses (Quản lý khóa học)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    description TEXT,
    target_grade VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng course_enrollments (Đăng ký học sinh vào khóa)
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed data: Tạo khóa học mẫu (Thầy Minh tạo)
INSERT INTO courses (id, teacher_id, name, subject, description, target_grade) VALUES
    ('d001f1ee-0000-0000-0000-000000000001', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[DSA] Graph Search (BFS/DFS)',          'dsa',  'Module tìm kiếm đồ thị: BFS, DFS và ứng dụng.', 'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000002', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[DSA] Dynamic Programming',             'dsa',  'Quy hoạch động cơ bản đến nâng cao.',            'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000003', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[LTNC] Memory Allocation & Pointers',   'ltnc', 'Cấp phát bộ nhớ và con trỏ trong C++.',          'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000004', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[LTNC] STL Containers & Iterators',     'ltnc', 'Thư viện chuẩn STL: vector, map, set...',        'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000005', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Deadlock & Synchronization',     'hdh',  'Đồng bộ hóa tiến trình và bế tắc.',              'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000006', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Memory Management (Paging)',      'hdh',  'Quản lý bộ nhớ: phân trang, phân đoạn.',         'K22 - CSE'),
    ('d001f1ee-0000-0000-0000-000000000007', 'c333f1ee-6c54-4b01-90e6-d701748f0856', '[HĐH] Virtual Memory & TLB',            'hdh',  'Bộ nhớ ảo, TLB, Page Replacement.',              'K22 - CSE')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed data: Gán học sinh vào khóa
INSERT INTO course_enrollments (course_id, student_id)
SELECT * FROM (VALUES
    -- Kem Đá: 4 khóa
    ('d001f1ee-0000-0000-0000-000000000001'::UUID, 'a111f1ee-6c54-4b01-90e6-d701748f0854'::UUID),
    ('d001f1ee-0000-0000-0000-000000000003'::UUID, 'a111f1ee-6c54-4b01-90e6-d701748f0854'::UUID),
    ('d001f1ee-0000-0000-0000-000000000005'::UUID, 'a111f1ee-6c54-4b01-90e6-d701748f0854'::UUID),
    ('d001f1ee-0000-0000-0000-000000000006'::UUID, 'a111f1ee-6c54-4b01-90e6-d701748f0854'::UUID),
    -- Tuấn Khôi: 3 khóa
    ('d001f1ee-0000-0000-0000-000000000002'::UUID, 'b222f1ee-6c54-4b01-90e6-d701748f0855'::UUID),
    ('d001f1ee-0000-0000-0000-000000000004'::UUID, 'b222f1ee-6c54-4b01-90e6-d701748f0855'::UUID),
    ('d001f1ee-0000-0000-0000-000000000007'::UUID, 'b222f1ee-6c54-4b01-90e6-d701748f0855'::UUID)
) AS v(course_id, student_id)
WHERE NOT EXISTS (
    SELECT 1 FROM course_enrollments ce
    WHERE ce.course_id = v.course_id AND ce.student_id = v.student_id
);

-- ============================================================================
-- DONE! Đã thêm:
--   - 3 cột vào skill_nodes (student_id, course_name, key)
--   - 3 cột vào chat_sessions (agent_used, retry_count, validation_score)
--   - Bảng courses (7 khóa mẫu)
--   - Bảng course_enrollments (7 enrollments mẫu)
-- ============================================================================
