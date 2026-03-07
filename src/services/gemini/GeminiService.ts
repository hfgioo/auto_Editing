import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GeminiAnalysis } from '../../types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelId: string;

  constructor(apiKey: string, _baseURL?: string, modelId: string = 'gemini-1.5-pro') {
    if (!apiKey) {
      throw new Error('Gemini API Key is required');
    }
    this.modelId = modelId;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelId });
  }

  /**
   * 分析视频内容
   * 注意：这个方法需要在 Electron 主进程中调用，因为需要访问文件系统
   */
  async analyzeVideo(videoPath: string): Promise<GeminiAnalysis> {
    try {
      console.log('[GeminiService] 分析视频:', videoPath);
      const result = await this.model.generateContent(
        `Analyze video and return strict JSON (highlights, summary, suggestedMusic, transcription): ${videoPath}`
      );
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);
      return this.validateAnalysis(parsed as GeminiAnalysis);
    } catch (error) {
      console.error('[GeminiService] 分析失败:', error);
      throw new Error(`视频分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 仅生成字幕
   */
  async generateSubtitles(videoPath: string): Promise<GeminiAnalysis['transcription']> {
    try {
      console.log('[GeminiService] 生成字幕:', videoPath);
      
      // 模拟字幕生成
      return [
        {
          startTime: 0,
          endTime: 3,
          text: '欢迎来到自动视频编辑工具',
          confidence: 0.95,
        },
        {
          startTime: 3.5,
          endTime: 6,
          text: '这是一个示例字幕',
          confidence: 0.92,
        },
      ];
    } catch (error) {
      console.error('[GeminiService] 字幕生成失败:', error);
      throw error;
    }
  }

  /**
   * 验证和清理分析结果
   */
  private validateAnalysis(analysis: GeminiAnalysis): GeminiAnalysis {
    // 确保 highlights 存在且有效
    if (!Array.isArray(analysis.highlights)) {
      analysis.highlights = [];
    }

    analysis.highlights = analysis.highlights
      .filter(h => 
        typeof h.startTime === 'number' &&
        typeof h.endTime === 'number' &&
        h.endTime > h.startTime &&
        typeof h.score === 'number'
      )
      .sort((a, b) => b.score - a.score); // 按评分排序

    // 确保 transcription 存在且有效
    if (!Array.isArray(analysis.transcription)) {
      analysis.transcription = [];
    }

    analysis.transcription = analysis.transcription
      .filter(t =>
        typeof t.startTime === 'number' &&
        typeof t.endTime === 'number' &&
        t.endTime > t.startTime &&
        typeof t.text === 'string' &&
        t.text.trim().length > 0
      )
      .sort((a, b) => a.startTime - b.startTime); // 按时间排序

    // 确保 summary 和 suggestedMusic 存在
    if (typeof analysis.summary !== 'string') {
      analysis.summary = '无法生成摘要';
    }

    if (typeof analysis.suggestedMusic !== 'string') {
      analysis.suggestedMusic = 'upbeat';
    }

    return analysis;
  }

  /**
   * 测试 API Key 是否有效
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello');
      const response = await result.response;
      return response.text().length > 0;
    } catch (error) {
      console.error('[GeminiService] 连接测试失败:', error);
      return false;
    }
  }
}
