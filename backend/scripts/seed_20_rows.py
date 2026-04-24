"""Script seed mock data 20 rows cho 2 users."""
import sys, os, uuid, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding='utf-8')

from core.database import SessionLocal
import models

USER1_ID = uuid.UUID("1278b9f5-9778-4c6f-9649-67416814900c")
USER2_ID = uuid.UUID("b222f1ee-6c54-4b01-90e6-d701748f0855")

db = SessionLocal()
try:
    # 1. Đảm bảo 2 user tồn tại
    user1 = db.query(models.User).filter(models.User.id == USER1_ID).first()
    if not user1:
        user1 = models.User(
            id=USER1_ID,
            username="student_1278",
            password_hash="mock",
            role="student",
            full_name="Nguyễn Văn A",
            grade="K19",
            total_points=100
        )
        db.add(user1)

    user2 = db.query(models.User).filter(models.User.id == USER2_ID).first()
    if not user2:
        user2 = models.User(
            id=USER2_ID,
            username="tuankhoi",
            password_hash="mock",
            role="student",
            full_name="Tuấn Khôi",
            grade="K20",
            total_points=200
        )
        db.add(user2)
    
    db.commit()

    print("✅ Đã đảm bảo 2 user tồn tại.")

    courses = [
        "[DSA] Graph Search (BFS/DFS)",
        "[DSA] Dynamic Programming",
        "[LTNC] STL Containers & Iterators",
        "[HĐH] Virtual Memory & TLB",
        "[LTNC] Polymorphism & Virtual Functions"
    ]

    topics = [
        "BFS", "DFS", "Dynamic Programming", "Memoization", 
        "STL Vectors", "Iterators", "Virtual Memory", "TLB",
        "Polymorphism", "Virtual Functions"
    ]

    # Generate LearningProgress (khoảng 5 rows cho mỗi user)
    print("Seeding Learning Progress...")
    for uid in [USER1_ID, USER2_ID]:
        for course in courses:
            existing = db.query(models.LearningProgress).filter(
                models.LearningProgress.student_id == uid,
                models.LearningProgress.course_module_name == course
            ).first()
            if not existing:
                risk = random.choice(["optimal", "moderate", "high_risk"])
                ai_dep = "none" if risk == "optimal" else ("moderate" if risk == "moderate" else "high")
                db.add(models.LearningProgress(
                    id=uuid.uuid4(),
                    student_id=uid,
                    course_module_name=course,
                    mastery_score=random.randint(20, 95),
                    ai_dependency=ai_dep,
                    risk_level=risk,
                    progress_pct=random.randint(10, 100),
                    time_spent_mins=random.randint(60, 300)
                ))

    # Generate QuizHistory (khoảng 5 rows cho mỗi user)
    print("Seeding Quiz History...")
    for uid in [USER1_ID, USER2_ID]:
        for i in range(5):
            topic = random.choice(topics)
            score = random.randint(30, 100)
            diff = random.choice(["easy", "medium", "hard"])
            hints = random.randint(0, 10) if score < 70 else random.randint(0, 2)
            db.add(models.QuizHistory(
                id=uuid.uuid4(),
                student_id=uid,
                topic_name=topic,
                difficulty_level=diff,
                score=score,
                hints_used=hints,
                quiz_details={"total": 100, "correct_answers": score // 10}
            ))

    db.commit()
    print("✅ Đã chèn thành công khoảng 20 rows data cho 2 users.")

except Exception as e:
    db.rollback()
    print("❌ Lỗi:", e)
finally:
    db.close()
