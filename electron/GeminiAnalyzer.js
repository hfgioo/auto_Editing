const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAnalyzer {
  constructor(apiKey, baseURL, modelId) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.modelId = modelId || 'gemini-1.5-flash';
    this.genAI = null;
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * 提取视频关键帧
   */
  async extractKeyFrames(videoPath, count = 10) {
    const tempDir = path.join(path.dirname(videoPath), 'temp_frames');
    await fs.mkdir(tempDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const frames = [];
      
      ffmpeg(videoPath)
        .on('end', () => resolve(frames))
        .on('error', reject)
        .screenshots({
          count,
          folder: tempDir,
          filename: 'frame-%i.jpg',
          size: '1280x720'
        })
        .on('filenames', (filenames) => {
          frames.push(...filenames.map(f => path.join(tempDir, f)));
        });
    });
  }

  /**
   * 将图片转换为 base64
   */
  async imageToBase64(imagePath) {
    const buffer = await fs.readFile(imagePath);
    return buffer.toString('base64');
  }

  /**
   * 调用 Gemini API 分析视频
   */
  async analyzeVideo(videoPath, options = {}) {
    if (!this.genAI) {
      throw new Error('Gemini API Key 未配置');
    }

    try {
      console.log('[GeminiAnalyzer] 开始分析视频:', videoPath);

      // 1. 提取关键帧
      console.log('[GeminiAnalyzer] 提取关键帧...');
      const frameCount = options.frameCount || 10;
      const framePaths = await this.extractKeyFrames(videoPath, frameCount);
      
      // 2. 转换为 base64
      console.log('[GeminiAnalyzer] 转换图片格式...');
      const frameData = await Promise.all(
        framePaths.map(async (framePath) => ({
          inlineData: {
            data: await this.imageToBase64(framePath),
            mimeType: 'image/jpeg'
          }
        }))
      );

      // 3. 构建提示词
      const prompt = this.buildPrompt(options);

      // 4. 调用 Gemini API
      console.log('[GeminiAnalyzer] 调用 Gemini API...');
      const model = this.genAI.getGenerativeModel({ model: this.modelId });
      
      const result = await model.generateContent([
        prompt,
        ...frameData
      ]);

      const response = await result.response;
      const text = response.text();

      console.log('[GeminiAnalyzer] API 响应:', text.substring(0, 200));

      // 5. 解析响应
      const analysis = this.parseResponse(text);

      // 6. 清理临时文件
      await this.cleanupFrames(framePaths);

      return analysis;

    } catch (error) {
      console.error('[GeminiAnalyzer] 分析失败:', error);
      throw error;
    }
  }

  /**
   * 构建分析提示词
   */
  buildPrompt(options) {
    const language = options.language || 'zh-CN';
    
    return `你是一个专业的视频内容分析师。请分析这些视频关键帧，并提供以下信息：

1. **视频主题** (theme): 用一句话概括视频的核心主题
2. **关键场景** (scenes): 识别视频中的重要场景，每个场景包含：
   - 开始时间 (startTime): 估算的开始时间（秒）
   - 结束时间 (endTime): 估算的结束时间（秒）
   - 描述 (description): 场景内容描述
   - 重要性 (importance): 1-10 的评分，10 表示最重要
3. **情感基调** (mood): 视频的整体情感（如：欢快、严肃、感人等）
4. **建议配乐** (suggestedMusic): 适合的背景音乐类型
5. **剪辑建议** (editingSuggestions): 具体的剪辑建议

请以 JSON 格式返回结果，确保格式正确。

语言: ${language}`;
  }

  /**
   * 解析 Gemini 响应
   */
  parseResponse(text) {
    try {
      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // 如果没有 JSON，返回默认结构
      console.warn('[GeminiAnalyzer] 无法解析 JSON，使用默认结构');
      return {
        theme: '视频内容分析',
        scenes: [],
        mood: 'neutral',
        suggestedMusic: 'background',
        editingSuggestions: text,
        rawResponse: text
      };

    } catch (error) {
      console.error('[GeminiAnalyzer] 解析响应失败:', error);
      return {
        theme: '分析失败',
        scenes: [],
        mood: 'neutral',
        suggestedMusic: 'background',
        editingSuggestions: '',
        error: error.message,
        rawResponse: text
      };
    }
  }

  /**
   * 清理临时帧文件
   */
  async cleanupFrames(framePaths) {
    try {
      for (const framePath of framePaths) {
        await fs.unlink(framePath).catch(() => {});
      }
      
      // 删除临时目录
      if (framePaths.length > 0) {
        const tempDir = path.dirname(framePaths[0]);
        await fs.rmdir(tempDir).catch(() => {});
      }
    } catch (error) {
      console.error('[GeminiAnalyzer] 清理临时文件失败:', error);
    }
  }

  /**
   * 批量分析多个视频
   */
  async analyzeMultiple(videoPaths, options = {}) {
    const results = [];
    
    for (const videoPath of videoPaths) {
      try {
        const analysis = await this.analyzeVideo(videoPath, options);
        results.push({
          videoPath,
          success: true,
          analysis
        });
      } catch (error) {
        results.push({
          videoPath,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = GeminiAnalyzer;
