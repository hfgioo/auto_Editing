import { create } from 'zustand';
import { VideoFile, ProcessTask, AppSettings } from '../types';

interface AppState {
  // Files
  files: VideoFile[];
  addFiles: (files: VideoFile[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Tasks
  tasks: ProcessTask[];
  addTask: (task: ProcessTask) => void;
  updateTask: (id: string, updates: Partial<ProcessTask>) => void;
  removeTask: (id: string) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // UI State
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const defaultSettings: AppSettings = {
  geminiApiKey: '',
  outputPath: '',
  videoQuality: 'high',
  autoSubtitle: true,
  autoMusic: true,
};

export const useAppStore = create<AppState>((set) => ({
  // Files
  files: [],
  addFiles: (files) => set((state) => ({ files: [...state.files, ...files] })),
  removeFile: (id) => set((state) => ({ files: state.files.filter(f => f.id !== id) })),
  clearFiles: () => set({ files: [] }),

  // Tasks
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTask: (id) => set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),

  // Settings
  settings: defaultSettings,
  updateSettings: (settings) => set((state) => ({
    settings: { ...state.settings, ...settings }
  })),

  // UI State
  currentPage: 'upload',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
