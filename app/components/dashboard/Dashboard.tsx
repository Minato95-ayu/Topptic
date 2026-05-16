'use client';

import { useState } from 'react';
import { useApp } from '@/app/providers';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { createProject } from '@/app/lib/backend';
import { Badge } from '@/app/components/common/Badge';

export function Dashboard() {
  const { projects, refreshProjects, setSelectedProjectId } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLanguage, setNewProjectLanguage] = useState('rust');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      await createProject({
        name: newProjectName,
        path: `./workspace/${newProjectName.toLowerCase().replace(/\s+/g, '-')}`,
        language: newProjectLanguage
      });
      await refreshProjects();
      setIsModalOpen(false);
      setNewProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 overflow-y-auto bg-slate-950 text-slate-200">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Projects Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Manage and monitor your local Topptic projects.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Icons.Plus className="w-5 h-5" />
          Create New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => setSelectedProjectId(project.id)}
            className="group relative flex flex-col p-6 rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/50 hover:border-blue-500/50 transition-all cursor-pointer shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-slate-800 text-blue-400 group-hover:text-blue-300 group-hover:scale-110 transition-transform">
                <Icons.Folder className="w-6 h-6" />
              </div>
              {project.isActive && <Badge variant="success">Active</Badge>}
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-1 group-hover:text-white transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">
              {project.description || `A ${project.language} project at ${project.path}`}
            </p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-slate-400 capitalize">{project.language}</span>
              </div>
              <span className="text-xs text-slate-500">
                {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-500 min-h-[300px] border-2 border-dashed border-slate-800 rounded-2xl">
          <Icons.Folder className="w-16 h-16 mb-4 text-slate-700" />
          <p className="text-lg">No projects found</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-slate-100 mb-6">Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    placeholder="e.g. My Awesome App"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Language Stack</label>
                  <select
                    value={newProjectLanguage}
                    onChange={(e) => setNewProjectLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="rust">Rust (Tauri / CLI)</option>
                    <option value="typescript">TypeScript (Next.js)</option>
                    <option value="python">Python (FastAPI / CLI)</option>
                  </select>
                </div>
              </div>
              <div className="mt-8 flex items-center justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
