'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { listProjects } from '@/app/lib/backend';
import { Icons } from '@/app/lib/icons';
import type { Project } from '@/app/lib/types';

interface ProjectsListProps {
  onSelectProject?: (id: string) => void;
}

export function ProjectsList({ onSelectProject }: ProjectsListProps) {
  const [expanded, setExpanded] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    void listProjects().then(setProjects);
  }, []);

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 hover:text-slate-200 mb-2"
      >
        <span>Projects</span>
        <Icons.ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-2">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onSelectProject?.(project.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-300 transition-colors flex items-center gap-2"
            >
              <Icons.Folder className="w-4 h-4" />
              <span className="truncate">{project.name}</span>
              <span className="ml-auto text-xs text-slate-500 capitalize">{project.language}</span>
            </button>
          ))}
          <Button variant="secondary" size="sm" className="w-full flex items-center justify-center gap-2 mt-2">
            <Icons.Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>
      )}
    </div>
  );
}
