'use client';
import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoginScreen from '@/components/LoginScreen';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { Loader2 } from 'lucide-react';

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  // Đang kiểm tra localStorage
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F6FAFE]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Chưa đăng nhập → hiện LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  // Đã đăng nhập → hiện App chính
  return (
    <div className="flex h-screen bg-[#F6FAFE]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto px-8 pb-8">{children}</main>
      </div>
    </div>
  );
}
