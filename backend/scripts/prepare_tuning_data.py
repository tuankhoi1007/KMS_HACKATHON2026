"""Script tạo dữ liệu huấn luyện (JSONL) cho Gemini Roadmap Engine.
Data này giúp AI học cách phân bổ thời gian (Pie Chart), bắt điểm yếu dựa trên context.
"""
import json
import random
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Định nghĩa các chủ đề giả lập để train
TOPICS = {
    "dsa": ["Big-O Notation", "Arrays & Strings", "Linked Lists", "Hash Tables", "Stacks & Queues", "Trees & Graphs"],
    "ltnc": ["Variables", "Pointers", "Memory Allocation", "OOP Basics", "Polymorphism"],
    "hdh": ["Process", "CPU Scheduling", "Synchronization", "Deadlock", "Memory Management"]
}

SAMPLES = 50

with open("tuning_data.jsonl", "w", encoding="utf-8") as f:
    for i in range(SAMPLES):
        course = random.choice(["dsa", "ltnc", "hdh"])
        topics = TOPICS[course]
        
        # Ngữ cảnh giả lập
        hints = random.randint(0, 20)
        ai_dep = "High" if hints > 10 else ("Moderate" if hints > 5 else "Low")
        weak_topic = random.choice(topics)
        
        # Đầu vào
        text_input = f"MÔN HỌC: {course.upper()}\n"
        text_input += f"NGỮ CẢNH: AI Dependency: {ai_dep}, Hints: {hints}\n"
        text_input += f"Học sinh yếu phần: {weak_topic}\n"

        # Đầu ra (Expected JSON)
        time_alloc = [
            {"topic": weak_topic, "percentage": random.randint(50, 70)},
            {"topic": "Ôn tập chung", "percentage": 30}
        ]
        
        expected_output = json.dumps({
            "node_statuses": {
                t.lower().replace(" ", "_"): {
                    "status": "in-progress" if t == weak_topic else "mastered",
                    "mastery_pct": 20 if t == weak_topic else 90
                } for t in topics
            },
            "weakness_areas": [weak_topic.lower().replace(" ", "_")],
            "recommended_next": weak_topic.lower().replace(" ", "_"),
            "ai_insight": f"Phát hiện yếu phần {weak_topic} do lạm dụng {hints} hints. Cần tập trung thời gian vào đây.",
            "time_allocation": time_alloc,
            "schedule": [
                {"day": "Thứ 2", "task": f"Đọc lại lý thuyết phần {weak_topic}", "duration": "2 giờ"},
                {"day": "Thứ 3", "task": f"Làm bài tập {weak_topic} tự code", "duration": "3 giờ"},
                {"day": "Thứ 4", "task": "Ôn tập tổng hợp", "duration": "1 giờ"}
            ]
        }, ensure_ascii=False)

        # Ghi JSONL
        json_obj = {
            "text_input": text_input,
            "output": expected_output
        }
        f.write(json.dumps(json_obj, ensure_ascii=False) + "\n")

print("✅ Đã tạo file tuning_data.jsonl với", SAMPLES, "mẫu.")
