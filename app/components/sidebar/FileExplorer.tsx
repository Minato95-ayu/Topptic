'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/app/lib/icons';
import { listFiles } from '@/app/lib/backend';
import { useApp } from '@/app/providers';
import type { FileEntry } from '@/app/lib/types';

interface FileExplorerProps {
  currentPath?: string;
  onFileSelect?: (path: string) => void;
}

export function FileExplorer({ currentPath = '.', onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedFilePath } = useApp();

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listFiles(currentPath);
        setFiles(data.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        }));
      } catch (err) {
        setError('Failed to load files');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchFiles();
  }, [currentPath]);

  if (loading && files.length === 0) {
    return <div className="px-6 py-4 text-xs text-slate-500 animate-pulse flex items-center gap-2"><Icons.RefreshCw className="w-3 h-3 animate-spin" /> Scanning workspace...</div>;
  }

  if (error) {
    return <div className="px-6 py-4 text-xs text-red-500 flex items-center gap-2"><Icons.AlertCircle className="w-3 h-3" /> {error}</div>;
  }

  return (
    <div className="py-2 flex flex-col h-full">
      <div className="px-4 py-2 flex items-center justify-between group">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Explorer</span>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded">
          <Icons.Plus className="w-3 h-3 text-slate-400 hover:text-slate-200" />
        </button>
      </div>
      
      <div className="mt-1 flex-1 overflow-y-auto custom-scrollbar">
        {files.length === 0 && !loading && (
          <div className="px-6 py-2 text-xs text-slate-600 italic">Workspace is empty</div>
        )}
        
        {files.map((file) => {
          const isSelected = selectedFilePath === file.path;
          return (
            <button
              key={file.path}
              onClick={() => !file.isDirectory && onFileSelect?.(file.path)}
              className={`w-full flex items-center gap-2 px-6 py-1.5 text-sm transition-all group border-l-2 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-500/10 text-blue-100' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              {file.isDirectory ? (
                <Icons.Folder className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400/70'}`} />
              ) : (
                <Icons.FileText className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              )}
              <span className="truncate">{file.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
