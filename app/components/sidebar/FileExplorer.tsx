'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from '@/app/lib/icons';
import { listFiles, writeFile, createDirectory, deleteFileOrFolder, renameFileOrFolder, revealInExplorer } from '@/app/lib/backend';
import { useApp } from '@/app/providers';
import type { FileEntry } from '@/app/lib/types';

interface FileExplorerProps {
  onFileSelect?: (path: string) => void;
  projectPath?: string;
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

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'html':
    case 'htm':
      return (
        <svg className="w-3.5 h-3.5 text-orange-500 fill-current animate-in zoom-in duration-300" viewBox="0 0 24 24">
          <path d="M12 2L2 5l1.8 13.5L12 22l6.2-3.5L20 5z M17 9H9.3l.3 2H17l-.5 4.5l-4.5 1.5l-4.5-1.5l-.2-1.5h2l.1.7l2.6.9l2.6-.9l.2-2.2H7.5l-.5-4.5h10.5z" />
        </svg>
      );
    case 'css':
      return (
        <svg className="w-3.5 h-3.5 text-blue-400 fill-current animate-in zoom-in duration-300" viewBox="0 0 24 24">
          <path d="M12 2L2 22h20L12 2zm0 3.6L18.4 18H5.6L12 5.6z" />
        </svg>
      );
    case 'js':
      return (
        <div className="w-3.5 h-3.5 bg-yellow-500 text-slate-950 font-black flex items-center justify-center rounded-[3px] text-[8px] font-mono leading-none select-none animate-in zoom-in duration-300">
          JS
        </div>
      );
    case 'ts':
      return (
        <div className="w-3.5 h-3.5 bg-blue-500 text-white font-black flex items-center justify-center rounded-[3px] text-[8px] font-mono leading-none select-none animate-in zoom-in duration-300">
          TS
        </div>
      );
    case 'tsx':
      return (
        <div className="w-3.5 h-3.5 bg-sky-500 text-slate-950 font-black flex items-center justify-center rounded-[3px] text-[8px] font-mono leading-none select-none animate-in zoom-in duration-300">
          TSX
        </div>
      );
    case 'json':
      return (
        <div className="w-3.5 h-3.5 text-emerald-400 font-extrabold flex items-center justify-center text-[10px] font-mono leading-none select-none animate-in zoom-in duration-300">
          {"{}"}
        </div>
      );
    case 'md':
      return (
        <svg className="w-3.5 h-3.5 text-cyan-400 animate-in zoom-in duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9v6l3-3 3 3V9" />
        </svg>
      );
    default:
      return <Icons.FileText className="w-3.5 h-3.5 text-slate-400" />;
  }
};

