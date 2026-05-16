'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { sendChatMessage } from '@/app/lib/backend';
import { Icons } from '@/app/lib/icons';
import type { AIChatMessage } from '@/app/lib/types';
import { useApp } from '@/app/providers';

const MessageContent = ({ content, onApply }: { content: string, onApply: (code: string) => void }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w*)\n([\s\S]*?)```/);
          const lang = match ? match[1] : '';
          const code = match ? match[2] : part.slice(3, -3);
          return (
            <div key={index} className="relative group rounded-md overflow-hidden bg-slate-900 border border-slate-700/50 my-2">
              <div className="flex justify-between items-center bg-slate-800/80 px-3 py-1 text-xs text-slate-400 border-b border-slate-700/50">
                <span className="lowercase">{lang || 'code'}</span>
                <button 
                  onClick={() => onApply(code)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded flex items-center gap-1"
                >
                  <Icons.Zap className="w-3 h-3" /> Apply to Editor
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono overflow-x-auto text-slate-300 custom-scrollbar">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
    </div>
  );
};

export function ChatPanel() {
  const { fileContent, selectedFilePath, setFileContent } = useApp();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello. I'm your Topptic AI Assistant, wired to the Rust backend when you run the Tauri app.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const content = input.trim();
    if (!content || isLoading) return;

    const userMessage: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const response = await sendChatMessage({ 
      message: content,
      codeContext: fileContent,
      filePath: selectedFilePath || undefined
    });
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      }
    ]);
    setIsLoading(false);
  };

  const handleApplyCode = (code: string) => {
    setFileContent(code);
  };

  return (
    <div className="w-96 bg-slate-900/40 backdrop-blur-xl border-l border-slate-700/30 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/30">
        <h3 className="text-sm font-semibold text-slate-50">AI Assistant</h3>
        <p className="text-xs text-slate-500">Rust command bridge</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-500/30 text-blue-100 border border-blue-500/50'
                  : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 w-full'
              }`}
            >
              <MessageContent content={message.content} onApply={handleApplyCode} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-1 px-3 py-2 bg-slate-800/50 rounded-lg">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-700/30 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSendMessage();
            }}
            placeholder={selectedFilePath ? `Ask about ${selectedFilePath.split('/').pop()}...` : "Ask me anything..."}
            className="input-base flex-1 text-sm"
          />
          <Button onClick={() => void handleSendMessage()} disabled={!input.trim() || isLoading} className="px-3">
            <Icons.Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-center">Context: {selectedFilePath ? 'Active File' : 'None'}</p>
      </div>
    </div>
  );
}
