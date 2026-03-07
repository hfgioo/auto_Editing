import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { GeminiAnalysis } from '../../types';

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API Key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  /**
   * 分析视频内容
   * 注意：这个方法需要在 Electron 主进程中调用，因为需要访问文件系统
   */
  async analyzeVideo(videoPath: string): Promise<GeminiAnalysis> {
    try {
      // 在实际应用中，这里应该通过 IPC 从主进程读取文件
      // 目前返回模拟数据用于演示
      console.log('[GeminiService] 分析视频:', videoPath);
      
      // TODO: 实际实现需要：
      // 1. 通过 IPC 从主进程读取视频文件
      // 2. 转换为 base64
      // 3. 调用 Gemini API
      
      // 模拟 API 响应
      const mockAnalysis: GeminiAnalysis = {
        highlights: [
          {
            startTime: 5,
            endTime: 15,
            description: '精彩开场',
            score: 85,
          },
          {
            startTime: 30,
            endTime: 45,
            description: '核心内容',
            score: 92,
          },
          {
            startTime: 60,
            endTime: 75,
            description: '高潮部分',
            score: 88,
          },
        ],
        summary: '这是一个关于产品介绍的视频，包含了产品特性展示和使用演示。',
        suggestedMusic: 'upbeat',
        transcription: [
          {
            startTime: 0,
            endTime: 5,
            text: '大家好，欢迎观看本期视频',
            confidence: 0.95,
          },
          {
            startTime: 5,
            endTime: 10,
            text: '今天我们要介绍一款全新的产品',
            confidence: 0.92,
          },
          {
            startTime: 10,
            endTime: 15,
            text: '它具有强大的功能和简洁的设计',
            confidence: 0.94,
          },
        ],
      };

      return this.validateAnalysis(mockAnalysis);
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
