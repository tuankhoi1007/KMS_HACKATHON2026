import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import './globals.css'; 

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}