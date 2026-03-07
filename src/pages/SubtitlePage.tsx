import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { api } from '../services/api';

interface SubtitleSegment {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface VideoSubtitle {
  id: string;
  videoName: string;
  videoId: string;
  language: string;
  createdAt: string;
  segments: SubtitleSegment[];
}

const SubtitlePage: React.FC = () => {
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<VideoSubtitle | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSubtitles();
  }, []);

  const loadSubtitles = async () => {
    try {
      const data = await api.getSubtitles();
      setSubtitles(data);
      if (data.length > 0) {
        setSelectedSubtitle(data[0]);
      }
    } catch (error) {
      console.error('[SubtitlePage] 加载字幕失败:', error);
    }
  };

  const handleEdit = (index: number, text: string) => {
    setEditingIndex(index);
    setEditText(text);
  };

  const handleSave = async () => {
    if (selectedSubtitle && editingIndex !== null) {
      try {
        await api.updateSubtitleSegment(
          selectedSubtitle.id,
          editingIndex,
          editText
        );
        
        const updatedSegments = selectedSubtitle.segments.map((seg) =>
          seg.index === editingIndex ? { ...seg, text: editText } : seg
        );
        
        const updatedSubtitle = { ...selectedSubtitle, segments: updatedSegments };
        setSubtitles(subtitles.map(s => 
          s.id === selectedSubtitle.id ? updatedSubtitle : s
        ));
        setSelectedSubtitle(updatedSubtitle);
        setEditingIndex(null);
      } catch (error) {
        console.error('[SubtitlePage] 保存失败:', error);
        alert('保存失败');
      }
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const exportSRT = () => {
    if (!selectedSubtitle) return;

    let srtContent = '';
    selectedSubtitle.segments.forEach((seg) => {
      srtContent += `${seg.index}\n`;
      srtContent += `${seg.startTime} --> ${seg.endTime}\n`;
      srtContent += `${seg.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubtitle.videoName.replace(/\.[^.]+$/, '')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSegments = selectedSubtitle?.segments.filter(seg =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 左侧视频列表 */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">视频列表</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {subtitles.length} 个视频
              </p>
            </div>
            
            <div className="p-3 space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {subtitles.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">暂无字幕</p>
                  <p className="text-xs mt-1">处理视频后自动生成</p>
                </div>
              ) : (
                subtitles.map((subtitle) => (
                  <button
                    key={subtitle.id}
                    onClick={() => {
                      setSelectedSubtitle(subtitle);
                      setEditingIndex(null);
                    }}
                    className={`
                      w-full p-3 rounded-lg border text-left transition-all
                      ${selectedSubtitle?.id === subtitle.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <p className="font-medium text-sm text-gray-900 truncate mb-1">
                      {subtitle.videoName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="px-2 py-0.5 bg-white rounded-full border border-gray-200">
                        {subtitle.language}
                      </span>
                      <span>{subtitle.segments.length} 条</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧字幕编辑器 */}
        <div className="xl:col-span-9">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {selectedSubtitle ? (
              <>
                {/* 编辑器头部 */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {selectedSubtitle.videoName}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedSubtitle.segments.length} 条字幕 · AI 自动生成
                    </p>
                  </div>
                  
                  <button
                    onClick={exportSRT}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    导出 SRT
                  </button>
                </div>

                {/* 搜索栏 */}
                <div className="px-6 py-3 border-b border-gray-200">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索字幕内容..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* 字幕列表 */}
                <div className="p-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
                  <div className="space-y-3 max-w-4xl">
                    {filteredSegments.map((segment) => (
                      <div
                        key={segment.index}
                        className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors bg-white"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full font-mono font-semibold">
                              {segment.index}
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="px-2 py-1 bg-gray-100 rounded">{segment.startTime}</span>
                              <span>→</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">{segment.endTime}</span>
                            </div>
                          </div>
                          
                          {editingIndex === segment.index ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleSave}
                                className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                                title="保存"
                              >
                                <CheckIcon className="w-5 h-5 text-green-600" />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="取消"
                              >
                                <XMarkIcon className="w-5 h-5 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(segment.index, segment.text)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <PencilIcon className="w-5 h-5 text-gray-600" />
                            </button>
                          )}
                        </div>

                        {editingIndex === segment.index ? (
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-3 border-2 border-orange-500 rounded-lg text-gray-900 resize-none focus:outline-none text-sm"
                            rows={2}
                            autoFocus
                          />
                        ) : (
                          <p className="text-gray-900 leading-relaxed pl-10 text-sm">
                            {segment.text}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-400">
                <div className="text-center">
                  <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-base mb-2">选择一个视频查看字幕</p>
                  <p className="text-sm">字幕由 AI 在视频处理时自动生成</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubtitlePage;
