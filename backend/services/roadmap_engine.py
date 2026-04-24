import os
import json
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

load_dotenv()

# Khởi tạo client mới (SDK google.genai)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Setup Model
TUNED_MODEL = os.getenv("TUNED_MODEL_NAME")
MODEL_ID = TUNED_MODEL if TUNED_MODEL else 'gemini-3.1-flash-lite-preview'
print(f"🚀 Đang sử dụng mô hình: {MODEL_ID}")

# Retry wrapper
RETRY_DECORATOR = retry(
    wait=wait_exponential(multiplier=2, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)

@RETRY_DECORATOR
async def generate_ai_roadmap(course_kb: dict, student_context: str) -> dict:
    """
    Gọi Gemini AI để cá nhân hóa cây kỹ năng cho học sinh.
    """
    nodes = course_kb.get("nodes", [])
    node_keys = [n["key"] for n in nodes if "key" in n]
    
    prompt = f"""
Bạn là chuyên gia giáo dục. Nhiệm vụ của bạn là cập nhật trạng thái "Độ tinh thông" (Mastery) và lập lộ trình học tập.

DỮ LIỆU ĐẦU VÀO:
1. Knowledge Base (Danh sách các chủ đề): {node_keys}
2. Dữ liệu học tập học sinh:
{student_context}

QUY TẮC BẮT BUỘC (TUÂN THỦ TUYỆT ĐỐI):
1. KHÔNG ĐƯỢC PHÉP trả về ai_insight chung chung kiểu "Bạn đang làm tốt". PHẢI chỉ ra chính xác hành động tiếp theo.
2. THỜI GIAN BIỂU (Schedule): Bắt buộc lập kế hoạch cho ít nhất 5 ngày (Thứ 2 đến Thứ 6). Mỗi ngày phải có 1 Task cụ thể, ví dụ: "Giải bài tập Stack nâng cao", "Re-code thuật toán BFS từ đầu".
3. PHÂN BỔ THỜI GIAN (Time Allocation): Phải có ít nhất 3 topic với tỷ lệ phần trăm cụ thể (tổng 100%). Nếu học sinh giỏi, hãy chọn các topic NÂNG CAO.
4. Tên topic trong time_allocation PHẢI kèm tên môn: VD: [DSA] Linked List.
5. Mastery_pct: Nếu học sinh chưa làm bài ở node đó, mặc định mastery_pct là 0 và status là "locked".
6. NẾU HỌC SINH ĐANG GIỎI: Hãy tập trung lộ trình vào việc "Tối ưu hóa thời gian chạy" hoặc "Ứng dụng thực tế" của các kiến thức đã biết.

TRẢ VỀ DUY NHẤT 1 JSON OBJECT:
{{
    "node_statuses": {{
        "key_node": {{ "status": "mastered|in-progress|locked", "mastery_pct": 0 }}
    }},
    "ai_insight": "Phân tích lời khuyên cụ thể.",
    "recommended_next": "key của node nên học tiếp theo",
    "weakness_areas": ["key_1", "key_2"],
    "time_allocation": [
        {{"topic": "[Tên Môn] Tên topic 1", "percentage": 70}}
    ],
    "schedule": [
        {{"day": "Thứ 2", "task": "Đọc lại lý thuyết phần A"}}
    ]
}}
"""

    try:
        # Gọi API bất đồng bộ chuẩn của SDK mới
        response = await client.aio.models.generate_content(
            model=MODEL_ID,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4 # Hạ nhiệt độ xuống một chút để JSON ổn định hơn
            )
        )
        
        raw_text = response.text.strip()
        result = json.loads(raw_text)
        
        # Đảm bảo các field bắt buộc tồn tại
        if "node_statuses" not in result: result["node_statuses"] = {}
        for key in node_keys:
            if key not in result["node_statuses"]:
                result["node_statuses"][key] = {"status": "locked", "mastery_pct": 0}
        
        if "ai_insight" not in result: result["ai_insight"] = "Hãy tiếp tục cố gắng!"
        if "recommended_next" not in result: result["recommended_next"] = node_keys[0] if node_keys else ""
        if "weakness_areas" not in result: result["weakness_areas"] = []
        if "time_allocation" not in result or not result["time_allocation"]:
            # FALLBACK: Nếu AI không trả về chart, lấy 3 node đầu tiên từ KB để vẽ 1 chart mặc định
            kb_nodes = course_kb.get("nodes", [])
            fallback_chart = []
            if kb_nodes:
                subject_label = course_kb.get("subject", "BrainRoot").upper()
                for i in range(min(3, len(kb_nodes))):
                    fallback_chart.append({
                        "topic": f"[{subject_label}] {kb_nodes[i]['name']}",
                        "percentage": 33 if i < 2 else 34
                    })
            result["time_allocation"] = fallback_chart
            
        if "schedule" not in result: result["schedule"] = []
            
        return result

    except json.JSONDecodeError as json_err:
        print(f"\n❌ LỖI PARSE JSON: Model trả về format sai.\nChi tiết: {json_err}")
        print(f"Dữ liệu thô trả về: {response.text if 'response' in locals() else 'None'}\n")
        raise json_err # Ném lỗi lên để Tenacity tự động retry

    except Exception as e:
        print(f"\n❌ LỖI KHI GỌI API: {str(e)}")
        
        # Fallback chart từ KB
        kb_nodes = course_kb.get("nodes", [])
        fallback_chart = []
        if kb_nodes:
            subject_label = course_kb.get("subject", "BrainRoot").upper()
            for i in range(min(3, len(kb_nodes))):
                fallback_chart.append({
                    "topic": f"[{subject_label}] {kb_nodes[i]['name']}",
                    "percentage": 33 if i < 2 else 34
                })

        # Nếu đã thử lại hết số lần mà vẫn tạch, mới trả về Fallback
        return {
            "node_statuses": {k: {"status": "locked", "mastery_pct": 0} for k in node_keys},
            "ai_insight": "Hệ thống đang bận cập nhật dữ liệu, vui lòng thử lại sau.",
            "recommended_next": node_keys[0] if node_keys else "",
            "weakness_areas": [],
            "time_allocation": fallback_chart,
            "schedule": []
        }