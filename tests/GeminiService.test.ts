import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiService } from '../src/services/gemini/GeminiService';

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            highlights: [
              {
                startTime: 0,
                endTime: 5,
                description: 'Opening scene',
                score: 85,
              },
            ],
            summary: 'Test video summary',
            suggestedMusic: 'upbeat',
            transcription: [
              {
                startTime: 0,
                endTime: 3,
                text: 'Hello world',
                confidence: 0.95,
              },
            ],
          }),
        },
      }),
    }),
  })),
}));

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(() => {
    service = new GeminiService('test-api-key');
  });

  describe('analyzeVideo', () => {
    it('should analyze video and return structured data', async () => {
      const result = await service.analyzeVideo('/path/to/video.mp4');

      expect(result).toHaveProperty('highlights');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('suggestedMusic');
      expect(result).toHaveProperty('transcription');

      expect(result.highlights).toHaveLength(1);
      expect(result.highlights[0]).toHaveProperty('startTime');
      expect(result.highlights[0]).toHaveProperty('endTime');
      expect(result.highlights[0]).toHaveProperty('score');
    });
  });

  describe('validateAnalysis', () => {
    it('should filter invalid highlights', () => {
      const invalidAnalysis = {
        highlights: [
          { startTime: 0, endTime: 5, description: 'Valid', score: 80 },
          { startTime: 10, endTime: 5, description: 'Invalid', score: 70 }, // endTime < startTime
          { startTime: 'invalid', endTime: 20, description: 'Invalid', score: 60 }, // invalid type
        ],
        summary: 'Test',
        suggestedMusic: 'upbeat',
        transcription: [],
      };

      const validated = service['validateAnalysis'](invalidAnalysis as any);

      expect(validated.highlights).toHaveLength(1);
      expect(validated.highlights[0].description).toBe('Valid');
    });

    it('should sort highlights by score', () => {
      const analysis = {
        highlights: [
          { startTime: 0, endTime: 5, description: 'Low', score: 60 },
          { startTime: 5, endTime: 10, description: 'High', score: 90 },
          { startTime: 10, endTime: 15, description: 'Medium', score: 75 },
        ],
        summary: 'Test',
        suggestedMusic: 'upbeat',
        transcription: [],
      };

      const validated = service['validateAnalysis'](analysis);

      expect(validated.highlights[0].score).toBe(90);
      expect(validated.highlights[1].score).toBe(75);
      expect(validated.highlights[2].score).toBe(60);
    });
  });
});
