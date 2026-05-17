import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';
import { StatusBar } from '@/app/components/StatusBar';
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
          <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
            </div>
            <StatusBar />
          </div>
        </Providers>
      </body>
    </html>
  );
}
