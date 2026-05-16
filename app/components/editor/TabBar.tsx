'use client';

import { Icons } from '@/app/lib/icons';

interface Tab {
  id: string;
  name: string;
  isDirty?: boolean;
}

interface TabBarProps {
  tabs?: Tab[];
  activeTabId?: string;
  onSelectTab?: (id: string) => void;
  onCloseTab?: (id: string) => void;
}

export function TabBar({
  tabs = [
    { id: '1', name: 'App.tsx', isDirty: false },
    { id: '2', name: 'utils.ts', isDirty: true }
  ],
  activeTabId = '1',
  onSelectTab,
  onCloseTab
}: TabBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-700/30 overflow-x-auto bg-slate-800/20">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelectTab?.(tab.id)}
          className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-sm whitespace-nowrap transition-all ${
            activeTabId === tab.id
              ? 'bg-slate-800 text-slate-50 border border-slate-700/50 border-b-0'
              : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
          }`}
        >
          <span>{tab.name}</span>
          {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onCloseTab?.(tab.id);
            }}
            className="ml-1 p-0.5 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Icons.X className="w-3 h-3" />
          </span>
        </button>
      ))}
    </div>
  );
}
