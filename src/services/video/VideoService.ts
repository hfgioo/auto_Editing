import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

export interface VideoSegment {
  startTime: number;
  endTime: number;
  inputFile: string;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
}

type HighlightLike = {
  startTime: number;
  endTime: number;
  reason?: string;
  score?: number;
};

export class VideoService {
  private parseFPS(fpsString: string): number {
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      return denominator !== 0 ? numerator / denominator : 30;
    }
    return parseFloat(fpsString) || 30;
  }

  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      (ffmpeg as any).ffprobe(videoPath, (err: Error | null, metadata: any) => {
        if (err) return reject(err);
        const videoStream = metadata?.streams?.find((s: any) => s.codec_type === 'video');
        if (!videoStream) return reject(new Error('未找到视频流'));
        resolve({
          duration: metadata?.format?.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFPS(videoStream.r_frame_rate || '30/1'),
          codec: videoStream.codec_name || 'unknown',
          bitrate: metadata?.format?.bit_rate || 0,
        });
      });
    });
  }

  async extractClips(videoPath: string, highlights: HighlightLike[], outputDir: string): Promise<string[]> {
    if (!highlights || highlights.length === 0) return [];
    const outputs: string[] = [];

    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i];
      const outputPath = path.join(outputDir, `clip_${i}.mp4`);
      await new Promise<void>((resolve, reject) => {
        (ffmpeg as any)(videoPath)
          .setStartTime(highlight.startTime)
          .setDuration(highlight.endTime - highlight.startTime)
          .output(outputPath)
          .on('progress', () => {})
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });
      outputs.push(outputPath);
    }
    return outputs;
  }

  async mergeVideos(
    input: string[] | VideoSegment[],
    outputPath: string,
    _onProgress?: (percent: number) => void
  ): Promise<string> {
    if (!input || input.length === 0) {
      throw new Error('没有要合并的片段');
    }

    // 兼容测试场景：直接合并剪辑文件
    if (typeof input[0] === 'string') {
      const clips = input as string[];
      return new Promise<string>((resolve, reject) => {
        const cmd = (ffmpeg as any)();
        clips.forEach((clip) => cmd.input(clip));
        cmd
          .videoCodec('libx264')
          .audioCodec('aac')
          .on('progress', () => {})
          .on('end', () => resolve(outputPath))
          .on('error', (err: Error) => reject(err))
          .mergeToFile(outputPath, path.dirname(outputPath));
      });
    }

    // 生产场景：按时间段切片后合并
    const segments = input as VideoSegment[];
    const tempDir = path.join(path.dirname(outputPath), `segments_${Date.now()}`);
    await fs.promises.mkdir(tempDir, { recursive: true });
    try {
      const clips = await this.extractClips(
        segments[0].inputFile,
        segments.map((s) => ({ startTime: s.startTime, endTime: s.endTime })),
        tempDir
      );
      return this.mergeVideos(clips, outputPath, _onProgress);
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      (ffmpeg as any)(videoPath)
        .outputOptions([`-vf subtitles='${escapedSubPath}'`, '-c:a copy'])
        .output(outputPath)
        .on('progress', (progress: any) => {
          if (onProgress && progress?.percent) onProgress(Math.round(progress.percent));
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  async addBackgroundMusic(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    volume: number = 0.3,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let started = false;
      const command = (ffmpeg as any)()
        .input(videoPath)
        .input(audioPath)
        .complexFilter([
          `[1:a]volume=${volume}[a1]`,
          '[0:a][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]'
        ])
        .outputOptions([
          '-map 0:v',
          '-map [aout]',
          '-c:v copy',
          '-c:a aac',
          '-b:a 192k'
        ])
        .audioCodec('aac')
        .on('progress', (progress: any) => {
          if (onProgress && progress?.percent) onProgress(Math.round(progress.percent));
        })
        .on('end', () => {
          if (!started) return;
          setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve(outputPath);
          }, 0);
        })
        .on('error', (err: Error) => {
          if (!started) return;
          if (settled) return;
          settled = true;
          reject(err);
        });
      started = true;
      command.save(outputPath);
    });
  }

  async convertVideo(
    inputPath: string,
    outputPath: string,
    quality: 'low' | 'medium' | 'high' | 'ultra' = 'high',
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const qualitySettings = {
      low: { crf: 28, preset: 'veryfast', scale: '1280:720' },
      medium: { crf: 23, preset: 'medium', scale: '1920:1080' },
      high: { crf: 20, preset: 'slow', scale: '1920:1080' },
      ultra: { crf: 18, preset: 'slower', scale: '3840:2160' }
    };
    const settings = qualitySettings[quality];

    return new Promise((resolve, reject) => {
      (ffmpeg as any)(inputPath)
        .outputOptions([
          `-vf scale=${settings.scale}`,
          '-c:v libx264',
          `-preset ${settings.preset}`,
          `-crf ${settings.crf}`,
          '-c:a aac',
          '-b:a 192k'
        ])
        .output(outputPath)
        .on('progress', (progress: any) => {
          if (onProgress && progress?.percent) onProgress(Math.round(progress.percent));
        })
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }
}
