import { useState } from 'react';
import { 
  CloudArrowUpIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/solid';
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
    { id: 'upload' as PageType, label: '上传视频', desc: '拖拽素材并启动流程', icon: CloudArrowUpIcon },
    { id: 'process' as PageType, label: '处理进度', desc: '查看每一步状态', icon: ChartBarIcon },
    { id: 'subtitle' as PageType, label: '字幕管理', desc: '编辑和导出字幕', icon: DocumentTextIcon },
    { id: 'music' as PageType, label: '音乐库', desc: '管理 BGM 资源', icon: MusicalNoteIcon },
    { id: 'settings' as PageType, label: '设置', desc: 'AI 与导出参数', icon: Cog6ToothIcon },
  ];

  const activeItem = navItems.find((item) => item.id === currentPage);

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute -left-40 -top-48 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(225,107,66,0.24),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(41,120,181,0.2),transparent_70%)]" />

      <div className="relative flex h-full">
        <aside className="hidden w-80 shrink-0 border-r border-[var(--line)] bg-[var(--panel)]/85 backdrop-blur md:flex md:flex-col">
          <div className="px-8 pb-6 pt-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-lg shadow-[rgba(28,32,36,0.18)]">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Auto Editing</p>
                <h1 className="text-xl font-semibold">Clip Studio</h1>
              </div>
            </div>
          </div>

          <nav className="space-y-2 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    group w-full rounded-2xl border px-4 py-3 text-left transition-all
                    ${isActive
                      ? 'border-[rgba(225,107,66,0.32)] bg-[rgba(225,107,66,0.12)] shadow-[0_12px_24px_rgba(225,107,66,0.14)]'
                      : 'border-transparent hover:border-[var(--line)] hover:bg-white/70'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-white/85 text-[var(--accent)]' : 'bg-[var(--panel-2)] text-[var(--muted)] group-hover:text-[var(--ink)]'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isActive ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}`}>{item.label}</p>
                      <p className="text-xs text-[var(--muted)]">{item.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className={`flex-1 overflow-auto ${!isElectron() ? 'pt-3 md:pt-5' : ''}`}>
          <div className="mx-auto w-full max-w-[1300px] p-3 md:p-8">
            <header className="mb-4 rounded-3xl border border-[var(--line)] bg-[var(--panel)]/90 px-5 py-4 shadow-[0_8px_36px_rgba(15,23,42,0.06)] backdrop-blur md:mb-6 md:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Workspace</p>
                  <h2 className="text-xl font-semibold md:text-2xl">{activeItem?.label}</h2>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-white/70 px-3 py-1.5 text-xs text-[var(--muted)]">
                  {isElectron() ? 'Desktop Mode' : 'Browser Fallback'}
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs whitespace-nowrap ${
                        isActive
                          ? 'border-[rgba(225,107,66,0.42)] bg-[rgba(225,107,66,0.14)] text-[var(--ink)]'
                          : 'border-[var(--line)] bg-white/65 text-[var(--ink-soft)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="animate-fadeUp rounded-3xl border border-[var(--line)] bg-[var(--panel)]/92 p-3 shadow-[0_18px_46px_rgba(17,24,39,0.07)] backdrop-blur md:p-6">
              {currentPage === 'upload' && <UploadPage />}
              {currentPage === 'process' && <ProcessPage />}
              {currentPage === 'subtitle' && <SubtitlePage />}
              {currentPage === 'music' && <MusicPage />}
              {currentPage === 'settings' && <SettingsPage />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
