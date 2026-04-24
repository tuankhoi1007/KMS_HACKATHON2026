import requests

payload = {
    "teacher_id": "a111f1ee-6c54-4b01-90e6-d701748f0854",
    "topic_name": "Test",
    "difficulty_level": "easy",
    "target_grade": "L01",
    "questions": [{"q": "Test", "options": ["A"], "answer": "A", "hint": "Test"}]
}
res = requests.post("http://127.0.0.1:8000/teacher/quiz/save", json=payload)
print(res.status_code)
print(res.text)
