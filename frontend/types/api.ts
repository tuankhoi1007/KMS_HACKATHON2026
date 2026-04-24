// =============================================================================
// TypeScript Interfaces — mapped from Backend SQLAlchemy models
// =============================================================================

export interface User {
  id: string;
  username?: string;
  role: string;
  full_name: string;
  grade: string;
  avatar_url: string | null;
  total_points: number;
  current_streak: number;
  study_hours_this_week: number;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string | null;
}

export interface LearningProgress {
  id: string;
  student_id: string;
  course_module_name: string;
  progress_pct: number;
  mastery_score: number;
  ai_dependency: string;   // "none" | "moderate" | "high"
  risk_level: string;      // "optimal" | "moderate" | "high_risk"
  time_spent_mins: number;
  last_active: string;
}

export interface AlertInsight {
  id: string;
  student_id: string | null;
  type: string;
  title: string;
  content: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  student_id: string;
  topic_name: string;
  messages: { role: string; content: string }[];
  ai_summary: string;
  agent_used?: string;
  retry_count?: number;
  validation_score?: number;
  created_at: string;
}

export interface QuizHistory {
  id: string;
  student_id: string;
  topic_name: string;
  difficulty_level: string;
  score: number;
  hints_used: number;
  quiz_details: Record<string, any>;
  created_at: string;
}

// =============================================================================
// API Response Shapes
// =============================================================================

export interface DashboardResponse {
  profile: User;
  learning_progress: LearningProgress[];
  active_alerts: AlertInsight[];
}

export interface CommunityPick {
  id: number;
  title: string;
  author: string;
  tag: string;
  read_time: string;
  link_url?: string;
}

export interface ChatMessagePayload {
  student_id: string;
  message: string;
  topic_name: string;
}

export interface ChatReplyResponse {
  reply: string;
  session_id: string;
  agent_used?: string;
  retry_count?: number;
  validation_score?: number;
}

export interface QuizQuestion {
  id: number;
  difficulty: string;
  q: string;
  options: string[];
  hint: string;
}

export interface TeacherQuestionsResponse {
  topic: string;
  type: string;
  questions: QuizQuestion[];
}

export interface AIQuestionsResponse {
  topic: string;
  type: string;
  difficulty?: string;
  weakness_summary?: string;
  study_materials?: string[];
  total_questions: number;
  questions: QuizQuestion[];
}

export interface QuizSubmitPayload {
  student_id: string;
  topic_name: string;
  difficulty_level: string;
  score: number;
  hints_used: number;
  quiz_details: Record<string, any>;
}

export interface ClassAnalyticsResponse {
  risk_distribution: Record<string, number>;
  intervention_needed: User[];
}

export interface TeacherDashboardSummary {
  total_students: number;
  recent_alerts: AlertInsight[];
}

export interface StudentDetailResponse {
  profile: User;
  performance_trend: LearningProgress[];
  ai_dependency_score: string;
  recovery_track: any;
  recent_activity: LearningProgress[];
}

export interface TeacherChatPayload {
  message: string;
}

export interface SaveQuizPayload {
  teacher_id: string;
  topic_name: string;
  difficulty_level: string;
  target_grade?: string;
  expires_at?: string;
  questions: QuizQuestion[];
}
