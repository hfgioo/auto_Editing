import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIService } from '../src/services/ai/AIService';
import { GeminiService } from '../src/services/gemini/GeminiService';

// Mock GeminiService
vi.mock('../src/services/gemini/GeminiService');

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create AIService with Gemini provider', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
      };
      
      const service = new AIService(settings);
      
      expect(service).toBeDefined();
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        'https://test.api',
        'gemini-1.5-pro'
      );
    });

    it('should use default Gemini base URL if not provided', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiModelId: 'gemini-1.5-pro',
      };
      
      const service = new AIService(settings);
      
      expect(service).toBeDefined();
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        undefined,
        'gemini-1.5-pro'
      );
    });

    it('should use default Gemini model if not provided', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      
      expect(service).toBeDefined();
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        undefined,
        undefined
      );
    });

    it('should throw error for unsupported AI provider', () => {
      const settings = {
        aiProvider: 'unsupported' as any,
        geminiApiKey: 'test-api-key',
      };
      
      expect(() => new AIService(settings)).toThrow('不支持的 AI 供应商');
    });

    it('should throw error when aiProvider is undefined', () => {
      const settings = {
        geminiApiKey: 'test-api-key',
      } as any;
      
      expect(() => new AIService(settings)).toThrow('不支持的 AI 供应商');
    });

    it('should throw error when aiProvider is null', () => {
      const settings = {
        aiProvider: null as any,
        geminiApiKey: 'test-api-key',
      };
      
      expect(() => new AIService(settings)).toThrow('不支持的 AI 供应商');
    });

    it('should throw error when aiProvider is empty string', () => {
      const settings = {
        aiProvider: '' as any,
        geminiApiKey: 'test-api-key',
      };
      
      expect(() => new AIService(settings)).toThrow('不支持的 AI 供应商');
    });
  });

  describe('API Key Validation', () => {
    it('should accept valid API key', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'valid-api-key-12345',
      };
      
      expect(() => new AIService(settings)).not.toThrow();
    });

    it('should handle empty API key', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: '',
      };
      
      // GeminiService should handle validation
      expect(() => new AIService(settings)).not.toThrow();
    });

    it('should handle missing API key', () => {
      const settings = {
        aiProvider: 'gemini' as const,
      } as any;
      
      // GeminiService should handle validation
      expect(() => new AIService(settings)).not.toThrow();
    });
  });

  describe('Service Delegation', () => {
    it('should delegate analyzeVideo to GeminiService', async () => {
      const mockAnalysis = {
        highlights: [
          { startTime: 0, endTime: 10, reason: 'Test', score: 0.9 },
        ],
        subtitles: [
          { startTime: 0, endTime: 5, text: 'Test' },
        ],
      };
      
      const mockGeminiService = {
        analyzeVideo: vi.fn().mockResolvedValue(mockAnalysis),
      };
      
      vi.mocked(GeminiService).mockImplementation(() => mockGeminiService as any);
      
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      const result = await service.analyzeVideo('/test/video.mp4');
      
      expect(mockGeminiService.analyzeVideo).toHaveBeenCalledWith('/test/video.mp4');
      expect(result).toEqual(mockAnalysis);
    });

    it('should delegate generateSubtitles to GeminiService', async () => {
      const mockSubtitles = [
        { startTime: 0, endTime: 5, text: 'Test subtitle' },
      ];
      
      const mockGeminiService = {
        generateSubtitles: vi.fn().mockResolvedValue(mockSubtitles),
      };
      
      vi.mocked(GeminiService).mockImplementation(() => mockGeminiService as any);
      
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      const result = await service.generateSubtitles('/test/video.mp4');
      
      expect(mockGeminiService.generateSubtitles).toHaveBeenCalledWith('/test/video.mp4');
      expect(result).toEqual(mockSubtitles);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from GeminiService', async () => {
      const mockError = new Error('API error');
      
      const mockGeminiService = {
        analyzeVideo: vi.fn().mockRejectedValue(mockError),
      };
      
      vi.mocked(GeminiService).mockImplementation(() => mockGeminiService as any);
      
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      
      await expect(service.analyzeVideo('/test/video.mp4')).rejects.toThrow('API error');
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network timeout');
      
      const mockGeminiService = {
        analyzeVideo: vi.fn().mockRejectedValue(mockError),
      };
      
      vi.mocked(GeminiService).mockImplementation(() => mockGeminiService as any);
      
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      
      await expect(service.analyzeVideo('/test/video.mp4')).rejects.toThrow('Network timeout');
    });

    it('should handle invalid response format', async () => {
      const mockGeminiService = {
        analyzeVideo: vi.fn().mockResolvedValue(null),
      };
      
      vi.mocked(GeminiService).mockImplementation(() => mockGeminiService as any);
      
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      const result = await service.analyzeVideo('/test/video.mp4');
      
      expect(result).toBeNull();
    });
  });

  describe('Configuration Options', () => {
    it('should support custom base URL', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://custom.api.com',
      };
      
      const service = new AIService(settings);
      
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        'https://custom.api.com',
        undefined
      );
    });

    it('should support custom model ID', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiModelId: 'gemini-2.0-pro',
      };
      
      const service = new AIService(settings);
      
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        undefined,
        'gemini-2.0-pro'
      );
    });

    it('should support all configuration options together', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://custom.api.com',
        geminiModelId: 'gemini-2.0-pro',
      };
      
      const service = new AIService(settings);
      
      expect(GeminiService).toHaveBeenCalledWith(
        'test-api-key',
        'https://custom.api.com',
        'gemini-2.0-pro'
      );
    });
  });

  describe('Multiple Instances', () => {
    it('should support multiple AIService instances', () => {
      const settings1 = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'api-key-1',
      };
      
      const settings2 = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'api-key-2',
      };
      
      const service1 = new AIService(settings1);
      const service2 = new AIService(settings2);
      
      expect(service1).toBeDefined();
      expect(service2).toBeDefined();
      expect(GeminiService).toHaveBeenCalledTimes(2);
    });

    it('should isolate instances from each other', async () => {
      const mockAnalysis1 = {
        highlights: [{ startTime: 0, endTime: 10, reason: 'Test 1', score: 0.9 }],
        subtitles: [],
      };
      
      const mockAnalysis2 = {
        highlights: [{ startTime: 0, endTime: 20, reason: 'Test 2', score: 0.8 }],
        subtitles: [],
      };
      
      const mockGeminiService1 = {
        analyzeVideo: vi.fn().mockResolvedValue(mockAnalysis1),
      };
      
      const mockGeminiService2 = {
        analyzeVideo: vi.fn().mockResolvedValue(mockAnalysis2),
      };
      
      vi.mocked(GeminiService)
        .mockImplementationOnce(() => mockGeminiService1 as any)
        .mockImplementationOnce(() => mockGeminiService2 as any);
      
      const settings1 = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'api-key-1',
      };
      
      const settings2 = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'api-key-2',
      };
      
      const service1 = new AIService(settings1);
      const service2 = new AIService(settings2);
      
      const result1 = await service1.analyzeVideo('/test/video1.mp4');
      const result2 = await service2.analyzeVideo('/test/video2.mp4');
      
      expect(result1).toEqual(mockAnalysis1);
      expect(result2).toEqual(mockAnalysis2);
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct settings type', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
      };
      
      const service = new AIService(settings);
      expect(service).toBeDefined();
    });

    it('should handle settings with extra properties', () => {
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        extraProperty: 'ignored',
      } as any;
      
      const service = new AIService(settings);
      expect(service).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long API keys', () => {
      const longApiKey = 'a'.repeat(1000);
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: longApiKey,
      };
      
      const service = new AIService(settings);
      expect(GeminiService).toHaveBeenCalledWith(longApiKey, undefined, undefined);
    });

    it('should handle special characters in API key', () => {
      const specialApiKey = 'test-key-!@#$%^&*()_+-=[]{}|;:,.<>?';
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: specialApiKey,
      };
      
      const service = new AIService(settings);
      expect(GeminiService).toHaveBeenCalledWith(specialApiKey, undefined, undefined);
    });

    it('should handle very long base URLs', () => {
      const longUrl = 'https://' + 'a'.repeat(500) + '.com';
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiBaseURL: longUrl,
      };
      
      const service = new AIService(settings);
      expect(GeminiService).toHaveBeenCalledWith('test-api-key', longUrl, undefined);
    });

    it('should handle Unicode characters in model ID', () => {
      const unicodeModelId = 'gemini-模型-1.5';
      const settings = {
        aiProvider: 'gemini' as const,
        geminiApiKey: 'test-api-key',
        geminiModelId: unicodeModelId,
      };
      
      const service = new AIService(settings);
      expect(GeminiService).toHaveBeenCalledWith('test-api-key', undefined, unicodeModelId);
    });
  });
});
