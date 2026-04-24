'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { loginUser } from '@/services/apiClient';
import type { User } from '@/types/api';
import { Brain, Loader2, AlertTriangle, GraduationCap, BookOpen, Sparkles, LogIn, Lock, User as UserIcon } from 'lucide-react';

export default function LoginScreen() {
  const { login } = useAuth();
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  
  // Form fields
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !password.trim()) {
        setError('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginUser(name.trim(), password);
      
      // Kiểm tra role khớp với tab đang chọn
      if (result.user.role !== role) {
        setError(role === 'student'
          ? 'Tài khoản này là Giáo viên. Vui lòng chuyển sang tab Giáo viên.'
          : 'Tài khoản này là Học sinh. Vui lòng chuyển sang tab Học sinh.');
        return;
      }

      login(result.user);
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side - Brand / Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-blue-600 flex-col justify-between p-12 text-white">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-400 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-20 -left-20 w-[30rem] h-[30rem] bg-indigo-500 rounded-full blur-[120px]"></div>
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl mb-8">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Nâng tầm <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-100">
              Trí tuệ Nhân tạo
            </span>
          </h1>
          <p className="text-lg text-blue-100 max-w-md font-medium leading-relaxed">
            Hệ thống học tập thích ứng sử dụng công nghệ Socratic AI. Chống thui chột kiến thức, phát triển tư duy độc lập.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="flex -space-x-4">
            <img className="w-10 h-10 rounded-full border-2 border-blue-600" src="https://ui-avatars.com/api/?name=Alex&background=random" alt="User" />
            <img className="w-10 h-10 rounded-full border-2 border-blue-600" src="https://ui-avatars.com/api/?name=Sarah&background=random" alt="User" />
            <img className="w-10 h-10 rounded-full border-2 border-blue-600" src="https://ui-avatars.com/api/?name=Mike&background=random" alt="User" />
          </div>
          <p className="text-sm font-semibold text-blue-100">
            Hơn <span className="text-white font-bold">10,000+</span> học sinh đang sử dụng
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800">BrainRoot<span className="text-blue-600">.</span></h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Chào mừng trở lại</h2>
            <p className="text-slate-500 font-medium mt-2">Vui lòng đăng nhập để tiếp tục lộ trình học.</p>
          </div>

          {/* Role Toggle */}
          <div className="bg-slate-200/50 p-1.5 rounded-2xl flex mb-8">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                role === 'student' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" /> Học sinh
            </button>
            <button
              onClick={() => setRole('teacher')}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                role === 'teacher' ? 'bg-white text-purple-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Giáo viên
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tên tài khoản
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập..."
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                    className="w-full rounded-2xl pl-11 pr-5 py-4 text-sm bg-white border border-slate-200 shadow-[0_2px_10px_rgb(0,0,0,0.02)] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    className="w-full rounded-2xl pl-11 pr-5 py-4 text-sm bg-white border border-slate-200 shadow-[0_2px_10_rgb(0,0,0,0.02)] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !name.trim() || !password.trim()}
                className={`w-full py-4 mt-4 rounded-2xl font-bold text-base shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none ${
                  role === 'student'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30 hover:shadow-blue-600/40 transform hover:-translate-y-0.5'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-600/30 hover:shadow-purple-600/40 transform hover:-translate-y-0.5'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Xác nhận Đăng nhập <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
          </form>

          <p className="text-center text-xs text-slate-400 font-medium mt-8">
            BrainRoot LMS — Hệ thống học tập thích ứng AI, HCMUT.
          </p>
        </div>
      </div>
    </div>
  );
}
