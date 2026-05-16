'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from '@/app/lib/icons';
import { listFiles } from '@/app/lib/backend';
import { useApp } from '@/app/providers';
import type { FileEntry } from '@/app/lib/types';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
}

interface FlattenedNode {
  path: string;
  name: string;
  isDirectory: boolean;
  level: number;
}

// Enterprise-standard directories to completely shield the workspace explorer from
const IGNORED_DIRECTORIES = [
  'node_modules',
  'target',
  'dist',
  '.git',
  '.next',
  '.tauri',
  '.cargo',
  'build',
  'out',
  'tsconfig.tsbuildinfo',
  '.next-env.d.ts',
  'dev-server.err.log',
  'dev-server.out.log'
];

const shouldIgnore = (name: string) => {
  if (IGNORED_DIRECTORIES.includes(name)) return true;
  // Ignore standard compiler caches and hidden files, keeping standard configs like .gitignore or .env
  if (name.startsWith('.') && name !== '.env' && name !== '.gitignore') return true;
  return false;
};

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [loadedDirs, setLoadedDirs] = useState<Record<string, FileEntry[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { selectedFilePath } = useApp();

  // Scroll and layout properties for absolute virtual windowing
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const rowHeight = 32; // Row spacing in pixels matching the SaaS dark styling

  // 1. Scan and register the workspace root directory on mount
  useEffect(() => {
    const fetchRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listFiles('.');
        setLoadedDirs({ '.': data });
      } catch (err) {
        setError('Failed to scan workspace root');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchRoot();
  }, []);

  // 2. High-performance scroll tracking for virtual calculations
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    if (e.currentTarget.clientHeight !== containerHeight) {
      setContainerHeight(e.currentTarget.clientHeight);
    }
  };

  // 3. Lazy loaded collapsible directory expanding
  const toggleFolder = async (path: string) => {
    const isExpanded = expandedPaths[path];
    if (isExpanded) {
      setExpandedPaths((prev) => ({ ...prev, [path]: false }));
    } else {
      if (!loadedDirs[path]) {
        try {
          const subfiles = await listFiles(path);
          setLoadedDirs((prev) => ({ ...prev, [path]: subfiles }));
        } catch (err) {
          console.error(`Failed to load directory ${path}:`, err);
        }
      }
      setExpandedPaths((prev) => ({ ...prev, [path]: true }));
    }
  };

  // 4. Transform nested directory buffers into a single flat sorted visible tree
  const getVisibleNodes = (): FlattenedNode[] => {
    const list: FlattenedNode[] = [];

    const processDir = (dirPath: string, level: number) => {
      const entries = loadedDirs[dirPath] || [];
      
      // Sort nodes: folders first (alphabetical), then files (alphabetical)
      const sorted = [...entries].sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (shouldIgnore(entry.name)) continue;

        list.push({
          path: entry.path,
          name: entry.name,
          isDirectory: entry.isDirectory,
          level,
        });

        // Recursively insert loaded subfolder elements if active path is expanded
        if (entry.isDirectory && expandedPaths[entry.path]) {
          processDir(entry.path, level + 1);
        }
      }
    };

    processDir('.', 0);
    return list;
  };

  const visibleNodes = getVisibleNodes();
  const totalHeight = visibleNodes.length * rowHeight;

  // 5. Virtual view calculations (with 2 rows of top/bottom scroll cushion buffer)
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const endIndex = Math.min(
    visibleNodes.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + 2
  );

  const renderedItems = visibleNodes.slice(startIndex, endIndex);

  if (loading && Object.keys(loadedDirs).length === 0) {
    return (
      <div className="px-6 py-4 text-xs text-slate-500 animate-pulse flex items-center gap-2">
        <Icons.RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
        <span>Scanning workspace...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 text-xs text-red-500 flex items-center gap-2">
        <Icons.AlertCircle className="w-3 h-3" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="py-2 flex flex-col h-full overflow-hidden select-none">
      <div className="px-4 py-2 flex items-center justify-between group">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workspace Explorer</span>
        <button 
          onClick={async () => {
            // Re-trigger scanning on the root directory
            try {
              const data = await listFiles('.');
              setLoadedDirs((prev) => ({ ...prev, '.': data }));
            } catch (err) {
              console.error('Refresh failed:', err);
            }
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-800 rounded"
          title="Refresh Workspace"
        >
          <Icons.RefreshCw className="w-3 h-3 text-slate-400 hover:text-slate-200" />
        </button>
      </div>

      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="mt-1 flex-1 overflow-y-auto custom-scrollbar relative"
        style={{ minHeight: '200px' }}
      >
        {visibleNodes.length === 0 && (
          <div className="px-6 py-2 text-xs text-slate-600 italic">Workspace is empty</div>
        )}

        <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
          {renderedItems.map((node, index) => {
            const globalIndex = startIndex + index;
            const isSelected = selectedFilePath === node.path;
            const isExpanded = expandedPaths[node.path];

            return (
              <div
                key={node.path}
                style={{
                  position: 'absolute',
                  top: globalIndex * rowHeight,
                  left: 0,
                  right: 0,
                  height: rowHeight,
                }}
              >
                <button
                  onClick={() => {
                    if (node.isDirectory) {
                      void toggleFolder(node.path);
                    } else {
                      onFileSelect?.(node.path);
                    }
                  }}
                  style={{ paddingLeft: `${node.level * 16 + 12}px` }}
                  className={`w-full h-full flex items-center gap-2 px-3 py-1 text-sm transition-all group border-l-2 text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-100 font-medium'
                      : 'border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {node.isDirectory ? (
                    <div className="flex items-center gap-1.5">
                      <Icons.ChevronDown
                        className={`w-3.5 h-3.5 transition-transform text-slate-500 group-hover:text-slate-300 ${
                          isExpanded ? '' : '-rotate-90'
                        }`}
                      />
                      <Icons.Folder
                        className={`w-4 h-4 ${
                          isSelected ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400/70'
                        }`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 pl-5">
                      <Icons.FileText
                        className={`w-4 h-4 ${
                          isSelected ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                    </div>
                  )}
                  <span className="truncate flex-1 font-mono text-xs">{node.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
