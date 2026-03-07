import React, { useState, useEffect } from 'react';
import {
  MusicalNoteIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';

interface MusicTrack {
  id: string;
  name: string;
  path: string;
  duration: number;
  genre: string;
  mood: string;
}

const MusicLibraryPage: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMusicLibrary();
  }, []);

  const loadMusicLibrary = async () => {
    if (!window.electronAPI?.db) {
      // 演示模式 - 使用模拟数据
      const mockTracks: MusicTrack[] = [
        {
          id: '1',
          name: 'Upbeat Background',
          path: '/music/upbeat.mp3',
          duration: 180,
          genre: 'Electronic',
          mood: 'upbeat',
        },
        {
          id: '2',
          name: 'Calm Ambient',
          path: '/music/calm.mp3',
          duration: 240,
          genre: 'Ambient',
          mood: 'calm',
        },
        {
          id: '3',
          name: 'Dramatic Cinematic',
          path: '/music/dramatic.mp3',
          duration: 200,
          genre: 'Cinematic',
          mood: 'dramatic',
        },
      ];
      setTracks(mockTracks);
      return;
    }

    try {
      const musicList = await window.electronAPI.db.getAllMusic();
      setTracks(musicList);
    } catch (error) {
      console.error('[MusicLibraryPage] 加载失败:', error);
    }
  };

  const handleAddMusic = async () => {
    if (!window.electronAPI) return;
    const files = await window.electronAPI.selectVideos(); // 复用文件选择
    if (!files || files.length === 0) return;

    // TODO: 添加音乐文件到库
    console.log('添加音乐:', files);
  };

  const handleDeleteTrack = async (id: string) => {
    if (!confirm('确定要删除这首音乐吗？')) return;

    if (playingId === id) {
      audioElement?.pause();
      setPlayingId(null);
    }

    if (window.electronAPI?.db) {
      await window.electronAPI.db.deleteMusic(id);
      loadMusicLibrary();
    } else {
      setTracks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handlePlayPause = (track: MusicTrack) => {
    if (playingId === track.id) {
      audioElement?.pause();
      setPlayingId(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(track.path);
      audio.play();
      audio.onended = () => setPlayingId(null);
      setAudioElement(audio);
      setPlayingId(track.id);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMoodColor = (mood: string): string => {
    const colors: Record<string, string> = {
      upbeat: 'bg-yellow-100 text-yellow-800',
      calm: 'bg-blue-100 text-blue-800',
      dramatic: 'bg-red-100 text-red-800',
      happy: 'bg-green-100 text-green-800',
      sad: 'bg-gray-100 text-gray-800',
    };
    return colors[mood] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-claude-text-primary">音乐库</h2>
          <p className="text-sm text-claude-text-secondary mt-1">
            管理背景音乐，为视频添加合适的配乐
          </p>
        </div>
        <button onClick={handleAddMusic} className="btn-primary flex items-center">
          <PlusIcon className="w-5 h-5 mr-2" />
          添加音乐
        </button>
      </div>

      {/* Music List */}
      {tracks.length === 0 ? (
        <div className="card text-center py-12">
          <MusicalNoteIcon className="w-16 h-16 mx-auto text-claude-text-tertiary mb-4" />
          <p className="text-lg text-claude-text-secondary mb-4">音乐库为空</p>
          <button onClick={handleAddMusic} className="btn-primary">
            添加第一首音乐
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-3">
            {tracks.map(track => (
              <div
                key={track.id}
                className="flex items-center justify-between p-4 bg-claude-surface rounded-claude hover:bg-claude-border transition-colors"
              >
                <div className="flex items-center flex-1 min-w-0">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayPause(track)}
                    className="w-10 h-10 flex items-center justify-center bg-claude-accent-primary text-white rounded-full hover:bg-claude-accent-primary/80 transition-colors flex-shrink-0"
                  >
                    {playingId === track.id ? (
                      <PauseIcon className="w-5 h-5" />
                    ) : (
                      <PlayIcon className="w-5 h-5 ml-0.5" />
                    )}
                  </button>

                  {/* Track Info */}
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-sm font-medium text-claude-text-primary truncate">
                      {track.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-claude-text-secondary">
                        {track.genre}
                      </span>
                      <span className="text-xs text-claude-text-tertiary">•</span>
                      <span className="text-xs text-claude-text-secondary">
                        {formatDuration(track.duration)}
                      </span>
                    </div>
                  </div>

                  {/* Mood Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getMoodColor(
                      track.mood
                    )}`}
                  >
                    {track.mood}
                  </span>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteTrack(track.id)}
                  className="ml-4 p-2 text-claude-text-secondary hover:text-claude-error hover:bg-red-50 rounded transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {tracks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {tracks.length}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">总曲目</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {Math.floor(tracks.reduce((sum, t) => sum + t.duration, 0) / 60)}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">总时长（分钟）</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {new Set(tracks.map(t => t.genre)).size}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">音乐风格</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicLibraryPage;
