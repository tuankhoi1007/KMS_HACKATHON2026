import { redirect } from 'next/navigation';

export default function HomePage() {
  // Tự động đá người dùng sang trang Dashboard khi họ truy cập trang chủ
  redirect('/dashboard');
}