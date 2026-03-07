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

export class VideoService {
  /**
   * 解析 FPS 字符串 (例如 "30/1" -> 30)
   */
  private parseFPS(fpsString: string): number {
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0]);
      const denominator = parseFloat(parts[1]);
      return denominator !== 0 ? numerator / denominator : 30;
    }
    return parseFloat(fpsString) || 30;
  }

  /**
   * 获取视频信息
   */
  async getVideoInfo(videoPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('未找到视频流'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFPS(videoStream.r_frame_rate || '30/1'),
          codec: videoStream.codec_name || 'unknown',
          bitrate: metadata.format.bit_rate || 0,
        });
      });
    });
  }

  /**
   * 剪辑单个视频片段
   */
  async cutVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration)
        .output(outputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-c:a aac',
          '-b:a 192k'
        ]);

      if (onProgress) {
        command.on('progress', (progress) => {
          if (progress.percent) {
            onProgress(Math.round(progress.percent));
          }
        });
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * 合并多个视频片段
   */
  async mergeVideos(
    segments: VideoSegment[],
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    if (segments.length === 0) {
      throw new Error('没有要合并的片段');
    }

    // 如果只有一个片段，直接剪辑
    if (segments.length === 1) {
      const seg = segments[0];
      return this.cutVideo(
        seg.inputFile,
        outputPath,
        seg.startTime,
        seg.endTime - seg.startTime,
        onProgress
      );
    }

    // 多个片段：先剪辑每个片段，然后合并
    const tempDir = path.join(path.dirname(outputPath), 'temp_segments');
    await fs.promises.mkdir(tempDir, { recursive: true });

    try {
      // 剪辑所有片段
      const tempFiles: string[] = [];
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const tempFile = path.join(tempDir, `segment_${i}.mp4`);
        
        await this.cutVideo(
          seg.inputFile,
          tempFile,
          seg.startTime,
          seg.endTime - seg.startTime,
          (percent) => {
            if (onProgress) {
              const totalProgress = ((i + percent / 100) / segments.length) * 50;
              onProgress(Math.round(totalProgress));
            }
          }
        );

        tempFiles.push(tempFile);
      }

      // 创建合并列表文件
      const listFile = path.join(tempDir, 'concat_list.txt');
      const listContent = tempFiles.map(f => `file '${f}'`).join('\n');
      await fs.promises.writeFile(listFile, listContent);

      // 合并视频
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(listFile)
          .inputOptions(['-f concat', '-safe 0'])
          .outputOptions(['-c copy'])
          .output(outputPath)
          .on('progress', (progress) => {
            if (onProgress && progress.percent) {
              const totalProgress = 50 + Math.round(progress.percent / 2);
              onProgress(totalProgress);
            }
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // 清理临时文件
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 清理临时文件
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * 添加字幕
   */
  async addSubtitles(
    videoPath: string,
    subtitlePath: string,
    outputPath: string,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // 转义字幕路径中的特殊字符
      const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');

      ffmpeg(videoPath)
        .outputOptions([
          `-vf subtitles='${escapedSubPath}'`,
          '-c:a copy'
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.round(progress.percent));
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * 添加背景音乐
   */
  async addBackgroundMusic(
    videoPath: string,
    audioPath: string,
    outputPath: string,
    volume: number = 0.3,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
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
        .output(outputPath)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.round(progress.percent));
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }

  /**
   * 生成视频缩略图
   */
  async generateThumbnail(
    videoPath: string,
    outputPath: string,
    timeInSeconds: number = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timeInSeconds],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '320x240'
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  /**
   * 转换视频格式
   */
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
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${settings.scale}`,
          `-c:v libx264`,
          `-preset ${settings.preset}`,
          `-crf ${settings.crf}`,
          '-c:a aac',
          '-b:a 192k'
        ])
        .output(outputPath)
        .on('progress', (progress) => {
          if (onProgress && progress.percent) {
            onProgress(Math.round(progress.percent));
          }
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });
  }
}
