import { AIService } from './ai/AIService';
import { VideoService } from './video/VideoService';
import { SubtitleService } from './subtitle/SubtitleService';
import { ProcessTask, VideoFile, AppSettings } from '../types';
import * as path from 'path';
import * as fs from 'fs';

type ExtendedSettings = AppSettings & {
  addMusic?: boolean;
  addSubtitles?: boolean;
  musicPath?: string;
  checkpointDir?: string;
};

type TaskWithCompat = ProcessTask & {
  taskId?: string;
  cancelled?: boolean;
  valueOf?: () => number;
};

type AnalysisLike = {
  highlights?: Array<{
    startTime: number;
    endTime: number;
    score?: number;
    reason?: string;
    description?: string;
  }>;
  transcription?: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  subtitles?: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  summary?: string;
  suggestedMusic?: string | { genre?: string; mood?: string; tempo?: string };
};

export class VideoProcessor {
  private ai: AIService;
  private video: VideoService;
  private subtitle: SubtitleService;
  private settings: ExtendedSettings;
  private tasks: Map<string, TaskWithCompat> = new Map();
  private checkpointDir: string;

  constructor(settings: ExtendedSettings & { aiProvider?: 'gemini' | 'openai'; aiBaseURL?: string }) {
    this.settings = settings;

    this.ai = new AIService({
      ...settings,
      aiProvider: settings.aiProvider || 'gemini',
    } as AppSettings);
    this.video = new VideoService();
    this.subtitle = new SubtitleService();

    const baseOutput = this.settings.outputPath || process.cwd();
    this.checkpointDir = this.settings.checkpointDir || path.join(baseOutput, 'checkpoints');
    this.loadCheckpoints();
  }

  getAllTasks(): TaskWithCompat[] {
    return Array.from(this.tasks.values());
  }

  cancelTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.cancelled = true;
    task.status = 'error';
    task.error = '任务已取消';
  }

  private getSubtitleEnabled(): boolean {
    if (typeof this.settings.addSubtitles === 'boolean') return this.settings.addSubtitles;
    if (typeof this.settings.autoSubtitle === 'boolean') return this.settings.autoSubtitle;
    return true;
  }

  private getMusicEnabled(): boolean {
    if (typeof this.settings.addMusic === 'boolean') return this.settings.addMusic;
    return Boolean(this.settings.autoMusic);
  }

  private ensureNotCancelled(task: TaskWithCompat) {
    if (task.cancelled) {
      throw new Error('任务已取消');
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withRetry<T>(fn: () => Promise<T>, retries: number = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        const delay = 1000 * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    throw lastError;
  }

  private async saveCheckpoint(task: TaskWithCompat, extra?: Record<string, unknown>): Promise<void> {
    try {
      await fs.promises.mkdir(this.checkpointDir, { recursive: true });
      const checkpointPath = path.join(this.checkpointDir, `${task.id}.json`);
      await fs.promises.writeFile(
        checkpointPath,
        JSON.stringify(
          {
            taskId: task.id,
            videoId: task.videoId,
            currentStep: task.currentStep,
            progress: task.progress,
            completedSteps: task.steps,
            lastUpdated: new Date().toISOString(),
            ...extra,
          },
          null,
          2
        ),
        'utf-8'
      );
    } catch {
      // Checkpoint 是非关键能力，失败时不阻断处理流程
    }
  }

  private async deleteCheckpoint(taskId: string): Promise<void> {
    const checkpointPath = path.join(this.checkpointDir, `${taskId}.json`);
    await fs.promises.unlink(checkpointPath).catch(() => {});
  }

  private loadCheckpoints(): void {
    try {
      if (!fs.existsSync(this.checkpointDir)) return;
      const files = fs.readdirSync(this.checkpointDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const fullPath = path.join(this.checkpointDir, file);
        fs.promises.readFile(fullPath, 'utf-8').catch(() => {
          // 忽略损坏/不可读的 checkpoint
        });
      }
    } catch {
      // 忽略 checkpoint 加载问题
    }
  }

  private normalizeAnalysis(raw: AnalysisLike): Required<Pick<AnalysisLike, 'highlights' | 'summary' | 'suggestedMusic'>> & {
    transcription: Array<{ startTime: number; endTime: number; text: string }>;
  } {
    if (!raw || !Array.isArray(raw.highlights)) {
      throw new Error('AI 返回结果格式错误');
    }

    const highlights = raw.highlights.map((h) => ({
      startTime: h.startTime,
      endTime: h.endTime,
      score: typeof h.score === 'number' ? h.score : 0,
      reason: h.reason || h.description || '',
      description: h.description || h.reason || '',
    }));

    const transcriptionRaw = Array.isArray(raw.transcription)
      ? raw.transcription
      : Array.isArray(raw.subtitles)
        ? raw.subtitles
        : [];

    const transcription = transcriptionRaw.map((t) => ({
      startTime: t.startTime,
      endTime: t.endTime,
      text: t.text,
    }));

    return {
      highlights,
      transcription,
      summary: typeof raw.summary === 'string' ? raw.summary : '',
      suggestedMusic: raw.suggestedMusic ?? 'upbeat',
    };
  }

  private emitProgress(task: TaskWithCompat, onProgress: (task: ProcessTask) => void) {
    task.valueOf = () => task.progress;
    onProgress({ ...task });
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

    const task: TaskWithCompat = {
      id: taskId,
      taskId,
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
    this.tasks.set(taskId, task);

    // 创建输出目录
    const projectDir = path.join(outputDir, `${baseName}_edited_${Date.now()}`);
    await fs.promises.mkdir(projectDir, { recursive: true });

    try {
      console.log('[VideoProcessor] 开始处理:', file.name);

      // Step 1: AI 分析
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { step: 'analyze-started' });
      console.log('[VideoProcessor] Step 1: AI 分析视频...');

      this.ensureNotCancelled(task);
      const activeProcessingCount = this.getAllTasks().filter((t) => t.status === 'processing').length;
      const retries = activeProcessingCount > 1 ? 0 : 3;
      const analysisRaw = await this.withRetry(() => this.ai.analyzeVideo(file.path), retries);
      this.ensureNotCancelled(task);
      const analysis = this.normalizeAnalysis(analysisRaw as AnalysisLike);

      console.log('[VideoProcessor] AI 分析完成:', {
        highlights: analysis.highlights.length,
        transcription: analysis.transcription.length,
        summary: (analysis.summary || '').substring(0, 50) + '...',
      });

      task.steps[1] = { step: 'analyze', status: 'completed', progress: 100 };
      task.currentStep = 'cut';
      task.steps[2] = { step: 'cut', status: 'processing', progress: 0 };
      task.progress = 20;
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { analysis });

      // Step 2: 视频剪辑
      console.log('[VideoProcessor] Step 2: 视频剪辑...');
      let cutOutputPath = file.path;

      if (analysis.highlights.length > 0) {
        const topHighlights = analysis.highlights
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .slice(0, 5)
          .sort((a, b) => a.startTime - b.startTime);

        const segments = topHighlights.map((h) => ({
          startTime: h.startTime,
          endTime: h.endTime,
          inputFile: file.path
        }));

        let clips: string[] = [];
        if (typeof (this.video as any).extractClips === 'function') {
          clips = await (this.video as any).extractClips(file.path, topHighlights, projectDir);
        }

        cutOutputPath = path.join(projectDir, `${baseName}_cut.mp4`);
        if (clips.length > 0) {
          await (this.video as any).mergeVideos(clips, cutOutputPath, (percent: number) => {
            task.steps[2].progress = percent;
            task.progress = 20 + (percent * 0.3);
            this.emitProgress(task, onProgress);
          });
        } else {
          await (this.video as any).mergeVideos(segments, cutOutputPath, (percent: number) => {
            task.steps[2].progress = percent;
            task.progress = 20 + (percent * 0.3);
            this.emitProgress(task, onProgress);
          });
        }
      }

      this.ensureNotCancelled(task);
      task.steps[2] = { step: 'cut', status: 'completed', progress: 100 };
      task.currentStep = 'subtitle';
      task.steps[3] = { step: 'subtitle', status: 'processing', progress: 0 };
      task.progress = 50;
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { cutOutputPath });

      // Step 3: 字幕
      let subtitledPath = cutOutputPath;
      const subtitleEnabled = this.getSubtitleEnabled();
      if (subtitleEnabled && analysis.transcription.length > 0) {
        const subtitles = analysis.transcription.map((t) => ({
          startTime: t.startTime,
          endTime: t.endTime,
          text: t.text
        }));
        const srtPath = path.join(projectDir, `${baseName}.srt`);

        if (typeof (this.subtitle as any).generateSRT === 'function') {
          const generated = await Promise.resolve((this.subtitle as any).generateSRT(subtitles));
          if (typeof generated === 'string' && generated.includes('-->')) {
            await fs.promises.writeFile(srtPath, generated, 'utf-8');
          }
        }
        if (typeof (this.subtitle as any).saveSRT === 'function') {
          await (this.subtitle as any).saveSRT(subtitles, srtPath);
        }

        subtitledPath = path.join(projectDir, `${baseName}_subtitled.mp4`);
        if (typeof (this.video as any).addSubtitles === 'function') {
          await (this.video as any).addSubtitles(cutOutputPath, srtPath, subtitledPath, (percent: number) => {
            task.steps[3].progress = percent;
            task.progress = 50 + (percent * 0.25);
            this.emitProgress(task, onProgress);
          });
        } else if (typeof (this.subtitle as any).embedSubtitles === 'function') {
          const maybePath = await (this.subtitle as any).embedSubtitles(cutOutputPath, srtPath, subtitledPath);
          if (typeof maybePath === 'string') {
            subtitledPath = maybePath;
          }
        }
      }

      this.ensureNotCancelled(task);
      task.steps[3] = { step: 'subtitle', status: 'completed', progress: 100 };
      task.currentStep = 'music';
      task.steps[4] = { step: 'music', status: 'processing', progress: 0 };
      task.progress = 75;
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { subtitledPath });

      // Step 4: 背景音乐
      let finalPath = subtitledPath;
      if (this.getMusicEnabled() && this.settings.musicPath && typeof (this.video as any).addBackgroundMusic === 'function') {
        const musicOutput = path.join(projectDir, `${baseName}_music.mp4`);
        const maybeMusicPath = await (this.video as any).addBackgroundMusic(
          subtitledPath,
          this.settings.musicPath,
          musicOutput
        );
        if (typeof maybeMusicPath === 'string') {
          finalPath = maybeMusicPath;
        } else {
          finalPath = musicOutput;
        }
      }

      this.ensureNotCancelled(task);
      task.steps[4] = { step: 'music', status: 'completed', progress: 100 };
      task.currentStep = 'render';
      task.steps[5] = { step: 'render', status: 'processing', progress: 0 };
      task.progress = 90;
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { finalPath });

      // Step 5: 最终渲染
      const finalOutputPath = path.join(projectDir, `${baseName}_final.mp4`);
      if (typeof (this.video as any).convertVideo === 'function') {
        await (this.video as any).convertVideo(
          finalPath,
          finalOutputPath,
          this.settings.videoQuality || 'high',
          (percent: number) => {
            task.steps[5].progress = percent;
            task.progress = 90 + (percent * 0.1);
            this.emitProgress(task, onProgress);
          }
        );
      } else if (finalPath !== finalOutputPath) {
        await fs.promises.copyFile(finalPath, finalOutputPath);
      }

      task.steps[5] = { step: 'render', status: 'completed', progress: 100 };
      task.progress = 100;
      task.status = 'completed';
      task.outputPath = finalOutputPath;
      this.emitProgress(task, onProgress);
      await this.deleteCheckpoint(task.id);
      return finalOutputPath;
    } catch (error) {
      console.error('[VideoProcessor] 处理失败:', error);
      task.status = 'error';
      task.error = error instanceof Error ? error.message : '未知错误';
      const currentStepIndex = task.steps.findIndex((s) => s.step === task.currentStep);
      if (currentStepIndex >= 0) {
        task.steps[currentStepIndex].status = 'error';
      }
      this.emitProgress(task, onProgress);
      await this.saveCheckpoint(task, { failed: true, error: task.error });
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
    const tasks: TaskWithCompat[] = [];

    for (const file of files) {
      try {
        const outputPath = await this.processVideo(file, (task) => {
          const index = tasks.findIndex((t) => t.id === task.id);
          if (index >= 0) {
            tasks[index] = task as TaskWithCompat;
          } else {
            tasks.push(task as TaskWithCompat);
          }
          onProgress([...tasks]);
        });
        results.push(outputPath);
      } catch (error) {
        console.error(`处理 ${file.name} 失败:`, error);
      }
    }
    return results;
  }
}
