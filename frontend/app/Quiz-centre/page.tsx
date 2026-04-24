'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  getTeacherQuestions, getAIQuestions, submitQuiz, getStudentDashboard, 
  generateTeacherQuiz, saveTeacherQuiz, getAssignedQuizzes 
} from '@/services/apiClient';
import type { QuizQuestion } from '@/types/api';
import { Bot, ChevronRight, Flame, Activity, AlertTriangle, AlertCircle, CheckCircle, Loader2, Brain, ShieldCheck } from 'lucide-react';

const TOPICS = [
  { key: 'dsa', label: 'DSA' },
  { key: 'ltnc', label: 'LTNC (C++)' },
  { key: 'hdh', label: 'Hệ Điều Hành' },
];

export default function QuizCentrePage() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const isTeacher = user?.role === 'teacher';

  // Quiz state
  const [selectedTopic, setSelectedTopic] = useState('dsa');
  const [quizType, setQuizType] = useState<'teacher' | 'ai'>('teacher');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [weaknessSummary, setWeaknessSummary] = useState<string | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<string[]>([]);
  const [prefetchedQuestions, setPrefetchedQuestions] = useState<QuizQuestion[]>([]);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [answersDetail, setAnswersDetail] = useState<any[]>([]); // Tracking for BKT Lite
  const [isLastQuestionPrefetched, setIsLastQuestionPrefetched] = useState(false);

  // Data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [assignedQuizzes, setAssignedQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [learningTopics, setLearningTopics] = useState<string[]>([]);

  // Load profile data
  useEffect(() => {
    if (isTeacher || !studentId) return;
    getStudentDashboard(studentId)
      .then((d) => {
        setStreak(d.profile.current_streak);
        setTotalPoints(d.profile.total_points);
        const topics = d.learning_progress.map(p => p.course_module_name);
        setLearningTopics(topics);
        if (topics.length > 0 && selectedTopic === 'dsa') {
          setSelectedTopic(topics[0]);
        }
        // Sau khi có profile, lấy quiz theo lớp của học sinh
        return getAssignedQuizzes(d.profile.grade);
      })
      .then(setAssignedQuizzes)
      .catch((err) => {
        console.error("Lỗi khi tải dữ liệu học sinh:", err);
      });
  }, [isTeacher, studentId]);

  // Fetch questions when topic or type changes
  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowHint(false);
    setHintsUsed(0);
    setCorrectCount(0);
    setIncorrectCount(0);
    setWeaknessSummary(null);
    setStudyMaterials([]);

    try {
      if (quizType === 'teacher') {
        if (selectedQuizId) {
          const quiz = assignedQuizzes.find(q => q.id === selectedQuizId);
          if (quiz) {
            setQuestions(quiz.questions);
          } else {
            setQuestions([]);
          }
        } else {
          setQuestions([]);
        }
      } else {
        // AI ADAPTIVE: Background Pre-fetching Strategy
        // 1. Tải câu đầu tiên cực nhanh (num=1)
        const firstBatch = await getAIQuestions(studentId, selectedTopic, 1);
        setQuestions(firstBatch.questions);
        setWeaknessSummary(firstBatch.weakness_summary || null);
        setStudyMaterials(firstBatch.study_materials || []);
        setLoading(false); // Cho học sinh làm ngay câu 1

        // 2. Tải các câu tiếp theo ngầm (num=2)
        setIsPrefetching(true);
        getAIQuestions(studentId, selectedTopic, 2)
          .then(data => {
            setPrefetchedQuestions(data.questions);
            setIsLastQuestionPrefetched(true);
          })
          .catch(err => console.error("Lỗi prefetch:", err))
          .finally(() => setIsPrefetching(false));
      }
    } catch (err: any) {
      setError(err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isTeacher) {
      fetchQuestions();
    }
  }, [selectedTopic, quizType, isTeacher, selectedQuizId]);

  const currentQ = questions[currentIdx];

  const handleSubmitAnswer = () => {
    if (!selectedAnswer || !currentQ) return;
    setIsSubmitted(true);
    const correct = selectedAnswer === currentQ.options[0];
    setIsCorrect(correct);
    
    // Lưu detail để BKT Lite ở Backend xử lý
    setAnswersDetail(prev => [...prev, {
      question_id: currentQ.id,
      is_correct: correct,
      used_hint: showHint
    }]);

    if (correct) setCorrectCount((c) => c + 1);
    else setIncorrectCount((c) => c + 1);
  };

  const handleNextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else if (prefetchedQuestions.length > 0) {
      // Gộp câu hỏi đã prefetch vào danh sách chính
      setQuestions(prev => [...prev, ...prefetchedQuestions]);
      setPrefetchedQuestions([]);
      setCurrentIdx((i) => i + 1);
    }

    setSelectedAnswer(null);
    setIsSubmitted(false);
    setIsCorrect(null);
    setShowHint(false);
  };

  const handleFinishQuiz = async () => {
    try {
      await submitQuiz({
        student_id: studentId,
        topic_name: selectedTopic,
        difficulty_level: 'intermediate',
        score: correctCount,
        hints_used: hintsUsed,
        quiz_details: { 
          total_questions: questions.length, 
          correct: correctCount, 
          incorrect: incorrectCount,
          answers_detail: answersDetail
        },
      });
      alert(`Nộp bài thành công! Đúng: ${correctCount}/${questions.length}. Mastery của bạn đã được cập nhật.`);
    } catch (err: any) {
      alert(`Lỗi nộp bài: ${err.message}`);
    }
  };

  const handleUseHint = () => {
    setShowHint(true);
    setHintsUsed((h) => h + 1);
  };

  if (isTeacher) {
    return <TeacherQuizGenerator />;
  }

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* Top Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Bot className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-bold text-slate-800">Quiz Centre</h1>
          </div>
          <p className="text-slate-500 font-semibold ml-12">Lộ trình học thích ứng, được cá nhân hoá bởi AI.</p>
        </div>

        <div className="flex gap-4">
           <div className="bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Flame className="w-3 h-3 text-orange-500" /> CHUỖI NGÀY</p>
             <p className="font-bold text-slate-800 text-lg">{streak} Ngày</p>
           </div>
           <div className="bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TỔNG ĐIỂM</p>
             <p className="font-bold text-blue-600 text-lg">{totalPoints.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="flex gap-6 flex-1 h-[600px]">
         
         {/* LEFT LIST: Topic & Quiz Type Selector */}
         <div className="w-80 bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col overflow-hidden">
            <div className="p-6 border-b">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Activity className="w-5 h-5 text-blue-600" /> Chủ đề Quiz
               </h3>
            </div>
            
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
               {/* Quiz type toggle */}
               <div className="flex gap-2 mb-4">
                 <button 
                   onClick={() => setQuizType('teacher')}
                   className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${quizType === 'teacher' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                 >
                   Quiz Giáo viên
                 </button>
                 <button 
                   onClick={() => setQuizType('ai')}
                   className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${quizType === 'ai' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                 >
                   Quiz AI
                 </button>
               </div>

               {quizType === 'ai' ? (
                 learningTopics.length > 0 ? (
                   learningTopics.map((t) => (
                     <div 
                       key={t}
                       onClick={() => setSelectedTopic(t)}
                       className={`rounded-2xl p-4 cursor-pointer transition ${
                         selectedTopic === t 
                           ? 'border-2 border-purple-600 bg-purple-50/30' 
                           : 'border border-slate-200 bg-white hover:border-slate-300'
                       }`}
                     >
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                          {t}
                          {selectedTopic === t && <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>}
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold">
                          AI tạo câu hỏi thích ứng
                        </p>
                     </div>
                   ))
                 ) : (
                   <p className="text-center text-slate-400 py-10 text-xs font-bold italic">Bạn chưa tham gia môn học nào.</p>
                 )
               ) : (
                 assignedQuizzes.length > 0 ? (
                   Object.entries(
                     assignedQuizzes.reduce((acc, q) => {
                       const match = q.topic_name.match(/^\[(.*?)\]/);
                       const subject = match ? match[1] : 'Khác';
                       if (!acc[subject]) acc[subject] = [];
                       acc[subject].push(q);
                       return acc;
                     }, {} as Record<string, any[]>)
                   ).map(([subject, quizzes]) => (
                     <div key={subject} className="mb-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                           <span className="w-1 h-1 rounded-full bg-slate-300"></span> {subject}
                        </h5>
                        <div className="space-y-2">
                          {(quizzes as any[]).map((q) => (
                            <div 
                              key={q.id}
                              onClick={() => setSelectedQuizId(q.id)}
                              className={`rounded-2xl p-4 cursor-pointer transition ${
                                selectedQuizId === q.id 
                                  ? 'border-2 border-blue-600 bg-blue-50/30' 
                                  : 'border border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                              }`}
                            >
                               <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-bold text-slate-800 flex-1 pr-2 leading-tight text-xs">
                                   {q.topic_name.replace(/^\[.*?\]\s*/, '')}
                                 </h4>
                                 <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                                   {q.difficulty_level}
                                 </span>
                               </div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                                 Hạn: {q.expires_at ? new Date(q.expires_at).toLocaleDateString() : 'Không thời hạn'}
                               </p>
                            </div>
                          ))}
                        </div>
                     </div>
                   ))
                 ) : (
                   <p className="text-center text-slate-400 py-10 text-xs font-bold italic">Chưa có quiz nào được giao.</p>
                 )
               )}
            </div>

            <div className="p-4 border-t bg-slate-50 text-center">
               <button onClick={fetchQuestions} className="text-sm font-bold text-blue-600 hover:text-blue-700">Tải lại câu hỏi</button>
            </div>
         </div>

         {/* RIGHT MAIN: Quiz Interactor */}
         <div className="flex-1 flex gap-6">
            
            {/* QA Board */}
            <div className="flex-1 bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-10 flex flex-col relative overflow-hidden">

               {loading && (
                 <div className="flex flex-col items-center justify-center flex-1 gap-4">
                   <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                   <p className="text-slate-500 font-semibold">Đang tải câu hỏi...</p>
                 </div>
               )}

               {error && (
                 <div className="flex flex-col items-center justify-center flex-1 gap-4">
                   <AlertTriangle className="w-12 h-12 text-red-400" />
                   <p className="text-red-600 font-bold">{error}</p>
                   <button onClick={fetchQuestions} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold text-sm">Thử lại</button>
                 </div>
               )}

                {!loading && !error && currentQ && (
                  <div className="flex-1 flex flex-col overflow-y-auto pr-4 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    {/* Header QA */}
                   <div className="flex justify-between items-center mb-6">
                      <p className="font-bold text-slate-500">Câu {currentIdx + 1} / {questions.length}</p>
                      <div className="flex gap-4 text-xs font-bold">
                         <span className="text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600"></span> {correctCount} Đúng</span>
                         <span className="text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {incorrectCount} Sai</span>
                      </div>
                   </div>

                   {/* AI Weakness Analysis */}
                   {quizType === 'ai' && weaknessSummary && currentIdx === 0 && (
                      <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-3xl border border-purple-100 shadow-sm animate-in slide-in-from-top-4 duration-500">
                         <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                               <Brain className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                               <h4 className="font-black text-slate-800 mb-1 text-lg">Phân Tích & Đề Xuất Học Tập</h4>
                               <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4">{weaknessSummary}</p>
                               {studyMaterials.length > 0 && (
                                 <div>
                                   <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-2">Tài liệu tham khảo</p>
                                   <ul className="space-y-1.5">
                                      {studyMaterials.map((mat, idx) => (
                                         <li key={idx} className="text-sm text-slate-700 font-semibold flex items-center gap-2">
                                           <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> {mat}
                                         </li>
                                      ))}
                                   </ul>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Question */}
                   <div className="text-center mb-12">
                       <div className="inline-block bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1 rounded-full uppercase font-bold mb-4">{currentQ.difficulty}</div>
                       <h2 className="text-xl font-bold text-slate-800 leading-relaxed">{currentQ.q}</h2>
                   </div>

                   {/* Options */}
                   <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto w-full mb-auto">
                      {currentQ.options.map((option, i) => {
                        const letter = String.fromCharCode(65 + i); // A, B, C, D
                        return (
                          <button 
                            key={i}
                            onClick={() => !isSubmitted && setSelectedAnswer(option)}
                            className={`border-2 py-4 rounded-2xl font-bold text-sm transition flex items-center justify-between px-6 text-left ${
                              selectedAnswer === option 
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' 
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                            }`}
                          >
                              <span className="flex-1">{option}</span>
                              <span className={`${selectedAnswer === option ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'} text-xs px-2 py-1 rounded-md ml-2 shrink-0`}>{letter}</span>
                          </button>
                        );
                      })}
                   </div>

                   {/* Hint */}
                   {showHint && (
                     <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-bottom-4 duration-300">
                       <p className="text-sm text-amber-800 font-medium"><strong>💡 Gợi ý:</strong> {currentQ.hint}</p>
                     </div>
                   )}
                   
                   {/* AI Feedback */}
                   {isSubmitted && (
                      <div className={`mt-6 p-6 rounded-2xl border-2 ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'} animate-in slide-in-from-bottom-4 duration-500`}>
                         <div className="flex gap-4 items-start">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                               {isCorrect ? <CheckCircle className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                            </div>
                            <div>
                               <h4 className={`font-bold mb-1 ${isCorrect ? 'text-green-800' : 'text-purple-900'}`}>
                                 {isCorrect ? 'Xuất sắc! Câu trả lời chính xác.' : 'Chưa đúng rồi.'}
                               </h4>
                               <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-700' : 'text-purple-800'}`}>
                                 {isCorrect 
                                   ? 'Tuyệt vời! Tiến độ đã được cập nhật. Tiếp tục phát huy!' 
                                   : `Đáp án đúng là: "${currentQ.options[0]}". ${currentQ.hint}`}
                               </p>
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Action Buttons */}
                   <div className="flex gap-4 justify-between mt-8 border-t pt-8">
                      {!isSubmitted && (
                        <button 
                          onClick={handleSubmitAnswer}
                          disabled={!selectedAnswer}
                          className="bg-blue-600 text-white px-8 py-4 rounded-full font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
                        >
                           Trả lời <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      {isSubmitted && currentIdx < questions.length - 1 && (
                        <button 
                          onClick={handleNextQuestion}
                          className="bg-green-600 text-white px-8 py-4 rounded-full font-bold shadow-sm hover:bg-green-700 transition flex items-center gap-2"
                        >
                           Câu tiếp theo <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                      {isSubmitted && currentIdx === questions.length - 1 && (
                        <button 
                          onClick={handleFinishQuiz}
                          className="bg-green-600 text-white px-8 py-4 rounded-full font-bold shadow-sm hover:bg-green-700 transition flex items-center gap-2"
                        >
                           Nộp bài <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {!showHint && !isSubmitted && (
                        <button 
                          onClick={handleUseHint}
                          className="bg-purple-100 text-purple-700 px-6 py-4 rounded-full font-bold shadow-sm hover:bg-purple-200 transition flex items-center gap-2"
                        >
                           <Bot className="w-5 h-5" /> Dùng Hint
                        </button>
                      )}
                    </div>
                  </div>
                )}

               {!loading && !error && questions.length === 0 && (
                 <div className="flex flex-col items-center justify-center flex-1 gap-3 text-slate-400">
                   <Bot className="w-12 h-12 text-blue-200" />
                   <p className="font-semibold">Chưa có câu hỏi cho chủ đề này.</p>
                 </div>
               )}

            </div>

            {/* Right Mini Panel */}
            <div className="w-64 flex flex-col gap-6">
                
                {/* Mastery Points */}
                <div className="bg-blue-600 text-white rounded-3xl p-6 relative overflow-hidden shadow-md">
                   <div className="absolute right-0 top-0 opacity-20">
                      <ActivityBg />
                   </div>
                   <p className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-80">QUIZ SCORE</p>
                   <h3 className="text-4xl font-black mb-1">{correctCount}/{questions.length}</h3>
                   <p className="text-sm font-semibold opacity-90">this session</p>
                   <p className="text-xs text-blue-200 mt-4 leading-relaxed">
                      Hints used: {hintsUsed}
                   </p>
                </div>

                {/* BrainRoot Monitor */}
                 {(() => {
                   const level = hintsUsed <= 1 ? 'good' : hintsUsed <= 3 ? 'warning' : 'danger';
                   const cfg = {
                     good: { label: 'Tốt', msg: 'Bạn đang có chỉ số độc lập tốt. Tiếp tục phát huy!', bg: 'bg-green-50', border: 'border-green-100', iconBg: 'bg-green-100', iconColor: 'text-green-600', barBg: 'bg-green-200', barFill: 'bg-green-500' },
                     warning: { label: 'Cần chú ý', msg: 'Bạn đang dùng nhiều gợi ý. Hãy thử tự giải!', bg: 'bg-amber-50', border: 'border-amber-100', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', barBg: 'bg-amber-200', barFill: 'bg-amber-500' },
                     danger: { label: 'Báo động!', msg: 'Cảnh báo: Bạn đang sử dụng quá nhiều Hint!', bg: 'bg-red-50', border: 'border-red-100', iconBg: 'bg-red-100', iconColor: 'text-red-600', barBg: 'bg-red-200', barFill: 'bg-red-500' },
                   }[level];
                   const Icon = level === 'good' ? ShieldCheck : level === 'warning' ? AlertTriangle : Brain;
                   return (
                     <div className={`${cfg.bg} rounded-3xl border ${cfg.border} p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors duration-500`}>
                       <div className="flex items-center gap-2 mb-3">
                         <div className={`w-8 h-8 rounded-full ${cfg.iconBg} flex items-center justify-center`}>
                           <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                         </div>
                         <h4 className={`font-bold ${cfg.iconColor} text-sm`}>BrainRoot Monitor</h4>
                       </div>
                       <div className={`inline-flex items-center gap-1.5 ${cfg.iconBg} px-3 py-1 rounded-full mb-3`}>
                         <span className={`text-[10px] font-bold ${cfg.iconColor} uppercase tracking-wider`}>{cfg.label}</span>
                       </div>
                       <p className="text-xs text-slate-600 font-medium leading-relaxed mb-4">{cfg.msg}</p>
                       <div className={`w-full h-2 rounded-full ${cfg.barBg}`}>
                         <div className={`h-full rounded-full transition-all duration-500 ${cfg.barFill}`} style={{ width: `${Math.min(100, hintsUsed * 20)}%` }}></div>
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider">Gợi ý đã dùng: {hintsUsed}</p>
                     </div>
                   );
                 })()}

            </div>

         </div>
      </div>
      
    </div>
  );
}

function ActivityBg() {
  return (
    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// TEACHER QUIZ GENERATOR
// ---------------------------------------------------------------------------
function TeacherQuizGenerator() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('[DSA] Graph Search (BFS/DFS)');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(3);
  const [targetGrade, setTargetGrade] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const res = await generateTeacherQuiz(topic, difficulty, numQuestions);
      setGeneratedQuiz(res.questions);
    } catch (err: any) {
      setError(err.message || 'Lỗi tạo câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const newQuiz = [...generatedQuiz];
    newQuiz[index][field] = value;
    setGeneratedQuiz(newQuiz);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuiz = [...generatedQuiz];
    const oldOpt = newQuiz[qIndex].options[optIndex];
    newQuiz[qIndex].options[optIndex] = value;
    // Cập nhật đáp án đúng nếu sửa text của option hiện đang là đáp án
    if (newQuiz[qIndex].answer === oldOpt) {
      newQuiz[qIndex].answer = value;
    }
    setGeneratedQuiz(newQuiz);
  };

  const handleSetCorrectAnswer = (qIndex: number, value: string) => {
    const newQuiz = [...generatedQuiz];
    newQuiz[qIndex].answer = value;
    setGeneratedQuiz(newQuiz);
  };

  const handleSave = async () => {
    if (generatedQuiz.length === 0) return;
    setIsSaving(true);
    try {
      await saveTeacherQuiz({
        teacher_id: user?.id,
        topic_name: topic,
        difficulty_level: difficulty,
        target_grade: targetGrade || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        questions: generatedQuiz
      });
      alert('Đã lưu bộ câu hỏi thành công!');
      setTopic('');
      setGeneratedQuiz([]);
    } catch (err: any) {
      alert(`Lỗi lưu: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col gap-6 animate-in fade-in duration-500 w-full pt-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">AI Quiz Generator</h1>
          <p className="text-slate-500 font-semibold">Tạo đề thi tự động bằng Socratic AI</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-sm font-bold text-slate-700">Chủ đề (Topic)</label>
            <select 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="[DSA] Graph Search (BFS/DFS)">[DSA] Graph Search (BFS/DFS)</option>
              <option value="[DSA] Dynamic Programming">[DSA] Dynamic Programming</option>
              <option value="[LTNC] Pointers & References">[LTNC] Pointers & References</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Độ khó</label>
            <select 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Dễ (Easy)</option>
              <option value="medium">Trung bình (Medium)</option>
              <option value="hard">Khó (Hard)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Số lượng câu</label>
            <input 
              type="number" 
              min={1} 
              max={10} 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2 lg:col-span-1">
            <label className="text-sm font-bold text-slate-700">Giao cho Lớp</label>
            <input 
              type="text" 
              placeholder="VD: L01 (Tùy chọn)" 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 lg:col-span-1">
            <label className="text-sm font-bold text-slate-700">Hạn chót</label>
            <input 
              type="datetime-local" 
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-sm"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        
        <button 
          onClick={handleGenerate} 
          disabled={loading || !topic}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
          {loading ? 'AI Đang suy nghĩ...' : 'Tạo Bộ Câu Hỏi'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3 font-medium">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {generatedQuiz.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:p-8" onClick={() => setGeneratedQuiz([])}>
          <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden relative shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setGeneratedQuiz([])} 
              className="absolute top-6 right-6 bg-white hover:bg-slate-100 text-slate-500 w-10 h-10 rounded-full flex items-center justify-center font-bold z-50 shadow-sm border"
            >
              X
            </button>
            <div className="p-8 flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-6 pr-12">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" /> Kết quả: {generatedQuiz.length} câu hỏi
                </h2>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="w-5 h-5 border-2 border-white rounded-sm" />}
                  {isSaving ? 'Đang lưu...' : 'Lưu Bộ Câu Hỏi'}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 pr-4">
                {generatedQuiz.map((q, i) => (
                  <div key={q.id || i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-start gap-2 mb-4">
                      <span className="font-bold text-slate-800 text-lg shrink-0 mt-1">Câu {i + 1}:</span>
                      <textarea 
                        value={q.q} 
                        onChange={(e) => handleQuestionChange(i, 'q', e.target.value)}
                        className="flex-1 font-bold text-slate-800 text-lg border-b border-dashed border-slate-300 hover:border-blue-500 focus:border-blue-500 focus:border-solid outline-none bg-transparent px-2 py-1 resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {q.options?.map((opt: string, idx: number) => (
                        <div key={idx} className={`relative p-3 rounded-xl border font-medium flex items-center gap-2 ${opt === q.answer ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                          <input 
                            type="radio" 
                            name={`answer-${i}`} 
                            checked={opt === q.answer} 
                            onChange={() => handleSetCorrectAnswer(i, opt)}
                            className="w-4 h-4 cursor-pointer"
                            title="Chọn làm đáp án đúng"
                          />
                          <span className="font-bold text-slate-400 w-5">{String.fromCharCode(65 + idx)}.</span>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => handleOptionChange(i, idx, e.target.value)}
                            className={`flex-1 outline-none bg-transparent ${opt === q.answer ? 'text-green-800' : 'text-slate-700'}`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex gap-3 items-start">
                      <Brain className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Gợi ý Socratic</p>
                        <textarea 
                          value={q.hint} 
                          onChange={(e) => handleQuestionChange(i, 'hint', e.target.value)}
                          className="w-full text-sm font-medium text-slate-700 bg-transparent outline-none resize-none overflow-hidden"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
