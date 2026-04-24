'use client';
import { useAuth } from '@/context/AuthContext';
import { Bell, User, LogOut } from 'lucide-react';

export default function TopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="w-full bg-[#F6FAFE] px-8 py-6 flex items-center justify-between animate-in fade-in duration-500">
      {/* Left: User greeting */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-sm font-bold text-blue-600">{user?.full_name?.charAt(0) || 'U'}</span>
        </div>
        <span className="text-sm font-semibold text-slate-600">
          Xin chào, <span className="text-slate-800 font-bold">{user?.full_name || 'User'}</span>
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white px-4 py-2 flex items-center">
            <span className={`text-xs font-bold uppercase tracking-wider ${user?.role === 'teacher' ? 'text-purple-600' : 'text-blue-600'}`}>
               {user?.role === 'teacher' ? 'Teacher Mode' : 'Student Mode'}
            </span>
        </div>
        <button className="w-10 h-10 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-white rounded-full flex items-center justify-center text-slate-600 hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition">
            <Bell className="w-4 h-4" />
        </button>
        <button 
          onClick={logout}
          title="Đăng xuất"
          className="w-10 h-10 bg-red-50 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-red-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100 hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition"
        >
            <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
