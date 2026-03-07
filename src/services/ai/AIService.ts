import { AppSettings } from '../../types';
import { GeminiService } from '../gemini/GeminiService';

export interface AIAnalysisResult {
  highlights: Array<{
    startTime: number;
    endTime: number;
    reason: string;
    score: number;
  }>;
  subtitles?: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  suggestedMusic?: {
    genre: string;
    mood: string;
    tempo: string;
  };
}

export interface AIProvider {
  analyzeVideo(videoPath: string): Promise<AIAnalysisResult>;
  generateSubtitles(videoPath: string): Promise<Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>>;
}

export class AIService {
  private provider: AIProvider;

  constructor(settings: AppSettings) {
    if (settings.aiProvider === 'gemini') {
      this.provider = new GeminiService(
        settings.geminiApiKey,
        settings.geminiBaseURL,
        settings.geminiModelId
      );
    } else {
      throw new Error(`不支持的 AI 供应商: ${settings.aiProvider}`);
    }
  }

  async analyzeVideo(videoPath: string): Promise<AIAnalysisResult> {
    return this.provider.analyzeVideo(videoPath);
  }

  async generateSubtitles(videoPath: string) {
    return this.provider.generateSubtitles(videoPath);
  }
}
