'use client';

import { useState } from 'react';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { Badge } from '@/app/components/common/Badge';
import { runBuild } from '@/app/lib/backend';
import { useApp } from '@/app/providers';
import type { BuildResponse } from '@/app/lib/types';

export function BuildPanel() {
  const { selectedProjectId, projects, setPendingAutoFix } = useApp();
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastBuild, setLastBuild] = useState<BuildResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleBuild = async () => {
    if (!selectedProjectId || !selectedProject) return;

    setIsBuilding(true);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting build for ${selectedProject.name}...`]);
    
    try {
      const response = await runBuild({
        projectPath: selectedProject.path || '.',
        maxRetries: 3
      });

      setLastBuild(response);
      setLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Build ${response.success ? 'succeeded' : 'failed'} in ${response.attempts} attempts.`,
        ...(response.stdout ? [`STDOUT: ${response.stdout}`] : []),
        ...(response.stderr ? [`STDERR: ${response.stderr}`] : [])
      ]);
    } catch (error) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${String(error)}`]);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Icons.Zap className="w-6 h-6 text-blue-500" />
            Build Orchestrator
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Project: <span className="text-blue-400 font-medium">{selectedProject?.name || 'No project selected'}</span>
          </p>
        </div>
        <Button 
          onClick={handleBuild} 
          disabled={isBuilding || !selectedProjectId}
          className="flex items-center gap-2"
        >
          {isBuilding ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Icons.Zap className="w-4 h-4" />
          )}
          {isBuilding ? 'Building...' : 'Start Build'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-light p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Status</p>
          <div className="flex items-center gap-2">
            {lastBuild ? (
              lastBuild.success ? (
                <Badge variant="success">Success</Badge>
              ) : (
                <Badge variant="error">Failed</Badge>
              )
            ) : (
              <span className="text-slate-400">No recent builds</span>
            )}
            {lastBuild?.healed && <Badge variant="info">Healed by AI</Badge>}
          </div>
        </div>
        <div className="glass-light p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Attempts</p>
          <p className="text-xl font-bold text-slate-200">{lastBuild?.attempts || 0}</p>
        </div>
        <div className="glass-light p-4 rounded-xl">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Last Run</p>
          <p className="text-sm font-medium text-slate-300">
            {lastBuild ? new Date().toLocaleTimeString() : 'Never'}
          </p>
        </div>
      </div>

      {/* Glassmorphic Self-Healing Trigger Banner */}
      {lastBuild && !lastBuild.success && lastBuild.stderr && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-400 border border-red-500/20">
              <Icons.ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">Build Failure Detected</h3>
              <p className="text-xs text-slate-400 mt-1">Topptic offline AI can analyze this error and write a correction card for you.</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setPendingAutoFix({
                stderr: lastBuild.stderr || 'Unknown compile failure.',
                filePath: selectedProject?.path || '.'
              });
            }}
            className="w-full md:w-auto text-xs px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/10 transition-all font-semibold rounded-lg border border-red-500/20"
          >
            <Icons.Brain className="w-4 h-4 animate-bounce" /> Ask AI to Auto-Fix
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 glass-light rounded-xl overflow-hidden border border-slate-700/50">
        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase">Build Logs</span>
          <button 
            onClick={() => setLogs([])}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear Logs
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 custom-scrollbar bg-black/20">
          {logs.length === 0 ? (
            <p className="text-slate-600 italic">Logs will appear here when you start a build...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`whitespace-pre-wrap ${
                log.includes('failed') || log.includes('Error') ? 'text-red-400' : 
                log.includes('succeeded') ? 'text-green-400' : 
                log.includes('STDOUT') ? 'text-slate-400' : 
                log.includes('STDERR') ? 'text-yellow-400' : 'text-slate-300'
              }`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
