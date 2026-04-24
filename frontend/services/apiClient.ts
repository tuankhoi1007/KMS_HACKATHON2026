import axios from 'axios';
import type {
  DashboardResponse,
  CommunityPick,
  ChatMessagePayload,
  ChatReplyResponse,
  ChatSession,
  TeacherQuestionsResponse,
  AIQuestionsResponse,
  QuizSubmitPayload,
  QuizHistory,
  ClassAnalyticsResponse,
  TeacherDashboardSummary,
  StudentDetailResponse,
  User,
  AuthResponse,
} from '@/types/api';

// =============================================================================
// Axios Instance — timeout 60s để chờ Render Free cold-start
// =============================================================================
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://hcmut-snake-api.onrender.com',
  timeout: 60_000, // 60 giây — Render free tier cần ~30-50s để thức dậy
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — bắt lỗi thống nhất
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Server đang khởi động, vui lòng thử lại sau 1 phút.'));
    }
    const detail = error.response?.data?.detail;
    const message = typeof detail === 'string' ? detail : `Lỗi API: ${error.response?.status ?? 'Network Error'}`;
    return Promise.reject(new Error(message));
  },
);

// =============================================================================
// NHÓM API XÁC THỰC (AUTH)
// =============================================================================

/** Đăng nhập bằng username + password */
export const loginUser = (username: string, password: string) =>
  api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data);

// =============================================================================
// NHÓM API CHO HỌC SINH (STUDENT)
// =============================================================================

/** Frame 1: Lấy Points, Streak, Hour và tiến độ các môn học */
export const getStudentDashboard = (studentId: string) =>
  api.get<DashboardResponse>(`/student/${studentId}/dashboard`).then((r) => r.data);

/** Frame 1: Lịch sử Quiz đã làm */
export const getStudentQuizHistory = (studentId: string) =>
  api.get<QuizHistory[]>(`/student/${studentId}/quiz-history`).then((r) => r.data);

/** Frame 1: Lộ trình phục hồi "cai nghiện AI" */
export const getStudentRecoveryPlan = (studentId: string) =>
  api.get(`/student/${studentId}/recovery-plan`).then((r) => r.data);

/** Frame 1: Các bài viết/mẹo học tập AI gợi ý chung */
export const getCommunityPicks = () =>
  api.get<CommunityPick[]>(`/student/community/curated-picks`).then((r) => r.data);

/** Frame 3: Lấy câu hỏi Quiz do giáo viên tạo */
export const getTeacherQuestions = (topic: string) =>
  api.get<TeacherQuestionsResponse>(`/student/quiz/${encodeURIComponent(topic)}/teacher-questions`).then((r) => r.data);

/** Frame 3: Lấy câu hỏi Quiz do AI sinh ra */
export const getAIQuestions = (studentId: string, topic: string, num = 3) =>
  api.get<AIQuestionsResponse>(`/student/${studentId}/quiz/${encodeURIComponent(topic)}/ai-questions`, {
    params: { num },
  }).then((r) => r.data);

/** Frame 3: Nộp bài Quiz (gửi điểm + hints_used) */
export const submitQuiz = (data: QuizSubmitPayload) =>
  api.post(`/student/quiz/submit`, data).then((r) => r.data);

/** Lấy danh sách Quiz do giáo viên giao */
export const getAssignedQuizzes = (grade?: string) =>
  api.get<any[]>(`/student/assigned-quizzes`, { params: { grade } }).then((r) => r.data);

// =============================================================================
// NHÓM API AI SOCRATIC (CHAT)
// =============================================================================

/** Frame 2: Gửi tin nhắn Chat Socratic */
export const postSocraticChat = (data: ChatMessagePayload) =>
  api.post<ChatReplyResponse>(`/student/chat`, data).then((r) => r.data);

/** Frame 2: Lấy lịch sử các phiên chat cũ */
export const getChatSessions = (studentId: string) =>
  api.get<ChatSession[]>(`/student/${studentId}/chat-sessions`).then((r) => r.data);

// =============================================================================
// NHÓM API CHO GIÁO VIÊN (TEACHER)
// =============================================================================

/** Frame 4: Tìm kiếm học sinh theo tên */
export const searchStudents = (name: string) =>
  api.get<User[]>(`/teacher/search-students`, { params: { name } }).then((r) => r.data);

/** Frame 4: Biểu đồ lớp học (risk distribution) */
export const getClassAnalytics = () =>
  api.get<ClassAnalyticsResponse>(`/teacher/class-analytics`).then((r) => r.data);


/** Frame 4: Dashboard tổng quan giáo viên */
export const getTeacherDashboardSummary = () =>
  api.get<TeacherDashboardSummary>(`/teacher/dashboard-summary`).then((r) => r.data);

/** Frame 5: Chi tiết rủi ro một học sinh cụ thể */
export const getStudentDetailForTeacher = (studentId: string) =>
  api.get<StudentDetailResponse>(`/teacher/student/${studentId}/detail`).then((r) => r.data);

/** Teacher Chat */
export const postTeacherChat = (message: string) =>
  api.post<{ reply: string }>(`/teacher/chat`, { message }).then((r) => r.data);

/** Generate Teacher Quiz */
export const generateTeacherQuiz = (topic: string, difficulty: string, num: number = 3) =>
  api.get<{ topic: string, difficulty: string, questions: any[] }>(`/teacher/quiz/generate`, {
    params: { topic, difficulty, num }
  }).then((r) => r.data);

/** Save Teacher Quiz */
export const saveTeacherQuiz = (data: any) =>
  api.post<{ message: string, quiz_id: string }>(`/teacher/quiz/save`, data).then((r) => r.data);

// =============================================================================
// NHÓM API KNOWLEDGE GRAPH (SKILL TREE)
// =============================================================================

/** Lấy cây kỹ năng cá nhân hóa */
export const getSkillGraph = (studentId: string, courseName: string) =>
  api.get<any>(`/skill-tree/${studentId}/graph`, { params: { course_name: courseName } }).then((r) => r.data);

/** Gọi AI tạo/tái tạo cây kỹ năng */
export const generateSkillGraph = (studentId: string, courseName: string, targetLevel?: string, hoursPerDay?: number) =>
  api.post<any>(`/skill-tree/${studentId}/generate`, { 
    course_name: courseName,
    target_level: targetLevel,
    hours_per_day: hoursPerDay
  }).then((r) => r.data);

export default api;
