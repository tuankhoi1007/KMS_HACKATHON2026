from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from core.database import get_db
import models
from sqlalchemy import func
from uuid import UUID
from typing import Optional

teacher = APIRouter(prefix="/teacher", tags=["Teacher Dashboard"])

# --- 1. TÌM KIẾM HỌC SINH ---
@teacher.get("/search-students")
def search_students(
    name: Optional[str] = Query(None, description="Tìm theo tên học sinh"),
    db: Session = Depends(get_db)
):
    query = db.query(models.User).filter(models.User.role == "student")
    if name:
        query = query.filter(models.User.full_name.ilike(f"%{name}%"))
    return query.all()

# --- 2. BIỂU ĐỒ LỚP HỌC (Frame 4) ---
@teacher.get("/class-analytics")
def get_class_stats(db: Session = Depends(get_db)):
    # Đếm số lượng theo rủi ro (Dùng cho biểu đồ tròn Frame 4)
    risk_dist = db.query(models.LearningProgress.risk_level, func.count(models.LearningProgress.id))\
                  .group_by(models.LearningProgress.risk_level).all()
    
    # Lấy danh sách học sinh rủi ro cao (Intervention Needed)
    high_risk_students = db.query(models.User).join(models.LearningProgress)\
                           .filter(models.LearningProgress.risk_level == 'high_risk').all()
    
    return {
        "risk_distribution": dict(risk_dist),
        "intervention_needed": high_risk_students
    }

# --- 3. DASHBOARD TỔNG QUAN ---
@teacher.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    
    # Lấy các cảnh báo chưa được giải quyết của cả lớp
    recent_alerts = db.query(models.AlertInsight)\
                      .filter(models.AlertInsight.is_resolved == False)\
                      .order_by(models.AlertInsight.created_at.desc())\
                      .limit(5).all()
                      
    return {
        "total_students": total_students,
        "recent_alerts": recent_alerts
    }

# --- 4. CHI TIẾT RỦI RO (Frame 5) ---
@teacher.get("/student/{student_id}/detail")
def get_student_detail_analysis(student_id: UUID, db: Session = Depends(get_db)):
    # 1. Thông tin cá nhân & Chỉ số tổng quát (Frame 5 top bar)
    student = db.query(models.User).filter(models.User.id == student_id).first()
    
    # 2. Performance Trend (Dữ liệu vẽ biểu đồ cột Frame 5)
    trend = db.query(models.LearningProgress)\
              .filter(models.LearningProgress.student_id == student_id)\
              .order_by(models.LearningProgress.last_active.asc()).all()

    # 3. AI Dependency & Insights (Phần bên phải Frame 5)
    current_status = db.query(models.LearningProgress)\
                       .filter(models.LearningProgress.student_id == student_id)\
                       .order_by(models.LearningProgress.last_active.desc()).first()

    # 4. Personalized Recovery Track (Cái box xanh to ở giữa Frame 5)
    recovery_plan = db.query(models.AiRecoveryPlan)\
                      .filter(models.AiRecoveryPlan.student_id == student_id)\
                      .order_by(models.AiRecoveryPlan.created_at.desc()).first()

    # 5. Recent Activity Table (Bảng dưới cùng Frame 5)
    activities = db.query(models.LearningProgress)\
                   .filter(models.LearningProgress.student_id == student_id)\
                   .limit(5).all()

    return {
        "profile": student,
        "performance_trend": trend,
        "ai_dependency_score": current_status.ai_dependency if current_status else "low",
        "recovery_track": recovery_plan,
        "recent_activity": activities
    }

# --- 5. CHAT TUTOR (PEDAGOGICAL ASSISTANT) ---
from pydantic import BaseModel
from services.chat_engine import get_pedagogical_reply, generate_adaptive_quiz

class TeacherChatPayload(BaseModel):
    message: str

@teacher.post("/chat")
async def teacher_chat(payload: TeacherChatPayload):
    # Dùng get_pedagogical_reply để tư vấn sư phạm
    reply = await get_pedagogical_reply(history=[], user_input=payload.message)
    return {"reply": reply}

# --- 6. QUIZ GENERATOR ---
@teacher.get("/quiz/generate")
async def generate_teacher_quiz(topic: str, difficulty: str = 'medium', num: int = 3):
    questions = await generate_adaptive_quiz(topic=topic, difficulty=difficulty, num_questions=num)
    return {
        "topic": topic,
        "difficulty": difficulty,
        "questions": questions
    }

class SaveQuizPayload(BaseModel):
    teacher_id: str
    topic_name: str
    difficulty_level: str
    target_grade: Optional[str] = None
    expires_at: Optional[str] = None
    questions: list

