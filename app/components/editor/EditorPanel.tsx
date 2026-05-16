'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { TabBar } from '@/app/components/editor/TabBar';
import { DEFAULT_EDITOR_CODE } from '@/app/lib/constants';
import { formatCode, writeFile, runBuild } from '@/app/lib/backend';

import { useApp } from '@/app/providers';
import { getLanguageFromPath } from '@/app/lib/utils';
import { Icons } from '@/app/lib/icons';
import type { BuildResponse } from '@/app/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-800 flex items-center justify-center font-mono text-sm text-slate-500">Loading Topptic Editor...</div>
});

export function EditorPanel() {
  const { selectedFilePath, fileContent, setFileContent, saveCurrentFile, selectedProjectId, projects } = useApp();
  const [status, setStatus] = useState('Ready');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildState, setBuildState] = useState<'idle' | 'compiling' | 'healing' | 'success' | 'error'>('idle');

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleFormat = async () => {
    if (!selectedFilePath) return;
    setStatus('Formatting...');
    const formatted = await formatCode(selectedFilePath, fileContent);
    setFileContent(formatted);
    setStatus('Formatted');
  };

  const handleSave = async () => {
    if (!selectedFilePath) return;
    setStatus('Saving...');
    try {
      await saveCurrentFile();
      setStatus('Saved');
    } catch {
      setStatus('Error saving file');
    }
  };

  const handleBuild = async () => {
    if (!selectedProjectId || !selectedProject || !selectedFilePath) return;
    
    // Save current file before building
    await handleSave();

    setIsBuilding(true);
    setBuildState('compiling');
    setBuildLogs([`[${new Date().toLocaleTimeString()}] Starting build for ${selectedProject.name}...`, 'Compiling...']);
    
    try {
      const response = await runBuild({
        projectPath: selectedProject.path || '.',
        sourcePath: selectedFilePath, // pass sourcePath to trigger healing if needed
        maxRetries: 3
      });

      if (response.success) {
        setBuildState('success');
        setBuildLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Success: Native App Built.`,
          ...(response.stdout ? [`STDOUT: ${response.stdout}`] : [])
        ]);
      } else {
        setBuildState('error');
        setBuildLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Build failed after ${response.attempts} attempts.`,
          ...(response.stderr ? [`STDERR: ${response.stderr}`] : [])
        ]);
      }

      if (response.healed) {
         setBuildLogs(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] Error Detected - Triggered AI Healing...`,
          `AI successfully healed the code!`
        ]);
        // If healed, we should ideally fetch the latest content to update the editor.
        // The read logic in providers.tsx handles refreshing if selectedFilePath changes,
        // but here we might just need to reload it.
        // For now, rely on user to reopen or we can trigger a re-read.
      }
    } catch (error) {
      setBuildState('error');
      setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] System Error: ${String(error)}`]);
    } finally {
      setIsBuilding(false);
      // Auto-hide after 5s if successful
      if (buildState === 'success') {
          setTimeout(() => setBuildState('idle'), 5000);
      }
    }
  };

  if (!selectedFilePath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950/20">
        <div className="text-center">
          <Icons.FileText className="w-16 h-16 text-slate-800 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700">Select a file to edit</h2>
          <p className="text-slate-600 mt-2">Choose a file from the explorer on the left</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <TabBar tabs={[{ id: '1', name: selectedFilePath.split('/').pop() || '', isDirty: false }]} activeTabId="1" />
      <div className="flex items-center justify-between border-b border-slate-700/30 bg-slate-900/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Icons.FileText className="w-4 h-4 text-blue-400/70" />
          <span className="text-xs text-slate-400 font-mono">{selectedFilePath}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">{status}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleFormat}>
              Format
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" onClick={handleBuild} disabled={isBuilding} className="flex items-center gap-2">
               {isBuilding ? (
                 <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 <Icons.Zap className="w-3 h-3" />
               )}
               Build
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 relative">
          <MonacoEditor
            value={fileContent}
            language={getLanguageFromPath(selectedFilePath)}
            theme="vs-dark"
            onChange={(value) => setFileContent(value ?? '')}
            onMount={(editor, monaco) => {
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                void handleSave();
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              automaticLayout: true,
              padding: { top: 16 },
              lineNumbersMinChars: 3,
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
            }}
          />
        </div>

        {buildState !== 'idle' && (
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-slate-950/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
             <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                   <Icons.Terminal className="w-4 h-4 text-slate-400" />
                   <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Live Tracker</span>
                   <div className="ml-2 flex items-center gap-2">
                     {buildState === 'compiling' && <span className="text-blue-400 text-xs animate-pulse">Compiling...</span>}
                     {buildState === 'healing' && <span className="text-yellow-400 text-xs animate-pulse">Error Detected - Triggering AI Healing...</span>}
                     {buildState === 'success' && <span className="text-green-400 text-xs">Success: Native App Built</span>}
                     {buildState === 'error' && <span className="text-red-400 text-xs">Build Failed</span>}
                   </div>
                </div>
                <button onClick={() => setBuildState('idle')} className="text-slate-500 hover:text-slate-300">
                  <Icons.X className="w-4 h-4" />
                </button>
             </div>
             <div className="p-4 h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-400 space-y-1 custom-scrollbar">
                {buildLogs.map((log, i) => (
                  <div key={i} className={`${
                    log.includes('Success') ? 'text-green-400' :
                    log.includes('Error') || log.includes('failed') || log.includes('STDERR') ? 'text-red-400' :
                    log.includes('AI Healing') ? 'text-yellow-400' :
                    'text-slate-300'
                  }`}>
                    {log}
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
