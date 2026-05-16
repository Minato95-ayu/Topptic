'use client';

import { useState } from 'react';
import { ChatPanel } from '@/app/components/ai/ChatPanel';
import { EditorPanel } from '@/app/components/editor/EditorPanel';
import { Icons } from '@/app/lib/icons';

export default function Home() {
  const [showChat, setShowChat] = useState(true);

  return (
    <div className="flex h-full overflow-hidden">
      <EditorPanel />
      {showChat && <ChatPanel />}

      <button
        type="button"
        onClick={() => setShowChat((value) => !value)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50 hover:shadow-blue-500/75 transition-all hover-lift z-50"
        title="Toggle AI Chat"
      >
        <Icons.Brain className="w-6 h-6" />
      </button>
    </div>
  );
}
