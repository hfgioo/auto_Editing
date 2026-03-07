// Test setup file
import { expect } from 'vitest';

// Mock window.electronAPI
global.window = global.window || {};
(global.window as any).electronAPI = {
  selectVideos: () => Promise.resolve([]),
  selectOutputDir: () => Promise.resolve(null),
  saveSettings: () => Promise.resolve(true),
  loadSettings: () => Promise.resolve(null),
  getAppVersion: () => Promise.resolve('0.1.0'),
  openExternal: () => Promise.resolve(),
  showInFolder: () => Promise.resolve(),
};
