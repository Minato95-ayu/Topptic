'use client';

import { ProjectsList } from '@/app/components/sidebar/ProjectsList';
import { FileExplorer } from '@/app/components/sidebar/FileExplorer';
import { useApp } from '@/app/providers';

export default function Sidebar() {
  const { 
    activeNav, 
    setActiveNav, 
    projects, 
    setSelectedProjectId,
    selectedProjectId,
    openFile
  } = useApp();

  const activityItems = [
    {
      id: 'projects',
      label: 'Explorer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      )
    },
    {
      id: 'build',
      label: 'Run & Compile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'ai-roadmap',
      label: 'AI Roadmap',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex h-full select-none">
      {/* 1. VS Code Activity Bar (Far Left) */}
      <aside className="w-12 bg-slate-950 border-r border-slate-900/60 flex flex-col justify-between items-center py-4 z-20">
        <div className="flex flex-col items-center gap-4.5 w-full">
          {/* Logo Brand Icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2 cursor-pointer transform active:scale-95 transition-all">
            <span className="text-white font-bold text-xs">T</span>
          </div>

          {/* Activity items */}
          {activityItems.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveNav(item.id)}
                className={`relative group p-2 rounded-lg transition-all ${
                  isActive 
                    ? 'text-blue-400 bg-slate-900/50' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
                }`}
                title={item.label}
              >
                {/* VS Code active bar indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-blue-500 rounded-r" />
                )}
                {item.icon}
              </button>
            );
          })}
        </div>

        {/* Settings Icon (At the very bottom of Activity Bar) */}
        <button
          type="button"
          onClick={() => setActiveNav('settings')}
          className={`relative group p-2 rounded-lg transition-all ${
            activeNav === 'settings' 
              ? 'text-blue-400 bg-slate-900/50' 
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
          }`}
          title="Settings"
        >
          {activeNav === 'settings' && (
            <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-blue-500 rounded-r" />
          )}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </aside>

      {/* 2. Secondary Sidebar Panel (collapsible Explorer pane) */}
      <aside className="w-[196px] bg-slate-900/35 backdrop-blur-xl border-r border-slate-900/60 flex flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-slate-800/40 flex items-center justify-between select-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {activeNav === 'projects' ? 'Explorer' : activeNav === 'build' ? 'Run & Build' : activeNav === 'settings' ? 'Settings' : 'Roadmap'}
          </span>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeNav === 'projects' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <ProjectsList 
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={(id) => {
                  setSelectedProjectId(id);
                }} 
                onCreateProjectClick={() => {
                  setSelectedProjectId(null);
                }}
              />
              
              {selectedProjectId && (
                <div className="flex-1 border-t border-slate-800/50 mt-1 overflow-hidden">
                  <FileExplorer 
                    projectPath={projects.find(p => p.id === selectedProjectId)?.path}
                    onFileSelect={openFile} 
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 text-xs text-slate-500 leading-relaxed italic">
              {activeNav === 'build' && "Compile log views are open on the main screen."}
              {activeNav === 'settings' && "Manage editor parameters on the main screen."}
              {activeNav === 'ai-roadmap' && "Off-line fine-tuning scripts are active."}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
