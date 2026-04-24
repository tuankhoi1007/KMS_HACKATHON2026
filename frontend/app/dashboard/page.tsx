'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getStudentDashboard, getCommunityPicks, getTeacherDashboardSummary } from '@/services/apiClient';
import type { DashboardResponse, CommunityPick, TeacherDashboardSummary } from '@/types/api';
import { BookOpen, CheckCircle, ChevronRight, PlayCircle, Lock, Target, Brain, Award, AlertTriangle, Lightbulb, Link2, Loader2, Users, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const isTeacher = user?.role === 'teacher';
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // STATE: Loading / Error / Data
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [communityPicks, setCommunityPicks] = useState<CommunityPick[]>([]);

  useEffect(() => {
    if (isTeacher || !studentId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashData, picksData] = await Promise.all([
          getStudentDashboard(studentId),
          getCommunityPicks(),
        ]);
        setDashboard(dashData);
        setCommunityPicks(picksData);
      } catch (err: any) {
        setError(err.message || 'Không thể kết nối đến server.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isTeacher, studentId]);

  // ---------------------------------------------------------------------------
  // TEACHER MODE
  // ---------------------------------------------------------------------------
  if (isTeacher) {
    return <TeacherDashboard router={router} />;
  }

  // ---------------------------------------------------------------------------
  // LOADING STATE — Skeleton + "Đang đánh thức hệ thống..."
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-lg">Đang đánh thức hệ thống...</p>
        <p className="text-slate-400 text-sm">Server Render Free có thể mất 30-50 giây để khởi động.</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR STATE
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-500">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-bold text-lg">Lỗi kết nối</p>
        <p className="text-slate-500 text-sm max-w-md text-center">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-700 transition">
          Thử lại
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // EXTRACT DATA
  // ---------------------------------------------------------------------------
  const profile = dashboard?.profile;
  const progress = dashboard?.learning_progress ?? [];
  const alerts = dashboard?.active_alerts ?? [];

  // Tính mastery trung bình từ learning_progress
  const avgMastery = progress.length > 0
    ? Math.round(progress.reduce((sum, p) => sum + p.mastery_score, 0) / progress.length)
    : 0;

  // Màu sắc cho courses
  const courseColors = [
    { bg: 'bg-blue-50/50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', bar: 'bg-blue-600', active: true },
    { bg: 'bg-white', border: 'border-slate-50', icon: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500', active: false },
    { bg: 'bg-white', border: 'bg-white', icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', active: false },
  ];
  const courseIcons = [Brain, Target, Award];

  // Dùng greeting dựa trên giờ
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  // strokeDashoffset cho SVG circle (chu vi ~283)
  const strokeOffset = 283 - (283 * avgMastery) / 100;

  // STUDENT DASHBOARD UI
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">

      {/* Hero Section */}
      <div className="bg-blue-600 rounded-4xl p-10 text-white relative overflow-hidden shadow-md">
        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#FFFFFF" d="M42.7,-73.2C56.2,-64.5,68.7,-53.4,78.2,-40.1C87.6,-26.8,93.9,-11.4,91.9,3.1C90,17.6,79.8,31.2,69.5,43.2C59.3,55.1,49.1,65.3,37,72.7C24.9,80.1,10.9,84.7,-2.8,89.6C-16.5,94.5,-29.9,99.8,-41.8,95.5C-53.7,91.2,-64.1,77.3,-72.2,62.8C-80.3,48.3,-86.1,33.2,-87.3,17.8C-88.5,2.4,-85,-13.2,-78,-26.9C-71,-40.6,-60.5,-52.4,-48.2,-62.1C-35.9,-71.8,-21.8,-79.4,-6.8,-67.7C8.2,-56,29.2,-81.9,42.7,-73.2Z" transform="translate(100 100) translate(20, -20) scale(1.2)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold mb-3">{greeting}, {profile?.full_name || 'Bạn'}!</h1>
          <p className="text-blue-100 mb-8 max-w-lg text-lg">Sẵn sàng chinh phục kiến thức hôm nay? Lộ trình học tập đang chờ sự tò mò của bạn.</p>
          <div className="flex gap-4">
            <button onClick={() => router.push('/chat-tutor')} className="bg-white text-blue-600 px-6 py-3 rounded-full font-bold text-sm hover:bg-slate-50 transition shadow-sm">Tiếp tục bài học</button>
            <button onClick={() => router.push('/knowledge-graph')} className="border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-full font-bold text-sm transition">Xem mục tiêu</button>
          </div>
        </div>
      </div>

      {/* Stats and Courses Grid */}
      <div className="grid grid-cols-12 gap-8">

        {/* Main Content Area: Courses & Path */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">

          {/* My Courses — dynamic from API */}
          <div className="bg-white rounded-4xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-xl font-bold text-slate-800">Môn học của tôi</h2>
              <button onClick={() => router.push('/knowledge-graph')} className="text-blue-600 font-bold text-sm hover:underline">Xem tất cả</button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {progress.length > 0 ? (
                progress.slice(0, 3).map((p, i) => {
                  const c = courseColors[i % courseColors.length];
                  const Icon = courseIcons[i % courseIcons.length];
                  return (
                    <div key={p.id} className={`${c.active ? `border ${c.border} ${c.bg}` : `shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 bg-white`} rounded-3xl p-5 relative overflow-hidden ${!c.active && i === 2 ? 'opacity-75' : ''}`}>
                      {c.active && <div className="absolute top-4 right-4 bg-white text-[10px] font-bold text-blue-600 px-2.5 py-1 rounded-full uppercase shadow-sm">Đang học</div>}
                      <div className={`w-10 h-10 ${c.icon} rounded-full flex justify-center items-center mb-4`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm mb-4 pr-10">{p.course_module_name}</h3>
                      <div className="mt-auto">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-2">
                          <span>Tiến độ</span>
                          <span>{p.progress_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className={`${c.bar} h-full`} style={{ width: `${p.progress_pct}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-8 text-slate-400 font-medium">
                  Chưa có dữ liệu môn học nào.
                </div>
              )}
            </div>
          </div>

          {/* Personalized Learning Path */}
          <div className="bg-white rounded-4xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                  Lộ trình học cá nhân
                  <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-md font-semibold">Module {Math.min(progress.length, 12)} / 12</span>
                </h2>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                <span>Tiến độ thành thạo</span>
                <span>{avgMastery}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full" style={{ width: `${avgMastery}%` }}></div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {/* Step 1 */}
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0 z-10">
                  <CheckCircle className="w-5 h-5 text-green-500" fill="currentColor" stroke="white" />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-800">Nền tảng Tư duy Phản biện</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-1">Thành thạo ngày 12/10 • 4 bài học</p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="relative flex items-start gap-4">
                <div className="w-10 h-10 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm shadow-blue-200">
                  <PlayCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-1">
                  <h4 className="font-bold text-blue-900">Logic & Suy luận Nâng cao</h4>
                  <p className="text-xs font-semibold text-blue-700 mt-1 mb-3">Đang học • Bài 5: Tam đoạn luận</p>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Step 3 */}
              <div className="relative flex items-start gap-4 opacity-50">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0 z-10">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pt-1">
                  <h4 className="font-bold text-slate-600">Phương pháp Ra quyết định</h4>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Đã khoá • Hoàn thành Logic trước</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar Area: Scores & Curators */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">

          {/* BrainRoot Monitor — dynamic color by mastery level */}
          {(() => {
            // Xác định mức độ
            const level = avgMastery >= 70 ? 'good' : avgMastery >= 40 ? 'warning' : 'danger';
            const config = {
              good: {
                label: 'Tuyệt vời!',
                sublabel: 'Tư duy độc lập cao',
                stroke: '#16A34A',   // green-600
                text: 'text-green-600',
                bg: 'bg-green-50',
                border: 'border-green-100',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
              },
              warning: {
                label: 'Cần chú ý',
                sublabel: 'Có dấu hiệu phụ thuộc AI',
                stroke: '#F59E0B',   // amber-500
                text: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100',
                iconBg: 'bg-amber-100',
                iconColor: 'text-amber-600',
              },
              danger: {
                label: 'Báo động!',
                sublabel: 'Phụ thuộc AI nghiêm trọng',
                stroke: '#DC2626',   // red-600
                text: 'text-red-600',
                bg: 'bg-red-50',
                border: 'border-red-100',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-600',
              },
            }[level];

            const StatusIcon = level === 'good' ? CheckCircle : level === 'warning' ? AlertTriangle : Brain;

            return (
              <div className={`${config.bg} rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${config.border} p-8 text-center flex flex-col items-center transition-colors duration-500`}>
                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 ${config.iconBg} px-4 py-2 rounded-full mb-4`}>
                  <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
                  <span className={`text-xs font-bold ${config.iconColor} uppercase tracking-wider`}>{config.label}</span>
                </div>

                <h3 className="font-bold text-slate-800 text-lg mb-1">BrainRoot Monitor</h3>
                <p className="text-xs text-slate-500 font-medium mb-6">{config.sublabel}</p>

                {/* Circular Progress */}
                <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                    <circle cx="50" cy="50" r="45" fill="none" stroke={config.stroke} strokeWidth="8" strokeDasharray="283" strokeDashoffset={strokeOffset} className="drop-shadow-md transition-all duration-700" strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className={`text-4xl font-extrabold ${config.text} tracking-tighter`}>{avgMastery}%</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mastery</span>
                  </div>
                </div>

                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Bạn có <span className={`font-bold ${config.text}`}>{profile?.total_points ?? 0} điểm</span> và chuỗi <span className={`font-bold ${config.text}`}>{profile?.current_streak ?? 0} ngày</span> liên tục. {level === 'good' ? 'Tiếp tục phát huy!' : level === 'warning' ? 'Hãy thử tự giải không dùng gợi ý!' : 'Cần giảm phụ thuộc AI ngay!'}
                </p>
              </div>
            );
          })()}

          {/* AI Tutor Curator Message */}
          <div className="bg-purple-600 text-white rounded-4xl p-8 relative overflow-hidden shadow-md">
            <div className="absolute right-[-20px] top-[-20px] opacity-20">
              <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
            </div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Brain className="w-5 h-5 text-purple-200" />
              <h3 className="font-bold text-purple-100 text-sm">AI Tutor</h3>
            </div>
            <p className="text-lg font-medium leading-snug relative z-10">
              "Tôi nhận thấy bạn đang làm tốt phần tam đoạn luận. Sẵn sàng thử thách ứng dụng thực tế chưa?"
            </p>
            <button onClick={() => router.push('/Quiz-centre')} className="mt-6 bg-white text-purple-700 px-5 py-2 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 transition relative z-10">
              Bắt đầu thử thách
            </button>
          </div>

        </div>

      </div>

      {/* Bottom Information Cards — dynamic alerts + community picks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">

        {/* Alerts */}
        <div onClick={() => router.push('/Quiz-centre')} className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white rounded-3xl p-5 flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">Thui chột Kiến thức</h4>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{alerts.length} chủ đề cần ôn lại</p>
          </div>
        </div>

        <div onClick={() => router.push('/chat-tutor')} className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white rounded-3xl p-5 flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <Lightbulb className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800">AI Insights</h4>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{alerts.length > 0 ? alerts[0].title : 'Không có gợi ý mới'}</p>
          </div>
        </div>

        {/* Community Pick — dynamic */}
        <div onClick={() => window.open(communityPicks.length > 0 ? communityPicks[0].link_url : '#', '_blank')} className="bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white rounded-3xl p-5 flex items-center gap-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition cursor-pointer bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blue-600 text-white">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white">Bài viết Nổi bật</h4>
            <p className="text-sm text-blue-100 font-medium mt-0.5">
              {communityPicks.length > 0 ? communityPicks[0].title : 'Chưa có bài viết nào'}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// TEACHER DASHBOARD COMPONENT
// ---------------------------------------------------------------------------
function TeacherDashboard({ router }: { router: any }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const data = await getTeacherDashboardSummary();
        setSummary(data);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải dữ liệu giáo viên.');
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-lg">Đang tải dữ liệu tổng quan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-500">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-bold text-lg">Lỗi kết nối</p>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="bg-blue-800 rounded-4xl p-10 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-4xl font-bold mb-3">{greeting}, Thầy/Cô {user?.full_name || ''}!</h1>
          <p className="text-blue-200 mb-8 max-w-lg text-lg">Hôm nay lớp học của chúng ta có gì mới? Hãy xem các thông báo và cảnh báo từ hệ thống Socratic.</p>
          <div className="flex gap-4">
            <button onClick={() => router.push('/Analytics')} className="bg-white text-blue-800 px-6 py-3 rounded-full font-bold text-sm hover:bg-slate-50 transition shadow-sm">Xem Phân tích Lớp học</button>
            <button onClick={() => router.push('/Quiz-centre')} className="border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-full font-bold text-sm transition">Tạo Bộ câu hỏi mới</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Total Students Card */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng số học sinh</p>
            <h2 className="text-5xl font-black text-slate-800">{summary?.total_students || 0}</h2>
          </div>
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Action Required Card */}
        <div className="bg-red-50 rounded-3xl p-8 shadow-sm border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Cần can thiệp</p>
            <h2 className="text-5xl font-black text-red-600">{summary?.recent_alerts?.length || 0}</h2>
          </div>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Bell className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Recent Alerts List */}
      <div className="bg-white rounded-4xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          Cảnh báo gần đây
          <span className="bg-red-100 text-red-600 text-xs px-2.5 py-1 rounded-md font-semibold">Mới nhất</span>
        </h2>
        {summary?.recent_alerts && summary.recent_alerts.length > 0 ? (
          <div className="space-y-4">
            {summary.recent_alerts.map((alert) => (
              <div key={alert.id} className="p-4 border border-slate-100 rounded-2xl flex gap-4 hover:bg-slate-50 transition cursor-pointer">
                <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1">{alert.title}</h4>
                  <p className="text-sm text-slate-600 font-medium">{alert.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 font-medium py-8 text-center bg-slate-50 rounded-2xl">Không có cảnh báo nào mới từ học sinh.</p>
        )}
      </div>
    </div>
  );
}