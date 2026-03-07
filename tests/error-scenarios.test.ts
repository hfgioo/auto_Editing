import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoProcessor } from '../src/services/VideoProcessor';
import { GeminiService } from '../src/services/gemini/GeminiService';
import { VideoService } from '../src/services/video/VideoService';
import { SubtitleService } from '../src/services/subtitle/SubtitleService';
import { VideoFile } from '../src/types';
import * as fs from 'fs';

// Mock all services
vi.mock('../src/services/gemini/GeminiService');
vi.mock('../src/services/video/VideoService');
vi.mock('../src/services/subtitle/SubtitleService');
vi.mock('fs');

describe('Error Scenarios', () => {
  let processor: VideoProcessor;
  let mockGeminiService: any;
  let mockVideoService: any;
  let mockSubtitleService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service instances with default success responses
    mockGeminiService = {
      analyzeVideo: vi.fn().mockResolvedValue({
        highlights: [
          { startTime: 0, endTime: 10, reason: 'Test', score: 0.9 },
        ],
        subtitles: [
          { startTime: 0, endTime: 5, text: 'Test' },
        ],
      }),
      generateSubtitles: vi.fn().mockResolvedValue([
        { startTime: 0, endTime: 5, text: 'Test' },
      ]),
    };
    
    mockVideoService = {
      mergeVideos: vi.fn().mockResolvedValue('/tmp/merged.mp4'),
      addBackgroundMusic: vi.fn().mockResolvedValue('/tmp/with_music.mp4'),
      extractClips: vi.fn().mockResolvedValue(['/tmp/clip1.mp4']),
    };
    
    mockSubtitleService = {
      generateSRT: vi.fn().mockResolvedValue('/tmp/subtitles.srt'),
      embedSubtitles: vi.fn().mockResolvedValue('/tmp/final.mp4'),
    };
    
    // Mock fs operations
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([] as any);
    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.promises.unlink).mockResolvedValue(undefined);
    vi.mocked(fs.promises.readFile).mockResolvedValue('{}');
    
    // Mock constructors
    vi.mocked(GeminiService).mockImplementation(() => mockGeminiService);
    vi.mocked(VideoService).mockImplementation(() => mockVideoService);
    vi.mocked(SubtitleService).mockImplementation(() => mockSubtitleService);
    
    processor = new VideoProcessor({
      aiProvider: 'gemini',
      geminiApiKey: 'test-api-key',
      geminiBaseURL: 'https://test.api',
      geminiModelId: 'gemini-1.5-pro',
    } as any);
  });

  describe('Network Failures', () => {
    it('should handle network timeout', async () => {
      const error = new Error('Network timeout');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-1',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle connection refused', async () => {
      const error = new Error('Connection refused');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-2',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle DNS resolution failure', async () => {
      const error = new Error('DNS resolution failed');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-3',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle SSL certificate error', async () => {
      const error = new Error('SSL certificate error');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-4',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle intermittent network issues', async () => {
      mockGeminiService.analyzeVideo
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          highlights: [{ startTime: 0, endTime: 10, reason: 'Test', score: 0.9 }],
          subtitles: [{ startTime: 0, endTime: 5, text: 'Test' }],
        });
      
      const videoFile: VideoFile = {
        id: 'test-5',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const result = await processor.processVideo(videoFile, vi.fn());
      expect(result).toBeTruthy();
      expect(mockGeminiService.analyzeVideo).toHaveBeenCalledTimes(3);
    }, 15000);
  });

  describe('API Failures', () => {
    it('should handle invalid API key', async () => {
      const error = new Error('Invalid API key');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-6',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle rate limit exceeded', async () => {
      const error = new Error('Rate limit exceeded');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-7',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle quota exceeded', async () => {
      const error = new Error('Quota exceeded');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-8',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle service unavailable', async () => {
      const error = new Error('Service unavailable');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-9',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle malformed API response', async () => {
      mockGeminiService.analyzeVideo.mockResolvedValue({
        // Missing required fields
      } as any);
      
      const videoFile: VideoFile = {
        id: 'test-10',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);
  });

  describe('Disk Space Issues', () => {
    it('should handle insufficient disk space', async () => {
      const error = new Error('ENOSPC: no space left on device');
      mockVideoService.mergeVideos.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-11',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle write permission denied', async () => {
      const error = new Error('EACCES: permission denied');
      mockVideoService.mergeVideos.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-12',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle disk read error', async () => {
      const error = new Error('EIO: i/o error');
      mockVideoService.extractClips.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-13',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);
  });

  describe('FFmpeg Failures', () => {
    it('should handle FFmpeg not installed', async () => {
      const error = new Error('FFmpeg not found');
      mockVideoService.mergeVideos.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-14',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle video processing error', async () => {
      const error = new Error('Video processing failed');
      mockVideoService.mergeVideos.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-15',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle unsupported video codec', async () => {
      const error = new Error('Unsupported codec');
      mockVideoService.extractClips.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-16',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle corrupted video file', async () => {
      const error = new Error('Invalid data found when processing input');
      mockVideoService.extractClips.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-17',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);
  });

  describe('Memory Issues', () => {
    it('should handle out of memory error', async () => {
      const error = new Error('JavaScript heap out of memory');
      mockGeminiService.analyzeVideo.mockRejectedValue(error);
      
      const videoFile: VideoFile = {
        id: 'test-18',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
    }, 15000);

    it('should handle large file processing', async () => {
      const videoFile: VideoFile = {
        id: 'test-19',
        name: 'large-video.mp4',
        path: '/test/large-video.mp4',
        size: 5000000000, // 5GB
        duration: 3600,
      };
      
      const result = await processor.processVideo(videoFile, vi.fn());
      expect(result).toBeTruthy();
    }, 15000);
  });

  describe('Concurrent Processing', () => {
    it('should handle multiple videos concurrently', async () => {
      const videoFiles = [
        { id: 'test-20', name: 'video1.mp4', path: '/test/video1.mp4', size: 1024000, duration: 60 },
        { id: 'test-21', name: 'video2.mp4', path: '/test/video2.mp4', size: 1024000, duration: 60 },
        { id: 'test-22', name: 'video3.mp4', path: '/test/video3.mp4', size: 1024000, duration: 60 },
      ];
      
      const promises = videoFiles.map(vf => processor.processVideo(vf, vi.fn()));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => typeof r === 'string')).toBe(true);
    }, 30000);

    it('should handle one failure in concurrent processing', async () => {
      mockGeminiService.analyzeVideo
        .mockResolvedValueOnce({
          highlights: [{ startTime: 0, endTime: 10, reason: 'Test', score: 0.9 }],
          subtitles: [{ startTime: 0, endTime: 5, text: 'Test' }],
        })
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({
          highlights: [{ startTime: 0, endTime: 10, reason: 'Test', score: 0.9 }],
          subtitles: [{ startTime: 0, endTime: 5, text: 'Test' }],
        });
      
      const videoFiles = [
        { id: 'test-23', name: 'video1.mp4', path: '/test/video1.mp4', size: 1024000, duration: 60 },
        { id: 'test-24', name: 'video2.mp4', path: '/test/video2.mp4', size: 1024000, duration: 60 },
        { id: 'test-25', name: 'video3.mp4', path: '/test/video3.mp4', size: 1024000, duration: 60 },
      ];
      
      const results = await Promise.allSettled(
        videoFiles.map(vf => processor.processVideo(vf, vi.fn()))
      );
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    }, 30000);
  });
});
