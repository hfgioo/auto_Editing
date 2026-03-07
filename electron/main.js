const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const { File: NodeFile } = require('node:buffer');

if (typeof globalThis.File === 'undefined') {
  globalThis.File = NodeFile;
}

const VideoProcessor = require('./VideoProcessor');
const CloudUploader = require('./CloudUploader');
const db = require('./database');

let mainWindow;
const videoProcessor = new VideoProcessor();
const cloudUploader = new CloudUploader();

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5176');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ========== IPC 处理器 ==========

// 设置相关
ipcMain.handle('load-settings', async () => {
  try {
    const settings = await db.getSettings();
    return settings || getDefaultSettings();
  } catch (error) {
    console.error('[Main] 加载设置失败:', error);
    return getDefaultSettings();
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    await db.saveSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('[Main] 保存设置失败:', error);
    throw error;
  }
});

ipcMain.handle('test-ai-connection', async (_event, settings) => {
  try {
    if (!settings || !settings.aiProvider) {
      return { success: false, message: '缺少 AI 配置' };
    }

    if (settings.analysisApiKey && settings.analysisBaseURL && settings.analysisModelId) {
      const base = normalizeOpenAIBaseURL(settings.analysisBaseURL);
      const resp = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${settings.analysisApiKey}`,
        },
        body: JSON.stringify({
          model: settings.analysisModelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return { success: false, message: `分析接口连接失败: ${resp.status} ${text}` };
      }
      return { success: true, message: '分析接口（OpenAI 兼容）连接测试成功' };
    }

    if (settings.aiProvider === 'gemini') {
      if (!settings.geminiApiKey) {
        return { success: false, message: '请先填写 Gemini API Key' };
      }
      const base = settings.geminiBaseURL || 'https://generativelanguage.googleapis.com/v1beta';
      const model = settings.geminiModelId || 'gemini-1.5-flash';
      const url = `${base}/models/${model}:generateContent?key=${settings.geminiApiKey}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'ping' }] }],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return { success: false, message: `Gemini 连接失败: ${resp.status} ${text}` };
      }
      return { success: true, message: 'Gemini 连接测试成功' };
    }

    if (settings.aiProvider === 'openai' || settings.aiProvider === 'custom' || settings.aiProvider === 'compatible') {
      const useOpenAI = settings.aiProvider === 'openai' || (settings.aiProvider === 'compatible' && settings.openaiApiKey);
      const apiKey = useOpenAI ? settings.openaiApiKey : settings.customApiKey;
      const baseURL = useOpenAI
        ? normalizeOpenAIBaseURL(settings.openaiBaseURL || 'https://api.openai.com/v1')
        : normalizeOpenAIBaseURL(settings.customBaseURL);
      const model = useOpenAI
        ? (settings.openaiModelId || 'gpt-4o-mini')
        : settings.customModelId;

      if (!apiKey || !baseURL || !model) {
        return { success: false, message: '请先填写完整的 API Key / Base URL / Model' };
      }

      const resp = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return { success: false, message: `连接失败: ${resp.status} ${text}` };
      }
      return { success: true, message: `${useOpenAI ? 'OpenAI 兼容接口' : '自定义 API'} 连接测试成功` };
    }

    return { success: false, message: '请配置可用的分析接口或选择受支持的 AI 提供商' };
  } catch (error) {
    return { success: false, message: `连接测试异常: ${error.message}` };
  }
});

// 文件选择
ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-music-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (!result.canceled) {
    return result.filePaths;
  }
  return [];
});

