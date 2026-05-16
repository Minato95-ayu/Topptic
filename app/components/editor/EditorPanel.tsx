'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { TabBar } from '@/app/components/editor/TabBar';
import { DEFAULT_EDITOR_CODE } from '@/app/lib/constants';
import { formatCode, writeFile } from '@/app/lib/backend';

import { useApp } from '@/app/providers';
import { getLanguageFromPath } from '@/app/lib/utils';
import { formatCode } from '@/app/lib/backend';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-800 flex items-center justify-center font-mono text-sm text-slate-500">Loading Topptic Editor...</div>
});

export function EditorPanel() {
  const { selectedFilePath, fileContent, setFileContent, saveCurrentFile } = useApp();
  const [status, setStatus] = useState('Ready');

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
    <div className="flex-1 flex flex-col overflow-hidden">
      <TabBar tabs={[{ id: '1', name: selectedFilePath.split('/').pop() || '', isDirty: false }]} activeTabId="1" />
      <div className="flex items-center justify-between border-b border-slate-700/30 bg-slate-900/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Icons.File className="w-4 h-4 text-blue-400/70" />
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
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <MonacoEditor
          value={fileContent}
          language={getLanguageFromPath(selectedFilePath)}
          theme="vs-dark"
          onChange={(value) => setFileContent(value ?? '')}
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
    </div>
  );
}
