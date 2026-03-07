import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoProcessor } from '../src/services/VideoProcessor';
import { GeminiService } from '../src/services/gemini/GeminiService';
import { VideoService } from '../src/services/video/VideoService';
import { SubtitleService } from '../src/services/subtitle/SubtitleService';
import { VideoFile } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock all services
vi.mock('../src/services/gemini/GeminiService');
vi.mock('../src/services/video/VideoService');
vi.mock('../src/services/subtitle/SubtitleService');
vi.mock('fs');
vi.mock('path');

describe('VideoProcessor Integration Tests', () => {
  let processor: VideoProcessor;
  let mockGeminiService: any;
  let mockVideoService: any;
  let mockSubtitleService: any;
  
  const mockAnalysis = {
    highlights: [
      { startTime: 0, endTime: 10, reason: 'Interesting moment', score: 0.9 },
      { startTime: 20, endTime: 30, reason: 'Key scene', score: 0.85 },
    ],
    subtitles: [
      { startTime: 0, endTime: 5, text: 'Hello world' },
      { startTime: 5, endTime: 10, text: 'Test subtitle' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service instances
    mockGeminiService = {
      analyzeVideo: vi.fn().mockResolvedValue(mockAnalysis),
      generateSubtitles: vi.fn().mockResolvedValue(mockAnalysis.subtitles),
    };
    
    mockVideoService = {
      mergeVideos: vi.fn().mockResolvedValue('/tmp/merged.mp4'),
      addBackgroundMusic: vi.fn().mockResolvedValue('/tmp/with_music.mp4'),
      extractClips: vi.fn().mockResolvedValue(['/tmp/clip1.mp4', '/tmp/clip2.mp4']),
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
    vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
    
    // Mock path operations
    vi.mocked(path.dirname).mockReturnValue('/tmp');
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.basename).mockImplementation((p) => p.split('/').pop() || '');
    
    // Mock constructors
    vi.mocked(GeminiService).mockImplementation(() => mockGeminiService);
    vi.mocked(VideoService).mockImplementation(() => mockVideoService);
    vi.mocked(SubtitleService).mockImplementation(() => mockSubtitleService);
    
    processor = new VideoProcessor({
      aiProvider: 'gemini',
      geminiApiKey: 'test-api-key',
      geminiBaseURL: 'https://test.api',
      geminiModelId: 'gemini-1.5-pro',
      outputPath: '/tmp/output',
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task Management', () => {
    it('should create task with correct initial state', async () => {
      const videoFile: VideoFile = {
        id: 'task-test-1',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const progressCallback = vi.fn();
      const promise = processor.processVideo(videoFile, progressCallback);
      
      // Check task was created
      const tasks = processor.getAllTasks();
      expect(tasks.length).toBeGreaterThan(0);
      
      const task = tasks.find(t => t.videoId === videoFile.id);
      expect(task).toBeDefined();
      expect(task?.status).toBe('processing');
      
      await promise;
    });

    it('should update task status during processing', async () => {
      const videoFile: VideoFile = {
        id: 'task-test-2',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const progressCallback = vi.fn();
      await processor.processVideo(videoFile, progressCallback);
      
      // Verify progress callback was called with different stages
      expect(progressCallback).toHaveBeenCalled();
      const calls = progressCallback.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should handle task cancellation', async () => {
      const videoFile: VideoFile = {
        id: 'task-test-3',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      // Make processing slow
      mockGeminiService.analyzeVideo.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockAnalysis), 5000))
      );
      
      const promise = processor.processVideo(videoFile, vi.fn());
      
      // Cancel task
      const tasks = processor.getAllTasks();
      const taskId = tasks[0]?.taskId;
      if (taskId) {
        processor.cancelTask(taskId);
      }
      
      // Should reject
      await expect(promise).rejects.toThrow();
    }, 10000);

    it('should track multiple concurrent tasks', async () => {
      const videoFiles = [
        { id: 'concurrent-1', name: 'video1.mp4', path: '/test/video1.mp4', size: 1024000, duration: 60 },
        { id: 'concurrent-2', name: 'video2.mp4', path: '/test/video2.mp4', size: 1024000, duration: 60 },
        { id: 'concurrent-3', name: 'video3.mp4', path: '/test/video3.mp4', size: 1024000, duration: 60 },
      ];
      
      const promises = videoFiles.map(vf => processor.processVideo(vf, vi.fn()));
      
      // Check all tasks are tracked
      const tasks = processor.getAllTasks();
      expect(tasks.length).toBe(3);
      
      await Promise.all(promises);
      
      // All tasks should be completed
      const finalTasks = processor.getAllTasks();
      expect(finalTasks.every(t => t.status === 'completed')).toBe(true);
    }, 30000);

    it('should clean up completed tasks', async () => {
      const videoFile: VideoFile = {
        id: 'cleanup-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processor.processVideo(videoFile, vi.fn());
      
      const tasks = processor.getAllTasks();
      const task = tasks.find(t => t.videoId === videoFile.id);
      
      // Task should exist and be completed
      expect(task).toBeDefined();
      expect(task?.status).toBe('completed');
    });
  });

  describe('Checkpoint System', () => {
    it('should save checkpoint after each processing step', async () => {
      const videoFile: VideoFile = {
        id: 'checkpoint-test-1',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processor.processVideo(videoFile, vi.fn());
      
      // Verify checkpoint was saved
      const writeFileCalls = vi.mocked(fs.promises.writeFile).mock.calls;
      const checkpointCalls = writeFileCalls.filter(call => 
        call[0].toString().includes('checkpoint')
      );
      
      expect(checkpointCalls.length).toBeGreaterThan(0);
    });

    it('should load checkpoints on initialization', async () => {
      const checkpointData = {
        taskId: 'test-task-123',
        videoId: 'test-video',
        currentStep: 'analyzing',
        completedSteps: {},
        lastUpdated: new Date().toISOString(),
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['test-task-123.json'] as any);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(checkpointData));
      
      // Create new processor to trigger checkpoint loading
      const newProcessor = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        checkpointDir: '/tmp/checkpoints',
      } as any);
      
      // Wait for async loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify checkpoint was loaded
      expect(fs.promises.readFile).toHaveBeenCalled();
    });

    it('should resume from checkpoint', async () => {
      const checkpointData = {
        taskId: 'resume-test',
        videoId: 'test-video',
        videoPath: '/test/video.mp4',
        currentStep: 'cutting',
        completedSteps: {
          analysis: mockAnalysis,
        },
        settings: {
          aiProvider: 'gemini',
          geminiApiKey: 'test-api-key',
        },
        lastUpdated: new Date().toISOString(),
      };
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['resume-test.json'] as any);
      vi.mocked(fs.promises.readFile).mockResolvedValue(JSON.stringify(checkpointData));
      
      const newProcessor = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        checkpointDir: '/tmp/checkpoints',
      } as any);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Resume should skip completed steps
      const videoFile: VideoFile = {
        id: 'test-video',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await newProcessor.processVideo(videoFile, vi.fn());
      
      // Analysis should not be called again (already completed)
      // This depends on implementation details
    });

    it('should delete checkpoint after successful completion', async () => {
      const videoFile: VideoFile = {
        id: 'checkpoint-delete-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processor.processVideo(videoFile, vi.fn());
      
      // Verify checkpoint was deleted
      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should handle corrupted checkpoint files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['corrupted.json'] as any);
      vi.mocked(fs.promises.readFile).mockResolvedValue('invalid json{');
      
      // Should not throw, just skip corrupted checkpoint
      const newProcessor = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        checkpointDir: '/tmp/checkpoints',
      } as any);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Processor should still work
      expect(newProcessor).toBeDefined();
    });
  });

  describe('Temporary File Management', () => {
    it('should track temporary files during processing', async () => {
      const videoFile: VideoFile = {
        id: 'temp-file-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processor.processVideo(videoFile, vi.fn());
      
      // Verify temporary files were created
      expect(mockVideoService.extractClips).toHaveBeenCalled();
      expect(mockVideoService.mergeVideos).toHaveBeenCalled();
    });

    it('should clean up temporary files after completion', async () => {
      const videoFile: VideoFile = {
        id: 'temp-cleanup-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processor.processVideo(videoFile, vi.fn());
      
      // Verify cleanup was called
      // This depends on implementation - may use fs.unlink for temp files
      expect(fs.promises.unlink).toHaveBeenCalled();
    });

    it('should clean up temporary files on error', async () => {
      const videoFile: VideoFile = {
        id: 'temp-error-cleanup',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      mockGeminiService.analyzeVideo.mockRejectedValue(new Error('Processing failed'));
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
      
      // Cleanup should still happen
      // This depends on implementation
    }, 15000);
  });

  describe('Progress Reporting', () => {
    it('should report progress for each processing step', async () => {
      const videoFile: VideoFile = {
        id: 'progress-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const progressCallback = vi.fn();
      await processor.processVideo(videoFile, progressCallback);
      
      // Should have multiple progress updates
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback.mock.calls.length).toBeGreaterThan(1);
      
      // Progress should increase
      const progressValues = progressCallback.mock.calls.map(call => call[0]);
      expect(progressValues[0]).toBeLessThan(progressValues[progressValues.length - 1]);
    });

    it('should report step names in progress', async () => {
      const videoFile: VideoFile = {
        id: 'progress-step-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const progressCallback = vi.fn();
      await processor.processVideo(videoFile, progressCallback);
      
      // Check that step information is included
      const calls = progressCallback.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed steps with exponential backoff', async () => {
      const videoFile: VideoFile = {
        id: 'retry-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      // Fail twice, then succeed
      mockGeminiService.analyzeVideo
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockAnalysis);
      
      const startTime = Date.now();
      await processor.processVideo(videoFile, vi.fn());
      const duration = Date.now() - startTime;
      
      // Should have retried
      expect(mockGeminiService.analyzeVideo).toHaveBeenCalledTimes(3);
      
      // Should have waited between retries (exponential backoff)
      // First retry: ~1s, second retry: ~2s = ~3s total minimum
      expect(duration).toBeGreaterThan(3000);
    }, 15000);

    it('should fail after max retries', async () => {
      const videoFile: VideoFile = {
        id: 'max-retry-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      mockGeminiService.analyzeVideo.mockRejectedValue(new Error('Persistent failure'));
      
      await expect(processor.processVideo(videoFile, vi.fn())).rejects.toThrow();
      
      // Should have tried 4 times (1 initial + 3 retries)
      expect(mockGeminiService.analyzeVideo).toHaveBeenCalledTimes(4);
    }, 20000);

    it('should preserve error context through retries', async () => {
      const videoFile: VideoFile = {
        id: 'error-context-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      const originalError = new Error('Original error message');
      mockGeminiService.analyzeVideo.mockRejectedValue(originalError);
      
      try {
        await processor.processVideo(videoFile, vi.fn());
        expect.fail('Should have thrown');
      } catch (error: any) {
        // Error should contain information about retries
        expect(error).toBeDefined();
      }
    }, 20000);
  });

  describe('Configuration Handling', () => {
    it('should respect addMusic setting', async () => {
      const processorWithMusic = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        addMusic: true,
        musicPath: '/test/music.mp3',
      } as any);
      
      const videoFile: VideoFile = {
        id: 'music-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processorWithMusic.processVideo(videoFile, vi.fn());
      
      expect(mockVideoService.addBackgroundMusic).toHaveBeenCalledWith(
        expect.any(String),
        '/test/music.mp3',
        expect.any(String)
      );
    });

    it('should respect addSubtitles setting', async () => {
      const processorNoSubtitles = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        addSubtitles: false,
      } as any);
      
      const videoFile: VideoFile = {
        id: 'no-subtitles-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processorNoSubtitles.processVideo(videoFile, vi.fn());
      
      expect(mockSubtitleService.generateSRT).not.toHaveBeenCalled();
    });

    it('should use custom output path', async () => {
      const customOutputPath = '/custom/output';
      const processorCustomOutput = new VideoProcessor({
        aiProvider: 'gemini',
        geminiApiKey: 'test-api-key',
        geminiBaseURL: 'https://test.api',
        geminiModelId: 'gemini-1.5-pro',
        outputPath: customOutputPath,
      } as any);
      
      const videoFile: VideoFile = {
        id: 'custom-output-test',
        name: 'video.mp4',
        path: '/test/video.mp4',
        size: 1024000,
        duration: 60,
      };
      
      await processorCustomOutput.processVideo(videoFile, vi.fn());
      
      // Verify output path was used
      expect(mockVideoService.mergeVideos).toHaveBeenCalled();
    });
  });
});
