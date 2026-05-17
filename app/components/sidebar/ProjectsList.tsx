'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { listProjects } from '@/app/lib/backend';
import { Icons } from '@/app/lib/icons';
import type { Project } from '@/app/lib/types';

interface ProjectsListProps {
  projects: Project[];
  selectedProjectId?: string | null;
  onSelectProject?: (id: string) => void;
  onCreateProjectClick?: () => void;
}

export function ProjectsList({ 
  projects, 
  selectedProjectId,
  onSelectProject, 
  onCreateProjectClick 
}: ProjectsListProps) {
  const [expanded, setExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; project: Project | null } | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, project });
  };

  const handleReveal = async (path: string) => {
    try {
      const { revealInExplorer } = await import('@/app/lib/backend');
      await revealInExplorer(path);
    } catch (err) {
      console.error('Failed to reveal:', err);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  return (
    <div className="px-4 py-2">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 tracking-widest uppercase mb-2 transition-colors select-none text-left"
      >
        <Icons.ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
        <span>Projects</span>
      </button>

      {expanded && (
        <div className="space-y-2">
          {projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject?.(project.id)}
                onContextMenu={(e) => handleContextMenu(e, project)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 border-l-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 text-blue-100 font-medium'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                <Icons.Folder className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{project.name}</span>
                <span className={`ml-auto text-xs capitalize ${isSelected ? 'text-blue-300/80' : 'text-slate-500'}`}>
                  {project.language}
                </span>
              </button>
            );
          })}
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onCreateProjectClick}
            className="w-full flex items-center justify-center gap-2 mt-2"
          >
            <Icons.Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      )}

      {/* Custom Context Menu Overlay for Projects */}
      {contextMenu && contextMenu.project && contextMenu.project.path && (
        <div
          className="fixed z-[9999] w-56 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-[#cccccc] font-sans text-xs flex flex-col"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              void handleCopyPath(contextMenu.project!.path!);
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Copy Path</span>
            <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Shift+Alt+C</span>
          </button>

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          <button
            onClick={() => {
              void handleReveal(contextMenu.project!.path!);
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1.5 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Reveal in File Explorer</span>
            <span className="text-[10px] text-slate-500 group-hover:text-slate-300">Shift+Alt+R</span>
          </button>
        </div>
      )}
    </div>
  );
}
