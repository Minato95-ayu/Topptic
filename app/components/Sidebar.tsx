'use client';

import { ProjectsList } from '@/app/components/sidebar/ProjectsList';
import { FileExplorer } from '@/app/components/sidebar/FileExplorer';
import { useApp } from '@/app/providers';
import { invoke } from '@tauri-apps/api/core';
import { useState } from 'react';

export default function Sidebar() {
  const { 
    activeNav, 
    setActiveNav, 
    projects, 
    setSelectedProjectId,
    selectedProjectId,
    openFile,
    refreshProjects
  } = useApp();

  const [gitStatusText, setGitStatusText] = useState<string>('');
  const [gitCommitMsg, setGitCommitMsg] = useState<string>('');
  const [gitLoading, setGitLoading] = useState<boolean>(false);
  const [gitResult, setGitResult] = useState<string>('');

  const currentProject = projects.find(p => p.id === selectedProjectId);

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await invoke<string | null>('open_workspace_folder');
      if (selectedPath) {
        console.log("Selected Workspace Folder ->", selectedPath);
        // Clean folder name to use as project title
        const folderName = selectedPath.split(/[\\/]/).pop() || 'Workspace Project';
        
        // Dynamic register via Tauri IPC create_project endpoint
        await invoke('create_project', {
          request: {
            name: folderName,
            path: selectedPath
          }
        });
        
        // Refresh local database caches
        await refreshProjects();
      }
    } catch (error) {
      console.error("Open Folder launcher failed:", error);
    }
  };

  const handleImportFolder = async () => {
    try {
      const result = await invoke<string>('import_folder');
      console.log("Import result:", result);
      // Extract folder name from result message
      const match = result.match(/workspace\/(.+)$/);
      const folderName = match ? match[1] : 'Imported Project';
      
      // Register as a new project
      await invoke('create_project', {
        request: {
          name: folderName,
          path: folderName
        }
      });
      
      await refreshProjects();
    } catch (error) {
      console.error("Import Folder failed:", error);
    }
  };

  const handleGitAction = async (action: string) => {
    if (!currentProject) return;
    setGitLoading(true);
    setGitResult('');
    try {
      const res = await invoke<string>('run_git_command', {
        action,
        projectPath: currentProject.path,
        commitMsg: action === 'commit' ? gitCommitMsg : null
      });
      setGitResult(res);
      if (action === 'commit') setGitCommitMsg('');
      // Trigger status check again
      const nextStatus = await invoke<string>('run_git_command', {
        action: 'status',
        projectPath: currentProject.path
      });
      setGitStatusText(nextStatus || 'No modifications detected.');
    } catch (err) {
      setGitResult(`Error: ${err}`);
    } finally {
      setGitLoading(false);
    }
  };

  const fetchGitStatus = async () => {
    if (!currentProject) return;
    setGitLoading(true);
    try {
      const status = await invoke<string>('run_git_command', {
        action: 'status',
        projectPath: currentProject.path
      });
      setGitStatusText(status || 'No uncommitted modifications.');
    } catch (err) {
      setGitStatusText(`Git error: ${err}`);
    } finally {
      setGitLoading(false);
    }
  };

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
      id: 'git',
      label: 'Source Control (Git)',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 9v6" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 12c-2 0-4-1-4-3" stroke="currentColor" strokeWidth="1.8" fill="none" />
          <circle cx="8" cy="9" r="1.5" fill="currentColor" />
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
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.id === 'git') {
                    void fetchGitStatus();
                  }
                }}
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

        {/* Settings Icon */}
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
            {activeNav === 'projects' ? 'Explorer' : activeNav === 'git' ? 'Source Control' : activeNav === 'build' ? 'Run & Build' : activeNav === 'settings' ? 'Settings' : 'Roadmap'}
          </span>
          
          {activeNav === 'projects' && (
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenFolder}
                className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-slate-800/60 transition-all"
                title="Open Folder (Link Workspace)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
              </button>
              <button
                onClick={handleImportFolder}
                className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-slate-800/60 transition-all"
                title="Import Folder (Copy files into workspace)"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          )}
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
          ) : activeNav === 'git' ? (
            <div className="flex-1 p-3 flex flex-col overflow-hidden gap-3 animate-in fade-in duration-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Changes list</span>
              
              {/* Scrollable uncommitted files changes list */}
              <div className="flex-1 overflow-y-auto bg-slate-950/40 border border-slate-800/50 rounded-lg p-2 font-mono text-[9px] text-slate-300 leading-normal whitespace-pre-wrap">
                {gitStatusText || 'Fetching git changes...'}
              </div>

              {/* Commit and Action operations */}
              <div className="flex flex-col gap-2 border-t border-slate-800/50 pt-2">
                <input
                  type="text"
                  placeholder="Commit message..."
                  value={gitCommitMsg}
                  onChange={(e) => setGitCommitMsg(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-[10px] text-slate-200 rounded p-1.5 focus:outline-none focus:border-blue-500/50 font-sans"
                />
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleGitAction('stage_all')}
                    disabled={gitLoading || !currentProject}
                    className="py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded text-[10px] font-semibold transition-all"
                  >
                    Stage All
                  </button>
                  <button
                    onClick={() => handleGitAction('commit')}
                    disabled={gitLoading || !currentProject || !gitCommitMsg}
                    className="py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-[10px] font-semibold transition-all"
                  >
                    Commit
                  </button>
                </div>
                <button
                  onClick={() => handleGitAction('push')}
                  disabled={gitLoading || !currentProject}
                  className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 text-white rounded text-[10px] font-bold shadow-md shadow-blue-950/50 transition-all flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Push Changes
                </button>
              </div>

              {gitResult && (
                <div className="bg-slate-950 border border-slate-900 rounded p-1 text-[9px] font-mono text-cyan-400 overflow-x-auto whitespace-pre max-h-[80px]">
                  {gitResult}
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

