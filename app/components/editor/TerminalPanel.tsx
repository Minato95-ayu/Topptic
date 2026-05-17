'use client';

import { useState, useEffect, useRef } from 'react';
import { executeTerminalCommand, listenToTerminalOutput } from '@/app/lib/backend';
import { useApp } from '@/app/providers';
import { Icons } from '@/app/lib/icons';

interface TerminalLine {
  type: 'input' | 'stdout' | 'stderr' | 'system';
  text: string;
}

interface TerminalPanelProps {
  onClose?: () => void;
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const { selectedProjectId, projects } = useApp();
  const [logs, setLogs] = useState<TerminalLine[]>([
    { type: 'system', text: 'Topptic Terminal Booted. Type a command and press Enter.\n' }
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const activeProject = projects.find(p => p.id === selectedProjectId);
  const projectPath = activeProject?.path || '.';

  // 1. Auto-scroll terminal logs to bottom on update
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 2. Real-time dynamic socket output subscription
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    
    const bindLogs = async () => {
      try {
        unlisten = await listenToTerminalOutput((payload) => {
          if (payload.stdout) {
            setLogs((prev) => [...prev, { type: 'stdout', text: payload.stdout || '' }]);
          }
          if (payload.stderr) {
            setLogs((prev) => [...prev, { type: 'stderr', text: payload.stderr || '' }]);
          }
          if (payload.isExit) {
            setIsRunning(false);
            const code = payload.exitCode ?? 0;
            setLogs((prev) => [
              ...prev,
              { 
                type: 'system', 
                text: `[Process exited with code ${code}]\n` 
              }
            ]);
          }
        });
      } catch (err) {
        console.error('Failed to bind terminal logs:', err);
      }
    };

    void bindLogs();
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // 3. Command execution handler
  const handleExecute = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    if (trimmedInput.toLowerCase() === 'clear') {
      setLogs([]);
      setInput('');
      return;
    }

    // Register inside command history log
    setCommandHistory((prev) => [trimmedInput, ...prev.filter(h => h !== trimmedInput)]);
    setHistoryIndex(-1);

    // Render local input prompt first
    setLogs((prev) => [...prev, { type: 'input', text: `${trimmedInput}\n` }]);
    setIsRunning(true);
    setInput('');

    try {
      await executeTerminalCommand(trimmedInput, projectPath);
    } catch (err) {
      setLogs((prev) => [...prev, { type: 'stderr', text: `Terminal spawn error: ${String(err)}\n` }]);
      setIsRunning(false);
    }
  };

  // 4. Command history key listeners
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < commandHistory.length) {
          setHistoryIndex(nextIndex);
          setInput(commandHistory[nextIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const prevIndex = historyIndex - 1;
      if (prevIndex >= 0) {
        setHistoryIndex(prevIndex);
        setInput(commandHistory[prevIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  // Click panel focus to keep caret alive
  const handlePanelClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div 
      onClick={handlePanelClick}
      className="h-64 border-t border-slate-700/40 bg-slate-950/80 backdrop-blur-xl flex flex-col select-none relative animate-in slide-in-from-bottom duration-200"
    >
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/30">
        <div className="flex items-center gap-2">
          <Icons.Terminal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Embedded Terminal</span>
          <span className="text-[10px] font-mono text-slate-500 max-w-[200px] truncate">({projectPath})</span>
          <div className="ml-4 flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-full px-2.5 py-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest">{isRunning ? 'Running' : 'Idle'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLogs([]);
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Clear Console"
          >
            <Icons.RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Hide Terminal"
          >
            <Icons.X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Output Console Log Panel */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed text-slate-300 space-y-1 custom-scrollbar cursor-text select-text"
      >
        {logs.map((log, index) => (
          <div 
            key={index}
            className={`${
              log.type === 'input' ? 'text-blue-300 font-semibold flex gap-2' :
              log.type === 'stderr' ? 'text-red-400 font-medium' :
              log.type === 'system' ? 'text-yellow-500/80 italic font-medium' :
              'text-slate-300'
            }`}
          >
            {log.type === 'input' && <span className="text-blue-500/60 font-bold select-none">&gt;</span>}
            <pre className="whitespace-pre-wrap font-mono m-0 p-0">{log.text}</pre>
          </div>
        ))}
        {isRunning && (
          <div className="text-blue-400/50 text-[10px] animate-pulse flex items-center gap-1.5 py-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
            <span>Process executing background thread...</span>
          </div>
        )}
      </div>

      {/* Glowing Terminal Input Footer */}
      <div className="px-4 py-2 border-t border-slate-900 bg-slate-950/40 flex items-center gap-2 group-focus-within:border-blue-500/20">
        <span className="text-blue-400 font-bold text-xs select-none font-mono">
          {activeProject?.name?.toLowerCase().replace(/\s+/g, '-') || 'workspace'} $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder={isRunning ? "Please wait for command to exit..." : "Type command here (e.g. dir, cargo run, npm run)..."}
          className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 text-slate-200 font-mono text-xs placeholder-slate-600 focus:placeholder-slate-500 py-1"
        />
        {!isRunning && input.trim() && (
          <button
            type="button"
            onClick={handleExecute}
            className="text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 px-2.5 py-1 rounded-md transition-all shadow-lg shadow-blue-500/5 select-none"
          >
            Execute
          </button>
        )}
      </div>
    </div>
  );
}
