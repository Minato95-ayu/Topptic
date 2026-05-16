import { ChatPanel } from '@/app/components/ai/ChatPanel';
import { EditorPanel } from '@/app/components/editor/EditorPanel';
import { BuildPanel } from '@/app/components/build/BuildPanel';
import { SettingsPanel } from '@/app/components/settings/SettingsPanel';
import { Icons } from '@/app/lib/icons';
import { useApp } from '@/app/providers';

export default function Home() {
  const { activeNav } = useApp();
  const [showChat, setShowChat] = useState(true);

  const renderActivePanel = () => {
    switch (activeNav) {
      case 'build':
        return <BuildPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'ai-roadmap':
        return (
          <div className="flex-1 flex items-center justify-center bg-slate-950/50">
            <h2 className="text-xl text-slate-400">AI Roadmap coming soon...</h2>
          </div>
        );
      case 'projects':
      default:
        return <EditorPanel />;
    }
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className="flex-1 flex flex-col min-w-0">
        {renderActivePanel()}
      </div>
      
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
