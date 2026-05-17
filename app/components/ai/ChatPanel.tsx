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
  const { selectedFilePath, getLiveContent, setPendingDiff, selectedModel } = useApp();
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

  // Unified chat execution bridge (supports input submit and dynamic action presets)
  const executeChatMessage = async (messageText: string) => {
    const content = messageText.trim();
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

    // Construct high-context LLM prompt with Monaco active buffers
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

    // Mode 1: Attempt direct local SSE stream fetch using selected LLM model
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
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
              const parsed = JSON.parse(line) as { response?: string };
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
            const parsed = JSON.parse(buffer) as { response?: string };
            if (parsed.response) {
              accumulatedResponse += parsed.response;
              updateAssistantMessage(accumulatedResponse);
            }
          } catch {}
        }

        if (accumulatedResponse.trim()) {
          streamCompleted = true;
          setIsLoading(false);
        }
      }
    } catch (e) {
      console.log('Direct Ollama connection not active. Falling back to rust cmd typewriter simulation.', e);
    }

    // Mode 2: Tauri rust bridge typewriter fallback simulation
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
    }
  };

  const handleSendMessage = () => {
    void executeChatMessage(input);
  };

  const handleTriggerPreset = (presetPrompt: string) => {
    if (isLoading) return;
    void executeChatMessage(presetPrompt);
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
        <p className="text-[10px] text-slate-500 font-mono">Model: {selectedModel}</p>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs md:max-w-sm rounded-lg px-3 py-2 text-xs leading-relaxed ${
                message.role === 'user'
                  ? 'bg-blue-500/30 text-blue-100 border border-blue-500/50 shadow-lg shadow-blue-500/5'
                  : 'bg-slate-800/50 text-slate-300 border border-slate-700/50 w-full'
              }`}
            >
              <MessageContent content={message.content} onApply={handleApplyCode} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-1 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Presets and Chat Inputs */}
      <div className="border-t border-slate-700/30 p-4 space-y-3">
        {/* Preset AI Prescription pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar scrollbar-none select-none">
          <button
            type="button"
            onClick={() => handleTriggerPreset("Fix any syntax errors, logically incorrect statements, or typescript failures in my code. Return the whole corrected code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none"
          >
            <Icons.ShieldAlert className="w-3 h-3" /> Fix Bugs
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Optimize the efficiency, runtime performance, complexity parameters, and caching features of this code. Return the whole optimized code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:border-green-500/30 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none"
          >
            <Icons.Zap className="w-3 h-3" /> Optimize
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Draft comprehensive and highly performant unit tests targeting key segments, edge cases, and interfaces in this code. Return the whole tests code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/30 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none"
          >
            <Icons.Brain className="w-3 h-3" /> Write Tests
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Document all major workflow branches, function statements, types, and imports in this file using elegant TSX comment structures. Return the whole annotated code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[9px] font-bold uppercase tracking-wider whitespace-nowrap bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 hover:border-purple-500/30 px-2.5 py-1 rounded-md transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none"
          >
            <Icons.FileText className="w-3 h-3" /> Document
          </button>
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSendMessage();
            }}
            disabled={isLoading}
            placeholder={selectedFilePath ? `Ask about ${selectedFilePath.split('/').pop()}...` : "Ask me anything..."}
            className="input-base flex-1 text-xs py-2 bg-slate-950/40"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} className="px-3">
            <Icons.Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-slate-500 text-center select-none font-medium">Context: {selectedFilePath ? 'Active Monaco Buffer' : 'None'}</p>
      </div>
    </div>
  );
}
