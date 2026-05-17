'use client';

import { useState } from 'react';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { writeFile, executeTerminalCommand } from '@/app/lib/backend';
import { useApp } from '@/app/providers';

export interface ActionPayload {
  tool: 'write_file' | 'execute_command';
  parameters: {
    path?: string;
    content?: string;
    command?: string;
    cwd?: string;
  };
  rationale: string;
}

interface ActionCardProps {
  payload: ActionPayload;
}

export function ActionCard({ payload }: ActionCardProps) {
  const { openFile, selectedFilePath } = useApp();
  const [status, setStatus] = useState<'idle' | 'executing' | 'success' | 'rejected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showCode, setShowCode] = useState(false);

  const { tool, parameters, rationale } = payload;

  const handleApprove = async () => {
    setStatus('executing');
    setErrorMessage('');
    try {
      if (tool === 'write_file') {
        const filePath = parameters.path;
        const content = parameters.content;

        if (!filePath || content === undefined) {
          throw new Error('Missing path or content parameters.');
        }

        // Call our safe, atomic local file writer
        await writeFile({ path: filePath, content });

        // Hot-reload Monaco if editing the currently active file buffer
        if (selectedFilePath === filePath) {
          await openFile(filePath);
        }
        setStatus('success');
      } else if (tool === 'execute_command') {
        const command = parameters.command;
        if (!command) {
          throw new Error('Missing command parameter.');
        }

        // Call our local process spawning terminal bridge
        const output = await executeTerminalCommand(command, parameters.cwd);
        
        if (output.toLowerCase().includes('failed') || output.toLowerCase().includes('error')) {
          setErrorMessage(output);
          setStatus('error');
        } else {
          setStatus('success');
        }
      } else {
        throw new Error(`Unsupported tool: ${tool}`);
      }
    } catch (error) {
      setErrorMessage(String(error));
      setStatus('error');
    }
  };

  const handleReject = () => {
    setStatus('rejected');
  };

  // UI styling based on execution state
  const getContainerClass = () => {
    const base = "rounded-xl border p-4 backdrop-blur-xl transition-all duration-300 shadow-xl my-4 text-xs select-none ";
    switch (status) {
      case 'executing':
        return base + "bg-yellow-500/5 border-yellow-500/20 shadow-yellow-500/5 animate-pulse";
      case 'success':
        return base + "bg-green-500/5 border-green-500/20 shadow-green-500/5";
      case 'rejected':
        return base + "bg-slate-900/40 border-slate-800 text-slate-500 shadow-none";
      case 'error':
        return base + "bg-red-500/5 border-red-500/20 shadow-red-500/5";
      default:
        return base + "bg-slate-950/80 border-slate-800/80 shadow-slate-950/20 hover:border-slate-700/50";
    }
  };

  return (
    <div className={getContainerClass()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
            status === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            status === 'executing' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
            status === 'rejected' ? 'bg-slate-800 border-slate-700 text-slate-500' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            {tool === 'write_file' ? (
              <Icons.FileText className="w-4 h-4" />
            ) : (
              <Icons.Monitor className="w-4 h-4" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[10px]">
              AI Proposing {tool === 'write_file' ? 'File Update' : 'Command execution'}
            </h4>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">
              {tool === 'write_file' ? parameters.path : parameters.command}
            </p>
          </div>
        </div>

        {/* State Badge */}
        <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
          status === 'success' ? 'bg-green-500/10 text-green-400' :
          status === 'rejected' ? 'bg-slate-800 text-slate-500' :
          status === 'executing' ? 'bg-yellow-500/10 text-yellow-400' :
          status === 'error' ? 'bg-red-500/10 text-red-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          {status}
        </span>
      </div>

      {/* Rationale */}
      <p className="text-slate-400 leading-relaxed bg-slate-950/20 border border-slate-900 rounded-lg p-2.5 my-2">
        {rationale}
      </p>

      {/* Code diff/view for write_file */}
      {tool === 'write_file' && parameters.content && (
        <div className="my-2 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-300 transition-colors text-[10px]"
          >
            <span>{showCode ? 'Hide Proposed Changes' : 'View Proposed Changes'}</span>
            <Icons.ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCode ? 'rotate-180' : ''}`} />
          </button>
          {showCode && (
            <pre className="p-3 text-[10px] font-mono overflow-x-auto text-slate-300 custom-scrollbar max-h-48 border-t border-slate-900">
              <code>{parameters.content}</code>
            </pre>
          )}
        </div>
      )}

      {/* Error Output Panel */}
      {status === 'error' && errorMessage && (
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 p-2.5 rounded-lg my-2 font-mono text-[9px] whitespace-pre-wrap max-h-24 overflow-y-auto">
          {errorMessage}
        </div>
      )}

      {/* Interactive Trigger Sandbox Buttons */}
      {status === 'idle' && (
        <div className="flex gap-2 justify-end mt-3 pt-2 border-t border-slate-900">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReject}
            className="text-[10px] px-3 py-1 text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:bg-slate-800"
          >
            Reject
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            className="text-[10px] px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1"
          >
            <Icons.Zap className="w-3.5 h-3.5" /> Approve Action
          </Button>
        </div>
      )}
    </div>
  );
}
