'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { Button } from '@/app/components/common/Button';
import { TabBar } from '@/app/components/editor/TabBar';
import { DEFAULT_EDITOR_CODE } from '@/app/lib/constants';
import { formatCode, writeFile, runBuild, exportProject, listenToExportLogs } from '@/app/lib/backend';

import { useApp } from '@/app/providers';
import { getLanguageFromPath } from '@/app/lib/utils';
import { Icons } from '@/app/lib/icons';
import type { BuildResponse } from '@/app/lib/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-800 flex items-center justify-center font-mono text-sm text-slate-500">Loading Topptic Editor...</div>
});

const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.DiffEditor), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-800 flex items-center justify-center font-mono text-sm text-slate-500">Loading Topptic Diff Preview...</div>
});

export function EditorPanel() {
  const { 
    selectedFilePath, 
    fileContent, 
    setFileContent, 
    saveCurrentFile, 
    selectedProjectId, 
    projects,
    getLiveContent,
    setLiveContent,
    pendingDiff,
    acceptPendingDiff,
    rejectPendingDiff,
    openFiles,
    dirtyFiles,
    closeFile,
    setSelectedFilePath
  } = useApp();
  const [status, setStatus] = useState('Ready');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildState, setBuildState] = useState<'idle' | 'compiling' | 'healing' | 'success' | 'error'>('idle');

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPlatform, setExportPlatform] = useState('windows');
  const [isExporting, setIsExporting] = useState(false);
  const [exportLogs, setExportLogs] = useState<string[]>([]);
  const [exportResult, setExportResult] = useState<{ success: boolean; message: string; path?: string } | null>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isDirty = selectedFilePath ? !!dirtyFiles[selectedFilePath] : false;

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isLinux = navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
      if (isMac) setExportPlatform('mac');
      else if (isLinux) setExportPlatform('linux');
      else setExportPlatform('windows');
    }
  }, []);

  const handleFormat = async () => {
    if (!selectedFilePath) return;
    setStatus('Formatting...');
    try {
      const currentVal = getLiveContent();
      const formatted = await formatCode(selectedFilePath, currentVal);
      setFileContent(formatted);
      setLiveContent(formatted);
      setStatus('Formatted');
    } catch {
      setStatus('Error formatting');
    }
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
    
    await handleSave();

    setIsBuilding(true);
    setBuildState('compiling');
    setBuildLogs([`[${new Date().toLocaleTimeString()}] Starting build for ${selectedProject.name}...`, 'Compiling...']);
    
    try {
      const response = await runBuild({
        projectPath: selectedProject.path || '.',
        sourcePath: selectedFilePath,
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
      }
    } catch (error) {
      setBuildState('error');
      setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] System Error: ${String(error)}`]);
    } finally {
      setIsBuilding(false);
      if (buildState === 'success') {
          setTimeout(() => setBuildState('idle'), 5000);
      }
    }
  };

  const handleExport = async () => {
    if (!selectedProjectId || !selectedProject) return;
    setIsExporting(true);
    setExportLogs([`[${new Date().toLocaleTimeString()}] Preparing export for ${exportPlatform}...`]);
    setExportResult(null);

    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listenToExportLogs((log) => {
        setExportLogs(prev => [...prev, log]);
      });

      const response = await exportProject({
        projectPath: selectedProject.path || '.',
        targetOs: exportPlatform
      });

      setExportResult({
        success: response.success,
        message: response.message,
        path: response.outputPath
      });
      if (response.success) {
        setExportLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export completed successfully! Saved to: ${response.outputPath}`]);
      } else {
        setExportLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Export failed: ${response.message}`]);
      }
    } catch (error) {
      setExportResult({
        success: false,
        message: String(error)
      });
      setExportLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] System Error: ${String(error)}`]);
    } finally {
      setIsExporting(false);
      if (unlisten) unlisten();
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
      <TabBar 
        tabs={openFiles.map(path => ({
          id: path,
          name: path.split('/').pop() || path.split('\\').pop() || '',
          isDirty: !!dirtyFiles[path]
        }))} 
        activeTabId={selectedFilePath || undefined}
        onSelectTab={(path) => setSelectedFilePath(path)}
        onCloseTab={(path) => closeFile(path)}
      />
      <div className="flex items-center justify-between border-b border-slate-700/30 bg-slate-900/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Icons.FileText className="w-4 h-4 text-blue-400/70" />
          <span className="text-xs text-slate-400 font-mono">{selectedFilePath}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">{status}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleFormat} disabled={!!pendingDiff}>
              Format
            </Button>
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={!!pendingDiff}>
              Save
            </Button>
            <Button size="sm" onClick={handleBuild} disabled={isBuilding || !!pendingDiff} className="flex items-center gap-2">
               {isBuilding ? (
                 <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
               ) : (
                 <Icons.Zap className="w-3 h-3" />
               )}
               Build
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowExportModal(true)} 
              disabled={!!pendingDiff}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 border-0"
            >
               <Icons.Download className="w-3 h-3" />
               Export App
            </Button>
          </div>
        </div>
      </div>

      {pendingDiff && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Icons.Brain className="w-4 h-4 text-emerald-400 animate-bounce" />
                Safe AI Apply Review
              </h4>
              <p className="text-xs text-slate-400">Comparing original code (left) with AI suggested changes (right). Verify modifications before applying.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={rejectPendingDiff} 
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700 hover:border-slate-600 font-semibold"
            >
              Reject
            </Button>
            <Button 
              onClick={acceptPendingDiff} 
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 font-semibold"
            >
              Accept & Apply
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 relative">
          {pendingDiff ? (
            <MonacoDiffEditor
              original={pendingDiff.original}
              modified={pendingDiff.modified}
              language={getLanguageFromPath(selectedFilePath)}
              theme="vs-dark"
              options={{
                readOnly: true,
                originalEditable: false,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                automaticLayout: true,
                padding: { top: 16 },
                lineNumbersMinChars: 3,
                folding: true,
                renderSideBySide: true,
              }}
            />
          ) : (
            <MonacoEditor
              value={fileContent}
              language={getLanguageFromPath(selectedFilePath)}
              theme="vs-dark"
              onChange={(value) => {
                const val = value ?? '';
                setLiveContent(val);
                const nextDirty = val !== fileContent;
                if (nextDirty !== isDirty) {
                  setIsDirty(nextDirty);
                }
              }}
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
          )}
        </div>

        {/* Existing Build Tracker */}
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

        {/* Export Modal */}
        {showExportModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icons.Download className="w-5 h-5 text-purple-400" />
                    Export to Native Binary
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">Compile your project into a standalone executable.</p>
                </div>
                <button 
                  onClick={() => !isExporting && setShowExportModal(false)}
                  disabled={isExporting}
                  className="text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                {!isExporting && !exportResult && (
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Select Platform</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['windows', 'mac', 'linux'].map(os => (
                        <button
                          key={os}
                          onClick={() => setExportPlatform(os)}
                          className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                            exportPlatform === os 
                              ? 'bg-purple-500/10 border-purple-500/50 text-purple-300' 
                              : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 text-slate-400'
                          }`}
                        >
                          {os === 'windows' && <Icons.Monitor className="w-6 h-6" />}
                          {os === 'mac' && <Icons.Monitor className="w-6 h-6" />}
                          {os === 'linux' && <Icons.Terminal className="w-6 h-6" />}
                          <span className="text-xs font-semibold capitalize">{os}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(isExporting || exportResult || exportLogs.length > 0) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Build Output</span>
                      {isExporting && <div className="text-xs text-purple-400 animate-pulse">Compiling release build...</div>}
                      {exportResult?.success && <div className="text-xs text-green-400">Export Complete</div>}
                      {exportResult && !exportResult.success && <div className="text-xs text-red-400">Export Failed</div>}
                    </div>
                    <div className="bg-slate-950 rounded-xl p-4 h-48 overflow-y-auto border border-slate-800 font-mono text-[11px] leading-relaxed space-y-1 custom-scrollbar">
                      {exportLogs.map((log, i) => (
                        <div key={i} className={`${
                          log.includes('successfully') || log.includes('Success') ? 'text-green-400' :
                          log.includes('failed') || log.includes('Error') || log.includes('STDERR') ? 'text-red-400' :
                          'text-slate-400'
                        }`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                {!isExporting && (
                  <Button variant="ghost" onClick={() => setShowExportModal(false)}>
                    {exportResult ? 'Close' : 'Cancel'}
                  </Button>
                )}
                {!exportResult && (
                  <Button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-lg"
                  >
                    {isExporting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Exporting...
                      </>
                    ) : (
                      'Start Export'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}