from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from core.database import get_db
from models.skill_model import SkillNode, SkillEdge, StudentSkillStatus
from schemas.skill_schema import (
    SkillNodeCreate, SkillNodeResponse,
    SkillEdgeCreate, SkillEdgeResponse,
    StudentSkillStatusUpdate, StudentSkillStatusResponse,
    SkillNodeWithStatus, SkillGraphResponse, SkillStatus,
)
from knowledge_base.loader import load_course_kb, detect_subject
from services.roadmap_engine import generate_ai_roadmap
from typing import List, Optional
import models
import uuid

skill_tree = APIRouter(prefix="/skill-tree", tags=["Skill Tree"])


# ============================================================================
# GET /skill-tree/{student_id}/graph?course_name=...
# Trả về toàn bộ graph (nodes + edges) kèm trạng thái cá nhân.
# Nếu chưa có data trong DB → tự động generate.
# ============================================================================
@skill_tree.get("/{student_id}/graph")
async def get_skill_graph(
    student_id: uuid.UUID,
    course_name: str,
    db: Session = Depends(get_db)
):
    """Lấy cây kỹ năng cá nhân hóa cho 1 học sinh, 1 khóa học."""

    # 1. Kiểm tra xem đã có cây trong DB chưa
    existing_nodes = db.query(SkillNode).filter(
        SkillNode.student_id == student_id,
        SkillNode.course_name == course_name
    ).all()

    if existing_nodes:
        # Đã có data → lấy từ DB
        node_ids = [n.id for n in existing_nodes]
        edges = db.query(SkillEdge).filter(
            SkillEdge.source_node_id.in_(node_ids)
        ).all()
        statuses = db.query(StudentSkillStatus).filter(
            StudentSkillStatus.student_id == student_id,
            StudentSkillStatus.skill_node_id.in_(node_ids)
        ).all()
        status_map = {str(s.skill_node_id): s for s in statuses}

        nodes_with_status = []
        for node in existing_nodes:
            st = status_map.get(str(node.id))
            nodes_with_status.append(SkillNodeWithStatus(
                id=node.id,
                key=node.key,
                name=node.name,
                description=node.description,
                category=node.category,
                position_x=node.position_x,
                position_y=node.position_y,
                status=st.status if st else SkillStatus.LOCKED,
                mastery_pct=st.mastery_pct if st else 0,
            ))

        edges_response = [SkillEdgeResponse(
            id=e.id, source_node_id=e.source_node_id, target_node_id=e.target_node_id
        ) for e in edges]

        # TODO: ai_insight có thể được cache trong DB, hiện tại trả None
        return SkillGraphResponse(
            nodes=nodes_with_status,
            edges=edges_response,
            ai_insight=None,
            recommended_next=None,
            weakness_areas=None,
        )

    else:
        # Chưa có → auto-generate
        return await generate_and_save_graph(student_id, course_name, db)


# ============================================================================
# POST /skill-tree/{student_id}/generate
# Gọi AI tạo mới / tái tạo cây kỹ năng.
# ============================================================================
@skill_tree.post("/{student_id}/generate")
async def generate_skill_graph(
    student_id: uuid.UUID,
    data: dict = Body(...),
    db: Session = Depends(get_db)
):
    """Gọi AI để tạo/tái tạo cây kỹ năng cá nhân hóa."""
    course_name = data.get("course_name")
    if not course_name:
        raise HTTPException(status_code=400, detail="Thiếu course_name.")

    try:
        return await generate_and_save_graph(student_id, course_name, db, data.get("target_level"), data.get("hours_per_day"))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



