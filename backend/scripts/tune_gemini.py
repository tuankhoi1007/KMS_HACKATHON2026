"""Script để đẩy file JSONL lên Google và bắt đầu Fine-tune Gemini."""
import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# 1. Upload file
print("Uploading file...")
file = genai.upload_file("tuning_data.jsonl", mime_type="application/json")
print("Uploaded file:", file.name)

# 2. Tạo tuning job
print("Bắt đầu tuning (có thể mất 15-30 phút)...")
operation = genai.create_tuned_model(
    display_name="roadmap-evaluator-v1",
    source_model="models/gemini-1.5-flash-001-tuning",
    epoch_count=5,
    batch_size=4,
    learning_rate=0.001,
    training_data=file,
)

for status in operation.wait_bar():
    time.sleep(10)

result = operation.result()
print("\n✅ Tuning hoàn tất!")
print("Tuned Model Name:", result.name)
print("Hãy copy tên model này và đặt vào biến môi trường TUNED_MODEL_NAME.")
