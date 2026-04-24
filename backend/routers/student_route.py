from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from core.database import get_db
import models
import uuid
from datetime import datetime
from typing import List, Any, Optional
from services.chat_engine import get_socratic_reply, generate_adaptive_quiz

student = APIRouter(prefix="/student", tags=["Student Interface"])

# --- FRAME 1: COMMUNITY PICKS ---
@student.get("/community/curated-picks")
def get_community_picks():
    return [
        {"id": 1, "title": "Mẹo học con trỏ C++ không đau đầu", "author": "Tâm Leader", "tag": "LTNC", "read_time": "5 min"},
        {"id": 2, "title": "Cách đặt câu hỏi Socratic để nhớ lâu", "author": "Khóc vì miss", "tag": "Soft Skills", "read_time": "3 min"},
        {"id": 3, "title": "Review: 7 ngày 'cai nghiện' copy code từ AI", "author": "Nghĩa Tròn", "tag": "BrainRoot", "read_time": "6 min"},
        {"id": 4, "title": "Bí kíp sống sót qua môn Hệ điều hành: Đừng học vẹt!", "author": "Tuấn Khui", "tag": "HĐH", "read_time": "8 min"},
        {"id": 5, "title": "Tại sao xem Tutorial mãi mà vẫn không tự code được Graph?", "author": "Làng với hình bóng nọ", "tag": "DSA", "read_time": "4 min"},
        {"id": 6, "title": "Phương pháp Feynman: Dạy lại cho AI để x2 ghi nhớ", "author": "Gia Đào", "tag": "Study Hack", "read_time": "5 min"}
    ]

