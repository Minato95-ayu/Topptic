'use client';

import { useState, useEffect, useRef } from 'react';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { Badge } from '@/app/components/common/Badge';
import { useApp } from '@/app/providers';

interface WebErrorLog {
  message: string;
  source: string;
  lineno: number;
  colno: number;
  errorStack: string;
  timestamp: string;
}

export function WebPreviewPanel() {
  const { selectedProjectId, projects, setPendingAutoFix, setShowChat } = useApp();
  const [port, setPort] = useState('3000');
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');
  const [iframeKey, setIframeKey] = useState(0);
  const [webErrors, setWebErrors] = useState<WebErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Monitor postMessage events from the preview iframe
  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Check if message is a Topptic Preview Error telemetry signal
      if (event.data && event.data.type === 'TOPPTIC_PREVIEW_ERROR') {
        const errorData = event.data as Omit<WebErrorLog, 'timestamp'>;
        
        // Push telemetry error log to state
        setWebErrors(prev => [
          {
            ...errorData,
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev
        ]);
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  const handleUpdateUrl = () => {
    setIsLoading(true);
    setPreviewUrl(`http://localhost:${port}`);
    setIframeKey(prev => prev + 1); // Force reload iframe
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const triggerSelfHealing = (err: WebErrorLog) => {
    // Format a high-fidelity visual self-healing prompt
    const formattedError = `[Browser Runtime Error Detected]
Error Message: ${err.message}
File Location: ${err.source} (Line ${err.lineno}, Col ${err.colno})
Stack Trace:
${err.errorStack || 'No stack trace available.'}`;

    // Extract relative filename for auto-healing if present
    let relativeFilePath = selectedProject?.path || '.';
    if (err.source && err.source.includes('localhost')) {
      try {
        // Try to parse the filename from URL
        const url = new URL(err.source);
        const pathname = url.pathname;
        if (pathname && pathname !== '/') {
          relativeFilePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        }
      } catch {}
    }

    setPendingAutoFix({
      stderr: formattedError,
      filePath: relativeFilePath
    });
    setShowChat(true);
  };

  const selfHealingCodeSnippet = `<!-- Copy & Paste this inside your public/index.html <head> tag to enable AI Self-Healing -->
<script>
  window.onerror = function(message, source, lineno, colno, error) {
    window.parent.postMessage({
      type: 'TOPPTIC_PREVIEW_ERROR',
      message: message,
      source: source,
      lineno: lineno,
      colno: colno,
      errorStack: error ? error.stack : ''
    }, '*');
    return false;
  };
  window.addEventListener('unhandledrejection', function(event) {
    window.parent.postMessage({
      type: 'TOPPTIC_PREVIEW_ERROR',
      message: event.reason ? event.reason.message : 'Unhandled Promise Rejection',
      source: '',
      lineno: 0,
      colno: 0,
      errorStack: event.reason ? event.reason.stack : ''
    }, '*');
  });
</script>`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/50 p-6 animate-in fade-in duration-200">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Icons.Brain className="w-6 h-6 text-blue-500" />
            Agentic Web Preview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Visual feedback panel with integrated self-healing telemetry.
          </p>
        </div>
        
        {/* Navigation / Address bar control */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg px-2.5 py-1.5 backdrop-blur-md">
          <span className="text-[10px] font-bold text-slate-500 tracking-wider">PORT:</span>
          <input 
            type="text" 
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-12 bg-transparent text-xs font-mono text-blue-400 focus:outline-none focus:ring-0 text-center"
            placeholder="3000"
          />
          <button 
            onClick={handleUpdateUrl}
            className="p-1 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-300 transition-all text-[10px] font-bold uppercase px-2"
          >
            Connect
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* 1. Iframe Viewport Container */}
        <div className="flex-[2] flex flex-col min-h-0 bg-slate-900/40 border border-slate-900/80 rounded-xl overflow-hidden shadow-2xl relative">
          
          {/* Iframe navigation bar controls */}
          <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            
            <div className="flex-1 max-w-md mx-4 px-3 py-1 bg-slate-900/60 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between shadow-inner">
              <span className="truncate">{previewUrl}</span>
              {isLoading && <Icons.RefreshCw className="w-3 h-3 animate-spin text-slate-500" />}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleReload}
                className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-900 transition-colors"
                title="Reload Preview"
              >
                <Icons.RefreshCw className="w-3.5 h-3.5" />
              </button>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noreferrer"
                className="p-1 rounded text-slate-500 hover:text-blue-400 hover:bg-slate-900 transition-colors"
                title="Open in External Browser"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>

          {/* Actual Webview Iframe */}
          <div className="flex-1 bg-white relative">
            <iframe 
              key={iframeKey}
              ref={iframeRef}
              src={previewUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>

        {/* 2. Self-Healing & Console Telemetry Panel */}
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          
          {/* Web Telemetry Terminal */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/30 border border-slate-700/30 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-900 flex items-center justify-between select-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                Telemetry Console Logs
              </span>
              <button 
                onClick={() => setWebErrors([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase font-bold"
              >
                Clear
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[10px] leading-relaxed custom-scrollbar bg-black/15">
              {webErrors.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4 space-y-2">
                  <Icons.Zap className="w-8 h-8 text-slate-600 animate-pulse" />
                  <p className="italic">No runtime browser errors caught.</p>
                  <p className="text-[9px] text-slate-600 max-w-[200px] leading-normal mt-1">If your app crashes, error logs will appear here for Auto-Healing.</p>
                </div>
              ) : (
                webErrors.map((err, i) => (
                  <div key={i} className="p-3 bg-red-950/20 border border-red-500/10 rounded-lg text-red-400 space-y-1.5 relative group shadow-sm animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-red-500/10 pb-1 text-[9px] text-slate-400 select-none">
                      <span>{err.timestamp}</span>
                      <Badge variant="error">CRASH</Badge>
                    </div>
                    
                    <p className="font-bold text-slate-200 break-words">{err.message}</p>
                    {err.source && <p className="text-slate-500 break-all">Source: {err.source}:{err.lineno}</p>}
                    
                    <Button 
                      onClick={() => triggerSelfHealing(err)}
                      className="w-full mt-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white border border-red-500/20 text-[9px] font-bold py-1 flex items-center justify-center gap-1 shadow-lg shadow-red-950/30"
                    >
                      <Icons.Brain className="w-3.5 h-3.5 animate-bounce" /> Auto-Heal Visual Bug
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Self-Healing Snippet Instructions Box */}
          <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4 flex flex-col gap-2.5 backdrop-blur-sm shadow-md select-none">
            <h4 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
              <Icons.ShieldAlert className="w-4 h-4 text-purple-400" />
              How to enable Visual Self-Healing
            </h4>
            <p className="text-[10px] text-slate-400 leading-normal">
              Copy this script and paste it into the <code>&lt;head&gt;</code> of your web project's HTML file (e.g. <code>index.html</code>). 
              This allows the browser preview to stream unhandled exceptions directly into Topptic's Auto-Pilot.
            </p>
            <pre className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[8px] font-mono text-slate-400 overflow-x-auto select-all max-h-[100px] custom-scrollbar leading-tight">
              {selfHealingCodeSnippet}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
