'use client';

import type { ReactNode } from 'react';

interface NavItemProps {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: string;
}

export function NavItem({ icon, label, isActive = false, onClick, badge }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
      }`}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium text-left">{label}</span>
      {badge && <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs">{badge}</span>}
    </button>
  );
}
