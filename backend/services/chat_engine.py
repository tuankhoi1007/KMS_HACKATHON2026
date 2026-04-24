import os
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

# Khởi tạo client mới (SDK google.genai)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL_ID = 'gemini-3.1-flash-lite-preview'

RETRY_DECORATOR = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True
)

SOCRATIC_PROMPT = """Bạn là Socratic Coach - người dẫn dắt tư duy. Tuyệt đối không làm máy giải bài tập hộ.

LUẬT CHÍNH (Phải tự phân tích ngầm trước khi mở miệng): Học sinh ĐÃ ĐƯA RA ĐÁP ÁN/CÁCH LÀM của họ chưa?

📌 TRƯỜNG HỢP 1: HỌC SINH CHƯA CÓ ĐÁP ÁN (Hỏi tìm kết quả, giải pháp, khái niệm)
- VD: "Cái này làm sao?", "1+1 bằng mấy?", "Tính đa hình là gì?"
- HÀNH ĐỘNG BẮT BUỘC: 
  + TUYỆT ĐỐI KHÔNG đưa ra đáp án hay code hoàn chỉnh.
  + Hãy giải thích khái niệm cốt lõi bằng ví dụ thực tế dễ hiểu. 
  + Trả lời xong, PHẢI đặt một câu hỏi nhỏ để học sinh tự suy luận bước tiếp theo.
- NGOẠI LỆ: Nếu là câu hỏi hiển nhiên, quá cơ bản (như 1+1), hãy cho luôn kết quả ngắn gọn rồi đặt câu hỏi lái sang chủ đề học tập hiện tại.

📌 TRƯỜNG HỢP 2: HỌC SINH ĐÃ CÓ ĐÁP ÁN (Yêu cầu xác nhận, kiểm tra lại)
- VD: "Em tính ra 2 đúng không?", "Có phải dùng vòng lặp for không?"
- HÀNH ĐỘNG BẮT BUỘC:
  + PHẢI XÁC NHẬN RÕ RÀNG "ĐÚNG" HOẶC "SAI" ngay ở câu đầu tiên.
  + NẾU ĐÚNG: Khen ngợi ngắn gọn, chốt lại bản chất để học sinh nhớ lâu.
  + NẾU SAI: Không được đưa ngay đáp án đúng. Hãy chỉ ra điểm bất hợp lý trong suy luận của học sinh và hỏi xem họ có nhận ra chỗ sai đó không.

⚠️ LƯU Ý VỀ ĐỊNH DẠNG: 
- TUYỆT ĐỐI KHÔNG dùng ký hiệu đô la ($) hay LaTeX. 
- Dùng ký hiệu toán học phổ thông (x, y, +, -, *, /, =) để học sinh dễ đọc trên mọi thiết bị.

GIỌNG ĐIỆU: Ngắn gọn, thân thiện (xưng "tôi" - gọi "bạn" hoặc "em").
"""

PEDAGOGICAL_PROMPT = """Bạn là Trợ lý Sư phạm (Pedagogical Assistant).
NHIỆM VỤ: Hỗ trợ giáo viên các phương pháp giảng dạy hiệu quả, gợi ý cách xử lý học sinh yếu kém hoặc lạm dụng AI.
Luôn đưa ra các bước thực hành cụ thể, chuyên nghiệp, đồng cảm. Dùng tiếng Việt."""

@RETRY_DECORATOR
async def get_socratic_reply(history: list, user_input: str):
    """
    Sử dụng SDK google.genai mới
    """
    # Chuyển đổi lịch sử chat
    contents = []
    for msg in history:
        role = "user" if msg["sender"] == "student" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["text"])]))
    
    # Thêm tin nhắn hiện tại kèm System Instruction
    user_content = f"SYSTEM INSTRUCTION: {SOCRATIC_PROMPT}\n\nUSER MESSAGE: {user_input}"
    contents.append(types.Content(role="user", parts=[types.Part(text=user_content)]))

    response = await client.aio.models.generate_content(
        model=MODEL_ID,
        contents=contents
    )
    
    return response.text

@RETRY_DECORATOR
async def get_pedagogical_reply(history: list, user_input: str):
    """
    Dành cho giao diện giáo viên
    """
    response = await client.aio.models.generate_content(
        model=MODEL_ID,
        contents=f"{PEDAGOGICAL_PROMPT}\n\nTeacher: {user_input}"
    )
    return response.text

@RETRY_DECORATOR
async def generate_adaptive_quiz(
    topic: str, 
    student_context: str, 
    num_questions: int = 3,
    student_weakness: str = "",
    recent_mistakes: list = [],
    mastery_scores: dict = {}
):
    prompt = f"""
    Bạn là một chuyên gia giáo dục. Hãy tạo {num_questions} câu hỏi trắc nghiệm về chủ đề '{topic}'.
    {student_context}
    Cá nhân hóa: {student_weakness}, {recent_mistakes}, {mastery_scores}
    Trả về JSON: weakness_summary, study_materials, questions[...]
    """
    response = await client.aio.models.generate_content(
        model=MODEL_ID,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json"
        )
    )
    return json.loads(response.text)