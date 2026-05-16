'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { TabBar } from '@/app/components/editor/TabBar';
import { DEFAULT_EDITOR_CODE } from '@/app/lib/constants';
import { formatCode, writeFile } from '@/app/lib/backend';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-800 flex items-center justify-center">Loading Editor...</div>
});

export function EditorPanel() {
  const [code, setCode] = useState(DEFAULT_EDITOR_CODE);
  const [status, setStatus] = useState('Ready');
  const currentPath = 'App.tsx';

  const handleFormat = async () => {
    setStatus('Formatting...');
    const formatted = await formatCode(currentPath, code);
    setCode(formatted);
    setStatus('Formatted');
  };

  const handleSave = async () => {
    setStatus('Saving...');
    try {
      await writeFile({ path: currentPath, content: code });
      setStatus('Saved through Tauri');
    } catch {
      setStatus('Preview mode: run Tauri to save files');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={[{ id: '1', name: currentPath, isDirty: false }]} />
      <div className="flex items-center justify-between border-b border-slate-700/30 bg-slate-900/30 px-4 py-2">
        <span className="text-xs text-slate-500">{status}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleFormat}>
            Format
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          value={code}
          language="typescript"
          theme="vs-dark"
          onChange={(value) => setCode(value ?? '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            automaticLayout: true,
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}
