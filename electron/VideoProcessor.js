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

  async processVideoBatch(videoPaths, settings, onProgress) {
    const taskId = `${Date.now()}_batch`;
    const task = {
      id: taskId,
      videoPath: videoPaths.join(' | '),
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
      await this.updateStep(taskId, 'extract', 'processing', onProgress);
      const sourceInfos = [];
      for (const vp of videoPaths) {
        sourceInfos.push(await this.extractVideoInfo(vp));
      }
      await this.updateStep(taskId, 'extract', 'completed', onProgress);

      await this.updateStep(taskId, 'analyze', 'processing', onProgress);
      const analyses = [];
      for (let i = 0; i < videoPaths.length; i++) {
        analyses.push(await this.analyzeWithAI(videoPaths[i], sourceInfos[i], settings));
      }
      const montagePlan = this.buildSmartMontagePlan(videoPaths, analyses, sourceInfos, settings);
      await this.updateStep(taskId, 'analyze', 'completed', onProgress);

      await this.updateStep(taskId, 'edit', 'processing', onProgress);
      const editedPath = await this.editVideoByPlan(videoPaths, sourceInfos, montagePlan, settings);
      await this.updateStep(taskId, 'edit', 'completed', onProgress);

      let subtitles = [];
      let finalPath = editedPath;
      if (settings.autoSubtitle) {
        await this.updateStep(taskId, 'subtitle', 'processing', onProgress);
        subtitles = await this.generateSubtitles(editedPath, montagePlan, settings);
        finalPath = await this.burnSubtitles(editedPath, subtitles, settings);
        await this.updateStep(taskId, 'subtitle', 'completed', onProgress);
      }

      if (settings.autoMusic) {
        await this.updateStep(taskId, 'music', 'processing', onProgress);
        finalPath = await this.addMusic(finalPath, montagePlan, settings);
        await this.updateStep(taskId, 'music', 'completed', onProgress);
      }

      await this.updateStep(taskId, 'export', 'processing', onProgress);
      const outputPath = await this.exportVideo(finalPath, settings);
      await this.updateStep(taskId, 'export', 'completed', onProgress);

      task.status = 'completed';
      task.progress = 100;
      task.result = { outputPath, analysis: montagePlan, subtitles };
      onProgress(task);
      return task;
    } catch (error) {
      console.error('[VideoProcessor] 批量处理失败:', error);
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
          'Accept': 'application/json',
          'Authorization': `Bearer ${analysisConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: analysisConfig.model,
          stream: false,
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

    const data = await this.parseJSONOrSSEBody(response);
    
    let analysisText;
    if (analysisConfig.provider === 'gemini') {
      analysisText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      analysisText = data?.choices?.[0]?.message?.content;
    }

    if (!analysisText || typeof analysisText !== 'string') {
      throw new Error('AI 返回内容为空或格式不正确');
    }

    const parsed = this.parseAnalysisJSON(analysisText);
    if (!parsed) {
      throw new Error(`AI 返回内容无法解析为剪辑 JSON: ${analysisText.slice(0, 220)}`);
    }
    return parsed;
  }

  async parseJSONOrSSEBody(response) {
    const rawText = await response.text();
    if (!rawText) {
      throw new Error('AI 返回空响应');
    }

    try {
      return JSON.parse(rawText);
    } catch (_jsonError) {
      // 兼容某些 OpenAI 兼容网关返回 text/event-stream: data: {...}
      const lines = rawText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'));

      if (lines.length === 0) {
        const extracted = this.extractJSONObject(rawText);
        if (extracted) return extracted;
        throw new Error(`AI 返回非 JSON 内容: ${rawText.slice(0, 200)}`);
      }

      let fullContent = '';
      let lastPayload = null;
      for (const line of lines) {
        const payload = line.replace(/^data:\s*/, '');
        if (!payload || payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          lastPayload = parsed;
          const deltaContent = parsed?.choices?.[0]?.delta?.content;
          const messageContent = parsed?.choices?.[0]?.message?.content;
          if (typeof deltaContent === 'string') fullContent += deltaContent;
          if (typeof messageContent === 'string') fullContent = messageContent;
        } catch (_lineError) {
          // 忽略单行解析失败，继续尝试其它 data 行
        }
      }

      if (fullContent) {
        const maybeJSON = this.extractJSONObject(fullContent);
        if (maybeJSON) {
          return {
            choices: [{ message: { content: JSON.stringify(maybeJSON) } }],
          };
        }
        return {
          choices: [{ message: { content: fullContent } }],
        };
      }

      if (lastPayload) {
        return lastPayload;
      }

      throw new Error(`无法解析 AI 流式响应: ${rawText.slice(0, 200)}`);
    }
  }

  extractJSONObject(text) {
    if (!text || typeof text !== 'string') return null;

    const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : text;

    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start < 0 || end <= start) return null;

    const jsonText = candidate.slice(start, end + 1);
    try {
      return JSON.parse(jsonText);
    } catch (_e) {
      return null;
    }
  }

  parseAnalysisJSON(text) {
    if (typeof text !== 'string' || !text.trim()) return null;

    // 先尝试纯 JSON（最快路径）
    try {
      return JSON.parse(text);
    } catch (_e) {
      // ignore
    }

    // 去掉常见推理标签，兼容某些模型输出 <think>...</think>
    const withoutThink = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    try {
      return JSON.parse(withoutThink);
    } catch (_e) {
      // ignore
    }

    // 再尝试从包裹文本中提取 JSON 对象
    const extracted = this.extractJSONObject(withoutThink);
    if (extracted) return extracted;

    // 兼容数组根节点（极少数模型会返回数组）
    const start = withoutThink.indexOf('[');
    const end = withoutThink.lastIndexOf(']');
    if (start >= 0 && end > start) {
      const arrText = withoutThink.slice(start, end + 1);
      try {
        return JSON.parse(arrText);
      } catch (_e) {
        return null;
      }
    }

    return null;
  }

  normalizeSegmentWindow(start, end, maxDuration, maxClipDuration = 12, minClipDuration = 2) {
    const safeStart = Math.max(0, Number(start) || 0);
    const safeEnd = Math.min(maxDuration, Number(end) || safeStart);
    const rawDuration = Math.max(0, safeEnd - safeStart);

    if (rawDuration <= maxClipDuration) {
      return { start: safeStart, end: safeEnd, duration: rawDuration };
    }

    const mid = (safeStart + safeEnd) / 2;
    const half = maxClipDuration / 2;
    const clippedStart = Math.max(0, mid - half);
    const clippedEnd = Math.min(maxDuration, mid + half);
    const clippedDuration = Math.max(minClipDuration, clippedEnd - clippedStart);
    return { start: clippedStart, end: clippedStart + clippedDuration, duration: clippedDuration };
  }

  detectContentMode(settings, sourceInfos, videoPaths) {
    if (settings.contentMode && settings.contentMode !== 'auto') return settings.contentMode;

    const totalDuration = sourceInfos.reduce((sum, info) => sum + (Number(info?.duration) || 0), 0);
    const name = videoPaths.map((p) => path.basename(p).toLowerCase()).join(' ');

    if (/(movie|film|电影|解说|剧情|片段)/i.test(name) || totalDuration > 1800) return 'movie_commentary';
    if (/(教程|教学|course|lesson|review|评测)/i.test(name) || totalDuration > 900) return 'tutorial';
    if (/(采访|podcast|访谈|talk)/i.test(name)) return 'interview';
    if (/(游戏|game|电竞|直播)/i.test(name)) return 'gaming';
    if (/(旅行|vlog|日常|travel)/i.test(name)) return 'vlog';
    if (/(带货|广告|product|电商|开箱)/i.test(name)) return 'ecommerce';
    return 'short';
  }

  getContentProfile(mode, settings) {
    const profiles = {
      short: { minScore: 0.62, minDuration: 1.5, maxSegments: 16, maxDuration: 75, maxClipDuration: 8, order: 'impact' },
      vlog: { minScore: 0.56, minDuration: 2.5, maxSegments: 18, maxDuration: 120, maxClipDuration: 10, order: 'story' },
      tutorial: { minScore: 0.5, minDuration: 4, maxSegments: 20, maxDuration: 180, maxClipDuration: 16, order: 'logical' },
      interview: { minScore: 0.54, minDuration: 4, maxSegments: 14, maxDuration: 150, maxClipDuration: 14, order: 'speaker_balance' },
      gaming: { minScore: 0.6, minDuration: 2, maxSegments: 20, maxDuration: 120, maxClipDuration: 9, order: 'alternating' },
      ecommerce: { minScore: 0.58, minDuration: 1.8, maxSegments: 15, maxDuration: 90, maxClipDuration: 7, order: 'cta' },
      movie_commentary: { minScore: 0.55, minDuration: 3, maxSegments: 22, maxDuration: 180, maxClipDuration: 12, order: 'story' },
    };

    const base = profiles[mode] || profiles.short;
    return {
      mode,
      minScore: Number(settings.smartMinScore) > 0 ? Number(settings.smartMinScore) : base.minScore,
      minDuration: Number(settings.smartMinDurationSec) > 0 ? Number(settings.smartMinDurationSec) : base.minDuration,
      maxSegments: Number(settings.smartMaxSegments) > 0 ? Number(settings.smartMaxSegments) : base.maxSegments,
      maxDuration: Number(settings.smartMaxDurationSec) > 0 ? Number(settings.smartMaxDurationSec) : base.maxDuration,
      maxClipDuration: base.maxClipDuration,
      order: base.order,
    };
  }

  buildSmartMontagePlan(videoPaths, analyses, sourceInfos, settings) {
    const mode = this.detectContentMode(settings, sourceInfos, videoPaths);
    const profile = this.getContentProfile(mode, settings);
    const candidates = [];

    for (let sourceIndex = 0; sourceIndex < analyses.length; sourceIndex++) {
      const analysis = analyses[sourceIndex] || {};
      const highlights = Array.isArray(analysis.highlights) ? analysis.highlights : [];
      const duration = Number(sourceInfos[sourceIndex]?.duration) || 0;

      for (const h of highlights) {
        const normalized = this.normalizeSegmentWindow(h.startTime, h.endTime, duration, profile.maxClipDuration, profile.minDuration);
        if (normalized.duration <= 0) continue;
        candidates.push({
          sourceIndex,
          start: normalized.start,
          end: normalized.end,
          duration: normalized.duration,
          score: Number(h.score) || 0.5,
          reason: h.reason || '',
        });
      }
    }

    const pruned = this.smartPruneSegments(candidates, profile);
    const ordered = this.smartOrderSegments(pruned, profile);
    const maxDuration = profile.maxDuration;

    const limited = [];
    let totalDuration = 0;
    for (const seg of ordered) {
      if (totalDuration + seg.duration > maxDuration) break;
      limited.push(seg);
      totalDuration += seg.duration;
    }

    if (limited.length === 0) {
      const fallbackDuration = Math.min(profile.maxClipDuration, Number(sourceInfos[0]?.duration) || profile.maxClipDuration);
      limited.push({
        sourceIndex: 0,
        start: 0,
        end: fallbackDuration,
        duration: fallbackDuration,
        score: 0.3,
        reason: 'fallback',
      });
    }

    const suggestedMusic = analyses
      .map((a) => a?.suggestedMusic)
      .find(Boolean) || { genre: '轻快', mood: '中性', tempo: '中速' };

    return {
      mode: 'smart_montage',
      contentMode: mode,
      profile,
      sourceCount: videoPaths.length,
      segmentCount: limited.length,
      totalDuration,
      segments: limited,
      suggestedMusic,
      summary: `已自动从 ${videoPaths.length} 个视频智能筛选 ${limited.length} 个片段并完成排序`,
    };
  }

  smartPruneSegments(candidates, profile) {
    const minScore = profile.minScore;
    const minDuration = profile.minDuration;
    const maxSegments = profile.maxSegments;

    const filtered = candidates
      .filter((seg) => seg.duration >= minDuration && seg.score >= minScore)
      .sort((a, b) => b.score - a.score);

    const result = [];
    for (const seg of filtered) {
      if (result.length >= maxSegments) break;
      const overlaps = result.some((picked) => {
        if (picked.sourceIndex !== seg.sourceIndex) return false;
        return Math.max(picked.start, seg.start) < Math.min(picked.end, seg.end);
      });
      if (!overlaps) result.push(seg);
    }

    if (result.length > 0) return result;
    return candidates.sort((a, b) => b.score - a.score).slice(0, Math.min(maxSegments, Math.max(1, candidates.length)));
  }

  smartOrderSegments(segments, profile) {
    if (profile.order === 'logical') {
      return [...segments].sort((a, b) => (a.sourceIndex - b.sourceIndex) || (a.start - b.start));
    }

    if (profile.order === 'story') {
      return [...segments].sort((a, b) => a.start - b.start);
    }

    const remain = [...segments].sort((a, b) => b.score - a.score);
    const ordered = [];
    let lastSource = -1;

    while (remain.length > 0) {
      let idx = remain.findIndex((s) => s.sourceIndex !== lastSource);
      if (idx < 0) idx = 0;
      const picked = remain.splice(idx, 1)[0];
      ordered.push(picked);
      lastSource = picked.sourceIndex;
    }

    return ordered;
  }

  async editVideoByPlan(videoPaths, sourceInfos, montagePlan, settings) {
    const segments = Array.isArray(montagePlan?.segments) ? montagePlan.segments : [];
    const outputDir = path.join(settings.outputPath, 'temp');
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `montage_${Date.now()}.mp4`);
    if (segments.length === 0) {
      await fs.copyFile(videoPaths[0], outputPath);
      return outputPath;
    }

    const clipPaths = [];
    const concatListPath = path.join(outputDir, `concat_${Date.now()}.txt`);
    try {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const sourcePath = videoPaths[seg.sourceIndex];
        const hasAudio = !!sourceInfos[seg.sourceIndex]?.hasAudio;
        const clipPath = path.join(outputDir, `segment_${Date.now()}_${i}.mp4`);
        await this.extractSegmentClip(sourcePath, seg.start, seg.end, clipPath, settings, hasAudio);
        clipPaths.push(clipPath);
      }

      const concatContent = clipPaths
        .map((p) => `file '${String(p).replace(/'/g, "'\\''")}'`)
        .join('\n');
      await fs.writeFile(concatListPath, concatContent, 'utf8');

      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        outputPath,
      ]);
      return outputPath;
    } catch (error) {
      console.error('[VideoProcessor] 智能拼接失败:', error);
      throw new Error(`智能拼接失败: ${error?.message || '未知错误'}`);
    } finally {
      await fs.unlink(concatListPath).catch(() => {});
      await Promise.all(clipPaths.map((p) => fs.unlink(p).catch(() => {})));
    }
  }

  async extractSegmentClip(sourcePath, start, end, outputPath, settings, hasAudio) {
    const duration = Math.max(0.5, Number(end) - Number(start));
    const preset = settings.videoQuality === 'high' ? 'slow' : 'fast';
    const crf = settings.videoQuality === 'high' ? '18' : '23';

    if (hasAudio) {
      await execFileAsync(this.ffmpegPath, [
        '-y',
        '-ss', String(Math.max(0, start)),
        '-t', String(duration),
        '-i', sourcePath,
        '-c:v', 'libx264',
        '-preset', preset,
        '-crf', crf,
        '-c:a', 'aac',
        '-b:a', '160k',
        outputPath,
      ]);
      return;
    }

    await execFileAsync(this.ffmpegPath, [
      '-y',
      '-ss', String(Math.max(0, start)),
      '-t', String(duration),
      '-i', sourcePath,
      '-f', 'lavfi',
      '-t', String(duration),
      '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-shortest',
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', crf,
      '-c:a', 'aac',
      '-b:a', '160k',
      outputPath,
    ]);
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
