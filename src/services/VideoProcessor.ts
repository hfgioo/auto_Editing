import { AIService } from './ai/AIService';
import { VideoService } from './video/VideoService';
import { SubtitleService } from './subtitle/SubtitleService';
import { ProcessTask, VideoFile, AppSettings } from '../types';
import * as path from 'path';
import * as fs from 'fs';

export class VideoProcessor {
  private ai: AIService;
  private video: VideoService;
  private subtitle: SubtitleService;
  private settings: AppSettings;

  constructor(settings: AppSettings & { aiProvider?: 'gemini' | 'openai'; aiBaseURL?: string }) {
    this.settings = settings;
    
    this.ai = new AIService({
      ...settings,
      aiProvider: settings.aiProvider || 'gemini',
    });
    this.video = new VideoService();
    this.subtitle = new SubtitleService();
  }

  /**
   * 处理单个视频
   */
  async processVideo(
    file: VideoFile,
    onProgress: (task: ProcessTask) => void
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random()}`;
    const outputDir = this.settings.outputPath || path.dirname(file.path);
    const baseName = path.basename(file.name, path.extname(file.name));

    // 创建输出目录
    const projectDir = path.join(outputDir, `${baseName}_edited_${Date.now()}`);
    await fs.promises.mkdir(projectDir, { recursive: true });

    let task: ProcessTask = {
      id: taskId,
      videoId: file.id,
      status: 'processing',
      progress: 0,
      currentStep: 'analyze',
      steps: [
        { step: 'upload', status: 'completed', progress: 100 },
        { step: 'analyze', status: 'processing', progress: 0 },
        { step: 'cut', status: 'waiting', progress: 0 },
        { step: 'subtitle', status: 'waiting', progress: 0 },
        { step: 'music', status: 'waiting', progress: 0 },
        { step: 'render', status: 'waiting', progress: 0 },
      ]
    };

    try {
      console.log('[VideoProcessor] 开始处理:', file.name);

      // ========== Step 1: AI 分析 ==========
      onProgress(task);
      console.log('[VideoProcessor] Step 1: AI 分析视频...');

      const analysis = await this.ai.analyzeVideo(file.path);
      console.log('[VideoProcessor] AI 分析完成:', {
        highlights: analysis.highlights.length,
        transcription: analysis.transcription.length,
        summary: analysis.summary.substring(0, 50) + '...',
      });

      task.steps[1] = { step: 'analyze', status: 'completed', progress: 100 };
      task.currentStep = 'cut';
      task.steps[2] = { step: 'cut', status: 'processing', progress: 0 };
      task.progress = 20;
      onProgress(task);

      // ========== Step 2: 视频剪辑 ==========
      console.log('[VideoProcessor] Step 2: 视频剪辑...');

      let cutOutputPath: string;

      if (analysis.highlights.length > 0) {
        // 选择评分最高的片段（最多5个）
        const topHighlights = analysis.highlights
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .sort((a, b) => a.startTime - b.startTime);

        console.log('[VideoProcessor] 选择的精彩片段:', topHighlights.map(h => ({
          time: `${h.startTime}-${h.endTime}`,
          score: h.score,
          desc: h.description,
        })));

        const segments = topHighlights.map(h => ({
          startTime: h.startTime,
          endTime: h.endTime,
          inputFile: file.path
        }));

        cutOutputPath = path.join(projectDir, `${baseName}_cut.mp4`);
        
        await this.video.mergeVideos(segments, cutOutputPath, (percent) => {
          task.steps[2].progress = percent;
          task.progress = 20 + (percent * 0.3);
          onProgress(task);
        });

        console.log('[VideoProcessor] 视频剪辑完成:', cutOutputPath);
      } else {
        console.log('[VideoProcessor] 没有找到精彩片段，使用原视频');
        cutOutputPath = file.path;
      }

      task.steps[2] = { step: 'cut', status: 'completed', progress: 100 };
      task.currentStep = 'subtitle';
      task.steps[3] = { step: 'subtitle', status: 'processing', progress: 0 };
      task.progress = 50;
      onProgress(task);

      // ========== Step 3: 字幕生成 ==========
      let subtitledPath = cutOutputPath;

      if (this.settings.autoSubtitle && analysis.transcription.length > 0) {
        console.log('[VideoProcessor] Step 3: 生成字幕...');

        const subtitles = analysis.transcription.map(t => ({
          startTime: t.startTime,
          endTime: t.endTime,
          text: t.text
        }));

        const srtPath = path.join(projectDir, `${baseName}.srt`);
        await this.subtitle.saveSRT(subtitles, srtPath);
        console.log('[VideoProcessor] 字幕文件已保存:', srtPath);

        subtitledPath = path.join(projectDir, `${baseName}_subtitled.mp4`);
        await this.video.addSubtitles(cutOutputPath, srtPath, subtitledPath, (percent) => {
          task.steps[3].progress = percent;
          task.progress = 50 + (percent * 0.25);
          onProgress(task);
        });

        console.log('[VideoProcessor] 字幕已嵌入:', subtitledPath);
      } else {
        console.log('[VideoProcessor] 跳过字幕生成');
      }

      task.steps[3] = { step: 'subtitle', status: 'completed', progress: 100 };
      task.currentStep = 'music';
      task.steps[4] = { step: 'music', status: 'processing', progress: 0 };
      task.progress = 75;
      onProgress(task);

      // ========== Step 4: 背景音乐 ==========
      let finalPath = subtitledPath;

      if (this.settings.autoMusic) {
        console.log('[VideoProcessor] Step 4: 添加背景音乐...');
        console.log('[VideoProcessor] 建议音乐风格:', analysis.suggestedMusic);
        
        // TODO: 从音乐库中选择合适的音乐
        // 目前跳过音乐添加
        console.log('[VideoProcessor] 音乐库功能待实现，跳过');
      } else {
        console.log('[VideoProcessor] 跳过背景音乐');
      }

      task.steps[4] = { step: 'music', status: 'completed', progress: 100 };
      task.currentStep = 'render';
      task.steps[5] = { step: 'render', status: 'processing', progress: 0 };
      task.progress = 90;
      onProgress(task);

      // ========== Step 5: 最终渲染 ==========
      console.log('[VideoProcessor] Step 5: 最终渲染...');

      const finalOutputPath = path.join(projectDir, `${baseName}_final.mp4`);
      
      // 根据质量设置重新编码
      await this.video.convertVideo(
        finalPath,
        finalOutputPath,
        this.settings.videoQuality,
        (percent) => {
          task.steps[5].progress = percent;
          task.progress = 90 + (percent * 0.1);
          onProgress(task);
        }
      );

      console.log('[VideoProcessor] 处理完成:', finalOutputPath);

      // 清理中间文件
      if (cutOutputPath !== file.path && cutOutputPath !== finalOutputPath) {
        await fs.promises.unlink(cutOutputPath).catch(() => {});
      }
      if (subtitledPath !== cutOutputPath && subtitledPath !== finalOutputPath) {
        await fs.promises.unlink(subtitledPath).catch(() => {});
      }

      task.steps[5] = { step: 'render', status: 'completed', progress: 100 };
      task.progress = 100;
      task.status = 'completed';
      task.outputPath = finalOutputPath;
      onProgress(task);

      return finalOutputPath;
    } catch (error) {
      console.error('[VideoProcessor] 处理失败:', error);
      
      task.status = 'error';
      task.error = error instanceof Error ? error.message : '未知错误';
      
      const currentStepIndex = task.steps.findIndex(s => s.step === task.currentStep);
      if (currentStepIndex >= 0) {
        task.steps[currentStepIndex].status = 'error';
      }
      
      onProgress(task);
      throw error;
    }
  }

  /**
   * 批量处理视频
   */
  async processMultipleVideos(
    files: VideoFile[],
    onProgress: (tasks: ProcessTask[]) => void
  ): Promise<string[]> {
    const results: string[] = [];
    const tasks: ProcessTask[] = [];

    for (const file of files) {
      try {
        const outputPath = await this.processVideo(file, (task) => {
          const index = tasks.findIndex(t => t.id === task.id);
          if (index >= 0) {
            tasks[index] = task;
          } else {
            tasks.push(task);
          }
          onProgress([...tasks]);
        });

        results.push(outputPath);
      } catch (error) {
        console.error(`处理 ${file.name} 失败:`, error);
        // 继续处理下一个文件
      }
    }

    return results;
  }
}
