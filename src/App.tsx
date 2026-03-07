import React, { useState } from 'react';
import { 
  CloudArrowUpIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  ChartBarIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import UploadPage from './pages/UploadPage';
import ProcessPage from './pages/ProcessPage';
import SubtitlePage from './pages/SubtitlePage';
import MusicPage from './pages/MusicPage';
import SettingsPage from './pages/SettingsPage';

type PageType = 'upload' | 'process' | 'subtitle' | 'music' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { id: 'upload' as PageType, label: '上传视频', icon: CloudArrowUpIcon },
    { id: 'process' as PageType, label: '处理进度', icon: ChartBarIcon },
    { id: 'subtitle' as PageType, label: '字幕管理', icon: DocumentTextIcon },
    { id: 'music' as PageType, label: '音乐库', icon: MusicalNoteIcon },
    { id: 'settings' as PageType, label: '设置', icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* 侧边栏 */}
      <aside
        className={`
          bg-white border-r border-gray-200 flex flex-col transition-all duration-300
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo 区域 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                <CloudArrowUpIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">AI 视频编辑</h1>
                <p className="text-xs text-gray-500">智能剪辑</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarCollapsed ? (
              <Bars3Icon className="w-5 h-5 text-gray-600" />
            ) : (
              <XMarkIcon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all
                  ${isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* 底部信息 */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>版本 1.0.0</p>
              <p className="mt-1">© 2024 AI Video Editor</p>
            </div>
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className={`flex-1 overflow-auto ${!isElectron() ? 'pt-10' : ''}`}>
        <div className="p-8">
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
