// 类型定义
export interface VideoFile {
  id: string;
  name: string;
  path: string;
  size: number;
  duration: number;
  file?: File;
}

export interface ProcessTask {
  id: string;
  videoPath?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  steps: {
    [key: string]: {
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
      progress: number;
    };
  };
  result?: {
    outputPath?: string;
    analysis?: any;
    subtitles?: any[];
  };
  error?: string;
}

export interface AppSettings {
  aiProvider: 'gemini' | 'openai' | 'custom';
  geminiApiKey: string;
  geminiBaseURL: string;
  geminiModelId: string;
  openaiApiKey: string;
  openaiBaseURL: string;
  openaiModelId: string;
  customApiKey: string;
  customBaseURL: string;
  customModelId: string;
  outputPath: string;
  videoQuality: 'low' | 'medium' | 'high';
  autoSubtitle: boolean;
  autoMusic: boolean;
}

// Electron API 类型
export interface ElectronAPI {
  loadSettings: () => Promise<AppSettings>;
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>;
  selectOutputDir: () => Promise<string | null>;
  processVideo: (videoPath: string, settings: AppSettings) => Promise<ProcessTask>;
  getTask: (taskId: string) => Promise<ProcessTask | undefined>;
  getAllTasks: () => Promise<ProcessTask[]>;
  getProcessedVideos: () => Promise<any[]>;
  onVideoProgress: (callback: (task: ProcessTask) => void) => void;
  removeVideoProgressListener: () => void;
  getSubtitles: () => Promise<any[]>;
  saveSubtitle: (subtitle: any) => Promise<{ success: boolean }>;
  updateSubtitleSegment: (subtitleId: string, segmentIndex: number, newText: string) => Promise<{ success: boolean }>;
  getMusicTracks: () => Promise<any[]>;
  addMusicTrack: (track: any) => Promise<{ success: boolean }>;
  deleteMusicTrack: (trackId: string) => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
