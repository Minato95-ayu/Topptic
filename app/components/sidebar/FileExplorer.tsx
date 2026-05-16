'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/app/lib/icons';
import { listFiles } from '@/app/lib/backend';
import type { FileEntry } from '@/app/lib/types';

interface FileExplorerProps {
  currentPath?: string;
  onFileSelect?: (path: string) => void;
}

export function FileExplorer({ currentPath = '.', onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return <div className="px-6 py-4 text-xs text-slate-500 animate-pulse">Scanning workspace...</div>;
  }

  if (error) {
    return <div className="px-6 py-4 text-xs text-red-500">{error}</div>;
  }

  return (
    <div className="py-2">
      <div className="px-4 py-1 flex items-center justify-between group">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace</span>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Icons.Plus className="w-3 h-3 text-slate-500 hover:text-slate-300" />
        </button>
      </div>
      
      <div className="mt-1">
        {files.length === 0 && !loading && (
          <div className="px-6 py-2 text-xs text-slate-600 italic">No files found</div>
        )}
        
        {files.map((file) => (
          <button
            key={file.path}
            onClick={() => !file.isDirectory && onFileSelect?.(file.path)}
            className="w-full flex items-center gap-2 px-6 py-1.5 text-sm text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors group"
          >
            {file.isDirectory ? (
              <Icons.Folder className="w-4 h-4 text-blue-400/70" />
            ) : (
              <Icons.FileText className="w-4 h-4 text-slate-500 group-hover:text-blue-400/70" />
            )}
            <span className="truncate">{file.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
