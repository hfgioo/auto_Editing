export interface VideoFile {
  id: string;
  name: string;
  path: string;
  size: number;
  duration?: number;
  thumbnail?: string;
}

export interface ProcessTask {
  id: string;
  videoId: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  progress: number;
  currentStep: ProcessStep;
  steps: StepStatus[];
  error?: string;
  outputPath?: string;
}

export type ProcessStep = 
  | 'upload'
  | 'analyze'
  | 'cut'
  | 'subtitle'
  | 'music'
  | 'render';

export interface StepStatus {
  step: ProcessStep;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

export interface GeminiAnalysis {
  highlights: Highlight[];
  summary: string;
  suggestedMusic: string;
  transcription: Transcription[];
}

export interface Highlight {
  startTime: number;
  endTime: number;
  description: string;
  score: number;
}

export interface Transcription {
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
}

export interface AppSettings {
  aiProvider?: 'gemini' | 'openai';
  geminiApiKey: string;
  openaiApiKey?: string;
  aiBaseURL?: string;
  outputPath: string;
  videoQuality: 'low' | 'medium' | 'high' | 'ultra';
  autoSubtitle: boolean;
  autoMusic: boolean;
  cloudStorage?: {
    provider: 'aws' | 'aliyun' | 'tencent';
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}
