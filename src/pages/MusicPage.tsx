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
    loadMusicTracks();
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
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handleAddMusic = async () => {
    try {
      const paths = await api.selectMusicFiles();
      if (!paths || paths.length === 0) return;

      for (const filePath of paths) {
        const fileName = filePath.split(/[\\/]/).pop() || 'unknown';
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        const payload = {
          name: nameWithoutExt,
          artist: 'Unknown',
          duration: 0,
          genre: '轻快',
          filePath,
          addedAt: new Date().toISOString(),
        };
        await api.addMusicTrack(payload);
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

    if (audioElement) {
      audioElement.pause();
    }

    const encodedPath = encodeURI(track.filePath.replace(/\\/g, '/'));
    const audio = new Audio(`file://${encodedPath}`);
    audio.onended = () => setPlayingTrack(null);
    audio.play().catch((error) => {
      console.error('[MusicPage] 播放失败:', error);
      alert('播放失败，请确认文件路径有效且格式受支持');
    });

    setAudioElement(audio);
    setPlayingTrack(track.id);
  };

  const handleDelete = async (trackId: string) => {
    if (confirm('确定要删除这首音乐吗？')) {
      try {
        await api.deleteMusicTrack(trackId);
        setTracks(tracks.filter(t => t.id !== trackId));
        if (playingTrack === trackId) {
          setPlayingTrack(null);
        }
      } catch (error) {
        console.error('[MusicPage] 删除失败:', error);
        alert('删除失败');
      }
    }
  };

  const filteredTracks = tracks.filter(track => {
    const matchesGenre = selectedGenre === '全部' || track.genre === selectedGenre;
    const matchesSearch = track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={handleAddMusic}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          添加音乐
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索歌曲或艺术家..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>

          {/* 类型筛选 */}
          <div className="flex items-center gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`
                  px-3 py-2 rounded-lg font-medium transition-all text-sm
                  ${selectedGenre === genre
                    ? 'bg-orange-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-400'
                  }
                `}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 音乐列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredTracks.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MusicalNoteIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-base mb-2">没有找到音乐</p>
            <p className="text-sm">尝试调整搜索条件或添加新音乐</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    歌曲
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    艺术家
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    时长
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTracks.map((track) => (
                  <tr
                    key={track.id}
                    className={`
                      transition-colors
                      ${playingTrack === track.id ? 'bg-orange-50' : 'hover:bg-gray-50'}
                    `}
                  >
                    <td className="px-6 py-4">
                      <button
                        onClick={() => togglePlay(track)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-full transition-colors"
                      >
                        {playingTrack === track.id ? (
                          <PauseIcon className="w-5 h-5 text-orange-600" />
                        ) : (
                          <PlayIcon className="w-5 h-5 text-gray-600" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <MusicalNoteIcon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">
                          {track.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {track.artist}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {track.genre}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {formatDuration(track.duration)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(track.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <TrashIcon className="w-5 h-5 text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 播放器栏 */}
      {playingTrack && (
        <div className="fixed bottom-6 left-80 right-6 bg-white border border-gray-200 rounded-xl shadow-xl z-40">
          <div className="px-6 py-4">
            {(() => {
              const track = tracks.find(t => t.id === playingTrack);
              if (!track) return null;
              
              return (
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MusicalNoteIcon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {track.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {track.artist}
                    </p>
                  </div>

                  <button
                    onClick={() => setPlayingTrack(null)}
                    className="w-10 h-10 flex items-center justify-center bg-orange-600 hover:bg-orange-700 rounded-full transition-colors"
                  >
                    <PauseIcon className="w-5 h-5 text-white" />
                  </button>

                  <div className="text-sm text-gray-600 font-mono">
                    {formatDuration(track.duration)}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicPage;
