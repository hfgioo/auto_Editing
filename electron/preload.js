const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 设置
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  
  // 视频处理
  processVideo: (videoPath, settings) => ipcRenderer.invoke('process-video', videoPath, settings),
  getTask: (taskId) => ipcRenderer.invoke('get-task', taskId),
  getAllTasks: () => ipcRenderer.invoke('get-all-tasks'),
  getProcessedVideos: () => ipcRenderer.invoke('get-processed-videos'),
  
  // 进度监听
  onVideoProgress: (callback) => {
    ipcRenderer.on('video-progress', (event, task) => callback(task));
  },
  removeVideoProgressListener: () => {
    ipcRenderer.removeAllListeners('video-progress');
  },
  
  // 字幕
  getSubtitles: () => ipcRenderer.invoke('get-subtitles'),
  saveSubtitle: (subtitle) => ipcRenderer.invoke('save-subtitle', subtitle),
  updateSubtitleSegment: (subtitleId, segmentIndex, newText) => 
    ipcRenderer.invoke('update-subtitle-segment', subtitleId, segmentIndex, newText),
  
  // 音乐
  getMusicTracks: () => ipcRenderer.invoke('get-music-tracks'),
  addMusicTrack: (track) => ipcRenderer.invoke('add-music-track', track),
  deleteMusicTrack: (trackId) => ipcRenderer.invoke('delete-music-track', trackId),
});
