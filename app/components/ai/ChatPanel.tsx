'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/app/components/common/Button';
import { sendChatMessage, searchWorkspaceRag } from '@/app/lib/backend';
import { Icons } from '@/app/lib/icons';
import type { AIChatMessage } from '@/app/lib/types';
import { useApp } from '@/app/providers';
import { ActionCard, type ActionPayload } from './ActionCard';

const MessageContent = ({ content, onApply }: { content: string, onApply: (code: string) => void }) => {
  // Split on code blocks and <topptic_action> blocks
  const parts = content.split(/(```[\s\S]*?```|<topptic_action>[\s\S]*?<\/topptic_action>)/g);
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

        if (part.startsWith('<topptic_action>')) {
          try {
            const rawJson = part.replace('<topptic_action>', '').replace('</topptic_action>', '').trim();
            const payload: ActionPayload = JSON.parse(rawJson);
            return <ActionCard key={index} payload={payload} />;
          } catch (error) {
            return (
              <div key={index} className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-[10px] font-mono text-red-400 my-2">
                Failed to parse AI action: {String(error)}
                <pre className="mt-1 text-[8px] opacity-70 overflow-x-auto">{part}</pre>
              </div>
            );
          }
        }

        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
    </div>
  );
};

export function ChatPanel() {
  const { selectedFilePath, getLiveContent, setPendingDiff, selectedModel, pendingAutoFix, setPendingAutoFix, setShowChat } = useApp();
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello. I'm your Topptic AI Assistant, wired to the Rust backend when you run the Tauri app.",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');

  // Listen to global self-healing trigger events from Build/Terminal panels
  useEffect(() => {
    if (pendingAutoFix) {
      setInput(`Fix this compilation error in my file:\n\n${pendingAutoFix.stderr}\n\nHere is the original file path: ${pendingAutoFix.filePath}`);
      setPendingAutoFix(null);
      setShowChat(true);
    }
  }, [pendingAutoFix, setPendingAutoFix, setShowChat]);
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

    let ragContext = "";
    if (content.toLowerCase().startsWith('@workspace')) {
      const query = content.substring(10).trim();
      if (query) {
        updateAssistantMessage("🔍 Fetching workspace context offline...");
        try {
          ragContext = await searchWorkspaceRag(query);
          updateAssistantMessage("🔍 Fetching workspace context offline...\n\nFound relevant files. Generating answer...");
        } catch (error) {
          console.error("Workspace RAG query failed:", error);
        }
      }
    }

    // Construct high-context LLM prompt with Monaco active buffers and RAG context
    let promptContext = `You are Topptic's offline agentic coding assistant. You can create/update files and execute terminal commands!
Whenever the user asks you to write code, create files, or run commands, you MUST trigger an action card by wrapping a JSON payload inside <topptic_action> and </topptic_action> tags.

Available tools:
1. write_file: Parameters: { "path": "relative_path", "content": "file_code" }
2. execute_command: Parameters: { "command": "cli_command", "cwd": "relative_directory" }

Format example:
<topptic_action>
{
  "tool": "write_file",
  "parameters": {
    "path": "anno/home.html",
    "content": "<!DOCTYPE html>\\n<html>...</html>"
  },
  "rationale": "Creating the home page."
}
</topptic_action>

Respond in concise Hinglish if asked in Hinglish.`;
    if (ragContext) {
      promptContext += `\n\n${ragContext}`;
    }
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
    <div className="w-96 bg-slate-950/80 backdrop-blur-2xl border-l border-purple-500/10 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-950/20 via-purple-950/20 to-slate-950/20 border-b border-purple-500/20 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100 uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">Antigravity Clone</span>
            <span className="bg-purple-500/25 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest select-none animate-pulse">AGENT</span>
          </div>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5 select-none">Offline Model: {selectedModel || 'llama3.2'}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping" />
          <span className="text-[9px] font-bold text-purple-400/90 uppercase tracking-wider select-none">Active</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
              {/* Agent Logo for Assistant */}
              {!isUser && (
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 border border-purple-500/30 flex items-center justify-center text-[10px] font-black text-white select-none shadow-md shadow-purple-500/10 shrink-0">
                  A
                </div>
              )}
              
              <div
                className={`max-w-[280px] rounded-2xl px-3.5 py-2.5 text-[11px] leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-blue-600/10 text-blue-100 border border-blue-500/30 rounded-tr-none shadow-blue-500/5'
                    : 'bg-slate-900/60 text-slate-300 border border-purple-500/10 rounded-tl-none w-full shadow-slate-950/40'
                }`}
              >
                <MessageContent content={message.content} onApply={handleApplyCode} />
              </div>

              {/* User Initials for User */}
              {isUser && (
                <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold text-blue-300 select-none shrink-0">
                  U
                </div>
              )}
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex gap-2.5 justify-start items-center animate-pulse">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-[10px] font-black text-white shrink-0">
              A
            </div>
            <div className="flex flex-col gap-1 px-3 py-2 bg-slate-900/60 border border-purple-500/10 rounded-xl rounded-tl-none">
              <span className="text-[9px] font-semibold text-purple-400 uppercase tracking-widest select-none">Thinking...</span>
              <div className="flex gap-1 items-center mt-1">
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-100" />
                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Action Presets and Chat Inputs */}
      <div className="border-t border-purple-500/10 bg-slate-950/40 p-4 space-y-3">
        {/* Preset AI Prescription pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar scrollbar-none select-none">
          <button
            type="button"
            onClick={() => handleTriggerPreset("Fix any syntax errors, logically incorrect statements, or typescript failures in my code. Return the whole corrected code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[8.5px] font-bold uppercase tracking-widest whitespace-nowrap bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none active:scale-[0.97]"
          >
            <Icons.ShieldAlert className="w-3 h-3" /> Fix Bugs
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Optimize the efficiency, runtime performance, complexity parameters, and caching features of this code. Return the whole optimized code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[8.5px] font-bold uppercase tracking-widest whitespace-nowrap bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/25 hover:border-green-500/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none active:scale-[0.97]"
          >
            <Icons.Zap className="w-3 h-3" /> Optimize
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Draft comprehensive and highly performant unit tests targeting key segments, edge cases, and interfaces in this code. Return the whole tests code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[8.5px] font-bold uppercase tracking-widest whitespace-nowrap bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/25 hover:border-blue-500/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none active:scale-[0.97]"
          >
            <Icons.Brain className="w-3 h-3" /> Write Tests
          </button>
          
          <button
            type="button"
            onClick={() => handleTriggerPreset("Document all major workflow branches, function statements, types, and imports in this file using elegant TSX comment structures. Return the whole annotated code block.")}
            disabled={!selectedFilePath || isLoading}
            className="text-[8.5px] font-bold uppercase tracking-widest whitespace-nowrap bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/25 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed select-none active:scale-[0.97]"
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
            className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800 hover:border-slate-700/50 focus:border-purple-500/50 rounded-xl text-slate-200 placeholder-slate-500 transition-all outline-none focus:ring-1 focus:ring-purple-500/20"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading} 
            className="px-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] border-none"
          >
            <Icons.Send className="w-3.5 h-3.5" />
          </Button>
        </div>
        
        {/* Footer info bar */}
        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-slate-500 px-1 select-none">
          <span>Active Context: {selectedFilePath ? 'Monaco Buffer' : 'Global Workspace'}</span>
          <span>Offline helper enabled</span>
        </div>
      </div>
    </div>
  );
}
