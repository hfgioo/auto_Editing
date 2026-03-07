import React, { useState } from 'react';
import {
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

interface Subtitle {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

const SubtitleManagementPage: React.FC = () => {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([
    {
      id: '1',
      startTime: 0,
      endTime: 3,
      text: '欢迎来到自动视频编辑工具',
    },
    {
      id: '2',
      startTime: 3.5,
      endTime: 6,
      text: '这是一个示例字幕',
    },
    {
      id: '3',
      startTime: 6.5,
      endTime: 10,
      text: '你可以编辑、添加或删除字幕',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const handleEdit = (subtitle: Subtitle) => {
    setEditingId(subtitle.id);
    setEditText(subtitle.text);
  };

  const handleSave = (id: string) => {
    setSubtitles(prev =>
      prev.map(s => (s.id === id ? { ...s, text: editText } : s))
    );
    setEditingId(null);
    setEditText('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条字幕吗？')) {
      setSubtitles(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddNew = () => {
    const lastSubtitle = subtitles[subtitles.length - 1];
    const newStartTime = lastSubtitle ? lastSubtitle.endTime + 0.5 : 0;

    const newSubtitle: Subtitle = {
      id: `${Date.now()}`,
      startTime: newStartTime,
      endTime: newStartTime + 3,
      text: '新字幕',
    };

    setSubtitles(prev => [...prev, newSubtitle]);
    setEditingId(newSubtitle.id);
    setEditText(newSubtitle.text);
  };

  const handleExportSRT = () => {
    // 生成 SRT 格式
    let srt = '';
    subtitles.forEach((sub, index) => {
      const startTime = formatSRTTime(sub.startTime);
      const endTime = formatSRTTime(sub.endTime);
      srt += `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n\n`;
    });

    // 下载文件
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms
      .toString()
      .padStart(3, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-claude-text-primary">字幕管理</h2>
          <p className="text-sm text-claude-text-secondary mt-1">
            编辑和管理视频字幕
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportSRT} className="btn-secondary flex items-center">
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            导出 SRT
          </button>
          <button onClick={handleAddNew} className="btn-primary flex items-center">
            <PlusIcon className="w-5 h-5 mr-2" />
            添加字幕
          </button>
        </div>
      </div>

      {/* Subtitle List */}
      {subtitles.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-claude-text-tertiary mb-4" />
          <p className="text-lg text-claude-text-secondary mb-4">暂无字幕</p>
          <button onClick={handleAddNew} className="btn-primary">
            添加第一条字幕
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="space-y-3">
            {subtitles.map((subtitle, index) => (
              <div
                key={subtitle.id}
                className="p-4 bg-claude-surface rounded-claude hover:bg-claude-border transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-claude-text-tertiary">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-claude-text-secondary">
                      {formatTime(subtitle.startTime)} → {formatTime(subtitle.endTime)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {editingId === subtitle.id ? (
                      <>
                        <button
                          onClick={() => handleSave(subtitle.id)}
                          className="text-sm text-claude-accent-primary hover:underline"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-sm text-claude-text-secondary hover:underline"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(subtitle)}
                          className="p-1 text-claude-text-secondary hover:text-claude-accent-primary transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(subtitle.id)}
                          className="p-1 text-claude-text-secondary hover:text-claude-error transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === subtitle.id ? (
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    className="input w-full min-h-[60px] resize-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-claude-text-primary">{subtitle.text}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {subtitles.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {subtitles.length}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">字幕条数</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {formatTime(
                subtitles.reduce((sum, s) => sum + (s.endTime - s.startTime), 0)
              )}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">总时长</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-semibold text-claude-text-primary">
              {Math.round(
                subtitles.reduce((sum, s) => sum + s.text.length, 0) /
                  subtitles.length
              )}
            </p>
            <p className="text-sm text-claude-text-secondary mt-1">平均字数</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleManagementPage;
