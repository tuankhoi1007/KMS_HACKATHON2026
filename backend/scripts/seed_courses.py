"""Seed courses + enrollments data lên Supabase."""
import sys, os, uuid as _uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding='utf-8')

from core.database import SessionLocal
import models


TEACHER_ID = "c333f1ee-6c54-4b01-90e6-d701748f0856"  # Thầy Minh

COURSES_DATA = [
    {"id": "d001f1ee-0000-0000-0000-000000000001", "name": "[DSA] Graph Search (BFS/DFS)",        "subject": "dsa",  "description": "Module tìm kiếm đồ thị: BFS, DFS và ứng dụng.", "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000002", "name": "[DSA] Dynamic Programming",           "subject": "dsa",  "description": "Quy hoạch động cơ bản đến nâng cao.",            "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000003", "name": "[LTNC] Memory Allocation & Pointers", "subject": "ltnc", "description": "Cấp phát bộ nhớ và con trỏ trong C++.",          "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000004", "name": "[LTNC] STL Containers & Iterators",   "subject": "ltnc", "description": "Thư viện chuẩn STL: vector, map, set...",        "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000005", "name": "[HĐH] Deadlock & Synchronization",   "subject": "hdh",  "description": "Đồng bộ hóa tiến trình và bế tắc.",              "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000006", "name": "[HĐH] Memory Management (Paging)",    "subject": "hdh",  "description": "Quản lý bộ nhớ: phân trang, phân đoạn.",         "target_grade": "K22 - CSE"},
    {"id": "d001f1ee-0000-0000-0000-000000000007", "name": "[HĐH] Virtual Memory & TLB",          "subject": "hdh",  "description": "Bộ nhớ ảo, TLB, Page Replacement.",              "target_grade": "K22 - CSE"},
]

ENROLLMENTS = [
    # Kem Đá: 4 khóa
    ("d001f1ee-0000-0000-0000-000000000001", "a111f1ee-6c54-4b01-90e6-d701748f0854"),
    ("d001f1ee-0000-0000-0000-000000000003", "a111f1ee-6c54-4b01-90e6-d701748f0854"),
    ("d001f1ee-0000-0000-0000-000000000005", "a111f1ee-6c54-4b01-90e6-d701748f0854"),
    ("d001f1ee-0000-0000-0000-000000000006", "a111f1ee-6c54-4b01-90e6-d701748f0854"),
    # Tuấn Khôi: 3 khóa
    ("d001f1ee-0000-0000-0000-000000000002", "b222f1ee-6c54-4b01-90e6-d701748f0855"),
    ("d001f1ee-0000-0000-0000-000000000004", "b222f1ee-6c54-4b01-90e6-d701748f0855"),
    ("d001f1ee-0000-0000-0000-000000000007", "b222f1ee-6c54-4b01-90e6-d701748f0855"),
]

db = SessionLocal()
try:
    # 1. Seed courses
    count = 0
    for c in COURSES_DATA:
        cid = _uuid.UUID(c["id"])
        tid = _uuid.UUID(TEACHER_ID)
        existing = db.query(models.Course).filter(models.Course.id == cid).first()
        if not existing:
            db.add(models.Course(
                id=cid,
                teacher_id=tid,
                name=c["name"],
                subject=c["subject"],
                description=c["description"],
                target_grade=c["target_grade"],
            ))
            count += 1
    db.commit()
    print(f"✅ Đã tạo {count} khóa học mới.")

    # 2. Seed enrollments
    enroll_count = 0
    for course_id_str, student_id_str in ENROLLMENTS:
        cid = _uuid.UUID(course_id_str)
        sid = _uuid.UUID(student_id_str)
        existing = db.query(models.CourseEnrollment).filter(
            models.CourseEnrollment.course_id == cid,
            models.CourseEnrollment.student_id == sid,
        ).first()
        if not existing:
            db.add(models.CourseEnrollment(course_id=cid, student_id=sid))
            enroll_count += 1
    db.commit()
    print(f"✅ Đã tạo {enroll_count} enrollments mới.")

    # 3. Verify
    total_courses = db.query(models.Course).count()
    total_enrollments = db.query(models.CourseEnrollment).count()
    print(f"\n📊 Tổng: {total_courses} khóa học, {total_enrollments} enrollments trên Supabase.")

except Exception as e:
    db.rollback()
    print(f"❌ Lỗi: {e}")
    import traceback; traceback.print_exc()
finally:
    db.close()
