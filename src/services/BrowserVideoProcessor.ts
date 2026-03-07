import { ProcessTask, VideoFile, AppSettings } from '../types';

/**
 * 浏览器环境的视频处理器（演示版本）
 * 用于在没有 Electron 的情况下展示 UI 和流程
 */
export class BrowserVideoProcessor {
  private settings: AppSettings;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  /**
   * 模拟处理单个视频
   */
  async processVideo(
    file: VideoFile,
    onProgress: (task: ProcessTask) => void
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random()}`;

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
      console.log('[BrowserVideoProcessor] 开始处理:', file.name);

      // ========== Step 1: AI 分析 ==========
      onProgress(task);
      console.log('[BrowserVideoProcessor] Step 1: AI 分析视频...');
      
      await this.simulateProgress(task, 1, onProgress, 3000);
      
      task.steps[1] = { step: 'analyze', status: 'completed', progress: 100 };
      task.currentStep = 'cut';
      task.steps[2] = { step: 'cut', status: 'processing', progress: 0 };
      task.progress = 20;
      onProgress(task);

      // ========== Step 2: 视频剪辑 ==========
      console.log('[BrowserVideoProcessor] Step 2: 视频剪辑...');
      
      await this.simulateProgress(task, 2, onProgress, 4000);

      task.steps[2] = { step: 'cut', status: 'completed', progress: 100 };
      task.currentStep = 'subtitle';
      task.steps[3] = { step: 'subtitle', status: 'processing', progress: 0 };
      task.progress = 50;
      onProgress(task);

      // ========== Step 3: 字幕生成 ==========
      if (this.settings.autoSubtitle) {
        console.log('[BrowserVideoProcessor] Step 3: 生成字幕...');
        await this.simulateProgress(task, 3, onProgress, 3000);
      } else {
        console.log('[BrowserVideoProcessor] 跳过字幕生成');
        task.steps[3] = { step: 'subtitle', status: 'skipped', progress: 100 };
      }

      task.steps[3] = { step: 'subtitle', status: 'completed', progress: 100 };
      task.currentStep = 'music';
      task.steps[4] = { step: 'music', status: 'processing', progress: 0 };
      task.progress = 75;
      onProgress(task);

      // ========== Step 4: 背景音乐 ==========
      if (this.settings.autoMusic) {
        console.log('[BrowserVideoProcessor] Step 4: 添加背景音乐...');
        await this.simulateProgress(task, 4, onProgress, 2000);
      } else {
        console.log('[BrowserVideoProcessor] 跳过背景音乐');
        task.steps[4] = { step: 'music', status: 'skipped', progress: 100 };
      }

      task.steps[4] = { step: 'music', status: 'completed', progress: 100 };
      task.currentStep = 'render';
      task.steps[5] = { step: 'render', status: 'processing', progress: 0 };
      task.progress = 90;
      onProgress(task);

      // ========== Step 5: 最终渲染 ==========
      console.log('[BrowserVideoProcessor] Step 5: 最终渲染...');
      await this.simulateProgress(task, 5, onProgress, 3000);

      const outputPath = `output/${file.name.replace(/\.[^.]+$/, '')}_final.mp4`;
      console.log('[BrowserVideoProcessor] 处理完成:', outputPath);

      task.steps[5] = { step: 'render', status: 'completed', progress: 100 };
      task.progress = 100;
      task.status = 'completed';
      task.outputPath = outputPath;
      onProgress(task);

      return outputPath;
    } catch (error) {
      console.error('[BrowserVideoProcessor] 处理失败:', error);
      
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
   * 模拟进度更新
   */
  private async simulateProgress(
    task: ProcessTask,
    stepIndex: number,
    onProgress: (task: ProcessTask) => void,
    duration: number
  ): Promise<void> {
    const steps = 20;
    const interval = duration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const progress = Math.min(100, (i / steps) * 100);
      task.steps[stepIndex].progress = progress;
      
      // 更新总进度
      const baseProgress = [0, 20, 50, 75, 90][stepIndex] || 0;
      const stepWeight = [20, 30, 25, 15, 10][stepIndex] || 10;
      task.progress = baseProgress + (progress / 100) * stepWeight;
      
      onProgress({ ...task });
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
      }
    }

    return results;
  }
}
