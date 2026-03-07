const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const VideoProcessor = require('./VideoProcessor');
const CloudUploader = require('./CloudUploader');
const db = require('./database');

let mainWindow;
const videoProcessor = new VideoProcessor();
const cloudUploader = new CloudUploader();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
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
