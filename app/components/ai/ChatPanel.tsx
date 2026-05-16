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
  const { fileContent, selectedFilePath, setFileContent, getLiveContent, setPendingDiff } = useApp();
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

    // Pre-insert an empty assistant message to stream into
    const assistantMessageId = crypto.randomUUID();
    const newAssistantMessage: AIChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newAssistantMessage]);

    const updateAssistantMessage = (newText: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId ? { ...msg, content: newText } : msg
        )
      );
    };

    // Reconstruct context prompt matching Tauri backend standards
    let promptContext = "You are Topptic's offline coding assistant. Be concise, practical, and return actionable code guidance.";
    if (selectedFilePath) {
      promptContext += `\n\nCurrent file: ${selectedFilePath}`;
    }
    const currentCode = getLiveContent();
    if (currentCode) {
      promptContext += `\n\nCurrent Monaco editor code:\n\`\`\`\n${currentCode}\n\`\`\``;
    }
    promptContext += `\n\nUser request:\n${content}`;

    let streamCompleted = false;

    // Mode 1: Try Direct Local Ollama HTTP fetch with real-time SSE streaming
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200); // Fail fast to typewriter fallback if port closed

      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: promptContext,
          stream: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                accumulatedResponse += parsed.response;
                updateAssistantMessage(accumulatedResponse);
              }
            } catch (err) {
              console.warn('Error parsing JSON line:', err);
            }
          }
        }

        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.response) {
              accumulatedResponse += parsed.response;
              updateAssistantMessage(accumulatedResponse);
            }
          } catch {}
        }

        if (accumulatedResponse.trim()) {
          streamCompleted = true;
        }
      }
    } catch (e) {
      console.log('Direct Ollama connection not active or blocked. Falling back to typewriter driver.', e);
    }

    // Mode 2: High-fidelity visual Typewriter streaming fallback over Tauri Rust channels
    if (!streamCompleted) {
      try {
        const response = await sendChatMessage({ 
          message: content,
          codeContext: currentCode,
          filePath: selectedFilePath || undefined
        });

        const text = response.message;
        const words = text.split(/(\s+)/);
        let currentIndex = 0;
        let currentText = '';

        const typeNextWord = () => {
          if (currentIndex < words.length) {
            currentText += words[currentIndex];
            updateAssistantMessage(currentText);
            currentIndex++;
            setTimeout(typeNextWord, 12);
          } else {
            setIsLoading(false);
          }
        };

        typeNextWord();
      } catch (error) {
        updateAssistantMessage(`System Error: Failed to contact local AI assistant. (${String(error)})`);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handleApplyCode = (code: string) => {
    if (!selectedFilePath) return;
    setPendingDiff({
      original: getLiveContent(),
      modified: code,
      filePath: selectedFilePath
    });
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
