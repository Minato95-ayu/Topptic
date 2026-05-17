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
    </div>
  );
}
