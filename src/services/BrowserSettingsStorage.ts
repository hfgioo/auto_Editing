import { AppSettings } from '../types';

/**
 * 浏览器环境的设置存储（使用 localStorage）
 */
export class BrowserSettingsStorage {
  private static STORAGE_KEY = 'auto-editing-settings';

  /**
   * 加载设置
   */
  static loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[BrowserSettingsStorage] 加载设置失败:', error);
    }

    // 返回默认设置
    return {
      contentMode: 'auto',
      aiProvider: 'gemini',
      geminiApiKey: '',
      geminiBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
      geminiModelId: 'gemini-1.5-flash',
      openaiApiKey: '',
      openaiBaseURL: 'https://api.openai.com/v1',
      openaiModelId: 'gpt-4o',
      customApiKey: '',
      customBaseURL: '',
      customModelId: '',
      analysisApiKey: '',
      analysisBaseURL: '',
      analysisModelId: '',
      transcriptionApiKey: '',
      transcriptionBaseURL: '',
      smartMinScore: 0.58,
      smartMinDurationSec: 2,
      smartMaxSegments: 18,
      smartMaxDurationSec: 90,
      outputPath: './output',
      videoQuality: 'high',
      autoSubtitle: true,
      autoMusic: true,
    };
  }

  /**
   * 保存设置
   */
  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('[BrowserSettingsStorage] 设置已保存');
    } catch (error) {
      console.error('[BrowserSettingsStorage] 保存设置失败:', error);
      throw error;
    }
  }

  /**
   * 清除设置
   */
  static clearSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * 创建浏览器环境的 electronAPI 模拟
 */
export function createBrowserElectronAPI() {
  return {
    loadSettings: async () => {
      return BrowserSettingsStorage.loadSettings();
    },

    saveSettings: async (settings: AppSettings) => {
      BrowserSettingsStorage.saveSettings(settings);
    },

    selectOutputDir: async () => {
      // 浏览器环境无法选择文件夹，返回默认路径
      alert('浏览器版本暂不支持选择输出文件夹，将使用默认路径 ./output');
      return './output';
    },

    selectVideoFiles: async () => {
      // 浏览器环境使用 input[type=file]
      return null;
    },

    openOutputFolder: async (path: string) => {
      alert(`输出文件夹: ${path}\n\n浏览器版本无法直接打开文件夹`);
    },

    getVideoInfo: async (path: string) => {
      // 浏览器环境无法获取视频信息
      return {
        duration: 0,
        width: 1920,
        height: 1080,
        fps: 30,
      };
    },
  };
}
