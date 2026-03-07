const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fetch = require('node-fetch');
const OpenAI = require('openai');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const db = require('./database');

class VideoProcessor {
  constructor() {
    this.processingTasks = new Map();
    this.ffmpegPath = this.resolveBinaryPath(ffmpegInstaller?.path, 'ffmpeg');
    this.ffprobePath = this.resolveBinaryPath(ffprobeInstaller?.path, 'ffprobe');
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  resolveBinaryPath(installerPath, fallbackCommand) {
    try {
      if (installerPath && fsSync.existsSync(installerPath)) {
        return installerPath;
      }
    } catch (_error) {
      // ignore and use fallback
    }
    return fallbackCommand;
  }

  async processVideo(videoPath, settings, onProgress) {
    const taskId = Date.now().toString();
    
    const task = {
      id: taskId,
      videoPath,
      status: 'processing',
      progress: 0,
      steps: {
        extract: { status: 'pending', progress: 0 },
        analyze: { status: 'pending', progress: 0 },
        edit: { status: 'pending', progress: 0 },
        subtitle: { status: settings.autoSubtitle ? 'pending' : 'skipped', progress: settings.autoSubtitle ? 0 : 100 },
        music: { status: settings.autoMusic ? 'pending' : 'skipped', progress: settings.autoMusic ? 0 : 100 },
        export: { status: 'pending', progress: 0 },
      },
      result: null,
      error: null,
    };

    this.processingTasks.set(taskId, task);

    try {
      // 步骤 1: 提取视频信息
      await this.updateStep(taskId, 'extract', 'processing', onProgress);
      const videoInfo = await this.extractVideoInfo(videoPath);
      console.log('[VideoProcessor] 视频信息:', videoInfo);
      await this.updateStep(taskId, 'extract', 'completed', onProgress);

      // 步骤 2: AI 分析视频内容
      await this.updateStep(taskId, 'analyze', 'processing', onProgress);
      const analysis = await this.analyzeWithAI(videoPath, videoInfo, settings);
      console.log('[VideoProcessor] AI 分析结果:', analysis);
      await this.updateStep(taskId, 'analyze', 'completed', onProgress);

      // 步骤 3: 根据分析结果剪辑视频
      await this.updateStep(taskId, 'edit', 'processing', onProgress);
      const editedPath = await this.editVideo(videoPath, analysis, settings);
      console.log('[VideoProcessor] 剪辑完成:', editedPath);
      await this.updateStep(taskId, 'edit', 'completed', onProgress);

      // 步骤 4: 生成字幕并烧录
      let subtitles = [];
      let finalPath = editedPath;
      if (settings.autoSubtitle) {
        await this.updateStep(taskId, 'subtitle', 'processing', onProgress);
        subtitles = await this.generateSubtitles(editedPath, analysis, settings);
        finalPath = await this.burnSubtitles(editedPath, subtitles, settings);
        console.log('[VideoProcessor] 字幕生成完成:', subtitles.length, '条');
        await this.updateStep(taskId, 'subtitle', 'completed', onProgress);
      }

      // 步骤 5: 添加背景音乐
      if (settings.autoMusic) {
        await this.updateStep(taskId, 'music', 'processing', onProgress);
        finalPath = await this.addMusic(finalPath, analysis, settings);
        console.log('[VideoProcessor] 音乐添加完成:', finalPath);
        await this.updateStep(taskId, 'music', 'completed', onProgress);
      }

      // 步骤 6: 导出最终视频
      await this.updateStep(taskId, 'export', 'processing', onProgress);
      const outputPath = await this.exportVideo(finalPath, settings);
      console.log('[VideoProcessor] 导出完成:', outputPath);
      await this.updateStep(taskId, 'export', 'completed', onProgress);

      task.status = 'completed';
      task.progress = 100;
      task.result = { outputPath, analysis, subtitles };
      
      onProgress(task);
      return task;

    } catch (error) {
      console.error('[VideoProcessor] 处理失败:', error);
      for (const [stepName, step] of Object.entries(task.steps)) {
        if (step.status === 'processing') {
          await this.updateStep(taskId, stepName, 'failed', onProgress);
        }
      }
      task.status = 'failed';
      task.error = error.message;
      onProgress(task);
      throw error;
    }
  }

  async updateStep(taskId, stepName, status, onProgress) {
    const task = this.processingTasks.get(taskId);
    if (!task) return;

    task.steps[stepName].status = status;
    
    if (status === 'completed' || status === 'skipped' || status === 'failed') {
      task.steps[stepName].progress = 100;
    } else if (status === 'processing') {
      task.steps[stepName].progress = 50;
    }

    // 计算总进度
    const steps = Object.values(task.steps);
    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0) / steps.length;
    task.progress = Math.round(totalProgress);

    onProgress(task);
  }