@teacher.post("/quiz/save")
def save_teacher_quiz(payload: SaveQuizPayload, db: Session = Depends(get_db)):
    from datetime import datetime
    exp_date = None
    if payload.expires_at:
        try:
            exp_date = datetime.fromisoformat(payload.expires_at)
        except ValueError:
            pass

    new_quiz = models.TeacherQuiz(
        teacher_id=payload.teacher_id,
        topic_name=payload.topic_name,
        difficulty_level=payload.difficulty_level,
        target_grade=payload.target_grade,
        expires_at=exp_date,
        questions=payload.questions
    )
    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)
    return {"message": "Đã lưu bộ câu hỏi thành công", "quiz_id": new_quiz.id}


# =============================================================================
# 7. QUẢN LÝ KHÓA HỌC (COURSES)
# =============================================================================

class CreateCoursePayload(BaseModel):
    teacher_id: str
    name: str               # VD: "[DSA] Graph Search (BFS/DFS)"
    subject: str             # VD: "dsa"
    description: Optional[str] = None
    target_grade: Optional[str] = None

@teacher.post("/courses")
def create_course(payload: CreateCoursePayload, db: Session = Depends(get_db)):
    """Giáo viên tạo một khóa học mới (module)."""
    new_course = models.Course(
        teacher_id=payload.teacher_id,
        name=payload.name,
        subject=payload.subject,
        description=payload.description,
        target_grade=payload.target_grade,
    )
    db.add(new_course)
    db.commit()
    db.refresh(new_course)
    return {"message": "Đã tạo khóa học thành công", "course": new_course}


@teacher.get("/courses")
def get_teacher_courses(teacher_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Lấy danh sách khóa học. Nếu có teacher_id thì lọc theo giáo viên."""
    query = db.query(models.Course)
    if teacher_id:
        query = query.filter(models.Course.teacher_id == teacher_id)
    return query.order_by(models.Course.created_at.desc()).all()


@teacher.delete("/courses/{course_id}")
def delete_course(course_id: UUID, db: Session = Depends(get_db)):
    """Xóa khóa học."""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại.")
    db.delete(course)
    db.commit()
    return {"message": "Đã xóa khóa học."}


# =============================================================================
# 8. ĐĂNG KÝ HỌC SINH VÀO KHÓA HỌC (ENROLLMENT)
# =============================================================================

class EnrollStudentsPayload(BaseModel):
    course_id: str
    student_ids: list[str]   # Danh sách UUID học sinh

@teacher.post("/courses/enroll")
def enroll_students(payload: EnrollStudentsPayload, db: Session = Depends(get_db)):
    """Giáo viên thêm học sinh vào khóa học + tự động tạo LearningProgress."""
    course = db.query(models.Course).filter(models.Course.id == payload.course_id).first()
    if not course:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Khóa học không tồn tại.")

    enrolled = 0
    for sid in payload.student_ids:
        # Kiểm tra đã enroll chưa
        existing = db.query(models.CourseEnrollment).filter(
            models.CourseEnrollment.course_id == payload.course_id,
            models.CourseEnrollment.student_id == sid,
        ).first()
        if existing:
            continue

        # Tạo enrollment
        db.add(models.CourseEnrollment(
            course_id=payload.course_id,
            student_id=sid,
        ))

        # Tự động tạo LearningProgress nếu chưa có
        existing_progress = db.query(models.LearningProgress).filter(
            models.LearningProgress.student_id == sid,
            models.LearningProgress.course_module_name == course.name,
        ).first()
        if not existing_progress:
            db.add(models.LearningProgress(
                student_id=sid,
                course_module_name=course.name,
                progress_pct=0,
                mastery_score=0,
                ai_dependency="none",
                risk_level="optimal",
                time_spent_mins=0,
            ))
        enrolled += 1

    db.commit()
    return {"message": f"Đã thêm {enrolled} học sinh vào khóa '{course.name}'."}


@teacher.get("/courses/{course_id}/students")
def get_course_students(course_id: UUID, db: Session = Depends(get_db)):
    """Lấy danh sách học sinh đã đăng ký vào khóa học."""
    enrollments = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.course_id == course_id
    ).all()
    student_ids = [e.student_id for e in enrollments]
    students = db.query(models.User).filter(models.User.id.in_(student_ids)).all()
    return students


@teacher.delete("/courses/{course_id}/students/{student_id}")
def unenroll_student(course_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    """Xóa học sinh khỏi khóa học."""
    enrollment = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.course_id == course_id,
        models.CourseEnrollment.student_id == student_id,
    ).first()
    if enrollment:
        db.delete(enrollment)
        db.commit()
    return {"message": "Đã xóa học sinh khỏi khóa học."}