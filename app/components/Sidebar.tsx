import { NavItem } from '@/app/components/sidebar/NavItem';
import { ProjectsList } from '@/app/components/sidebar/ProjectsList';
import { FileExplorer } from '@/app/components/sidebar/FileExplorer';
import { Icons } from '@/app/lib/icons';
import { useApp } from '@/app/providers';

export default function Sidebar() {
  const { 
    activeNav, 
    setActiveNav, 
    backendStatus, 
    projects, 
    setSelectedProjectId,
    selectedProjectId
  } = useApp();

  const navItems = [
    { id: 'projects', label: 'Projects', icon: <Icons.FileText /> },
    { id: 'build', label: 'Build', icon: <Icons.Zap /> },
    { id: 'ai-roadmap', label: 'AI Roadmap', icon: <Icons.Brain /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings /> }
  ];

  return (
    <aside className="w-64 bg-slate-900/40 backdrop-blur-xl border-r border-slate-700/30 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-lg font-bold gradient-text">Topptic</span>
        </div>
        <p className="text-xs text-slate-500">v0.1.0</p>
      </div>

      <nav className="px-4 py-4 space-y-2 border-b border-slate-700/30">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeNav === item.id}
            onClick={() => setActiveNav(item.id)}
          />
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ProjectsList 
          projects={projects} 
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setActiveNav('projects');
          }} 
        />
        
        {activeNav === 'projects' && selectedProjectId && (
          <div className="mt-2 border-t border-slate-700/30 pt-2">
            <FileExplorer onFileSelect={setSelectedFilePath} />
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <div className={`w-2 h-2 rounded-full shadow-lg ${backendStatus?.tauri ? 'bg-green-500 shadow-green-500/50' : 'bg-yellow-500 shadow-yellow-500/40'}`} />
          <span>Backend: {backendStatus?.tauri ? 'Tauri' : 'Preview'}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">AI: {backendStatus?.aiEngine ?? 'checking'}</p>
        <p className="text-[10px] text-slate-600 truncate mt-0.5">{backendStatus?.workspace || 'No workspace'}</p>
      </div>
    </aside>
  );
}