  async extractVideoInfo(videoPath) {
    try {
      await fs.access(videoPath);
      const { stdout } = await execFileAsync(this.ffprobePath, [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        videoPath,
      ]);
      const info = JSON.parse(stdout);
      
      const videoStream = info.streams.find(s => s.codec_type === 'video');
      const audioStream = info.streams.find(s => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(info.format.duration),
        width: videoStream?.width || 1920,
        height: videoStream?.height || 1080,
        fps: eval(videoStream?.r_frame_rate || '30/1'),
        hasAudio: !!audioStream,
        size: parseInt(info.format.size),
        bitrate: parseInt(info.format.bit_rate),
      };
    } catch (error) {
      console.error('[VideoProcessor] 提取视频信息失败:', error);
      if (error?.code === 'ENOENT') {
        throw new Error('未找到 ffprobe 可执行文件。请确认应用内置 FFmpeg 资源完整，或在系统中安装 FFmpeg 并加入 PATH');
      }
      if (error?.message?.includes('No such file') || error?.message?.includes('ENOENT')) {
        throw new Error('视频文件不存在或路径不可访问，请检查文件是否被移动/删除');
      }
      if (error?.stderr && String(error.stderr).includes('Invalid data found when processing input')) {
        throw new Error('视频文件损坏或编码不受支持，请尝试先用播放器确认可正常播放');
      }
      throw new Error(`无法读取视频信息: ${error?.message || '未知错误'}`);
    }
  }

  async analyzeWithAI(videoPath, videoInfo, settings) {
    // 提取关键帧用于 AI 分析
    const framesDir = path.join(settings.outputPath, 'temp', 'frames');
    await fs.mkdir(framesDir, { recursive: true });

    // 每 5 秒提取一帧
    const frameInterval = 5;
    const frameCount = Math.floor(videoInfo.duration / frameInterval);
    
    console.log(`[VideoProcessor] 提取 ${frameCount} 个关键帧...`);
    
    const frames = [];
    for (let i = 0; i < Math.min(frameCount, 10); i++) {
      const timestamp = i * frameInterval;
      const framePath = path.join(framesDir, `frame_${i}.jpg`);
      
      await execFileAsync(this.ffmpegPath, [
        '-ss', String(timestamp),
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '2',
        framePath,
        '-y',
      ]);
      
      frames.push({
        timestamp,
        path: framePath,
      });
    }

    try {
      // 调用 AI API 分析（带重试）
      return await this.callAIAPIWithRetry(frames, videoInfo, settings);
    } finally {
      // 清理临时文件
      await fs.rm(framesDir, { recursive: true, force: true });
    }
  }

