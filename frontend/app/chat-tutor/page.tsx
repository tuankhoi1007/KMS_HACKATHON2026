'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { postSocraticChat, getChatSessions, getStudentDashboard, postTeacherChat } from '@/services/apiClient';
import type { ChatSession } from '@/types/api';
import { Send, Bot, User, Bookmark, BrainCircuit, Target, Clock, History, Loader2, AlertTriangle, Network } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  timestamp: string;
  agent_used?: string;
  retry_count?: number;
  validation_score?: number;
}

export default function ChatTutorPage() {
  const { user } = useAuth();
  const studentId = user?.id || '';
  const isTeacher = user?.role === 'teacher';
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studyHours, setStudyHours] = useState(0);
  const [topicName, setTopicName] = useState('General');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history + study hours on mount
  useEffect(() => {
    if (isTeacher || !studentId) return;

    const loadData = async () => {
      setInitialLoading(true);
      try {
        const [sessions, dashData] = await Promise.all([
          getChatSessions(studentId).catch(() => [] as ChatSession[]),
          getStudentDashboard(studentId).catch(() => null),
        ]);

        // Convert chat sessions to flat messages
        if (sessions.length > 0) {
          const flatMessages: ChatMessage[] = [];
          sessions.forEach((session) => {
            if (session.messages && Array.isArray(session.messages)) {
              session.messages.forEach((msg, idx) => {
                flatMessages.push({
                  id: `${session.id}-${idx}`,
                  sender: msg.role === 'user' ? 'student' : 'tutor',
                  text: msg.content,
                  timestamp: new Date(session.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                  agent_used: session.agent_used,
                  retry_count: session.retry_count,
                  validation_score: session.validation_score,
                });
              });
            }
          });
          setMessages(flatMessages);
        }

        if (dashData) {
          setStudyHours(dashData.profile.study_hours_this_week);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [isTeacher, studentId]);

  // ---------------------------------------------------------------------------
  // SEND MESSAGE — gọi POST /student/chat thật
  // ---------------------------------------------------------------------------
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student',
      text: userText,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await postSocraticChat({
        student_id: studentId,
        message: userText,
        topic_name: topicName,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: response.session_id || Date.now().toString(),
          sender: 'tutor',
          text: response.reply,
          timestamp: 'Just now',
          agent_used: response.agent_used,
          retry_count: response.retry_count,
          validation_score: response.validation_score,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'tutor',
          text: `⚠️ Lỗi: ${err.message}. Vui lòng thử lại.`,
          timestamp: 'Just now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isTeacher) {
    return <TeacherChat />;
  }

  // Initial loading state
  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-semibold text-lg">Đang tải lịch sử chat...</p>
        <p className="text-slate-400 text-sm">Server có thể mất 30-50 giây để khởi động.</p>
      </div>
    );
  }

  // STUDENT MODE UI
  return (
    <div className="flex gap-6 h-full animate-in fade-in duration-500">

      {/* LEFT: MAIN CHAT PANEL */}
      <div className="flex-1 bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col overflow-hidden">

        {/* Chat Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex justify-center items-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Socratic Coach - Pushin' Your Thinkin'</h2>
              <p className="text-xs text-green-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Active curator in session
              </p>
            </div>
          </div>
          {/* Topic selector */}
          <div className="flex items-center gap-3">
            <select
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              className="bg-slate-50 border rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 outline-none"
            >
              <option value="General">General</option>
              <option value="DSA">DSA</option>
              <option value="LTNC">LTNC (C++)</option>
              <option value="HDH">Hệ Điều Hành</option>
            </select>
            <button className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
              <Bookmark className="w-4 h-4" /> Save Chat
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Bot className="w-12 h-12 text-blue-200" />
              <p className="font-semibold">Bắt đầu cuộc trò chuyện với Socratic Coach!</p>
              <p className="text-sm">Hãy đặt câu hỏi về bài học của bạn.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${msg.sender === 'student'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-[#F6FAFE] text-slate-700 rounded-tl-sm border border-blue-50'
                }`}>
                {msg.sender === 'tutor' && (
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Socratic Coach</p>
                    {msg.agent_used && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${msg.agent_used === 'agent_1' ? 'bg-indigo-100 text-indigo-600' : 'bg-fuchsia-100 text-fuchsia-600'}`}>
                        {msg.agent_used === 'agent_1' ? 'Local AI' : 'Gemini Fallback'}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                {msg.sender === 'student' && <p className="text-[10px] text-blue-200 mt-2 text-right uppercase">Sent {msg.timestamp}</p>}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#F6FAFE] border border-blue-50 text-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-2 items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t bg-white">
          <div className="bg-[#F6FAFE] border rounded-full flex items-center pr-2 pl-4 py-1">
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-sm text-black py-2 disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputText.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 text-black flex justify-center items-center hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>

      </div>

      {/* RIGHT: CONTEXT & PROGRESS PANEL */}
      <div className="w-80 flex flex-col gap-6">

        {/* Current Focus */}
        <div className="bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6">
          <h3 className="font-bold mb-4 text-slate-800">Current Focus</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">{topicName}</p>
              <p className="font-bold text-sm text-slate-800">Socratic Learning</p>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-500">Mastery Progress</span>
              <span className="text-blue-600">68%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full w-[68%]"></div>
            </div>
          </div>
        </div>

        {/* Skill Tree Insight */}
        <div className="bg-gradient-to-r from-cyan-900/10 to-blue-900/10 rounded-4xl border border-cyan-100 p-6 relative overflow-hidden shadow-[0_4px_20px_rgba(34,211,238,0.1)]">
          <div className="absolute top-[-10px] right-[-10px] p-4 opacity-20">
            <Network className="w-24 h-24 text-cyan-600" />
          </div>
          <h3 className="font-bold mb-2 text-cyan-800 flex items-center gap-2">
            <Network className="w-4 h-4" /> Skill Tree Insight
          </h3>
          <p className="text-sm text-cyan-900 leading-relaxed font-medium relative z-10">
            "💡 Gợi ý: Bạn đã thành thạo phần <strong>Array</strong> và <strong>Hash Tables</strong> trong Skill Tree. Hãy áp dụng kiến thức đó để tối ưu thời gian chạy của bài toán này xuống O(N) nhé!"
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white p-6">
          <h3 className="font-bold mb-4 text-slate-800">Next Steps</h3>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 cursor-pointer hover:bg-blue-100 transition">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">RECOMMENDED</p>
            <p className="text-sm font-semibold text-slate-800">Practice Multi-step Equations</p>
          </div>
          <div className="flex justify-between mt-6 px-4">
            <div className="text-center">
              <Target className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-500">Skill Map</p>
            </div>
            <div className="text-center">
              <History className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold text-slate-500">History</p>
            </div>
          </div>
        </div>

        {/* Total Hours Block — dynamic */}
        <div className="bg-slate-800 text-white rounded-4xl p-6 relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-20">
            <Clock className="w-32 h-32" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">TOTAL FOCUSED HOURS</p>
          <h2 className="text-3xl font-bold">{studyHours} Hours</h2>
        </div>

      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// TEACHER CHAT (PEDAGOGICAL ASSISTANT)
// ---------------------------------------------------------------------------
function TeacherChat() {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    sender: 'tutor',
    text: `Chào Thầy/Cô ${user?.full_name || ''}! Tôi là Trợ lý Sư phạm AI. Thầy/Cô có câu hỏi nào về phương pháp giảng dạy, cách xử lý học sinh yếu kém hay chống lạm dụng AI không?`,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userText = inputText;
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'student', // Reuse 'student' logic for right alignment (it's the teacher in this case)
      text: userText,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await postTeacherChat(userText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + 'reply',
          sender: 'tutor',
          text: response.reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'tutor',
          text: `⚠️ Lỗi: ${err.message}. Vui lòng thử lại.`,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-6 h-full animate-in fade-in duration-500">
      {/* LEFT: MAIN CHAT PANEL */}
      <div className="flex-1 bg-white rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col overflow-hidden max-w-5xl mx-auto">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex justify-center items-center">
              <Bot className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">Pedagogical Assistant</h1>
              <p className="text-xs font-semibold text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'student' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex justify-center items-center shrink-0 ${msg.sender === 'student' ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm border text-indigo-600'}`}>
                {msg.sender === 'student' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[70%] ${msg.sender === 'student' ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`px-5 py-3 rounded-2xl shadow-sm text-sm font-medium ${msg.sender === 'student' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                  {msg.text.split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-white shadow-sm border text-indigo-600 flex justify-center items-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t">
          <div className="relative flex items-center">
            <input
              type="text"
              className="w-full bg-slate-50 border-none rounded-full pl-6 pr-14 py-4 text-sm font-semibold text-black focus:ring-2 focus:ring-indigo-600 outline-none placeholder-slate-400"
              placeholder="Hỏi AI về phương pháp sư phạm..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="absolute right-2 w-10 h-10 bg-indigo-600 text-white rounded-full flex justify-center items-center hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}