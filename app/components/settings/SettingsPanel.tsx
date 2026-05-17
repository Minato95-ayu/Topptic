'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { useApp } from '@/app/providers';

interface OllamaModelItem {
  name: string;
}

export function SettingsPanel() {
  const { backendStatus, selectedModel, setSelectedModel } = useApp();
  const [workspacePath] = useState(backendStatus?.workspace || './workspace');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Load available local Ollama models on mount
  useEffect(() => {
    const fetchLocalModels = async () => {
      try {
        setOllamaStatus('checking');
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        if (res.ok) {
          const data = (await res.json()) as { models?: OllamaModelItem[] };
          if (data && Array.isArray(data.models)) {
            const modelNames = data.models.map((m) => m.name);
            setAvailableModels(modelNames);
            setOllamaStatus('connected');
            
            // Auto-select first model if current isn't listed
            if (modelNames.length > 0 && !modelNames.includes(selectedModel)) {
              setSelectedModel(modelNames[0]);
            }
          } else {
            setOllamaStatus('offline');
          }
        } else {
          setOllamaStatus('offline');
        }
      } catch {
        setOllamaStatus('offline');
      }
    };

    void fetchLocalModels();
  }, [selectedModel, setSelectedModel]);

  const handleTestConnection = async () => {
    setOllamaStatus('checking');
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags');
      if (res.ok) {
        const data = (await res.json()) as { models?: OllamaModelItem[] };
        if (data && Array.isArray(data.models)) {
          const modelNames = data.models.map((m) => m.name);
          setAvailableModels(modelNames);
          setOllamaStatus('connected');
        } else {
          setOllamaStatus('offline');
        }
      } else {
        setOllamaStatus('offline');
      }
    } catch {
      setOllamaStatus('offline');
    }
  };

  return (
    <div className="flex-1 p-8 bg-slate-950/50 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        {/* Header section */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-lg shadow-blue-500/5">
            <Icons.Settings className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-100">Settings</h2>
            <p className="text-slate-500">Configure your development engine and AI integration</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* AI Configuration Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Icons.Brain className="w-5 h-5 text-cyan-400" />
              AI Intelligence
            </h3>
            
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
              {/* Connection Status Indicator */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    {ollamaStatus === 'connected' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      ollamaStatus === 'connected' ? 'bg-green-500' :
                      ollamaStatus === 'checking' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Local Ollama Engine</p>
                    <p className="text-sm font-medium text-slate-200 mt-0.5">
                      {ollamaStatus === 'connected' ? `Connected - ${availableModels.length} models detected` :
                       ollamaStatus === 'checking' ? 'Testing local API endpoint...' :
                       'Offline - local inference unavailable'}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleTestConnection}
                  disabled={ollamaStatus === 'checking'}
                >
                  {ollamaStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                </Button>
              </div>

              {/* Model selection */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Primary AI Model</label>
                
                {ollamaStatus === 'connected' && availableModels.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="input-base w-full pr-10 cursor-pointer appearance-none bg-slate-950/80 text-slate-100"
                    >
                      {availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <Icons.ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input 
                      type="text" 
                      className="input-base flex-1 bg-slate-950/80" 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      placeholder="e.g. llama3.2, codellama"
                    />
                  </div>
                )}
                
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  {ollamaStatus === 'connected' 
                    ? "Select from your installed local Ollama models. Chat inputs will stream instantly from this model."
                    : "Local Ollama service seems offline. The AI assistant panel will fallback to responsive Rust typewriter simulations."}
                </p>
              </div>

              <div className="border-t border-slate-800" />

              {/* Inference Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Local Inference Mode</p>
                  <p className="text-xs text-slate-500">Prioritize local hardware over cloud API</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-md" />
                </div>
              </div>
            </div>
          </section>

          {/* Workspace Configuration Section */}
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Icons.Folder className="w-5 h-5 text-yellow-400" />
              Workspace & Storage
            </h3>
            
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Default Projects Path</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="input-base flex-1 bg-slate-950/80 text-slate-400 cursor-not-allowed" 
                    value={workspacePath}
                    readOnly
                  />
                  <Button variant="secondary" disabled>Change</Button>
                </div>
              </div>

              <div className="border-t border-slate-800" />

              <div>
                <p className="text-sm font-medium text-slate-200">Database Engine</p>
                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/50 border border-slate-800/40 p-3 rounded-xl shadow-inner">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  SQLite 3 Database (WAL Concurrency) - Connected
                </div>
              </div>
            </div>
          </section>

          {/* Version Footer */}
          <section className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-slate-500 text-xs font-mono">
              <span>Topptic Engine v0.1.0-alpha</span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
                <a href="#" className="hover:text-blue-400 transition-colors">License</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
