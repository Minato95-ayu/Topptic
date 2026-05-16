'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { sendChatMessage } from '@/app/lib/backend';
import { Icons } from '@/app/lib/icons';
import type { AIChatMessage } from '@/app/lib/types';

export function ChatPanel() {
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

    const response = await sendChatMessage({ message: content });
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
              className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                message.role === 'user'
                  ? 'bg-blue-500/30 text-blue-100 border border-blue-500/50'
                  : 'bg-slate-800/50 text-slate-300 border border-slate-700/50'
              }`}
            >
              {message.content}
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
            placeholder="Ask me anything..."
            className="input-base flex-1"
          />
          <Button onClick={() => void handleSendMessage()} disabled={!input.trim() || isLoading} className="px-3">
            <Icons.Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-center">Runs locally through Tauri commands</p>
      </div>
    </div>
  );
}
