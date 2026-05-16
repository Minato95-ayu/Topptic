'use client';

import { useState } from 'react';
import { Icons } from '@/app/lib/icons';
import { Button } from '@/app/components/common/Button';
import { useApp } from '@/app/providers';

export function SettingsPanel() {
  const { backendStatus } = useApp();
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [workspacePath, setWorkspacePath] = useState(backendStatus?.workspace || './workspace');

  return (
    <div className="flex-1 p-8 bg-slate-950/50 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <Icons.Settings className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-100">Settings</h2>
            <p className="text-slate-500">Configure your development engine and AI integration</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* AI Configuration */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Icons.Brain className="w-5 h-5 text-cyan-400" />
              AI Intelligence
            </h3>
            <div className="p-6 rounded-2xl glass-light border border-slate-700/50 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Primary AI Model</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="input-base flex-1" 
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="e.g. llama3.2, codellama"
                  />
                  <Button variant="secondary">Check Model</Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Topptic will attempt to use this model via your local Ollama or llama.cpp instance.
                </p>
              </div>

              <div className="divider" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">Local Inference Mode</p>
                  <p className="text-xs text-slate-500">Prioritize local hardware over cloud API</p>
                </div>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
            </div>
          </section>

          {/* Workspace Configuration */}
          <section>
            <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Icons.Folder className="w-5 h-5 text-yellow-400" />
              Workspace & Storage
            </h3>
            <div className="p-6 rounded-2xl glass-light border border-slate-700/50 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Default Projects Path</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    className="input-base flex-1" 
                    value={workspacePath}
                    readOnly
                  />
                  <Button variant="secondary">Change</Button>
                </div>
              </div>

              <div className="divider" />

              <div>
                <p className="text-sm font-medium text-slate-200">Database Engine</p>
                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-400 bg-black/20 p-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  SQLite 3 (v3.45.0) - Connected
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-slate-500 text-sm">
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
