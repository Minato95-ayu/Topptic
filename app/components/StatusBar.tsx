'use client';

import { useApp } from '@/app/providers';
import { Icons } from '@/app/lib/icons';

export function StatusBar() {
  const { selectedFilePath, backendStatus, selectedProjectId, projects } = useApp();

  const activeProject = projects.find(p => p.id === selectedProjectId);
  const activeLang = selectedFilePath ? selectedFilePath.split('.').pop()?.toUpperCase() : 'PLAIN TEXT';

  return (
    <footer className="h-6 bg-slate-950 border-t border-slate-900/60 px-4 flex items-center justify-between text-[10px] font-medium text-slate-400 select-none z-40">
      <div className="flex items-center gap-4">
        {/* Left Side Status */}
        <div className="flex items-center gap-1.5 text-blue-400 font-semibold hover:text-blue-300 transition-colors cursor-pointer">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span>Tauri Host: Active</span>
        </div>
        
        {activeProject && (
          <div className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer">
            <Icons.Folder className="w-3 h-3 text-slate-500" />
            <span className="font-semibold text-slate-300">{activeProject.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Right Side Status */}
        {selectedFilePath && (
          <div className="flex items-center gap-1 text-slate-500">
            <span>Ln 14, Col 1</span>
          </div>
        )}

        <div className="flex items-center gap-1 text-slate-500">
          <span>UTF-8</span>
        </div>

        <div className="flex items-center gap-1 text-blue-400/90 font-mono font-bold">
          <span>{activeLang}</span>
        </div>

        <div className="flex items-center gap-1.5 border-l border-slate-800/80 pl-4 hover:text-slate-200 transition-colors cursor-pointer">
          <Icons.Brain className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono">Ollama: {backendStatus?.aiEngine || 'llama3.2'}</span>
        </div>
      </div>
    </footer>
  );
}
