const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

const dbPath = path.join(app.getPath('userData'), 'video_editor.db');
const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processed_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_path TEXT NOT NULL,
    output_path TEXT NOT NULL,
    analysis TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtitles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    video_name TEXT NOT NULL,
    language TEXT NOT NULL,
    segments TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES processed_videos(id)
  );

  CREATE TABLE IF NOT EXISTS music_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration INTEGER NOT NULL,
    genre TEXT NOT NULL,
    file_path TEXT NOT NULL,
    added_at TEXT NOT NULL
  );
`);

// 设置相关
function getSettings() {
  const row = db.prepare('SELECT data FROM settings WHERE id = 1').get();
  return row ? JSON.parse(row.data) : null;
}

function saveSettings(settings) {
  const data = JSON.stringify(settings);
  const stmt = db.prepare(`
    INSERT INTO settings (id, data) VALUES (1, ?)
    ON CONFLICT(id) DO UPDATE SET data = ?
  `);
  stmt.run(data, data);
}

// 视频相关
function saveProcessedVideo(video) {
  const stmt = db.prepare(`
    INSERT INTO processed_videos (video_path, output_path, analysis, created_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    video.videoPath,
    video.outputPath,
    JSON.stringify(video.analysis),
    video.createdAt
  );
  
  // 保存字幕
  if (video.subtitles && video.subtitles.length > 0) {
    saveSubtitle({
      videoId: result.lastInsertRowid,
      videoName: path.basename(video.videoPath),
      language: '中文',
      segments: video.subtitles,
      createdAt: video.createdAt,
    });
  }
  
  return result.lastInsertRowid;
}

function getAllProcessedVideos() {
  const stmt = db.prepare(`
    SELECT id, video_path, output_path, analysis, created_at
    FROM processed_videos
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all();
  return rows.map(row => ({
    id: row.id,
    videoPath: row.video_path,
    outputPath: row.output_path,
    analysis: JSON.parse(row.analysis || '{}'),
    createdAt: row.created_at,
  }));
}

// 字幕相关
function saveSubtitle(subtitle) {
  const stmt = db.prepare(`
    INSERT INTO subtitles (video_id, video_name, language, segments, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    subtitle.videoId,
    subtitle.videoName,
    subtitle.language,
    JSON.stringify(subtitle.segments),
    subtitle.createdAt
  );
}

function getAllSubtitles() {
  const stmt = db.prepare(`
    SELECT id, video_id, video_name, language, segments, created_at
    FROM subtitles
    ORDER BY created_at DESC
  `);
  
  const rows = stmt.all();
  return rows.map(row => ({
    id: row.id.toString(),
    videoId: row.video_id.toString(),
    videoName: row.video_name,
    language: row.language,
    segments: JSON.parse(row.segments),
    createdAt: row.created_at,
  }));
}

function updateSubtitleSegment(subtitleId, segmentIndex, newText) {
  const row = db.prepare('SELECT segments FROM subtitles WHERE id = ?').get(subtitleId);
  if (!row) throw new Error('字幕不存在');
  
  const segments = JSON.parse(row.segments);
  const segment = segments.find(s => s.index === segmentIndex);
  if (segment) {
    segment.text = newText;
  }
  
  const stmt = db.prepare('UPDATE subtitles SET segments = ? WHERE id = ?');
  stmt.run(JSON.stringify(segments), subtitleId);
}

// 音乐相关
function addMusicTrack(track) {
  const stmt = db.prepare(`
    INSERT INTO music_tracks (name, artist, duration, genre, file_path, added_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    track.name,
    track.artist,
    track.duration,
    track.genre,
    track.filePath,
    track.addedAt
  );
}

function getAllMusicTracks() {
  const stmt = db.prepare(`
    SELECT id, name, artist, duration, genre, file_path, added_at
    FROM music_tracks
    ORDER BY added_at DESC
  `);
  
  const rows = stmt.all();
  return rows.map(row => ({
    id: row.id.toString(),
    name: row.name,
    artist: row.artist,
    duration: row.duration,
    genre: row.genre,
    filePath: row.file_path,
    addedAt: row.added_at,
  }));
}

function deleteMusicTrack(trackId) {
  const stmt = db.prepare('DELETE FROM music_tracks WHERE id = ?');
  stmt.run(trackId);
}

module.exports = {
  getSettings,
  saveSettings,
  saveProcessedVideo,
  getAllProcessedVideos,
  saveSubtitle,
  getAllSubtitles,
  updateSubtitleSegment,
  addMusicTrack,
  getAllMusicTracks,
  deleteMusicTrack,
};
