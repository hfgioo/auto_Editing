import React, { useState, useEffect } from 'react';
import {
  MusicalNoteIcon,
  PlusIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  genre: string;
  addedAt: string;
  filePath: string;
}

const MusicPage: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('全部');
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const genres = ['全部', '轻快', '舒缓', '史诗', '电子', '古典'];

  useEffect(() => {
    void loadMusicTracks();
  }, []);

  const loadMusicTracks = async () => {
    try {
      const data = await api.getMusicTracks();
      setTracks(data);
    } catch (error) {
      console.error('[MusicPage] 加载音乐失败:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

  const handleAddMusic = async () => {
    try {
      const paths = await api.selectMusicFiles();
      if (!paths || paths.length === 0) return;

      for (const filePath of paths) {
        const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        await api.addMusicTrack({
          name: nameWithoutExt,
          artist: 'Unknown',
          duration: 0,
          genre: '轻快',
          filePath,
          addedAt: new Date().toISOString(),
        });
      }

      await loadMusicTracks();
      alert(`已添加 ${paths.length} 首音乐`);
    } catch (error) {
      console.error('[MusicPage] 添加音乐失败:', error);
      alert('添加音乐失败');
    }
  };

  const togglePlay = (track: MusicTrack) => {
    if (playingTrack === track.id) {
      audioElement?.pause();
      setPlayingTrack(null);
      return;
    }

    audioElement?.pause();
    const encodedPath = encodeURI(track.filePath.replace(/\\/g, '/'));
    const audio = new Audio(`file://${encodedPath}`);
    audio.onended = () => setPlayingTrack(null);
    audio.play().catch((error) => {
      console.error('[MusicPage] 播放失败:', error);
      alert('播放失败，请确认文件格式受支持');
    });

    setAudioElement(audio);
    setPlayingTrack(track.id);
  };

  const handleDelete = async (trackId: string) => {
    if (!confirm('确定要删除这首音乐吗？')) return;
    try {
      await api.deleteMusicTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
      if (playingTrack === trackId) setPlayingTrack(null);
    } catch (error) {
      console.error('[MusicPage] 删除失败:', error);
      alert('删除失败');
    }
  };

  const filteredTracks = tracks.filter((track) => {
    const matchesGenre = selectedGenre === '全部' || track.genre === selectedGenre;
    const lowerQ = searchQuery.toLowerCase();
    const matchesSearch = track.name.toLowerCase().includes(lowerQ) || track.artist.toLowerCase().includes(lowerQ);
    return matchesGenre && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink)]">音乐库</h3>
          <p className="text-xs text-[var(--muted)]">自动配乐会从这里挑选音频</p>
        </div>
        <button
          onClick={handleAddMusic}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <PlusIcon className="h-4 w-4" />
          添加音乐
        </button>
      </div>

      <section className="rounded-3xl border border-[var(--line)] bg-white/85 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索歌曲或艺术家..."
              className="w-full rounded-xl border border-[var(--line)] px-9 py-2 text-sm outline-none transition focus:border-[rgba(225,107,66,0.6)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selectedGenre === genre
                    ? 'border-[rgba(225,107,66,0.5)] bg-[rgba(225,107,66,0.14)] text-[var(--ink)]'
                    : 'border-[var(--line)] bg-white text-[var(--ink-soft)] hover:bg-[var(--panel)]'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white/85">
        {filteredTracks.length === 0 ? (
          <div className="py-16 text-center text-[var(--muted)]">
            <MusicalNoteIcon className="mx-auto mb-2 h-12 w-12" />
            <p className="text-sm">没有匹配的音乐</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-[var(--line)] bg-[var(--panel)]">
                <tr className="text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-5 py-3">播放</th>
                  <th className="px-5 py-3">歌曲</th>
                  <th className="px-5 py-3">艺术家</th>
                  <th className="px-5 py-3">类型</th>
                  <th className="px-5 py-3">时长</th>
                  <th className="px-5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((track) => (
                  <tr
                    key={track.id}
                    className={`border-b border-[var(--line)]/70 text-sm text-[var(--ink-soft)] transition ${
                      playingTrack === track.id ? 'bg-[rgba(225,107,66,0.1)]' : 'hover:bg-[var(--panel)]'
                    }`}
                  >
                    <td className="px-5 py-3">
                      <button onClick={() => togglePlay(track)} className="rounded-lg p-1.5 hover:bg-white">
                        {playingTrack === track.id ? (
                          <PauseIcon className="h-5 w-5 text-[var(--accent)]" />
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--panel-2)]">
                          <MusicalNoteIcon className="h-5 w-5 text-[var(--ink-soft)]" />
                        </div>
                        <span className="font-semibold text-[var(--ink)]">{track.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">{track.artist}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-[var(--panel-2)] px-2 py-1 text-xs">{track.genre}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{formatDuration(track.duration)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => handleDelete(track.id)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="删除">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default MusicPage;
