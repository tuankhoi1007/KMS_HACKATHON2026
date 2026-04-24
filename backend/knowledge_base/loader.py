import json
import os
import re

# Đường dẫn tới thư mục knowledge_base
KB_DIR = os.path.dirname(os.path.abspath(__file__))

# Mapping từ prefix trong course_module_name → file JSON
SUBJECT_MAP = {
    "dsa": "dsa.json",
    "ltnc": "ltnc.json",
    "hdh": "hdh.json",
    "hđh": "hdh.json",  # Hỗ trợ cả ký tự tiếng Việt
}


def detect_subject(course_module_name: str) -> str:
    """
    Phát hiện môn học từ tên module.
    VD: '[DSA] Graph Search (BFS/DFS)' → 'dsa'
        '[HĐH] Deadlock & Synchronization' → 'hdh'
        '[LTNC] Memory Allocation & Pointers' → 'ltnc'
    """
    # Ưu tiên tìm trong ngoặc vuông [DSA], [LTNC], [HĐH]
    match = re.match(r"^\[(.+?)\]", course_module_name)
    if match:
        subject_key = match.group(1).strip().lower()
        if subject_key in SUBJECT_MAP:
            return subject_key

    # Fallback: kiểm tra từ khóa trong tên
    lower_name = course_module_name.lower()
    for key in SUBJECT_MAP:
        if key in lower_name:
            return key

    return "dsa"  # Mặc định


def load_course_kb(course_module_name: str) -> dict:
    """
    Load Knowledge Base (cây kỹ năng chuẩn) cho một môn học.
    Trả về dict { subject, full_name, nodes: [...], edges: [...] }
    """
    if course_module_name.lower() == "global":
        merged_kb = {"subject": "global", "full_name": "Tất cả môn học (Global Roadmap)", "nodes": [], "edges": []}
        for filename in ["dsa.json", "ltnc.json", "hdh.json"]:
            path = os.path.join(KB_DIR, filename)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    merged_kb["nodes"].extend(data.get("nodes", []))
                    merged_kb["edges"].extend(data.get("edges", []))
        return merged_kb

    subject = detect_subject(course_module_name)
    filename = SUBJECT_MAP.get(subject, "dsa.json")
    filepath = os.path.join(KB_DIR, filename)

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Không tìm thấy Knowledge Base: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        kb = json.load(f)

    return kb
