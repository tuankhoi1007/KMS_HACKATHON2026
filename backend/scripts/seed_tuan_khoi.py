"""Script seed data cho học sinh Tuấn Khôi (b222f1ee-6c54-4b01-90e6-d701748f0855)"""
import sys, os, uuid
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding='utf-8')

from core.database import SessionLocal
import models
from datetime import datetime, timedelta

STUDENT_ID = uuid.UUID("b222f1ee-6c54-4b01-90e6-d701748f0855")

# Data để push
PROGRESS_DATA = [
    {
        "course_module_name": "[DSA] Dynamic Programming",
        "mastery_score": 30,
        "ai_dependency": "high",
        "risk_level": "high_risk",
    },
    {
        "course_module_name": "[LTNC] STL Containers & Iterators",
        "mastery_score": 50,
        "ai_dependency": "moderate",
        "risk_level": "moderate",
    }
]

QUIZ_DATA = [
    {
        "topic_name": "Dynamic Programming",
        "score": 25,
        "difficulty_level": "hard",
        "hints_used": 15,
        "time_spent": 1200,
        "quiz_details": {"total": 100}
    },
    {
        "topic_name": "STL Containers",
        "score": 55,
        "difficulty_level": "medium",
        "hints_used": 6,
        "time_spent": 600,
        "quiz_details": {"total": 100}
    }
]

db = SessionLocal()
try:
    # 1. Thêm Learning Progress
    print("Seeding Learning Progress...")
    for p in PROGRESS_DATA:
        existing = db.query(models.LearningProgress).filter(
            models.LearningProgress.student_id == STUDENT_ID,
            models.LearningProgress.course_module_name == p["course_module_name"]
        ).first()
        if not existing:
            db.add(models.LearningProgress(
                student_id=STUDENT_ID,
                course_module_name=p["course_module_name"],
                mastery_score=p["mastery_score"],
                ai_dependency=p["ai_dependency"],
                risk_level=p["risk_level"]
            ))
        else:
            existing.mastery_score = p["mastery_score"]
            existing.ai_dependency = p["ai_dependency"]
            existing.risk_level = p["risk_level"]
            
    # 2. Thêm Quiz History
    print("Seeding Quiz History...")
    for i, q in enumerate(QUIZ_DATA):
        db.add(models.QuizHistory(
            student_id=STUDENT_ID,
            topic_name=q["topic_name"],
            score=q["score"],
            difficulty_level=q["difficulty_level"],
            hints_used=q["hints_used"],
            quiz_details=q["quiz_details"]
        ))

    db.commit()
    print("✅ Seed data cho Tuấn Khôi thành công!")
    
except Exception as e:
    db.rollback()
    print("❌ Lỗi:", e)
finally:
    db.close()
