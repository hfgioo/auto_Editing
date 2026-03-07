// 检查是否在 Electron 环境中
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
};

// 统一的 API 接口
export const api = {
  // 设置
  loadSettings: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.loadSettings();
  },

  saveSettings: async (settings: any) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.saveSettings(settings);
  },

  selectOutputDir: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.selectOutputDir();
  },

  selectMusicFiles: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.selectMusicFiles();
  },

  openPath: async (targetPath: string) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.openPath(targetPath);
  },

  // 视频处理
  processVideo: async (videoPath: string, settings: any) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.processVideo(videoPath, settings);
  },

  getTask: async (taskId: string) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.getTask(taskId);
  },

  getAllTasks: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.getAllTasks();
  },

  getProcessedVideos: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.getProcessedVideos();
  },

  // 进度监听
  onVideoProgress: (callback: (task: any) => void) => {
    if (!(window as any).electronAPI) {
      console.warn('进度监听仅在 Electron 环境中可用');
      return;
    }
    (window as any).electronAPI.onVideoProgress(callback);
  },

  removeVideoProgressListener: () => {
    if (!(window as any).electronAPI) {
      return;
    }
    (window as any).electronAPI.removeVideoProgressListener();
  },

  // 字幕
  getSubtitles: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.getSubtitles();
  },

  saveSubtitle: async (subtitle: any) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.saveSubtitle(subtitle);
  },

  updateSubtitleSegment: async (subtitleId: string, segmentIndex: number, newText: string) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.updateSubtitleSegment(subtitleId, segmentIndex, newText);
  },

  // 音乐
  getMusicTracks: async () => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.getMusicTracks();
  },

  addMusicTrack: async (track: any) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.addMusicTrack(track);
  },

  deleteMusicTrack: async (trackId: string) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.deleteMusicTrack(trackId);
  },

  uploadToCloud: async (filePath: string, provider: string, config: any) => {
    if (!(window as any).electronAPI) {
      throw new Error('此功能仅在 Electron 环境中可用');
    }
    return (window as any).electronAPI.uploadToCloud(filePath, provider, config);
  },
};
