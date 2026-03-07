import React, { useState } from 'react';
import { 
  ArrowUpTrayIcon, 
  VideoCameraIcon, 
  Cog6ToothIcon,
  DocumentTextIcon,
  MusicalNoteIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type PageType = 'upload' | 'process' | 'subtitle' | 'music' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('upload');

  const navItems = [
    { id: 'upload' as PageType, label: '上传', icon: ArrowUpTrayIcon },
    { id: 'process' as PageType, label: '处理', icon: VideoCameraIcon },
    { id: 'subtitle' as PageType, label: '字幕', icon: DocumentTextIcon },
    { id: 'music' as PageType, label: '音乐', icon: MusicalNoteIcon },
    { id: 'settings' as PageType, label: '设置', icon: Cog6ToothIcon },
  ];

  return (
    <div className="h-screen flex bg-claude-bg">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-white border-r border-claude-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-claude-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-claude-accent-primary rounded-claude flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-claude-text-primary">AI 视频剪辑</h1>
              <p className="text-xs text-claude-text-tertiary">智能自动化</p>
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-claude transition-all
                    ${isActive
                      ? 'bg-claude-accent-light text-claude-accent-primary font-medium'
                      : 'text-claude-text-secondary hover:bg-claude-bg hover:text-claude-text-primary'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* 底部信息 */}
        <div className="p-4 border-t border-claude-border">
          <div className="text-xs text-claude-text-tertiary">
            <p>版本 1.0.0</p>
            <p className="mt-1">浏览器演示版</p>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-auto">
        <div className="h-full p-8">
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-claude-text-primary mb-4">
              {currentPage === 'upload' && '上传视频'}
              {currentPage === 'process' && '处理进度'}
              {currentPage === 'subtitle' && '字幕管理'}
              {currentPage === 'music' && '音乐库'}
              {currentPage === 'settings' && '设置'}
            </h2>
            <p className="text-claude-text-secondary">
              页面加载成功！当前页面: {currentPage}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