  async callAIAPIWithRetry(frames, videoInfo, settings) {
    const maxAttempts = Number(settings.aiRetryAttempts) > 0 ? Number(settings.aiRetryAttempts) : 3;
    const baseDelayMs = Number(settings.aiRetryBaseDelayMs) > 0 ? Number(settings.aiRetryBaseDelayMs) : 1000;

    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.callAIAPI(frames, videoInfo, settings);
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxAttempts;
        console.warn(`[VideoProcessor] AI 分析第 ${attempt}/${maxAttempts} 次尝试失败:`, error?.message || error);
        if (isLastAttempt) break;
        const delayMs = baseDelayMs * (2 ** (attempt - 1));
        await this.delay(delayMs);
      }
    }

    throw new Error(`AI 分析失败（已重试 ${maxAttempts} 次）: ${lastError?.message || '未知错误'}`);
  }

  async callAIAPI(frames, videoInfo, settings) {
    const analysisConfig = this.resolveAnalysisConfig(settings);

    // 读取帧图片并转为 base64
    const frameData = await Promise.all(
      frames.map(async (frame) => {
        const buffer = await fs.readFile(frame.path);
        return {
          timestamp: frame.timestamp,
          base64: buffer.toString('base64'),
        };
      })
    );

    const prompt = `分析这个视频的关键帧，视频总时长 ${videoInfo.duration.toFixed(1)} 秒。
请识别视频中的精彩片段，返回 JSON 格式：
{
  "highlights": [
    {
      "startTime": 开始时间（秒）,
      "endTime": 结束时间（秒）,
      "reason": "为什么这是精彩片段",
      "score": 0-1 的评分
    }
  ],
  "summary": "视频内容总结",
  "suggestedMusic": {
    "genre": "建议的音乐类型",
    "mood": "情绪",
    "tempo": "节奏"
  }
}`;

    let response;
    
    if (analysisConfig.provider === 'gemini') {
      // Gemini API 格式
      response = await fetch(`${analysisConfig.apiUrl}?key=${analysisConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...frameData.map(f => ({
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: f.base64,
                }
              }))
            ]
          }]
        }),
      });
    } else {
      // OpenAI 兼容 API 格式（支持任意兼容供应商）
      response = await fetch(analysisConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${analysisConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: analysisConfig.model,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...frameData.map(f => ({
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${f.base64}` }
              }))
            ]
          }],
          response_format: { type: 'json_object' },
        }),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API 调用失败: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    let analysisText;
    if (analysisConfig.provider === 'gemini') {
      analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      analysisText = data?.choices?.[0]?.message?.content;
    }

    if (!analysisText || typeof analysisText !== 'string') {
      throw new Error('AI 返回内容为空或格式不正确');
    }

    return JSON.parse(analysisText);
  }

  async editVideo(videoPath, analysis, settings) {
    const outputDir = path.join(settings.outputPath, 'temp');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `edited_${Date.now()}.mp4`);
    
    if (analysis.highlights.length === 0) {
      // 没有精彩片段，复制原视频
      await fs.copyFile(videoPath, outputPath);
      return outputPath;
    }

    // 生成 ffmpeg 过滤器，合并所有精彩片段
    const segments = analysis.highlights.map((h, i) => {
      return `[0:v]trim=start=${h.startTime}:end=${h.endTime},setpts=PTS-STARTPTS[v${i}];` +
             `[0:a]atrim=start=${h.startTime}:end=${h.endTime},asetpts=PTS-STARTPTS[a${i}]`;
    }).join(';');

    const concatVideo = analysis.highlights.map((_, i) => `[v${i}]`).join('');
    const concatAudio = analysis.highlights.map((_, i) => `[a${i}]`).join('');
    
    const filterComplex = `${segments};${concatVideo}concat=n=${analysis.highlights.length}:v=1:a=0[outv];${concatAudio}concat=n=${analysis.highlights.length}:v=0:a=1[outa]`;

    try {
      await execFileAsync(this.ffmpegPath, [
        '-i', videoPath,
        '-filter_complex', filterComplex,
        '-map', '[outv]',
        '-map', '[outa]',
        '-c:v', 'libx264',
        '-preset', settings.videoQuality === 'high' ? 'slow' : 'fast',
        '-crf', settings.videoQuality === 'high' ? '18' : '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        outputPath,
        '-y',
      ]);
      
      return outputPath;
    } catch (error) {
      console.error('[VideoProcessor] 视频剪辑失败:', error);
      // 失败时复制原视频
      await fs.copyFile(videoPath, outputPath);
      return outputPath;
    }
  }

  async generateSubtitles(videoPath, analysis, settings) {
    // 提取音频
    const audioPath = path.join(settings.outputPath, 'temp', `audio_${Date.now()}.wav`);
    await execFileAsync(this.ffmpegPath, [
      '-i', videoPath,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      audioPath,
      '-y',
    ]);

    // 调用 AI 生成字幕
    const subtitles = await this.callAIForSubtitles(audioPath, analysis, settings);
    
    // 清理临时文件
    await fs.unlink(audioPath).catch(() => {});
    
    return subtitles;
  }

  buildSRTContent(subtitles) {
    return subtitles
      .map((seg) => `${seg.index}\n${seg.startTime} --> ${seg.endTime}\n${seg.text}\n`)
      .join('\n');
  }

  escapePathForSubtitlesFilter(filePath) {
    return filePath
      .replace(/\\/g, '/')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
      .replace(/,/g, '\\,')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }

  async burnSubtitles(videoPath, subtitles, settings) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
      throw new Error('字幕列表为空，无法烧录字幕');
    }

    const tempDir = path.join(settings.outputPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const srtPath = path.join(tempDir, `subtitle_${Date.now()}.srt`);
    const outputPath = path.join(tempDir, `subtitled_${Date.now()}.mp4`);
    const escapedSrtPath = this.escapePathForSubtitlesFilter(srtPath);

    try {
      await fs.writeFile(srtPath, this.buildSRTContent(subtitles), 'utf8');
      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-i', videoPath,
        '-vf', `subtitles='${escapedSrtPath}'`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '20',
        '-c:a', 'copy',
        outputPath,
      ]);
      return outputPath;
    } catch (error) {
      console.error('[VideoProcessor] 字幕烧录失败:', error);
      throw new Error(`字幕烧录失败: ${error?.message || '未知错误'}`);
    } finally {
      await fs.unlink(srtPath).catch(() => {});
    }
  }

  async callAIForSubtitles(audioPath, analysis, settings) {
    const transcriptionConfig = this.resolveTranscriptionConfig(settings);

    const client = new OpenAI({
      apiKey: transcriptionConfig.apiKey,
      baseURL: transcriptionConfig.baseURL,
    });

    const transcription = await client.audio.transcriptions.create({
      file: fsSync.createReadStream(audioPath),
      model: transcriptionConfig.model,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: 'zh',
    });

    const segments = Array.isArray(transcription?.segments) ? transcription.segments : [];
    if (segments.length === 0) {
      throw new Error('语音转写结果为空，请检查音频质量或更换模型');
    }

    return segments.map((seg, idx) => ({
      index: idx + 1,
      startTime: this.formatSRTTime(seg.start || 0),
      endTime: this.formatSRTTime(seg.end || seg.start || 0),
      text: (seg.text || '').trim(),
    }));
  }

  resolveAnalysisConfig(settings) {
    if (settings.analysisApiKey && settings.analysisBaseURL && settings.analysisModelId) {
      const base = String(settings.analysisBaseURL).replace(/\/$/, '');
      return {
        provider: 'openai_compatible',
        apiUrl: `${base}/chat/completions`,
        apiKey: settings.analysisApiKey,
        model: settings.analysisModelId,
      };
    }

    if (settings.aiProvider === 'gemini') {
      if (!settings.geminiApiKey || !settings.geminiBaseURL || !settings.geminiModelId) {
        throw new Error('Gemini 分析配置不完整，请检查 API Key / Base URL / Model');
      }
      const base = String(settings.geminiBaseURL).replace(/\/$/, '');
      return {
        provider: 'gemini',
        apiUrl: `${base}/models/${settings.geminiModelId}:generateContent`,
        apiKey: settings.geminiApiKey,
        model: settings.geminiModelId,
      };
    }

    const openAICompat = this.resolveOpenAICompatibleConfig(settings);
    if (!openAICompat) {
      throw new Error('AI 分析配置不完整，请填写分析接口或 OpenAI 兼容配置');
    }

    return {
      provider: 'openai_compatible',
      apiUrl: `${openAICompat.baseURL}/chat/completions`,
      apiKey: openAICompat.apiKey,
      model: openAICompat.modelId,
    };
  }

  resolveTranscriptionConfig(settings) {
    if (settings.transcriptionApiKey && settings.transcriptionBaseURL) {
      const base = String(settings.transcriptionBaseURL).replace(/\/$/, '');
      return {
        apiKey: settings.transcriptionApiKey,
        baseURL: base,
        model: settings.transcriptionModelId || settings.transcriptionModel || 'whisper-1',
      };
    }

    const openAICompat = this.resolveOpenAICompatibleConfig(settings);
    if (!openAICompat) {
      throw new Error('字幕转写配置不完整。请填写“字幕转写 API 配置”或可用的 OpenAI 兼容配置');
    }

    return {
      apiKey: openAICompat.apiKey,
      baseURL: openAICompat.baseURL,
      model: settings.transcriptionModelId || settings.transcriptionModel || 'whisper-1',
    };
  }

  resolveOpenAICompatibleConfig(settings) {
    if (settings.aiProvider === 'openai') {
      if (!settings.openaiApiKey || !settings.openaiBaseURL || !settings.openaiModelId) return null;
      return {
        apiKey: settings.openaiApiKey,
        baseURL: String(settings.openaiBaseURL).replace(/\/$/, ''),
        modelId: settings.openaiModelId,
      };
    }

    if (settings.aiProvider === 'custom') {
      if (!settings.customApiKey || !settings.customBaseURL || !settings.customModelId) return null;
      return {
        apiKey: settings.customApiKey,
        baseURL: String(settings.customBaseURL).replace(/\/$/, ''),
        modelId: settings.customModelId,
      };
    }

    if (settings.customApiKey && settings.customBaseURL && settings.customModelId) {
      return {
        apiKey: settings.customApiKey,
        baseURL: String(settings.customBaseURL).replace(/\/$/, ''),
        modelId: settings.customModelId,
      };
    }

    if (settings.openaiApiKey && settings.openaiBaseURL && settings.openaiModelId) {
      return {
        apiKey: settings.openaiApiKey,
        baseURL: String(settings.openaiBaseURL).replace(/\/$/, ''),
        modelId: settings.openaiModelId,
      };
    }

    return null;
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  pickMusicBySuggestion(tracks, suggestedMusic) {
    if (!tracks || tracks.length === 0) return null;

    const suggestionText = typeof suggestedMusic === 'string'
      ? suggestedMusic
      : JSON.stringify(suggestedMusic || {});
    const normalized = suggestionText.toLowerCase();

    const matched = tracks.find((t) => normalized.includes(String(t.genre || '').toLowerCase()));
    return matched || tracks[0];
  }

  async addMusic(videoPath, analysis, settings) {
    let musicPath = settings.musicPath;

    if (!musicPath) {
      const tracks = db.getAllMusicTracks();
      const selectedTrack = this.pickMusicBySuggestion(tracks, analysis?.suggestedMusic);
      if (selectedTrack) {
        musicPath = selectedTrack.filePath;
      }
    }

    if (!musicPath) {
      throw new Error('已启用自动配乐，但音乐库为空。请先在音乐库中添加音频文件');
    }

    await fs.access(musicPath);
    const outputPath = path.join(settings.outputPath, 'temp', `music_${Date.now()}.mp4`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const { stdout: streamInfo } = await execFileAsync(this.ffprobePath, [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_streams',
      videoPath,
    ]);
    const hasAudio = JSON.parse(streamInfo).streams?.some((s) => s.codec_type === 'audio');

    if (hasAudio) {
      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-i', videoPath,
        '-stream_loop', '-1',
        '-i', musicPath,
        '-filter_complex', '[1:a]volume=0.18[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]',
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputPath,
      ]);
    } else {
      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-i', videoPath,
        '-stream_loop', '-1',
        '-i', musicPath,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        outputPath,
      ]);
    }

    return outputPath;
  }

  async exportVideo(videoPath, settings) {
    const outputDir = settings.outputPath;
    await fs.mkdir(outputDir, { recursive: true });
    
    const fileName = `output_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, fileName);
    
    // 复制到最终输出目录
    await fs.copyFile(videoPath, outputPath);
    
    return outputPath;
  }

  getTask(taskId) {
    return this.processingTasks.get(taskId);
  }

  getAllTasks() {
    return Array.from(this.processingTasks.values());
  }
}

module.exports = VideoProcessor;
