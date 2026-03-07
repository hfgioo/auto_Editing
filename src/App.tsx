import { useState } from 'react';
import { 
  CloudArrowUpIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import UploadPage from './pages/UploadPage';
import ProcessPage from './pages/ProcessPage';
import SubtitlePage from './pages/SubtitlePage';
import MusicPage from './pages/MusicPage';
import SettingsPage from './pages/SettingsPage';

type PageType = 'upload' | 'process' | 'subtitle' | 'music' | 'settings';

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('upload');

  const navItems = [
    { id: 'upload' as PageType, label: '上传视频', icon: CloudArrowUpIcon },
    { id: 'process' as PageType, label: '处理进度', icon: ChartBarIcon },
    { id: 'subtitle' as PageType, label: '字幕管理', icon: DocumentTextIcon },
    { id: 'music' as PageType, label: '音乐库', icon: MusicalNoteIcon },
    { id: 'settings' as PageType, label: '设置', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      <aside className="w-20 md:w-24 border-r border-slate-800 bg-slate-900/95 backdrop-blur flex flex-col items-center py-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-900/40">
          <CloudArrowUpIcon className="w-6 h-6 text-white" />
        </div>

        <nav className="mt-8 flex-1 w-full px-2 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`
                  w-full flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all text-xs
                  ${isActive
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }
                `}
                title={item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="hidden md:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className={`flex-1 overflow-auto ${!isElectron() ? 'pt-6' : ''}`}>
        <div className="min-h-full p-4 md:p-8 bg-[radial-gradient(circle_at_10%_20%,rgba(251,146,60,0.12),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(244,63,94,0.1),transparent_35%)]">
          {currentPage === 'upload' && <UploadPage />}
          {currentPage === 'process' && <ProcessPage />}
          {currentPage === 'subtitle' && <SubtitlePage />}
          {currentPage === 'music' && <MusicPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