export function FileExplorer({ onFileSelect, projectPath }: FileExplorerProps) {
  const [loadedDirs, setLoadedDirs] = useState<Record<string, FileEntry[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Determine the dynamic root subdirectory of this specific project inside Topptic's workspace
  const rootDir = projectPath ? projectPath.split(/[/\\]/).pop() || '.' : '.';

  // File and Folder Creation states
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newValueName, setNewValueName] = useState('');
  
  const { selectedFilePath } = useApp();

  // Context Menu states
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FlattenedNode | null } | null>(null);
  const [renamingNode, setRenamingNode] = useState<FlattenedNode | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FlattenedNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValueName.trim()) return;
    try {
      const relativePath = rootDir === '.' ? newValueName.trim() : `${rootDir}/${newValueName.trim()}`;
      await writeFile({ path: relativePath, content: '' });
      setNewValueName('');
      setShowNewFileInput(false);
      const data = await listFiles(rootDir);
      setLoadedDirs((prev) => ({ ...prev, [rootDir]: data }));
    } catch (err) {
      console.error('Failed to create file:', err);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValueName.trim()) return;
    try {
      const relativePath = rootDir === '.' ? newValueName.trim() : `${rootDir}/${newValueName.trim()}`;
      await createDirectory(relativePath);
      setNewValueName('');
      setShowNewFolderInput(false);
      const data = await listFiles(rootDir);
      setLoadedDirs((prev) => ({ ...prev, [rootDir]: data }));
    } catch (err) {
      console.error('Failed to create directory:', err);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingNode || !renameValue.trim() || renameValue === renamingNode.name) {
      setRenamingNode(null);
      return;
    }
    try {
      await renameFileOrFolder(renamingNode.path, renameValue.trim());
      setRenamingNode(null);
      // Refresh tree
      const data = await listFiles(rootDir);
      setLoadedDirs((prev) => ({ ...prev, [rootDir]: data }));
    } catch (err) {
      console.error('Failed to rename:', err);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      await deleteFileOrFolder(path);
      const data = await listFiles(rootDir);
      setLoadedDirs((prev) => ({ ...prev, [rootDir]: data }));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleReveal = async (path: string) => {
    try {
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

  // Scroll and layout properties for absolute virtual windowing
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const rowHeight = 32; // Row spacing in pixels matching the SaaS dark styling

  // 1. Scan and register the active project directory on mount and when selected project shifts
  useEffect(() => {
    const fetchRoot = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listFiles(rootDir);
        setLoadedDirs({ [rootDir]: data });
      } catch (err) {
        setError('Failed to scan workspace root');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchRoot();
  }, [rootDir]);

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

    processDir(rootDir, 0);
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
    <div className="py-1 flex flex-col h-full overflow-hidden select-none">
      {/* Collapsible Section Header (VS Code explorer style) */}
      <div className="px-4 py-1.5 flex items-center justify-between group select-none hover:bg-slate-900/10 transition-colors border-t border-slate-800/30">
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 tracking-widest uppercase transition-colors text-left"
        >
          <Icons.ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <span>Workspace Explorer</span>
        </button>
        
        {/* Actions - only visible on group-hover, exactly like VS Code! */}
        <div className="flex items-center gap-1 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={() => {
              if (!expanded) setExpanded(true);
              setShowNewFolderInput(false);
              setShowNewFileInput(prev => !prev);
              setNewValueName('');
            }}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="New File"
          >
            <svg className="w-3.5 h-3.5 text-slate-400 hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (!expanded) setExpanded(true);
              setShowNewFileInput(false);
              setShowNewFolderInput(prev => !prev);
              setNewValueName('');
            }}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="New Folder"
          >
            <svg className="w-3.5 h-3.5 text-slate-400 hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1H4a2 2 0 01-2-2V6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v2m-6 9h6" />
            </svg>
          </button>
          <button 
            onClick={async () => {
              try {
                const data = await listFiles(rootDir);
                setLoadedDirs((prev) => ({ ...prev, [rootDir]: data }));
              } catch (err) {
                console.error('Refresh failed:', err);
              }
            }}
            className="p-1 hover:bg-slate-800 rounded"
            title="Refresh Workspace"
          >
            <Icons.RefreshCw className="w-3 h-3 text-slate-400 hover:text-slate-200" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {(showNewFileInput || showNewFolderInput) && (
            <form 
              onSubmit={showNewFileInput ? handleCreateFile : handleCreateFolder}
              className="mx-3 my-1 px-2 py-1.5 border border-slate-800 bg-slate-950/60 backdrop-blur rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-200"
            >
              {showNewFileInput ? (
                <Icons.FileText className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Icons.Folder className="w-3.5 h-3.5 text-yellow-500" />
              )}
              <input
                autoFocus
                type="text"
                placeholder={showNewFileInput ? "New file..." : "New folder..."}
                value={newValueName}
                onChange={(e) => setNewValueName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowNewFileInput(false);
                    setShowNewFolderInput(false);
                    setNewValueName('');
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-700/30 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button 
                type="button" 
                onClick={() => {
                  setShowNewFileInput(false);
                  setShowNewFolderInput(false);
                  setNewValueName('');
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <Icons.X className="w-3 h-3" />
              </button>
            </form>
          )}

          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="mt-1 flex-1 overflow-y-auto custom-scrollbar relative"
            style={{ minHeight: '200px' }}
          >
            {visibleNodes.length === 0 && (
              <div className="px-4 py-8 text-center flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <div className="p-3 bg-slate-900/50 rounded-full border border-slate-800/60 text-slate-600 shadow-inner">
                  <Icons.Folder className="w-8 h-8 opacity-40 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-300 font-semibold">Workspace is empty</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] leading-relaxed">
                    Create a file or folder inside this project to start writing code.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[160px] mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setShowNewFileInput(true);
                      setNewValueName('');
                    }}
                    className="w-full py-1.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 hover:text-blue-200 border border-blue-500/20 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-900/20 active:scale-[0.98]"
                  >
                    <Icons.Plus className="w-3 h-3" />
                    <span>Create File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewFileInput(false);
                      setShowNewFolderInput(true);
                      setNewValueName('');
                    }}
                    className="w-full py-1.5 px-3 bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 hover:text-slate-200 border border-slate-700/30 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Icons.Folder className="w-3 h-3 text-slate-500" />
                    <span>Create Folder</span>
                  </button>
                </div>
              </div>
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
                      onContextMenu={(e) => handleContextMenu(e, node)}
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
                          {getFileIcon(node.name)}
                        </div>
                      )}
                      {renamingNode?.path === node.path ? (
                        <form 
                          onSubmit={handleRename}
                          className="flex-1 flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => setRenamingNode(null)}
                            onKeyDown={(e) => e.key === 'Escape' && setRenamingNode(null)}
                            className="flex-1 bg-slate-950 border border-blue-500 text-slate-200 text-xs font-mono px-1 py-0.5 outline-none rounded"
                          />
                        </form>
                      ) : (
                        <span className="truncate flex-1 font-mono text-xs">{node.name}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Custom Context Menu Overlay - VS Code Clone using Portal */}
      {contextMenu && contextMenu.node && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] w-72 bg-[#252526] border border-[#454545] rounded shadow-2xl py-1 text-[#cccccc] font-sans text-[13px] flex flex-col overflow-y-auto"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 290),
            maxHeight: '80vh',
            ...(contextMenu.y > window.innerHeight / 2
              ? { bottom: window.innerHeight - contextMenu.y }
              : { top: contextMenu.y }
            )
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Group 1: Create */}
          {contextMenu.node.is_dir && (
            <>
              <button
                onClick={() => {
                  setShowNewFileInput(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
              >
                <span>New File...</span>
              </button>
              <button
                onClick={() => {
                  setShowNewFolderInput(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
              >
                <span>New Folder...</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              void handleReveal(contextMenu.node!.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Reveal in File Explorer</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Shift+Alt+R</span>
          </button>
          
          {contextMenu.node.is_dir && (
            <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
              <span>Open in Integrated Terminal</span>
            </button>
          )}

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          {/* Group 2: AI & Search */}
          {contextMenu.node.is_dir && (
            <>
              <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
                <span>Find in Folder...</span>
                <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Shift+Alt+F</span>
              </button>
              <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
                <span>Add Folder to Chat</span>
              </button>
            </>
          )}

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          {/* Group 3: Clipboard */}
          <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
            <span>Cut</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Ctrl+X</span>
          </button>
          <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
            <span>Copy</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Ctrl+C</span>
          </button>
          <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
            <span className="text-[#858585]">Paste</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Ctrl+V</span>
          </button>

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          {/* Group 4: Paths */}
          <button
            onClick={() => {
              void handleCopyPath(contextMenu.node!.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Copy Path</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Shift+Alt+C</span>
          </button>
          <button
            onClick={() => {
              void navigator.clipboard.writeText(contextMenu.node!.path.split(/[\\/]/).pop() || '');
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Copy Relative Path</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Ctrl+Shift+C</span>
          </button>

          <div className="h-[1px] bg-[#454545] my-1 mx-2" />

          {/* Group 5: Modify */}
          <button
            onClick={() => {
              setRenamingNode(contextMenu.node);
              setRenameValue(contextMenu.node?.name || '');
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Rename...</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">F2</span>
          </button>
          <button
            onClick={() => {
              void handleDelete(contextMenu.node!.path);
              setContextMenu(null);
            }}
            className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group"
          >
            <span>Delete</span>
            <span className="text-[11px] text-[#858585] group-hover:text-slate-300 tracking-wider">Del</span>
          </button>

          {contextMenu.node.is_dir && (
            <>
              <div className="h-[1px] bg-[#454545] my-1 mx-2" />
              <button className="w-full text-left px-6 py-1 hover:bg-[#04395e] hover:text-white transition-colors flex items-center justify-between group">
                <span>Add folder to Topptic Context</span>
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