# ============================================================================
# HELPER: Generate + Save vào DB
# ============================================================================
async def generate_and_save_graph(
    student_id: uuid.UUID,
    course_name: str,
    db: Session,
    target_level: str = None,
    hours_per_day: int = None
) -> SkillGraphResponse:
    """Logic chính: load KB, gom context, gọi AI, lưu DB, trả response."""

    # 1. Load Knowledge Base
    try:
        course_kb = load_course_kb(course_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # 2. Gom Student Context
    user = db.query(models.User).filter(models.User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại.")

    progress = db.query(models.LearningProgress).filter(
        models.LearningProgress.student_id == student_id,
        models.LearningProgress.course_module_name == course_name
    ).first()

    recent_quizzes = db.query(models.QuizHistory).filter(
        models.QuizHistory.student_id == student_id,
    ).order_by(models.QuizHistory.created_at.desc()).limit(5).all()

    recent_chats = db.query(models.ChatSession).filter(
        models.ChatSession.student_id == student_id,
    ).order_by(models.ChatSession.created_at.desc()).limit(3).all()

    quiz_summary = ""
    for q in recent_quizzes:
        total = q.quiz_details.get("total", 0) if q.quiz_details else 0
        quiz_summary += f"  - Topic: {q.topic_name}, Score: {q.score}/{total}, Hints: {q.hints_used}, Difficulty: {q.difficulty_level}\n"

    chat_summary = ""
    for c in recent_chats:
        chat_summary += f"  - Topic: {c.topic_name}, AI Summary: {c.ai_summary or 'N/A'}\n"

    student_context = f"""
    - Họ tên: {user.full_name}
    - Lớp: {user.grade}
    - Thời gian học tuần này: {user.study_hours_this_week} giờ.
    - Tổng điểm tích lũy: {user.total_points}.
    - Chuỗi ngày học liên tiếp: {user.current_streak}.
    - Khóa học đang xem: {course_name}.
    - Mức độ phụ thuộc AI: {progress.ai_dependency if progress else 'none'}.
    - Mức độ rủi ro: {progress.risk_level if progress else 'optimal'}.
    - Mastery Score (khóa này): {progress.mastery_score if progress else 0}/100.
    - Tiến độ hoàn thành: {progress.progress_pct if progress else 0}%.
    - Lịch sử Quiz gần nhất:
{quiz_summary if quiz_summary else '    Chưa có.'}
    - Lịch sử Chat Socratic gần nhất:
{chat_summary if chat_summary else '    Chưa có.'}
    - MỤC TIÊU CỦA HỌC SINH (Hãy điều chỉnh thời gian biểu theo đây):
      + Số giờ học/ngày: {hours_per_day if hours_per_day else 2} giờ.
    """

    # 3. Gọi AI
    ai_result = await generate_ai_roadmap(course_kb, student_context)

    # 4. Xóa data cũ (nếu có)
    old_nodes = db.query(SkillNode).filter(
        SkillNode.student_id == student_id,
        SkillNode.course_name == course_name
    ).all()
    old_node_ids = [n.id for n in old_nodes]

    if old_node_ids:
        db.query(StudentSkillStatus).filter(
            StudentSkillStatus.skill_node_id.in_(old_node_ids)
        ).delete(synchronize_session=False)
        db.query(SkillEdge).filter(
            SkillEdge.source_node_id.in_(old_node_ids)
        ).delete(synchronize_session=False)
        db.query(SkillNode).filter(
            SkillNode.id.in_(old_node_ids)
        ).delete(synchronize_session=False)
        db.flush()

    # 5. Ghi nodes mới vào DB
    subject = detect_subject(course_name)
    node_statuses = ai_result.get("node_statuses", {})
    key_to_db_node = {}

    for kb_node in course_kb["nodes"]:
        key = kb_node["key"]
        ai_status = node_statuses.get(key, {"status": "locked", "mastery_pct": 0})

        db_node = SkillNode(
            id=uuid.uuid4(),
            student_id=student_id,
            course_name=course_name,
            key=key,
            name=kb_node["name"],
            description=kb_node["description"],
            category=subject,
            position_x=kb_node["position_x"],
            position_y=kb_node["position_y"],
        )
        db.add(db_node)
        db.flush()  # Để lấy được db_node.id

        key_to_db_node[key] = db_node

        # Ghi status
        db.add(StudentSkillStatus(
            id=uuid.uuid4(),
            student_id=student_id,
            skill_node_id=db_node.id,
            status=ai_status.get("status", "locked"),
            mastery_pct=ai_status.get("mastery_pct", 0),
        ))

    # 6. Ghi edges
    for kb_edge in course_kb["edges"]:
        src_node = key_to_db_node.get(kb_edge["source"])
        tgt_node = key_to_db_node.get(kb_edge["target"])
        if src_node and tgt_node:
            db.add(SkillEdge(
                id=uuid.uuid4(),
                source_node_id=src_node.id,
                target_node_id=tgt_node.id,
            ))

    db.commit()

    # 7. Build response
    nodes_with_status = []
    for kb_node in course_kb["nodes"]:
        key = kb_node["key"]
        db_node = key_to_db_node[key]
        ai_s = node_statuses.get(key, {"status": "locked", "mastery_pct": 0})
        nodes_with_status.append(SkillNodeWithStatus(
            id=db_node.id,
            key=key,
            name=db_node.name,
            description=db_node.description,
            category=db_node.category,
            position_x=db_node.position_x,
            position_y=db_node.position_y,
            status=ai_s.get("status", "locked"),
            mastery_pct=ai_s.get("mastery_pct", 0),
        ))

    all_edges = db.query(SkillEdge).filter(
        SkillEdge.source_node_id.in_([n.id for n in key_to_db_node.values()])
    ).all()

    edges_response = [SkillEdgeResponse(
        id=e.id, source_node_id=e.source_node_id, target_node_id=e.target_node_id
    ) for e in all_edges]

    return SkillGraphResponse(
        nodes=nodes_with_status,
        edges=edges_response,
        ai_insight=ai_result.get("ai_insight"),
        recommended_next=ai_result.get("recommended_next"),
        weakness_areas=ai_result.get("weakness_areas"),
        time_allocation=ai_result.get("time_allocation"),
        schedule=ai_result.get("schedule"),
    )


# ============================================================================
# LEGACY ENDPOINTS (giữ lại để không break code cũ)
# ============================================================================
@skill_tree.post("/nodes", response_model=SkillNodeResponse)
def create_skill_node(payload: SkillNodeCreate, db: Session = Depends(get_db)):
    new_node = SkillNode(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        position_x=payload.position_x,
        position_y=payload.position_y,
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    return new_node


@skill_tree.post("/edges", response_model=SkillEdgeResponse)
def create_skill_edge(payload: SkillEdgeCreate, db: Session = Depends(get_db)):
    src = db.query(SkillNode).filter(SkillNode.id == payload.source_node_id).first()
    tgt = db.query(SkillNode).filter(SkillNode.id == payload.target_node_id).first()
    if not src or not tgt:
        raise HTTPException(status_code=404, detail="Một trong hai node không tồn tại.")

    new_edge = SkillEdge(
        source_node_id=payload.source_node_id,
        target_node_id=payload.target_node_id,
    )
    db.add(new_edge)
    db.commit()
    db.refresh(new_edge)
    return new_edge


@skill_tree.get("/{student_id}/mastered", response_model=List[SkillNodeResponse])
def get_mastered_skills(student_id: uuid.UUID, db: Session = Depends(get_db)):
    mastered_statuses = db.query(StudentSkillStatus).filter(
        StudentSkillStatus.student_id == student_id,
        StudentSkillStatus.status == "mastered",
    ).all()

    if not mastered_statuses:
        return []

    mastered_node_ids = [s.skill_node_id for s in mastered_statuses]
    nodes = db.query(SkillNode).filter(SkillNode.id.in_(mastered_node_ids)).all()
    return nodes
