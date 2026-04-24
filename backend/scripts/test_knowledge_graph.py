"""
Test Script: Tạo Knowledge Graph cho học sinh Kem Đá.
Chạy: python scripts/test_knowledge_graph.py
"""
import asyncio
import sys
import os
import json

# Setup path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.stdout.reconfigure(encoding='utf-8')

from core.database import SessionLocal
from knowledge_base.loader import load_course_kb
from services.roadmap_engine import generate_ai_roadmap
import models

STUDENT_ID = "a111f1ee-6c54-4b01-90e6-d701748f0854"

# Danh sách khóa học của Kem Đá
COURSES = [
    "[DSA] Graph Search (BFS/DFS)",
    "[LTNC] Memory Allocation & Pointers",
    "[HĐH] Deadlock & Synchronization",
    "[HĐH] Memory Management (Paging)",
]


def build_student_context(db, user, course_name):
    """Gom ngữ cảnh học sinh từ DB."""
    progress = db.query(models.LearningProgress).filter(
        models.LearningProgress.student_id == STUDENT_ID,
        models.LearningProgress.course_module_name == course_name
    ).first()

    recent_quizzes = db.query(models.QuizHistory).filter(
        models.QuizHistory.student_id == STUDENT_ID,
    ).order_by(models.QuizHistory.created_at.desc()).limit(5).all()

    quiz_summary = ""
    for q in recent_quizzes:
        total = q.quiz_details.get("total", 0) if q.quiz_details else 0
        quiz_summary += f"  - Topic: {q.topic_name}, Score: {q.score}/{total}, Hints: {q.hints_used}\n"

    return f"""
    - Họ tên: {user.full_name}, Lớp: {user.grade}
    - Thời gian học tuần này: {user.study_hours_this_week} giờ
    - Tổng điểm: {user.total_points}, Streak: {user.current_streak}
    - Khóa học: {course_name}
    - AI dependency: {progress.ai_dependency if progress else 'none'}
    - Risk level: {progress.risk_level if progress else 'optimal'}
    - Mastery Score: {progress.mastery_score if progress else 0}/100
    - Progress: {progress.progress_pct if progress else 0}%
    - Quiz gần nhất:
{quiz_summary if quiz_summary else '    Chưa có.'}
    """


async def test_single_course(db, user, course_name):
    """Test generate graph cho 1 khóa."""
    print(f"\n{'='*60}")
    print(f"  KHÓA: {course_name}")
    print(f"{'='*60}")

    # 1. Load KB
    kb = load_course_kb(course_name)
    print(f"  Knowledge Base: {kb['subject']} — {len(kb['nodes'])} nodes, {len(kb['edges'])} edges")

    # 2. Build context
    context = build_student_context(db, user, course_name)

    # 3. Gọi AI
    print("  Đang gọi Gemini AI...")
    result = await generate_ai_roadmap(kb, context)

    # 4. Hiển thị kết quả
    print(f"\n  📊 AI INSIGHT: {result.get('ai_insight', 'N/A')}")
    print(f"  ⭐ RECOMMENDED NEXT: {result.get('recommended_next', 'N/A')}")
    print(f"  ⚠️  WEAKNESS AREAS: {result.get('weakness_areas', [])}")

    print(f"\n  {'Node':<30s} {'Status':<15s} {'Mastery':>8s}")
    print(f"  {'-'*55}")
    statuses = result.get("node_statuses", {})
    for key, val in statuses.items():
        status_icon = "✅" if val['status'] == 'mastered' else "🔄" if val['status'] == 'in-progress' else "🔒"
        print(f"  {status_icon} {key:<28s} {val['status']:<15s} {val['mastery_pct']:>6d}%")

    return result


async def main():
    print("=" * 60)
    print("  TEST KNOWLEDGE GRAPH — Học sinh: Kem Đá")
    print("  Student ID:", STUDENT_ID)
    print("=" * 60)

    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.id == STUDENT_ID).first()
        if not user:
            print("❌ Không tìm thấy học sinh!")
            return

        print(f"  👤 {user.full_name} | Lớp: {user.grade}")
        print(f"  📈 Points: {user.total_points} | Streak: {user.current_streak} | Study: {user.study_hours_this_week}h")

        all_results = {}
        for course in COURSES:
            try:
                result = await test_single_course(db, user, course)
                all_results[course] = result
            except Exception as e:
                print(f"  ❌ LỖI: {e}")

        # Lưu kết quả ra file JSON
        output_path = os.path.join(os.path.dirname(__file__), "test_graph_results.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_results, f, ensure_ascii=False, indent=2)
        print(f"\n{'='*60}")
        print(f"  ✅ Kết quả đã lưu tại: {output_path}")
        print(f"{'='*60}")

    except Exception as e:
        print(f"❌ LỖI CHUNG: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