ipcMain.handle('open-path', async (_event, targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') {
    return { success: false, error: '路径无效' };
  }

  try {
    const errorMessage = await shell.openPath(targetPath);
    if (errorMessage) {
      return { success: false, error: errorMessage };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 视频处理
ipcMain.handle('process-video', async (event, videoPath, settings) => {
  try {
    console.log('[Main] 开始处理视频:', videoPath);
    
    const task = await videoProcessor.processVideo(
      videoPath,
      settings,
      (updatedTask) => {
        // 发送进度更新到渲染进程
        event.sender.send('video-progress', updatedTask);
      }
    );
    
    // 保存到数据库
    await db.saveProcessedVideo({
      videoPath,
      outputPath: task.result.outputPath,
      analysis: task.result.analysis,
      subtitles: task.result.subtitles,
      createdAt: new Date().toISOString(),
    });
    
    return task;
  } catch (error) {
    console.error('[Main] 处理视频失败:', error);
    throw error;
  }
});

ipcMain.handle('process-video-batch', async (event, videoPaths, settings) => {
  try {
    if (!Array.isArray(videoPaths) || videoPaths.length === 0) {
      throw new Error('缺少可处理的视频列表');
    }

    console.log('[Main] 开始批量智能处理视频:', videoPaths.length);

    const task = await videoProcessor.processVideoBatch(
      videoPaths,
      settings,
      (updatedTask) => {
        event.sender.send('video-progress', updatedTask);
      }
    );

    await db.saveProcessedVideo({
      videoPath: videoPaths.join(' | '),
      outputPath: task.result.outputPath,
      analysis: task.result.analysis,
      subtitles: task.result.subtitles,
      createdAt: new Date().toISOString(),
    });

    return task;
  } catch (error) {
    console.error('[Main] 批量处理视频失败:', error);
    throw error;
  }
});

// 获取处理任务
ipcMain.handle('get-task', async (event, taskId) => {
  return videoProcessor.getTask(taskId);
});

ipcMain.handle('get-all-tasks', async () => {
  return videoProcessor.getAllTasks();
});

// 字幕相关
ipcMain.handle('get-subtitles', async () => {
  try {
    return await db.getAllSubtitles();
  } catch (error) {
    console.error('[Main] 获取字幕失败:', error);
    return [];
  }
});

ipcMain.handle('save-subtitle', async (event, subtitle) => {
  try {
    await db.saveSubtitle(subtitle);
    return { success: true };
  } catch (error) {
    console.error('[Main] 保存字幕失败:', error);
    throw error;
  }
});

ipcMain.handle('update-subtitle-segment', async (event, subtitleId, segmentIndex, newText) => {
  try {
    await db.updateSubtitleSegment(subtitleId, segmentIndex, newText);
    return { success: true };
  } catch (error) {
    console.error('[Main] 更新字幕失败:', error);
    throw error;
  }
});

// 音乐相关
ipcMain.handle('get-music-tracks', async () => {
  try {
    return await db.getAllMusicTracks();
  } catch (error) {
    console.error('[Main] 获取音乐失败:', error);
    return [];
  }
});

ipcMain.handle('add-music-track', async (event, track) => {
  try {
    await db.addMusicTrack(track);
    return { success: true };
  } catch (error) {
    console.error('[Main] 添加音乐失败:', error);
    throw error;
  }
});

ipcMain.handle('delete-music-track', async (event, trackId) => {
  try {
    await db.deleteMusicTrack(trackId);
    return { success: true };
  } catch (error) {
    console.error('[Main] 删除音乐失败:', error);
    throw error;
  }
});

// 获取已处理的视频列表
ipcMain.handle('get-processed-videos', async () => {
  try {
    return await db.getAllProcessedVideos();
  } catch (error) {
    console.error('[Main] 获取视频列表失败:', error);
    return [];
  }
});

function getDefaultSettings() {
  return {
    contentMode: 'auto',
    aiProvider: 'gemini',
    geminiApiKey: '',
    geminiBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
    geminiModelId: 'gemini-1.5-flash',
    openaiApiKey: '',
    openaiBaseURL: 'https://api.openai.com/v1',
    openaiModelId: 'gpt-4o',
    customApiKey: '',
    customBaseURL: '',
    customModelId: '',
    analysisApiKey: '',
    analysisBaseURL: '',
    analysisModelId: '',
    transcriptionApiKey: '',
    transcriptionBaseURL: '',
    transcriptionModelId: 'whisper-1',
    smartMinScore: 0.58,
    smartMinDurationSec: 2,
    smartMaxSegments: 18,
    smartMaxDurationSec: 90,
    outputPath: path.join(app.getPath('videos'), 'AI_Edited'),
    videoQuality: 'high',
    autoSubtitle: true,
    autoMusic: true,
    // 云存储配置
    cloudProvider: 'local', // 'local' | 'oss' | 'cos'
    ossRegion: '',
    ossAccessKeyId: '',
    ossAccessKeySecret: '',
    ossBucket: '',
    cosSecretId: '',
    cosSecretKey: '',
    cosBucket: '',
    cosRegion: '',
  };
}

function normalizeOpenAIBaseURL(baseURL) {
  const base = String(baseURL || '').replace(/\/$/, '');
  if (!base) return base;
  return /\/v\d+$/i.test(base) ? base : `${base}/v1`;
}

// ========== 云上传相关 ==========

// 上传单个文件到云端
ipcMain.handle('upload-to-cloud', async (event, filePath, provider, config) => {
  try {
    const result = await cloudUploader.upload(
      filePath,
      provider,
      config,
      (progress) => {
        event.sender.send('upload-progress', { filePath, progress });
      }
    );
    return { success: true, ...result };
  } catch (error) {
    console.error('[Main] 云上传失败:', error);
    return { success: false, error: error.message };
  }
});

// 批量上传文件到云端
ipcMain.handle('upload-multiple-to-cloud', async (event, filePaths, provider, config) => {
  try {
    const results = await cloudUploader.uploadMultiple(
      filePaths,
      provider,
      config,
      (overallProgress, current, total) => {
        event.sender.send('upload-batch-progress', {
          overallProgress,
          current,
          total,
        });
      }
    );
    return { success: true, results };
  } catch (error) {
    console.error('[Main] 批量云上传失败:', error);
    return { success: false, error: error.message };
  }
});
