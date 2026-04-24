'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquareText, FileQuestion, LineChart, Settings, Network } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';

  const menu = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat Tutor', path: '/chat-tutor', icon: MessageSquareText },
    { name: 'Quiz Centre', path: '/Quiz-centre', icon: FileQuestion },
    { name: 'Skill Tree', path: '/knowledge-graph', icon: Network },
    { name: 'Analytics', path: '/Analytics', icon: LineChart },
    { name: 'Settings', path: '/Settings', icon: Settings },
  ].filter(item => !(isTeacher && item.name === 'Skill Tree'));

  return (
    <aside className="w-64 bg-slate-50 flex flex-col h-full sticky top-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.04)]">
      <div className="px-8 py-8">
        <h1 className="font-bold text-2xl text-blue-700 tracking-tight">BrainRoot<span className="text-blue-400">.</span></h1>
        <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-widest uppercase">Learning Ecosystem</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold text-sm transition ${
              isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
            }`}>
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} /> {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}