# --- FRAME 1 & 3: STUDENT DASHBOARD (Profile, Progress & Alerts) ---
@student.get("/{student_id}/dashboard")
def get_student_dashboard(student_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Học sinh không tồn tại")
    
    progress = db.query(models.LearningProgress).filter(models.LearningProgress.student_id == student_id).all()
    
    # Lấy các khóa học sinh viên đã đăng ký
    enrollments = db.query(models.CourseEnrollment).filter(models.CourseEnrollment.student_id == student_id).all()
    if enrollments:
        enrolled_course_ids = [e.course_id for e in enrollments]
        courses = db.query(models.Course).filter(models.Course.id.in_(enrolled_course_ids)).all()
        
        progress_course_names = {p.course_module_name for p in progress}
        
        for c in courses:
            if c.name not in progress_course_names:
                new_prog = models.LearningProgress(
                    id=uuid.uuid4(),
                    student_id=student_id,
                    course_module_name=c.name,
                    progress_pct=0,
                    mastery_score=0,
                    ai_dependency="none",
                    risk_level="optimal",
                    time_spent_mins=0,
                    last_active=datetime.now()
                )
                db.add(new_prog)
                progress.append(new_prog)
                
        # Commit changes if we added new progress
        if len(progress) > len(progress_course_names):
            db.commit()
    
    # Lấy thông báo/cảnh báo cho học sinh (Frame 1)
    alerts = db.query(models.AlertInsight).filter(
        models.AlertInsight.student_id == student_id,
        models.AlertInsight.is_resolved == False
    ).all()
    
    return {
        "profile": user,
        "learning_progress": progress,
        "active_alerts": alerts
    }

# --- FRAME 3: QUIZ CENTER ---
@student.get("/quiz/{topic}/teacher-questions")
def get_quiz_questions(topic: str):
    topic_key = topic.lower()

    quiz_db = {
        "dsa": [
            # --- Cấp độ: EASY (Khởi động, kiểm tra khái niệm) ---
            {"id": 101, "difficulty": "easy", "q": "Cấu trúc dữ liệu nào hoạt động theo nguyên tắc LIFO (Last In, First Out)?", "options": ["Queue", "Stack", "Tree", "Graph"], "hint": "Tưởng tượng một chồng đĩa ăn ở nhà hàng, bạn sẽ lấy cái đĩa nào ra đầu tiên?"},
            {"id": 102, "difficulty": "easy", "q": "Độ phức tạp thời gian khi truy cập một phần tử bất kỳ trong Mảng (Array) bằng index là?", "options": ["O(1)", "O(n)", "O(log n)", "O(n^2)"], "hint": "Nếu bạn biết chính xác số nhà của bạn bè trên một con đường, bạn có cần phải gõ cửa từng nhà để tìm không?"},
            {"id": 103, "difficulty": "easy", "q": "Queue (Hàng đợi) thường được ứng dụng trong trường hợp nào?", "options": ["Quản lý lời gọi hàm (Function calls)", "Lưu trữ đồ thị", "Lập lịch tiến trình CPU", "Tìm đường đi ngắn nhất"], "hint": "Khi bạn đi siêu thị tính tiền, thu ngân sẽ phục vụ người đến trước hay người đến sau?"},
            {"id": 104, "difficulty": "easy", "q": "Thao tác chèn vào đầu Linked List mất bao lâu?", "options": ["O(1)", "O(n)", "O(log n)", "Tùy thuộc kích thước mảng"], "hint": "Nếu bạn nắm được mắt xích đầu tiên của một sợi dây chuyền, việc móc thêm một mắt xích mới vào đầu dây có phụ thuộc vào việc dây dài bao nhiêu không?"},
            {"id": 105, "difficulty": "easy", "q": "Binary Search yêu cầu điều kiện gì đối với mảng đầu vào?", "options": ["Độ dài chẵn", "Đã được sắp xếp", "Không có số âm", "Các phần tử phải duy nhất"], "hint": "Bạn có thể lật từ điển ra ngay giữa để tìm một từ, nếu các từ trong đó không được xếp theo bảng chữ cái không?"},

            # --- Cấp độ: MEDIUM (Vận dụng, phân biệt thuật toán) ---
            {"id": 106, "difficulty": "medium", "q": "Trong BFS (Breadth-First Search), cấu trúc dữ liệu nào được sử dụng để lưu các đỉnh chờ duyệt?", "options": ["Stack", "Queue", "Priority Queue", "Hash Map"], "hint": "Thuật toán này loang ra như gợn sóng nước. Để đảm bảo duyệt hết lớp thứ 1 rồi mới tới lớp thứ 2, bạn cần quy tắc vào-ra nào?"},
            {"id": 107, "difficulty": "medium", "q": "Trường hợp xấu nhất (Worst-case) của Quick Sort xảy ra khi nào?", "options": ["Mảng đã được sắp xếp sẵn", "Mảng chứa toàn số 0", "Khi chọn pivot ngẫu nhiên", "Kích thước mảng quá lớn"], "hint": "Điều gì xảy ra nếu bạn luôn xui xẻo chọn phải phần tử lớn nhất hoặc nhỏ nhất làm chốt (pivot), khiến mảng bị chia thành 1 bên 0 và 1 bên n-1 phần tử?"},
            {"id": 108, "difficulty": "medium", "q": "Xử lý đụng độ (Collision) trong Hash Table bằng Chaining nghĩa là gì?", "options": ["Tìm ô trống tiếp theo để chèn", "Tạo một Linked List tại index bị đụng độ", "Băm lại (Re-hash) lần nữa", "Xóa phần tử cũ"], "hint": "Nếu 3 người cùng được phân vào ngồi chung 1 cái ghế, cách tốt nhất để giữ lại cả 3 là nối cho họ thêm một dãy ghế phụ ở đằng sau đúng không?"},
            {"id": 109, "difficulty": "medium", "q": "Thuật toán sắp xếp nào ổn định (Stable Sort)?", "options": ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"], "hint": "'Ổn định' nghĩa là 2 phần tử bằng nhau sẽ giữ nguyên thứ tự ban đầu. Thuật toán nào cẩn thận trộn từng nửa lại với nhau thay vì tráo đổi vị trí liên tục?"},
            {"id": 110, "difficulty": "medium", "q": "Duyệt cây nhị phân theo thứ tự In-order (Trái - Gốc - Phải) trên cây BST (Binary Search Tree) sẽ cho kết quả gì?", "options": ["Mảng giảm dần", "Mảng ngẫu nhiên", "Mảng tăng dần", "Sao chép cây"], "hint": "BST luôn có node trái nhỏ hơn node gốc, node gốc nhỏ hơn node phải. Nếu cứ đọc từ trái sang phải thì kết quả trông sẽ thế nào?"},

            # --- Cấp độ: HARD (Tối ưu hóa, thuật toán nâng cao) ---
            {"id": 111, "difficulty": "hard", "q": "Giải thuật Dijkstra không hoạt động đúng nếu đồ thị có đặc điểm gì?", "options": ["Có chu trình", "Có trọng số âm", "Đồ thị có hướng", "Số lượng đỉnh quá lớn"], "hint": "Dijkstra rất 'tham lam', nó nghĩ rằng cứ đi tiếp thì quãng đường luôn dài ra. Nếu có một con đường đi qua càng nhiều càng 'trả lại tiền' thì nó có nhận ra được không?"},
            {"id": 112, "difficulty": "hard", "q": "Trong Quy hoạch động (Dynamic Programming), Memoization giải quyết vấn đề gì?", "options": ["Tính toán lại các bài toán con bị trùng lặp", "Giảm không gian bộ nhớ", "Tránh tràn bộ nhớ Stack", "Khử đệ quy"], "hint": "Nếu ai đó hỏi bạn 1234 * 5678 bằng mấy, bạn tính mất 5 phút. 1 giây sau họ hỏi lại đúng câu đó, bạn có tính lại từ đầu không?"},
            {"id": 113, "difficulty": "hard", "q": "Cây AVL khác cây Nhị phân tìm kiếm (BST) thông thường ở điểm nào cốt lõi?", "options": ["Cho phép giá trị trùng lặp", "Tự động cân bằng chiều cao sau khi chèn/xóa", "Số lượng con tối đa là 3", "Lưu trữ chuỗi thay vì số"], "hint": "Điều gì xảy ra với BST thông thường nếu bạn chèn vào các số 1, 2, 3, 4, 5? Nó sẽ thành 1 cái Linked List! Vậy cần cơ chế gì để ngăn chặn điều đó?"},
            {"id": 114, "difficulty": "hard", "q": "Độ phức tạp khi tìm kiếm một chuỗi độ dài L trong cấu trúc Trie (Prefix Tree) là bao nhiêu?", "options": ["O(N)", "O(L)", "O(L log N)", "O(N * L)"], "hint": "Trong từ điển (Trie), để tìm chữ 'APPLE', số lần bạn lật trang có phụ thuộc vào việc cuốn từ điển dày bao nhiêu, hay chỉ phụ thuộc vào số chữ cái của từ 'APPLE'?"},
            {"id": 115, "difficulty": "hard", "q": "Thuật toán Floyd-Warshall dùng để làm gì?", "options": ["Tìm cây khung nhỏ nhất", "Tìm đường đi ngắn nhất giữa mọi cặp đỉnh", "Tìm luồng cực đại", "Phân loại đồ thị"], "hint": "Dijkstra tìm từ 1 đỉnh đến mọi đỉnh. Nếu bạn muốn tìm khoảng cách giữa TẤT CẢ các thành phố trên bản đồ với nhau thì dùng gì?"}
        ],

        "ltnc": [
            # --- Cấp độ: EASY ---
            {"id": 201, "difficulty": "easy", "q": "Đâu là điểm khác biệt lớn nhất giữa Reference (&) và Pointer (*) trong C++?", "options": ["Reference có thể mang giá trị NULL", "Reference không thể trỏ sang đối tượng khác sau khi đã khởi tạo", "Pointer tốn ít bộ nhớ hơn", "Pointer không thể gán bằng địa chỉ"], "hint": "Pointer là một tờ giấy ghi địa chỉ nhà (có thể tẩy xóa viết lại). Reference là một biệt danh (nickname) gắn chết với một người từ lúc sinh ra. Bạn có thay đổi nickname đó sang chỉ người khác được không?"},
            {"id": 202, "difficulty": "easy", "q": "Từ khóa 'virtual' trong C++ dùng để hỗ trợ tính chất nào của OOP?", "options": ["Đóng gói (Encapsulation)", "Đa hình (Polymorphism)", "Kế thừa (Inheritance)", "Trừu tượng (Abstraction)"], "hint": "Khi bạn gọi hành động 'kêu()', nếu là chó thì sủa, mèo thì meo. Cơ chế nào giúp máy tính tự quyết định tiếng kêu đúng lúc chương trình đang chạy (runtime)?"},
            {"id": 203, "difficulty": "easy", "q": "Điều gì xảy ra nếu bạn không 'delete' bộ nhớ sau khi cấp phát bằng 'new'?", "options": ["Chương trình chạy nhanh hơn", "Bộ nhớ bị rò rỉ (Memory Leak)", "Lỗi biên dịch", "Hệ điều hành tự thu hồi ngay lập tức"], "hint": "Nếu bạn thuê phòng khách sạn (xin cấp phát bộ nhớ) mà lúc đi không chịu trả chìa khóa (delete), chủ khách sạn có cho người khác thuê phòng đó được nữa không?"},
            {"id": 204, "difficulty": "easy", "q": "Hàm Constructor (Khởi tạo) có kiểu trả về không?", "options": ["Có, là kiểu void", "Có, trả về chính class đó", "Không có kiểu trả về", "Có, là kiểu int"], "hint": "Nhiệm vụ của nó chỉ là 'xây nhà' lúc bắt đầu, vậy nó có cần phải 'báo cáo' (return) kết quả nào ra ngoài không?"},
            {"id": 205, "difficulty": "easy", "q": "Cấu trúc (Struct) trong C++ mặc định các thành viên có phạm vi truy cập là gì?", "options": ["Private", "Protected", "Public", "Static"], "hint": "Khác với Class mặc định luôn giấu đồ đi (Private), Struct thường được thiết kế để 'ai cũng có thể xem và sửa'."},

            # --- Cấp độ: MEDIUM ---
            {"id": 206, "difficulty": "medium", "q": "Destructor (Hàm hủy) của lớp cơ sở (Base class) có nên được khai báo là 'virtual' không?", "options": ["Không bao giờ", "Luôn luôn CÓ, nếu lớp đó được kế thừa", "Tùy thuộc vào trình biên dịch", "Chỉ khi hàm hủy rỗng"], "hint": "Nếu bạn dùng con trỏ lớp cha trỏ vào đối tượng lớp con, khi delete con trỏ đó mà destructor không virtual, chuyện gì sẽ xảy ra với các tài nguyên riêng của lớp con?"},
            {"id": 207, "difficulty": "medium", "q": "Template trong C++ hoạt động ở giai đoạn nào?", "options": ["Runtime (Lúc chạy)", "Compile time (Lúc biên dịch)", "Load time", "Link time"], "hint": "Khi bạn viết một khuôn đúc bánh (Template), người thợ làm bánh phải đổ bột vào khuôn để tạo ra bánh thật TRƯỚC KHI đem đi bán, hay ĐANG bán mới tạo hình?"},
            {"id": 208, "difficulty": "medium", "q": "std::vector khi hết sức chứa (capacity) thì nó sẽ làm gì?", "options": ["Báo lỗi tràn bộ nhớ", "Cấp phát một vùng nhớ mới lớn hơn, copy dữ liệu cũ sang và xóa vùng nhớ cũ", "Chèn dữ liệu vào đầu vector", "Chuyển thành danh sách liên kết"], "hint": "Tưởng tượng bạn đang ở trọ 1 người, giờ có thêm 2 bạn tới ở ghép mà phòng quá chật. Bạn phải làm gì với đồ đạc của mình?"},
            {"id": 209, "difficulty": "medium", "q": "Sự khác biệt giữa Pass-by-value và Pass-by-reference?", "options": ["Pass-by-value làm thay đổi biến gốc", "Pass-by-reference tạo ra một bản sao", "Pass-by-value copy dữ liệu, Pass-by-reference chia sẻ cùng một ô nhớ", "Không có sự khác biệt"], "hint": "Khi nộp bài tập, bạn đưa giáo viên bản photo (Value) hay bạn nộp bản gốc để giáo viên gạch xóa đỏ chót lên đó (Reference)?"},
            {"id": 210, "difficulty": "medium", "q": "Từ khóa 'const' ở cuối khai báo một hàm thành viên (ví dụ: int getAge() const;) có ý nghĩa gì?", "options": ["Hàm đó trả về một hằng số", "Hàm đó không được phép thay đổi các thuộc tính của object gọi nó", "Hàm đó không thể gọi hàm khác", "Biến cục bộ trong hàm là hằng số"], "hint": "Nếu hàm getAge() chỉ có chức năng là 'đọc' và trả về số tuổi, chúng ta có nên cho phép nó lén lút 'sửa' số tuổi của người đó không?"},

            # --- Cấp độ: HARD ---
            {"id": 211, "difficulty": "hard", "q": "Đặc điểm cốt lõi của std::unique_ptr là gì?", "options": ["Cho phép nhiều con trỏ cùng quản lý 1 vùng nhớ", "Sử dụng Reference Counting", "Không thể copy, chỉ có thể move", "Tự động copy sâu (Deep copy)"], "hint": "Chữ 'Unique' có nghĩa là độc nhất. Nếu bạn có một món đồ gia truyền độc nhất, bạn có thể 'copy' nó cho người khác không, hay chỉ có thể 'chuyển quyền sở hữu' (move) cho họ?"},
            {"id": 212, "difficulty": "hard", "q": "Hàm std::move() thực chất làm công việc gì bên dưới?", "options": ["Di chuyển vùng nhớ vật lý từ RAM sang Ổ cứng", "Thực hiện việc copy dữ liệu nhanh hơn", "Ép kiểu đối tượng thành rvalue reference (&&) để kích hoạt Move Constructor", "Xóa bộ nhớ hiện tại"], "hint": "Nó KHÔNG HỀ dời đồ đạc của bạn đi đâu cả. Nó chỉ dán một cái nhãn lên đồ đạc ghi là: 'Tôi không cần món đồ này nữa, ai có hàm Move thì cứ việc lấy đi'."},
            {"id": 213, "difficulty": "hard", "q": "Vấn đề 'Vòng lặp tham chiếu' (Circular Reference) trong std::shared_ptr được giải quyết bằng cách nào?", "options": ["Dùng std::unique_ptr", "Dùng std::weak_ptr", "Viết vòng lặp do-while", "Gọi hàm reset() thủ công"], "hint": "A trỏ tới B, B trỏ lại A. Cả hai đều nghĩ: 'Đứa kia chưa chết thì mình chưa chết được'. Cần một loại con trỏ nào đó 'chỉ đứng nhìn thôi nhưng không làm tăng bộ đếm sinh mạng (reference count)'?"},
            {"id": 214, "difficulty": "hard", "q": "Sự khác biệt giữa 'new' và 'malloc'?", "options": ["new là thư viện C, malloc là C++", "malloc tự động gọi Constructor, new thì không", "new vừa cấp phát vùng nhớ vừa gọi Constructor, malloc chỉ cấp bộ nhớ rỗng", "Không khác gì nhau"], "hint": "Malloc chỉ giống như việc bạn mua một mảnh đất trống. Còn 'new' là mua mảnh đất VÀ gọi luôn nhà thầu (Constructor) đến xây cái nhà lên đó."},
            {"id": 215, "difficulty": "hard", "q": "Lambda expression (Hàm nặc danh) Capture Clause `[=]` có ý nghĩa gì?", "options": ["Chụp tất cả các biến bên ngoài bằng tham chiếu (Reference)", "Chụp tất cả các biến bên ngoài bằng giá trị (Copy)", "Không bắt biến nào", "Cho phép sửa biến gốc"], "hint": "Dấu bằng (=) thường dùng để gán (copy) giá trị. Dấu và (&) dùng để lấy địa chỉ. Bạn đoán xem?"}
        ],

        "hdh": [
            # --- Cấp độ: EASY ---
            {"id": 301, "difficulty": "easy", "q": "Tiến trình (Process) đang chạy mà phải dừng lại đợi người dùng nhập bàn phím, nó sẽ chuyển sang trạng thái nào?", "options": ["Ready (Sẵn sàng)", "Blocked/Waiting (Chờ đợi)", "Terminated (Kết thúc)", "Running"], "hint": "CPU chạy rất nhanh, còn tay bạn gõ phím rất chậm. CPU có rảnh rỗi đứng nhìn bạn gõ không, hay nó cất tiến trình đó vào 'phòng chờ'?"},
            {"id": 302, "difficulty": "easy", "q": "Khái niệm Context Switch (Chuyển ngữ cảnh) là gì?", "options": ["Khởi động lại máy tính", "Chuyển từ chế độ User mode sang Kernel mode", "Lưu trạng thái tiến trình cũ và nạp trạng thái tiến trình mới vào CPU", "Đổi mật khẩu người dùng"], "hint": "Bạn đang đọc dở sách Toán thì có điện thoại. Bạn gấp sách lại (đánh dấu trang), nghe xong lại mở sách Toán ra đọc tiếp ở đúng trang đó. Hành động 'đánh dấu và mở lại' gọi là gì?"},
            {"id": 303, "difficulty": "easy", "q": "Hệ điều hành là gì?", "options": ["Một phần cứng quản lý RAM", "Một chương trình ứng dụng để soạn thảo", "Phần mềm hệ thống trung gian giữa phần cứng và người dùng", "Một loại virus"], "hint": "Nếu máy tính là một công ty, thì phần cứng là công nhân, phần mềm là khách hàng. Ai là 'Giám đốc' đứng ở giữa để phân công công việc?"},
            {"id": 304, "difficulty": "easy", "q": "Bộ nhớ ảo (Virtual Memory) giúp ích gì?", "options": ["Làm CPU chạy nhanh gấp đôi", "Cho phép chạy các chương trình có kích thước lớn hơn dung lượng RAM thực tế", "Xóa virus khỏi ổ cứng", "Tăng dung lượng pin"], "hint": "Nếu bàn làm việc của bạn (RAM) quá nhỏ, nhưng bạn lại có một cái tủ hồ sơ rất lớn (Ổ cứng), bạn sẽ làm gì để xử lý được nhiều sách vỡ cùng lúc?"},
            {"id": 305, "difficulty": "easy", "q": "System Call (Lời gọi hệ thống) được dùng khi nào?", "options": ["Tiến trình người dùng cần yêu cầu HĐH làm một việc mà nó không có quyền (VD: đọc file)", "Khi gọi hàm printf()", "Khi khai báo biến int", "Khi tính toán a + b"], "hint": "Bạn không được phép tự ý vào kho lấy hàng. Bạn phải đưa một cái 'đơn yêu cầu' cho thủ kho. Hệ điều hành chính là thủ kho đó."},

            # --- Cấp độ: MEDIUM ---
            {"id": 306, "difficulty": "medium", "q": "Thuật toán định thời Round Robin có đặc tính gì nổi bật?", "options": ["Xử lý tiến trình ngắn nhất trước", "Không bao giờ có preemption (ngắt quãng)", "Phân bổ cho mỗi tiến trình một khoảng thời gian bằng nhau (Time Quantum)", "Dựa vào độ ưu tiên tĩnh"], "hint": "Round Robin giống như việc cô giáo chia bánh kẹo cho một vòng tròn các em bé. Mỗi em chỉ được phát đúng 1 cái rồi chuyển sang em kế tiếp."},
            {"id": 307, "difficulty": "medium", "q": "Hiện tượng Trashing xảy ra khi nào?", "options": ["Lỗi màn hình xanh do RAM hỏng", "HĐH dành nhiều thời gian để swap (đổi trang) hơn là thực thi tiến trình", "CPU quá nóng", "Ổ cứng bị phân mảnh"], "hint": "Nếu cái bàn (RAM) của bạn có quá nhiều sách, mỗi lần tìm thông tin bạn cứ phải cất sách A vào tủ, lấy sách B ra, rồi lại cất B lấy A. Thời gian 'vận chuyển' còn nhiều hơn thời gian học!"},
            {"id": 308, "difficulty": "medium", "q": "Sự khác biệt giữa Mutex và Semaphore?", "options": ["Không có khác biệt", "Mutex là số nguyên n, Semaphore chỉ là 0 hoặc 1", "Mutex chỉ có 1 quyền sở hữu (lock/unlock), Semaphore là một bộ đếm đếm số lượng tài nguyên", "Semaphore chỉ dùng cho Thread"], "hint": "Mutex giống chìa khóa nhà vệ sinh duy nhất của quán cafe (1 người xài). Semaphore giống bảng điện tử đếm số chỗ trống trong bãi đỗ xe (nhiều người cùng xài theo sức chứa)."},
            {"id": 309, "difficulty": "medium", "q": "Trong phân trang (Paging), địa chỉ logic được chia thành 2 phần nào?", "options": ["Page Number và Page Offset", "Segment Number và Segment Offset", "Base và Limit", "Track và Sector"], "hint": "Để tìm một dòng chữ trong sách, bạn cần biết 2 thứ: Số thứ tự của trang sách đó (Page), và số thứ tự của dòng chữ tính từ đầu trang (Offset)."},
            {"id": 310, "difficulty": "medium", "q": "Điều kiện cần thiết để xảy ra Deadlock (Bế tắc) KHÔNG bao gồm điều kiện nào?", "options": ["Mutual Exclusion (Loại trừ tương hỗ)", "Hold and Wait (Giữ và Chờ)", "No Preemption (Không ưu tiên đoạt quyền)", "Preemptive scheduling (Định thời đoạt quyền)"], "hint": "Deadlock giống như kẹt xe ngã tư. Nếu cảnh sát giao thông có quyền 'cẩu' mạnh tay một chiếc xe ra khỏi hàng (Preemption), thì kẹt xe có xảy ra không?"},

            # --- Cấp độ: HARD ---
            {"id": 311, "difficulty": "hard", "q": "Thuật toán Banker (Banker's Algorithm) dùng để làm gì?", "options": ["Phát hiện Deadlock", "Ngăn chặn Deadlock (Deadlock Avoidance) bằng cách kiểm tra trạng thái an toàn", "Lập lịch CPU", "Quản lý thay thế trang"], "hint": "Trước khi ngân hàng cho bạn vay tiền, họ phải tính toán xem: Nếu đưa tiền cho bạn, ngân hàng có đủ tiền lẻ để duy trì hoạt động cho các khách khác không (trạng thái Safe)?"},
            {"id": 312, "difficulty": "hard", "q": "Hiện tượng Belady's Anomaly xảy ra ở thuật toán thay thế trang (Page Replacement) nào?", "options": ["LRU (Least Recently Used)", "FIFO (First In First Out)", "Optimal", "Clock"], "hint": "Thông thường, mua thêm RAM (tăng số khung trang) thì máy chạy mượt hơn (ít lỗi trang). Thuật toán nào 'ngu' đến mức: tăng thêm khung trang mà lỗi lại càng xảy ra nhiều hơn?"},
            {"id": 313, "difficulty": "hard", "q": "TLB (Translation Lookaside Buffer) là gì?", "options": ["Bộ đệm ổ cứng", "Bộ nhớ Cache phần cứng siêu tốc dùng để lưu bảng phân trang (Page Table) gần nhất", "Thuật toán chống phân mảnh", "Bộ lập lịch của Kernel"], "hint": "Bảng phân trang (Page Table) nằm trong RAM. Truy cập RAM khá chậm. Bạn cần một cuốn 'sổ tay nhỏ' nằm ngay sát CPU để nhớ các địa chỉ vừa tra cứu xong!"},
            {"id": 314, "difficulty": "hard", "q": "Trong thiết kế Hệ điều hành, Microkernel có ưu điểm gì so với Monolithic kernel?", "options": ["Tốc độ chạy siêu nhanh", "Tính ổn định và bảo mật cao do chỉ giữ các chức năng tối thiểu ở Kernel Mode", "Dễ viết code hơn", "Không cần Driver"], "hint": "Microkernel giống như một tổng công ty mà hầu hết các phòng ban (drivers, file system) bị đẩy ra làm công ty outsource độc lập. Nếu một phòng ban sập, tổng công ty có chết theo không?"},
            {"id": 315, "difficulty": "hard", "q": "Priority Inversion (Nghịch lý độ ưu tiên) là lỗi gì trong lập trình đồng thời?", "options": ["Tiến trình độ ưu tiên cao phải đợi tiến trình độ ưu tiên thấp nhả tài nguyên (Mutex)", "Hệ thống tự giảm độ ưu tiên của tiến trình", "Không thể cài đặt mức ưu tiên", "Tiến trình chạy mãi không dừng"], "hint": "Sếp lớn (High priority) muốn đi vệ sinh nhưng nhân viên quèn (Low priority) lại đang cầm chìa khóa (Lock) ở trong đó. Kẻ quyền lực nhất lại phải chầu chực kẻ yếu nhất!"}
        ]
    }
    if topic_key not in quiz_db:
        raise HTTPException(status_code=404, detail="Topic chưa có câu hỏi mẫu")
    return {"topic": topic, "type": "teacher_assigned", "questions": quiz_db[topic_key]}

@student.get("/{student_id}/quiz/{topic}/ai-questions")
async def get_ai_adaptive_quiz(
    student_id: uuid.UUID,
    topic: str, 
    num: int = 3, # Cho phép Frontend tự định nghĩa số lượng câu hỏi
    db: Session = Depends(get_db)
):
    try:
        # Thu thập ngữ cảnh học sinh
        user = db.query(models.User).filter(models.User.id == student_id).first()
        # Lấy progress CỤ THỂ của topic đó
        progress = db.query(models.LearningProgress).filter(
            models.LearningProgress.student_id == student_id,
            models.LearningProgress.course_module_name == topic
        ).first()

        if not progress:
            raise HTTPException(status_code=403, detail="Học sinh chưa học hoặc không được cấp quyền truy cập topic này.")
        
        # ============================================================
        # KNOWLEDGE TRACING: Thu thập trạng thái học sinh từ Database
        # ============================================================
        
        # 1. Lấy 5 bài quiz gần nhất của topic này
        recent_quizzes = db.query(models.QuizHistory).filter(
            models.QuizHistory.student_id == student_id,
            models.QuizHistory.topic_name == topic
        ).order_by(models.QuizHistory.created_at.desc()).limit(5).all()
        
        total_hints_used = sum([q.hints_used for q in recent_quizzes])
        recent_scores = [f"{q.score}/{q.quiz_details.get('total_questions', '?')}" for q in recent_quizzes] if recent_quizzes else []
        
        # 2. Trích xuất LỖI SAI GẦN ĐÂY từ quiz_details
        recent_mistakes = []
        for quiz in recent_quizzes:
            details = quiz.quiz_details or {}
            wrong_answers = details.get("wrong_answers", [])
            for wrong in wrong_answers:
                if isinstance(wrong, dict):
                    q_text = wrong.get("question", "")
                    chosen = wrong.get("chosen", "")
                    correct = wrong.get("correct", "")
                    if q_text:
                        recent_mistakes.append(f"Sai câu '{q_text[:60]}...' — Chọn '{chosen}' thay vì '{correct}'")
                elif isinstance(wrong, str):
                    recent_mistakes.append(wrong)
        
        # 3. Lấy MASTERY SCORES từ StudentSkillStatus (nếu có)
        skill_statuses = db.query(models.StudentSkillStatus).filter(
            models.StudentSkillStatus.student_id == student_id
        ).all()
        
        mastery_scores = {}
        student_weakness = ""
        lowest_mastery = 101
        
        for ss in skill_statuses:
            # Lấy tên node từ SkillNode
            node = db.query(models.SkillNode).filter(models.SkillNode.id == ss.skill_node_id).first()
            if node:
                mastery_scores[node.name] = ss.mastery_pct
                if ss.mastery_pct < lowest_mastery:
                    lowest_mastery = ss.mastery_pct
                    student_weakness = node.name
        
        # 4. Xây dựng Student Context cho Dynamic Prompt
        study_hours = user.study_hours_this_week if user else 0
        ai_dependency = progress.ai_dependency
        risk_level = progress.risk_level

        student_context = f"""
        - Chủ đề bài thi: {topic}
        - Tên học sinh: {user.full_name if user else 'N/A'}
        - Thời gian học tuần này: {study_hours} giờ.
        - Mức độ phụ thuộc AI: {ai_dependency}.
        - Mức độ rủi ro (risk level): {risk_level}.
        - Tổng hints đã dùng trong 5 bài quiz gần nhất: {total_hints_used}.
        - Kết quả các bài quiz gần nhất (đúng/tổng): {', '.join(recent_scores) if recent_scores else 'Chưa có'}.
        """

        # 5. Gọi Dynamic Prompt Engine
        ai_response_data = await generate_adaptive_quiz(
            topic=topic, 
            student_context=student_context, 
            num_questions=num,
            student_weakness=student_weakness,
            recent_mistakes=recent_mistakes,
            mastery_scores=mastery_scores,
        )
        
        return {
            "topic": topic,
            "type": "ai_adaptive",
            "weakness_summary": ai_response_data.get("weakness_summary", "Không có dữ liệu đánh giá."),
            "study_materials": ai_response_data.get("study_materials", []),
            "total_questions": len(ai_response_data.get("questions", [])),
            "questions": ai_response_data.get("questions", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Hệ thống AI đang quá tải, vui lòng thử lại. Lỗi: {str(e)}"
        )
    
@student.post("/quiz/submit")
def submit_quiz(data: dict = Body(...), db: Session = Depends(get_db)):
    """
    Quiz Submit với BKT Lite (Per-Question Knowledge Tracing).
    
    Thuật toán cập nhật Mastery theo TỪNG CÂU HỎI:
    - Đúng + không xem Hint: +20%  (Hiểu bài thực sự)
    - Đúng + có xem Hint:   +5%   (Vẫn khuyến khích, nhưng ít credit)
    - Sai + không xem Hint:  -10%  (Sai do ẩu hoặc thiếu kiến thức)
    - Sai + ĐÃ xem Hint:    -20%  (Hổng kiến thức nặng, AI cần can thiệp)
    - Mastery bị clamp trong [0, 100]
    """
    score = data['score']
    hints_used = data['hints_used']
    total_questions = data['quiz_details'].get('total_questions', data.get('total_questions', 5))
    wrong_answers = data['quiz_details'].get('wrong_answers', [])
    answers_detail = data['quiz_details'].get('answers_detail', [])
    
    new_quiz = models.QuizHistory(
        id=uuid.uuid4(),
        student_id=data['student_id'],
        topic_name=data['topic_name'],
        difficulty_level=data.get('difficulty_level', 'intermediate'),
        score=score,
        hints_used=hints_used,
        quiz_details=data['quiz_details'],
        created_at=datetime.now()
    )
    
    # ============================================================
    # BKT LITE — Per-Question Mastery Update
    # ============================================================
    
    # Lấy progress của topic này
    progress = db.query(models.LearningProgress).filter(
        models.LearningProgress.student_id == data['student_id'],
        models.LearningProgress.course_module_name == data['topic_name']
    ).first()
    
    # Tính mastery_delta từ per-question detail nếu có
    mastery_delta = 0
    if answers_detail:
        # Per-question analysis (chính xác nhất)
        for ans in answers_detail:
            is_correct = ans.get('is_correct', False)
            used_hint = ans.get('used_hint', False)
            if is_correct and not used_hint:
                mastery_delta += 20   # Hiểu bài thực sự
            elif is_correct and used_hint:
                mastery_delta += 5    # Vẫn OK nhưng phụ thuộc hint
            elif not is_correct and not used_hint:
                mastery_delta -= 10   # Sai do ẩu / thiếu kiến thức
            else:  # Sai dù đã xem hint
                mastery_delta -= 20   # Hổng kiến thức nặng
        # Chia trung bình cho số câu để tránh bùng nổ
        mastery_delta = mastery_delta // max(1, len(answers_detail))
    else:
        # Fallback: Tính gộp nếu frontend chưa gửi per-question detail
        correct_count = score
        wrong_count = total_questions - correct_count
        if hints_used == 0:
            mastery_delta = (correct_count * 20 - wrong_count * 10) // max(1, total_questions)
        else:
            mastery_delta = (correct_count * 5 - wrong_count * 20) // max(1, total_questions)
    
    new_mastery = 50  # Default
    points_earned = max(0, score * 10 - hints_used * 3)  # Tính điểm thưởng
    
    if progress:
        # Cập nhật mastery (clamp 0-100)
        old_mastery = progress.mastery_score or 50
        new_mastery = max(0, min(100, old_mastery + mastery_delta))
        progress.mastery_score = new_mastery
        
        # Cập nhật progress_pct (tăng dần theo số quiz đã làm)
        quiz_count = db.query(models.QuizHistory).filter(
            models.QuizHistory.student_id == data['student_id'],
            models.QuizHistory.topic_name == data['topic_name']
        ).count()
        progress.progress_pct = min(100, quiz_count * 10)  # Mỗi quiz tăng 10%
        
        # Cập nhật risk_level và ai_dependency dựa trên BKT
        if new_mastery >= 70 and hints_used <= 1:
            progress.risk_level = "optimal"
            progress.ai_dependency = "none"
        elif new_mastery >= 40 or hints_used <= 2:
            progress.risk_level = "moderate"
            progress.ai_dependency = "moderate"
        else:
            progress.risk_level = "high_risk"
            progress.ai_dependency = "high"
        
        progress.last_active = datetime.now()
    
    # Cập nhật tổng điểm của user
    user = db.query(models.User).filter(models.User.id == data['student_id']).first()
    if user:
        user.total_points = (user.total_points or 0) + points_earned
    
    db.add(new_quiz)
    db.commit()
    
    return {
        "status": "success", 
        "message": "Kết quả đã được lưu và phân tích rủi ro.",
        "new_mastery_score": new_mastery,
        "mastery_delta": mastery_delta,
        "points_earned": points_earned,
        "risk_level": progress.risk_level if progress else "unknown"
    }

@student.get("/{student_id}/quiz-history")
def get_quiz_history(student_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(models.QuizHistory).filter(models.QuizHistory.student_id == student_id).all()

# --- FRAME 2: CHAT SOCRATIC HISTORY ---
@student.get("/{student_id}/chat-sessions")
def get_chat_sessions(student_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(models.ChatSession).filter(models.ChatSession.student_id == student_id).all()

@student.post("/chat")
async def socratic_chat(data: dict = Body(...), db: Session = Depends(get_db)):
    student_id = data.get('student_id')
    student_msg = data.get('message')
    topic = data.get('topic_name', 'General')
    
    try:
        # Lấy lịch sử chat gần đây để AI có ngữ cảnh
        history_objs = db.query(models.ChatSession).filter(
            models.ChatSession.student_id == student_id,
            models.ChatSession.topic_name == topic
        ).order_by(models.ChatSession.created_at.desc()).limit(5).all()
        
        # Format lại cho get_socratic_reply
        chat_history = []
        for sess in reversed(history_objs): # Đảo ngược để theo thứ tự thời gian
            for m in sess.messages:
                chat_history.append({"sender": "student" if m["role"] == "user" else "tutor", "text": m["content"]})

        # Chuyển qua sử dụng Single Gemini Engine (chat_engine.py)
        reply_text = await get_socratic_reply(history=chat_history, user_input=student_msg)

        # Lưu lịch sử vào Database (metadata đơn giản hơn)
        new_chat = models.ChatSession(
            id=uuid.uuid4(),
            student_id=student_id,
            topic_name=topic,
            messages=[
                {"role": "user", "content": student_msg},
                {"role": "ai", "content": reply_text}
            ],
            ai_summary=f"Agent: gemini-3.1-flash-lite | Mode: Single-Agent Socratic",
            agent_used="gemini-3.1-flash-lite",
            retry_count=0,
            validation_score=100,
            created_at=datetime.now()
        )
        db.add(new_chat)
        db.commit()
        
        return {
            "reply": reply_text,
            "session_id": new_chat.id,
            "agent_used": "gemini-3.1-flash-lite",
            "retry_count": 0,
            "validation_score": 100
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối Socratic Coach: {str(e)}")
    
# --- FRAME 5: RECOVERY PLAN ---
@student.get("/{student_id}/recovery-plan")
def get_recovery_plan(student_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(models.AiRecoveryPlan).filter(
        models.AiRecoveryPlan.student_id == student_id,
        models.AiRecoveryPlan.status == 'active'
    ).order_by(models.AiRecoveryPlan.created_at.desc()).first()

# --- ASSIGNED QUIZZES FROM TEACHERS ---
@student.get("/assigned-quizzes")
def get_assigned_quizzes(grade: Optional[str] = None, db: Session = Depends(get_db)):
    # Lấy tất cả quiz do giáo viên tạo, lọc theo lớp nếu có
    query = db.query(models.TeacherQuiz)
    if grade:
        # Lọc những quiz cho lớp đó HOẶC những quiz không giới hạn lớp (target_grade is None)
        query = query.filter((models.TeacherQuiz.target_grade == grade) | (models.TeacherQuiz.target_grade == None))
    
    quizzes = query.order_by(models.TeacherQuiz.created_at.desc()).all()
    return quizzes