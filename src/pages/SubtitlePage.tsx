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
    void loadSubtitles();
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
    if (!selectedSubtitle || editingIndex === null) return;
    try {
      await api.updateSubtitleSegment(selectedSubtitle.id, editingIndex, editText);
      const updatedSegments = selectedSubtitle.segments.map((seg) =>
        seg.index === editingIndex ? { ...seg, text: editText } : seg
      );
      const updatedSubtitle = { ...selectedSubtitle, segments: updatedSegments };
      setSubtitles((prev) => prev.map((s) => (s.id === selectedSubtitle.id ? updatedSubtitle : s)));
      setSelectedSubtitle(updatedSubtitle);
      setEditingIndex(null);
    } catch (error) {
      console.error('[SubtitlePage] 保存失败:', error);
      alert('保存失败');
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

  const filteredSegments =
    selectedSubtitle?.segments.filter((seg) => seg.text.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white/85">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--ink)]">字幕任务</p>
              <p className="text-xs text-[var(--muted)]">共 {subtitles.length} 个视频</p>
            </div>

            <div className="max-h-[calc(100vh-17rem)] space-y-2 overflow-y-auto p-3">
              {subtitles.length === 0 ? (
                <div className="py-12 text-center text-[var(--muted)]">
                  <DocumentTextIcon className="mx-auto mb-2 h-10 w-10" />
                  <p className="text-xs">暂无字幕数据</p>
                </div>
              ) : (
                subtitles.map((subtitle) => (
                  <button
                    key={subtitle.id}
                    onClick={() => {
                      setSelectedSubtitle(subtitle);
                      setEditingIndex(null);
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      selectedSubtitle?.id === subtitle.id
                        ? 'border-[rgba(225,107,66,0.5)] bg-[rgba(225,107,66,0.12)]'
                        : 'border-[var(--line)] bg-white/70 hover:bg-white'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">{subtitle.videoName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{subtitle.segments.length} 条 · {subtitle.language}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="xl:col-span-9">
          <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white/85">
            {selectedSubtitle ? (
              <>
                <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{selectedSubtitle.videoName}</p>
                    <p className="text-xs text-[var(--muted)]">{selectedSubtitle.segments.length} 条字幕</p>
                  </div>
                  <button
                    onClick={exportSRT}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    导出 SRT
                  </button>
                </div>

                <div className="border-b border-[var(--line)] px-5 py-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索字幕内容..."
                      className="w-full rounded-xl border border-[var(--line)] bg-white px-9 py-2 text-sm outline-none ring-0 transition focus:border-[rgba(225,107,66,0.6)]"
                    />
                  </div>
                </div>

                <div className="max-h-[calc(100vh-21rem)] space-y-3 overflow-y-auto p-5">
                  {filteredSegments.map((segment) => (
                    <article key={segment.index} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                          <span className="rounded-md bg-[var(--panel-2)] px-2 py-0.5 font-mono">#{segment.index}</span>
                          <span className="font-mono">{segment.startTime}</span>
                          <span>→</span>
                          <span className="font-mono">{segment.endTime}</span>
                        </div>

                        {editingIndex === segment.index ? (
                          <div className="flex items-center gap-1">
                            <button onClick={handleSave} className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50" title="保存">
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button onClick={handleCancel} className="rounded-md p-1 text-red-600 hover:bg-red-50" title="取消">
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(segment.index, segment.text)}
                            className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--panel-2)]"
                            title="编辑"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>

                      {editingIndex === segment.index ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full resize-none rounded-xl border border-[rgba(225,107,66,0.6)] bg-white p-2 text-sm text-[var(--ink)] outline-none"
                          rows={3}
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{segment.text}</p>
                      )}
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-80 items-center justify-center text-center text-[var(--muted)]">
                <div>
                  <DocumentTextIcon className="mx-auto mb-2 h-10 w-10" />
                  <p className="text-sm">选择一个视频开始编辑字幕</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SubtitlePage;
