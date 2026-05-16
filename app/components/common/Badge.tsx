'use client';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info';
  children: string;
}

export function Badge({ variant = 'info', children }: BadgeProps) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30'
  };

  return <span className={variants[variant]}>{children}</span>;
}
