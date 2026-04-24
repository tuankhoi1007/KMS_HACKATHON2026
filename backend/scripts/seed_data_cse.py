import os
import sys
import uuid
import json
from datetime import datetime, timedelta

# Thêm đường dẫn để Python tìm thấy các module core/models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import SessionLocal, engine
import models

def seed_k22_data():
    # Đảm bảo các bảng đã được tạo
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Định nghĩa ID cố định
    KEM_DA_ID = uuid.UUID('a111f1ee-6c54-4b01-90e6-d701748f0854')
    TUAN_KHOI_ID = uuid.UUID('b222f1ee-6c54-4b01-90e6-d701748f0855')

    try:
        print("--- Đang khởi tạo dữ liệu - CSE ---")

        # 1. UPSERT USERS (Kem Đá & Tuấn Khôi)
        users_data = [
            {
                "id": KEM_DA_ID, "role": "student", "full_name": "Kem Đá", "grade": "K22 - CSE",
                "avatar_url": "https://ui-avatars.com/api/?name=Kem+Da", "total_points": 4100,
                "current_streak": 3, "study_hours_this_week": 24.5, "created_at": datetime.now() - timedelta(days=30)
            },
            {
                "id": TUAN_KHOI_ID, "role": "student", "full_name": "Tuấn Khôi", "grade": "K22 - CSE",
                "avatar_url": "https://ui-avatars.com/api/?name=Tuan+Khoi", "total_points": 8900,
                "current_streak": 45, "study_hours_this_week": 14.0, "created_at": datetime.now() - timedelta(days=60)
            }
        ]

        for u in users_data:
            existing = db.query(models.User).filter(models.User.id == u["id"]).first()
            if not existing:
                db.add(models.User(**u))
        db.flush()

        # 2. LEARNING PROGRESS
        progress_data = [
            # KEM ĐÁ
            (KEM_DA_ID, '[HĐH] Deadlock & Synchronization', 100, 35, 'high', 'high_risk', 120, 2),
            (KEM_DA_ID, '[HĐH] Memory Management (Paging)', 80, 40, 'high', 'high_risk', 150, 5),
            (KEM_DA_ID, '[DSA] Graph Search (BFS/DFS)', 95, 50, 'high', 'high_risk', 200, 7),
            (KEM_DA_ID, '[LTNC] Memory Allocation & Pointers', 100, 20, 'high', 'high_risk', 90, 0.4), # 10 hours
            # TUẤN KHÔI
            (TUAN_KHOI_ID, '[HĐH] Virtual Memory & TLB', 90, 88, 'low', 'optimal', 180, 1),
            (TUAN_KHOI_ID, '[DSA] Dynamic Programming', 75, 92, 'none', 'optimal', 300, 2),
            (TUAN_KHOI_ID, '[LTNC] STL Containers & Iterators', 100, 90, 'low', 'optimal', 140, 3)
        ]

        for student_id, module, prog, mastery, ai_dep, risk, time_spent, day_ago in progress_data:
            db.add(models.LearningProgress(
                id=uuid.uuid4(), student_id=student_id, course_module_name=module,
                progress_pct=prog, mastery_score=mastery, ai_dependency=ai_dep,
                risk_level=risk, time_spent_mins=time_spent,
                last_active=datetime.now() - timedelta(days=day_ago)
            ))

        # 3. QUIZ HISTORY (JSONB)
        quiz_data = [
            {
                "student_id": KEM_DA_ID, "topic": "[LTNC] Pointers & References", "score": 60, "hints": 5,
                "details": {"questions": [{"q": "Dangling pointer", "result": "incorrect", "hint": True}], "ai_feedback": "Yếu con trỏ, lạm dụng hint."}
            },
            {
                "student_id": TUAN_KHOI_ID, "topic": "[DSA] Dynamic Programming", "score": 100, "hints": 0,
                "details": {"questions": [{"q": "State transition", "result": "correct", "hint": False}], "ai_feedback": "Tư duy sắc bén."}
            }
        ]
        for q in quiz_data:
            db.add(models.QuizHistory(
                id=uuid.uuid4(), student_id=q["student_id"], topic_name=q["topic"],
                difficulty_level="advanced", score=q["score"], hints_used=q["hints"],
                quiz_details=q["details"], created_at=datetime.now() - timedelta(days=2)
            ))

        # 4. CHAT SESSIONS
        chat_msg = [
            {"role": "user", "content": "Code bị Segmentation fault rồi, sửa hàm delete này với."},
            {"role": "ai", "content": "Lỗi này do truy cập vùng nhớ không hợp lệ. Bạn free(temp) rồi lại gọi temp->next?"}
        ]
        db.add(models.ChatSession(
            id=uuid.uuid4(), student_id=KEM_DA_ID, topic_name="[LTNC] Segmentation Fault",
            messages=chat_msg, ai_summary="Học sinh đòi fix bug hộ. AI dùng Socratic.",
            created_at=datetime.now() - timedelta(hours=15)
        ))

        # 5. ALERTS & RECOVERY
        db.add(models.AlertInsight(
            id=uuid.uuid4(), student_id=KEM_DA_ID, type="intervention_needed",
            title="SOS: Lỗ hổng LTNC", content="AI Dependency: 95%. Cần can thiệp gấp.",
            is_resolved=False, created_at=datetime.now() - timedelta(hours=5)
        ))

        db.add(models.AiRecoveryPlan(
            id=uuid.uuid4(), student_id=KEM_DA_ID,
            plan_details={
                "plan_name": "Chinh phục Con trỏ",
                "phases": [{"name": "Phase 1: Memory Map", "status": "in_progress"}]
            },
            status="active", created_at=datetime.now()
        ))

        db.commit()
        print("--- THÀNH CÔNG: Đã bơm dữ liệu! ---")

    except Exception as e:
        db.rollback()
        print(f"Lỗi bơm dữ liệu: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_k22_data()