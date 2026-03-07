import { describe, it, expect, beforeEach } from 'vitest';
import { SubtitleService } from '../src/services/subtitle/SubtitleService';

describe('SubtitleService', () => {
  let service: SubtitleService;

  beforeEach(() => {
    service = new SubtitleService();
  });

  describe('formatTime', () => {
    it('should format seconds to SRT time format', () => {
      expect(service['formatTime'](0)).toBe('00:00:00,000');
      expect(service['formatTime'](65.5)).toBe('00:01:05,500');
      expect(service['formatTime'](3661.123)).toBe('01:01:01,123');
    });
  });

  describe('parseTime', () => {
    it('should parse SRT time format to seconds', () => {
      expect(service['parseTime']('00:00:00,000')).toBe(0);
      expect(service['parseTime']('00:01:05,500')).toBe(65.5);
      expect(service['parseTime']('01:01:01,123')).toBeCloseTo(3661.123, 2);
    });
  });

  describe('generateSRT', () => {
    it('should generate valid SRT format', () => {
      const subtitles = [
        { startTime: 0, endTime: 3, text: 'Hello' },
        { startTime: 3.5, endTime: 6, text: 'World' },
      ];

      const srt = service.generateSRT(subtitles);

      expect(srt).toContain('1\n00:00:00,000 --> 00:00:03,000\nHello');
      expect(srt).toContain('2\n00:00:03,500 --> 00:00:06,000\nWorld');
    });
  });

  describe('parseSRT', () => {
    it('should parse SRT format correctly', () => {
      const srt = `1
00:00:00,000 --> 00:00:03,000
Hello

2
00:00:03,500 --> 00:00:06,000
World
`;

      const subtitles = service.parseSRT(srt);

      expect(subtitles).toHaveLength(2);
      expect(subtitles[0]).toEqual({
        startTime: 0,
        endTime: 3,
        text: 'Hello',
      });
      expect(subtitles[1]).toEqual({
        startTime: 3.5,
        endTime: 6,
        text: 'World',
      });
    });
  });
});
