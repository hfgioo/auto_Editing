import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoService } from '../src/services/video/VideoService';
import ffmpeg from 'fluent-ffmpeg';

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg');

describe('VideoService', () => {
  let service: VideoService;
  let mockFfmpegCommand: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock ffmpeg command chain
    mockFfmpegCommand = {
      input: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      outputOptions: vi.fn().mockReturnThis(),
      videoCodec: vi.fn().mockReturnThis(),
      audioCodec: vi.fn().mockReturnThis(),
      size: vi.fn().mockReturnThis(),
      fps: vi.fn().mockReturnThis(),
      duration: vi.fn().mockReturnThis(),
      seek: vi.fn().mockReturnThis(),
      setStartTime: vi.fn().mockReturnThis(),
      setDuration: vi.fn().mockReturnThis(),
      complexFilter: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      run: vi.fn(),
      save: vi.fn(),
      mergeToFile: vi.fn(),
    };
    
    // Mock ffmpeg constructor
    vi.mocked(ffmpeg).mockReturnValue(mockFfmpegCommand as any);
    
    service = new VideoService();
  });

  describe('extractClips', () => {
    it('should extract clips from video based on highlights', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip 1', score: 0.9 },
        { startTime: 20, endTime: 30, reason: 'Clip 2', score: 0.85 },
      ];
      const outputDir = '/test/output';
      
      // Mock successful extraction
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      const result = await service.extractClips(videoPath, highlights, outputDir);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('clip_0.mp4');
      expect(result[1]).toContain('clip_1.mp4');
      expect(ffmpeg).toHaveBeenCalledTimes(2);
    });

    it('should handle empty highlights array', async () => {
      const videoPath = '/test/video.mp4';
      const highlights: any[] = [];
      const outputDir = '/test/output';
      
      const result = await service.extractClips(videoPath, highlights, outputDir);
      
      expect(result).toHaveLength(0);
      expect(ffmpeg).not.toHaveBeenCalled();
    });

    it('should handle extraction errors', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip 1', score: 0.9 },
      ];
      const outputDir = '/test/output';
      
      // Mock error
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Extraction failed')), 0);
        }
        return mockFfmpegCommand;
      });
      
      await expect(service.extractClips(videoPath, highlights, outputDir)).rejects.toThrow();
    });

    it('should use correct time ranges for clips', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 5.5, endTime: 15.7, reason: 'Precise clip', score: 0.9 },
      ];
      const outputDir = '/test/output';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      await service.extractClips(videoPath, highlights, outputDir);
      
      expect(mockFfmpegCommand.setStartTime).toHaveBeenCalledWith(5.5);
      expect(mockFfmpegCommand.setDuration).toHaveBeenCalledWith(10.2); // 15.7 - 5.5
    });

    it('should handle overlapping highlights', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip 1', score: 0.9 },
        { startTime: 5, endTime: 15, reason: 'Clip 2', score: 0.85 },
      ];
      const outputDir = '/test/output';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      const result = await service.extractClips(videoPath, highlights, outputDir);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('mergeVideos', () => {
    it('should merge multiple video clips', async () => {
      const clips = ['/test/clip1.mp4', '/test/clip2.mp4', '/test/clip3.mp4'];
      const outputPath = '/test/merged.mp4';
      
      // Mock mergeToFile to call callback immediately
      mockFfmpegCommand.mergeToFile.mockImplementation((output: string, tmpDir: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.on.mockReturnValue(mockFfmpegCommand);
      
      const result = await service.mergeVideos(clips, outputPath);
      
      expect(result).toBe(outputPath);
      expect(ffmpeg).toHaveBeenCalled();
    });

    it('should handle single clip', async () => {
      const clips = ['/test/clip1.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.mergeToFile.mockImplementation((output: string, tmpDir: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.on.mockReturnValue(mockFfmpegCommand);
      
      const result = await service.mergeVideos(clips, outputPath);
      
      expect(result).toBe(outputPath);
    });

    it('should handle empty clips array', async () => {
      const clips: string[] = [];
      const outputPath = '/test/merged.mp4';
      
      await expect(service.mergeVideos(clips, outputPath)).rejects.toThrow();
    });

    it('should handle merge errors', async () => {
      const clips = ['/test/clip1.mp4', '/test/clip2.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.mergeToFile.mockImplementation((output: string, tmpDir: string) => {
        setTimeout(() => {
          const errorCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'error'
          )?.[1];
          if (errorCallback) errorCallback(new Error('Merge failed'));
        }, 0);
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.on.mockReturnValue(mockFfmpegCommand);
      
      await expect(service.mergeVideos(clips, outputPath)).rejects.toThrow();
    });

    it('should use correct video codec', async () => {
      const clips = ['/test/clip1.mp4', '/test/clip2.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.mergeToFile.mockImplementation((output: string, tmpDir: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.on.mockReturnValue(mockFfmpegCommand);
      
      await service.mergeVideos(clips, outputPath);
      
      expect(mockFfmpegCommand.videoCodec).toHaveBeenCalled();
    });
  });

  describe('addBackgroundMusic', () => {
    it('should add background music to video', async () => {
      const videoPath = '/test/video.mp4';
      const musicPath = '/test/music.mp3';
      const outputPath = '/test/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.save.mockImplementation((output: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      const result = await service.addBackgroundMusic(videoPath, musicPath, outputPath);
      
      expect(result).toBe(outputPath);
      expect(ffmpeg).toHaveBeenCalled();
      expect(mockFfmpegCommand.input).toHaveBeenCalledWith(videoPath);
      expect(mockFfmpegCommand.input).toHaveBeenCalledWith(musicPath);
    });

    it('should handle music addition errors', async () => {
      const videoPath = '/test/video.mp4';
      const musicPath = '/test/music.mp3';
      const outputPath = '/test/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Music addition failed')), 0);
        }
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.save.mockImplementation((output: string) => {
        setTimeout(() => {
          const errorCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'error'
          )?.[1];
          if (errorCallback) errorCallback(new Error('Music addition failed'));
        }, 0);
        return mockFfmpegCommand;
      });
      
      await expect(service.addBackgroundMusic(videoPath, musicPath, outputPath)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should handle missing music file', async () => {
      const videoPath = '/test/video.mp4';
      const musicPath = '/nonexistent/music.mp3';
      const outputPath = '/test/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('No such file')), 0);
        }
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.save.mockImplementation((output: string) => {
        setTimeout(() => {
          const errorCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'error'
          )?.[1];
          if (errorCallback) errorCallback(new Error('No such file'));
        }, 0);
        return mockFfmpegCommand;
      });
      
      await expect(service.addBackgroundMusic(videoPath, musicPath, outputPath)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should use audio codec for music', async () => {
      const videoPath = '/test/video.mp4';
      const musicPath = '/test/music.mp3';
      const outputPath = '/test/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.save.mockImplementation((output: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      await service.addBackgroundMusic(videoPath, musicPath, outputPath);
      
      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalled();
    });

    it('should handle music longer than video', async () => {
      const videoPath = '/test/short_video.mp4';
      const musicPath = '/test/long_music.mp3';
      const outputPath = '/test/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      mockFfmpegCommand.save.mockImplementation((output: string) => {
        setTimeout(() => {
          const endCallback = mockFfmpegCommand.on.mock.calls.find(
            (call: any) => call[0] === 'end'
          )?.[1];
          if (endCallback) endCallback();
        }, 0);
        return mockFfmpegCommand;
      });
      
      const result = await service.addBackgroundMusic(videoPath, musicPath, outputPath);
      
      expect(result).toBe(outputPath);
    });
  });

  describe('getVideoInfo', () => {
    it('should get video metadata', async () => {
      const videoPath = '/test/video.mp4';
      const mockMetadata = {
        format: {
          duration: 60,
          size: 1024000,
          bit_rate: 128000,
        },
        streams: [
          {
            codec_type: 'video',
            width: 1920,
            height: 1080,
            r_frame_rate: '30/1',
          },
        ],
      };
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(mockMetadata), 0);
        }
        return mockFfmpegCommand;
      });
      
      // Mock ffprobe
      (ffmpeg as any).ffprobe = vi.fn((path: string, callback: Function) => {
        callback(null, mockMetadata);
      });
      
      const result = await service.getVideoInfo(videoPath);
      
      expect(result).toBeDefined();
      expect(result.duration).toBe(60);
    });

    it('should handle missing video file', async () => {
      const videoPath = '/nonexistent/video.mp4';
      
      (ffmpeg as any).ffprobe = vi.fn((path: string, callback: Function) => {
        callback(new Error('File not found'), null);
      });
      
      await expect(service.getVideoInfo(videoPath)).rejects.toThrow();
    });

    it('should handle corrupted video file', async () => {
      const videoPath = '/test/corrupted.mp4';
      
      (ffmpeg as any).ffprobe = vi.fn((path: string, callback: Function) => {
        callback(new Error('Invalid data'), null);
      });
      
      await expect(service.getVideoInfo(videoPath)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle FFmpeg not installed', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip', score: 0.9 },
      ];
      const outputDir = '/test/output';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('FFmpeg not found')), 0);
        }
        return mockFfmpegCommand;
      });
      
      await expect(service.extractClips(videoPath, highlights, outputDir)).rejects.toThrow();
    });

    it('should handle disk space errors', async () => {
      const clips = ['/test/clip1.mp4', '/test/clip2.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('ENOSPC: no space left')), 0);
        }
        return mockFfmpegCommand;
      });
      
      await expect(service.mergeVideos(clips, outputPath)).rejects.toThrow();
    });

    it('should handle permission errors', async () => {
      const videoPath = '/test/video.mp4';
      const musicPath = '/test/music.mp3';
      const outputPath = '/readonly/with_music.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('EACCES: permission denied')), 0);
        }
        return mockFfmpegCommand;
      });
      
      await expect(service.addBackgroundMusic(videoPath, musicPath, outputPath)).rejects.toThrow();
    });

    it('should handle codec errors', async () => {
      const clips = ['/test/clip1.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Unsupported codec')), 0);
        }
        return mockFfmpegCommand;
      });
      
      await expect(service.mergeVideos(clips, outputPath)).rejects.toThrow();
    });
  });

  describe('Progress Tracking', () => {
    it('should track extraction progress', async () => {
      const videoPath = '/test/video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip', score: 0.9 },
      ];
      const outputDir = '/test/output';
      
      const progressCallback = vi.fn();
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          setTimeout(() => callback({ percent: 50 }), 0);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return mockFfmpegCommand;
      });
      
      await service.extractClips(videoPath, highlights, outputDir);
      
      // Progress tracking depends on implementation
      expect(mockFfmpegCommand.on).toHaveBeenCalledWith('progress', expect.any(Function));
    });

    it('should track merge progress', async () => {
      const clips = ['/test/clip1.mp4', '/test/clip2.mp4'];
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'progress') {
          setTimeout(() => callback({ percent: 75 }), 0);
        }
        if (event === 'end') {
          setTimeout(() => callback(), 10);
        }
        return mockFfmpegCommand;
      });
      
      await service.mergeVideos(clips, outputPath);
      
      expect(mockFfmpegCommand.on).toHaveBeenCalledWith('progress', expect.any(Function));
    });
  });

  describe('Performance', () => {
    it('should handle large number of clips', async () => {
      const clips = Array.from({ length: 100 }, (_, i) => `/test/clip${i}.mp4`);
      const outputPath = '/test/merged.mp4';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      const result = await service.mergeVideos(clips, outputPath);
      
      expect(result).toBe(outputPath);
    }, 10000);

    it('should handle very long videos', async () => {
      const videoPath = '/test/long_video.mp4';
      const highlights = [
        { startTime: 0, endTime: 10, reason: 'Clip 1', score: 0.9 },
        { startTime: 3600, endTime: 3610, reason: 'Clip 2', score: 0.85 },
      ];
      const outputDir = '/test/output';
      
      mockFfmpegCommand.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockFfmpegCommand;
      });
      
      const result = await service.extractClips(videoPath, highlights, outputDir);
      
      expect(result).toHaveLength(2);
    });
  });
});
