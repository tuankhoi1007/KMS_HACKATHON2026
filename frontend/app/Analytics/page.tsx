'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getClassAnalytics, getTeacherDashboardSummary, searchStudents,
  getStudentDashboard, getStudentQuizHistory, generateSkillGraph
} from '@/services/apiClient';
import type { User, AlertInsight, LearningProgress, QuizHistory } from '@/types/api';
import { useRouter } from 'next/navigation';
import { Download, Calendar, Activity, AlertCircle, Bot, BookOpen, Clock, ChevronRight, Loader2, Search, Check, Bell } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {isTeacher ? <TeacherAnalytics /> : <StudentAnalytics />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TEACHER VIEW — kết nối API
// ---------------------------------------------------------------------------
function TeacherAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<User[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [alerts, setAlerts] = useState<AlertInsight[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<Record<string, number>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [analytics, summary, studentList] = await Promise.all([
          getClassAnalytics(),
          getTeacherDashboardSummary(),
          searchStudents(''),
        ]);
        setRiskDistribution(analytics.risk_distribution);
        setTotalStudents(summary.total_students);
        setAlerts(summary.recent_alerts);
        setStudents(studentList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Search handler
  const handleSearch = async (name: string) => {
    setSearchQuery(name);
    try {
      const results = await searchStudents(name);
      setStudents(results);
    } catch { }
  };

  // Build pie data from risk_distribution
  const riskColorMap: Record<string, { name: string; color: string }> = {
    optimal: { name: 'Optimal Growth', color: '#10B981' },
    moderate: { name: 'Moderate Slump', color: '#3B82F6' },
    high_risk: { name: 'High Risk', color: '#EF4444' },
  };
  const pieData = Object.entries(riskDistribution).map(([key, value]) => ({
    name: riskColorMap[key]?.name || key,
    value,
    color: riskColorMap[key]?.color || '#94A3B8',
  }));
  const totalInPie = pieData.reduce((s, d) => s + d.value, 0);
  const highRiskCount = riskDistribution['high_risk'] || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-lg">Đang đánh thức hệ thống...</p>
        <p className="text-slate-400 text-sm">Server Render Free có thể mất 30-50 giây.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-bold text-lg">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm">Thử lại</button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">INSIGHT DASHBOARD</p>
          <h1 className="text-3xl font-bold text-slate-800">Class Analytics</h1>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border rounded-lg px-4 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm học sinh..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="outline-none text-sm font-semibold text-slate-600 bg-transparent w-40"
            />
          </div>
          <button className="bg-white border rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Last 30 Days
          </button>
          <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold shadow-sm flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Students" value={String(totalStudents)} subtitle="" icon={<Activity className="w-4 h-4 text-blue-600" />} />
        <StatCard label="Risk Categories" value={String(pieData.length)} subtitle="Active categories" icon={<Activity className="w-4 h-4 text-green-600" />} />
        <StatCard label="High Risk" value={String(highRiskCount)} subtitle="" icon={<AlertCircle className="w-4 h-4 text-red-500" />} highlight="red" />
        <StatCard label="Alerts" value={String(alerts.length)} subtitle="Intervention Needed" icon={<AlertCircle className="w-4 h-4 text-orange-500" />} highlight="bg-blue-600 text-white" />
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Donut Chart */}
        <div className="col-span-4 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col items-center">
          <h3 className="font-bold text-slate-800 w-full mb-4">Brainrot Risk Distribution</h3>
          <div className="w-48 h-48 relative mb-6">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <h2 className="text-3xl font-black text-slate-800">{totalInPie || totalStudents}</h2>
              <p className="text-[10px] font-bold text-slate-400">STUDENTS</p>
            </div>
          </div>
          <div className="w-full space-y-3">
            {pieData.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Student Performance Table */}
        <div className="col-span-8 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Student Performance</h3>
            <span className="text-slate-400 text-sm font-medium">{students.length} results</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b">
                  <th className="pb-3 pl-2">Name</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">Points</th>
                  <th className="pb-3">Streak</th>
                </tr>
              </thead>
              <tbody>
                {students.length > 0 ? students.map(s => (
                  <tr key={s.id} onClick={() => setSelectedStudentId(s.id)} className="border-b last:border-0 hover:bg-slate-50 transition cursor-pointer">
                    <td className="py-4 pl-2 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200"></div> {s.full_name}
                    </td>
                    <td className="py-4 text-sm text-slate-500 font-medium">{s.grade || '-'}</td>
                    <td className="py-4 font-bold text-slate-800">{s.total_points}</td>
                    <td className="py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider text-blue-600 bg-blue-50">
                        {s.current_streak} days
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">Không tìm thấy học sinh.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Curator Insight */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center"><Bot className="w-4 h-4 text-purple-600" /></div>
            <h3 className="font-bold text-slate-800">Recent Alerts</h3>
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 3).map((a) => (
                <div key={a.id} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm font-bold text-slate-700">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{a.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Không có cảnh báo nào.</p>
          )}
        </div>

        {/* Intervention Required */}
        <div className="bg-blue-800 text-white rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10"><AlertCircle className="w-24 h-24" /></div>
          <h3 className="font-bold mb-3 relative z-10 text-xl">Intervention Required</h3>
          <p className="text-blue-200 text-sm font-medium mb-6 relative z-10 max-w-sm">
            {highRiskCount > 0
              ? `${highRiskCount} students have been flagged as high-risk for AI dependency.`
              : 'No students currently require intervention.'}
          </p>
          <button className="bg-white text-blue-800 px-5 py-2.5 text-sm font-bold rounded-xl shadow-sm relative z-10 hover:bg-blue-50 transition">
            Send Class Alert 🔔
          </button>
        </div>
      </div>

      {selectedStudentId && (
        <StudentDetailModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  highlight?: string;
}

function StatCard({ label, value, subtitle, icon, highlight }: StatCardProps) {
  return (
    <div className={`rounded-3xl p-6 shadow-sm border ${highlight === 'bg-blue-600 text-white' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center justify-between ${highlight === 'bg-blue-600 text-white' ? 'text-blue-200' : 'text-slate-400'}`}>
        {label} {icon}
      </p>
      <h2 className={`text-4xl font-black mb-1 ${highlight === 'red' ? 'text-red-500' : ''}`}>{value}</h2>
      <p className={`text-xs font-semibold ${highlight === 'bg-blue-600 text-white' ? 'text-blue-200' : 'text-slate-500'}`}>{subtitle}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STUDENT VIEW — kết nối API
// ---------------------------------------------------------------------------
function StudentAnalytics({ overrideStudentId }: { overrideStudentId?: string }) {
  const { user } = useAuth();
  const studentId = overrideStudentId || user?.id || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [showRoadmapModal, setShowRoadmapModal] = useState<string | null>(null); // Course name

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [dashData, quizData] = await Promise.all([
          getStudentDashboard(studentId),
          getStudentQuizHistory(studentId),
        ]);
        setProfile(dashData.profile);
        setProgress(dashData.learning_progress);
        setQuizHistory(quizData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold">Đang đánh thức hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-red-600 font-bold">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm">Thử lại</button>
      </div>
    );
  }

  // Build bar chart from quiz history
  const barData = quizHistory.map((q, i) => ({
    name: q.topic_name || `Quiz ${i + 1}`,
    score: q.score,
    fill: q.hints_used > 2 ? '#EF4444' : '#3B82F6',
  }));

  // Find high-risk progress entries
  const highRiskEntries = progress.filter(p => p.ai_dependency === 'high' || p.risk_level === 'high_risk');

  return (
    <>
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-200 shrink-0"></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {profile?.full_name || 'Student'}
              <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md uppercase ml-2 align-middle">
                {profile?.grade || 'N/A'}
              </span>
            </h1>
            <div className="flex gap-4 mt-2 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-600" /> {profile?.study_hours_this_week || 0}h this week</span>
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-600" /> {profile?.total_points || 0} pts</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-slate-100 text-slate-600 px-4 py-2 font-bold text-sm rounded-lg hover:bg-slate-200">Download Report</button>
          <button className="bg-blue-600 text-white px-4 py-2 font-bold text-sm rounded-lg shadow hover:bg-blue-700">Schedule Review</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">

        {/* Performance Trend Chart */}
        <div className="col-span-8 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-1">Quiz Performance History</h3>
          <p className="text-xs text-slate-500 font-semibold mb-8">Score per quiz attempt</p>
          <div className="flex-1 min-h-[250px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 'bold' }} dy={10} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="score" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">Chưa có dữ liệu quiz.</div>
            )}
          </div>
        </div>

        {/* AI Dependency */}
        <div className="col-span-4 bg-red-50/50 rounded-3xl border border-red-100 p-6 shadow-sm flex flex-col gap-6">
          <h3 className="font-bold text-red-600 flex items-center gap-2">
            <Bot className="w-5 h-5" /> AI Dependency
          </h3>

          {highRiskEntries.length > 0 ? highRiskEntries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl p-4 border border-red-200 shadow-sm relative">
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-red-500 rounded-r-md"></div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{entry.course_module_name}</h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium mb-3">
                AI Dependency: {entry.ai_dependency} | Risk: {entry.risk_level}
              </p>
              <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-2 py-1 rounded-sm tracking-wider">
                {entry.risk_level === 'high_risk' ? 'High Risk Concept Erosion' : 'Moderate Risk'}
              </span>
            </div>
          )) : (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-slate-600">Chưa có cảnh báo về phụ thuộc AI. Bạn đang làm tốt! 🎉</p>
            </div>
          )}
        </div>
      </div>

      {/* Recovery Track */}
      <div className="bg-blue-600 text-white rounded-3xl p-8 shadow-md">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mb-2 flex items-center gap-2"><Bot className="w-3 h-3" /> AI GENERATED PLAN <ChevronRight className="w-3 h-3" /></p>
        <h2 className="text-2xl font-bold mb-3">Personalized Recovery Track</h2>
        <p className="text-blue-100 font-medium max-w-2xl text-sm leading-relaxed mb-6">
          {highRiskEntries.length > 0
            ? `We've detected elevated AI dependency in ${highRiskEntries.length} module(s). This plan focuses on building independence.`
            : 'All modules are progressing well. Keep up the great work!'}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => setShowRoadmapModal("Global")}
            className="bg-white text-blue-700 px-6 py-2.5 font-bold rounded-lg shadow-sm text-sm hover:bg-blue-50 transition">
            View Personalized Roadmap
          </button>
        </div>
      </div>

      {showRoadmapModal && (
        <RoadmapModal
          studentId={studentId}
          initialCourse={showRoadmapModal}
          courses={["Global", ...progress.map(p => p.course_module_name)]}
          onClose={() => setShowRoadmapModal(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// MODAL XEM CHI TIẾT HỌC SINH CHO GIÁO VIÊN
// ---------------------------------------------------------------------------
function StudentDetailModal({ studentId, onClose }: { studentId: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div className="bg-slate-50 w-full max-w-6xl h-[90vh] rounded-3xl overflow-y-auto relative shadow-2xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-6 right-6 bg-white hover:bg-slate-100 text-slate-500 w-10 h-10 rounded-full flex items-center justify-center font-bold z-50 shadow-sm border"
        >
          X
        </button>
        <div className="p-8">
          <StudentAnalytics overrideStudentId={studentId} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROADMAP MODAL - HIỂN THỊ LỘ TRÌNH & PIE CHART
// ---------------------------------------------------------------------------
function RoadmapModal({ studentId, initialCourse, courses, onClose }: { studentId: string, initialCourse: string, courses: string[], onClose: () => void }) {
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState(initialCourse);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [isTracking, setIsTracking] = useState(false);
  const router = useRouter();

  const fetchRoadmap = () => {
    setLoading(true);
    generateSkillGraph(studentId, selectedCourse, undefined, hoursPerDay)
      .then(setGraphData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRoadmap();
  }, []);

  const timeAllocData = graphData?.time_allocation?.length > 0
    ? graphData.time_allocation.map((item: any) => ({ name: item.topic, value: item.percentage }))
    : [];

  const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Proposed Recovery Roadmap</h2>
            <p className="text-sm font-semibold text-slate-500">Customize your learning schedule based on your goals</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 font-bold text-slate-600">X</button>
        </div>

        {/* Config Bar */}
        <div className="bg-white border-b px-8 py-4 flex flex-wrap gap-4 items-end bg-slate-50/50">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Subject / Module</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            >
              {courses.map(c => <option key={c} value={c} className="text-slate-900">{c === 'Global' ? '🌍 All Subjects (Global)' : c}</option>)}
            </select>
          </div>
          <button
            onClick={fetchRoadmap}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-sm shadow-sm transition"
          >
            Regenerate
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              <p className="font-semibold text-slate-500">AI is mapping out the best path for you...</p>
            </div>
          ) : graphData ? (
            <div className="space-y-8">
              <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                  <Bot className="w-5 h-5" /> Socratic AI Insight
                </h3>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {graphData.ai_insight || "You're doing great, keep up the focus!"}
                </p>
              </div>

              {timeAllocData.length > 0 ? (
                <div className="grid grid-cols-2 gap-8 items-center bg-white border rounded-2xl p-6 shadow-sm">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-4">Recommended Time Allocation</h3>
                    <div className="space-y-3">
                      {timeAllocData.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="font-semibold text-sm text-slate-700">{d.name}</span>
                          </div>
                          <span className="font-black text-slate-800">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={timeAllocData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                          {timeAllocData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`, 'Allocation']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-green-50 text-green-700 rounded-2xl border border-green-200 font-medium text-center">
                  No current weaknesses require special time allocation. Continue with your regular study pace!
                </div>
              )}

              {graphData.recommended_next && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3">Recommended Next Steps:</h3>
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-black uppercase text-amber-600 tracking-wider">Priority Focus</span>
                      <p className="font-bold text-slate-800 text-lg mt-1">{graphData.recommended_next}</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button
                        onClick={() => setIsTracking(!isTracking)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 font-bold px-6 py-2.5 rounded-xl transition shadow-sm border ${isTracking
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        {isTracking ? <><Check className="w-4 h-4" /> Tracking Enabled</> : <><Bell className="w-4 h-4" /> Track Roadmap</>}
                      </button>
                      <button
                        onClick={() => router.push('/knowledge-graph')}
                        className="flex-1 md:flex-none bg-amber-500 text-white font-bold px-8 py-2.5 rounded-xl shadow-sm hover:bg-amber-600 transition hover:shadow-md"
                      >
                        Start Learning
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {graphData.schedule && graphData.schedule.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" /> Detailed Weekly Schedule
                  </h3>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    {graphData.schedule.map((item: any, idx: number) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-blue-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Clock className="w-4 h-4" />
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-blue-600 text-sm">{item.day}</span>
                          </div>
                          <p className="text-slate-700 font-medium text-sm leading-relaxed">{item.task}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-slate-500">Không tải được lộ trình.</p>
          )}
        </div>
      </div>
    </div>
  );
}