import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';
import { Providers } from '@/app/providers';

export const metadata: Metadata = {
  title: 'Topptic',
  description: 'Local app development engine'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-50">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
