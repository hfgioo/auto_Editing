import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createBrowserElectronAPI } from './services/BrowserSettingsStorage';
import './index.css';

// 如果不在 Electron 环境中，注入浏览器版本的 API
if (!window.electronAPI) {
  console.log('[main] 检测到浏览器环境，注入模拟 API');
  (window as any).electronAPI = createBrowserElectronAPI();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
