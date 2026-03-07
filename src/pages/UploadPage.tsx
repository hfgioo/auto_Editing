import React, { useState, useRef, useEffect } from 'react';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  PlayIcon,
  VideoCameraIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import { ProcessTask } from '../types';
import { api } from '../services/api';

const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.onVideoProgress((task: ProcessTask) => {
      setTasks((prev) => {
        const index = prev.findIndex((t) => t.id === task.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = task;
          return next;
        }
        return [...prev, task];
      });
    });

    return () => {
      api.removeVideoProgressListener();
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const videoFiles = newFiles.filter((file) => file.type.startsWith('video/'));
    setFiles((prev) => [...prev, ...videoFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) {
      alert('请先上传视频文件');
      return;
    }

    try {
      const settings = await api.loadSettings();

      const hasAnalysisOverride = !!(settings.analysisApiKey && settings.analysisBaseURL && settings.analysisModelId);
      const hasGemini = !!(settings.geminiApiKey && settings.geminiBaseURL && settings.geminiModelId);
      const hasOpenAI = !!(settings.openaiApiKey && settings.openaiBaseURL && settings.openaiModelId);
      const hasCustom = !!(settings.customApiKey && settings.customBaseURL && settings.customModelId);

      let analysisReady = false;
      if (hasAnalysisOverride) {
        analysisReady = true;
      } else if (settings.aiProvider === 'gemini') {
        analysisReady = hasGemini;
      } else if (settings.aiProvider === 'openai') {
        analysisReady = hasOpenAI;
      } else {
        analysisReady = hasCustom || hasOpenAI;
      }

      if (!analysisReady) {
        alert('请先在设置中完成 AI 分析配置（可用分析接口覆盖，或配置 Gemini/OpenAI/自定义兼容接口）');
        return;
      }

      setIsProcessing(true);

      for (let i = 0; i < files.length; i++) {
        const filePath = (files[i] as any).path;
        if (!filePath) {
          throw new Error('无法获取文件路径，请在 Electron 环境中运行');
        }
        await api.processVideo(filePath, settings);
      }

      alert('✅ 所有视频处理完成！');
      setFiles([]);
    } catch (error) {
      alert(`❌ 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStepLabel = (stepName: string) => {
    const labels: Record<string, string> = {
      extract: '提取信息',
      analyze: 'AI 分析',
      edit: '视频剪辑',
      subtitle: '生成字幕',
      music: '添加音乐',
      export: '导出视频',
    };
    return labels[stepName] || stepName;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? 'border-[var(--accent)] bg-[rgba(225,107,66,0.1)]'
            : 'border-[var(--line)] bg-white/70 hover:border-[rgba(225,107,66,0.45)] hover:bg-white/90'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,var(--accent),var(--accent-2))] text-white shadow-lg">
          <CloudArrowUpIcon className="h-8 w-8" />
        </div>

        <h3 className="text-lg font-semibold text-[var(--ink)]">{isDragging ? '松开以上传文件' : '把视频拖拽到这里'}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">或者点击选择文件，支持批量上传</p>

        <div className="mt-4 flex items-center justify-center gap-5 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <VideoCameraIcon className="h-4 w-4" />
            <span>MP4 / MOV / AVI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DocumentIcon className="h-4 w-4" />
            <span>自动串行处理</span>
          </div>
        </div>
      </section>

      {files.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white/85">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink)]">已选 {files.length} 个视频</h3>
              <p className="text-xs text-[var(--muted)]">
                总大小 {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </p>
            </div>
            <button
              onClick={handleStartProcessing}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlayIcon className="h-4 w-4" />
              {isProcessing ? '处理中...' : '开始处理'}
            </button>
          </div>

          <div className="divide-y divide-[var(--line)]/70">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--panel-2)] text-xs font-bold text-[var(--ink-soft)]">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{file.name}</p>
                  <p className="text-xs text-[var(--muted)]">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isProcessing}
                  className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-[rgba(239,68,68,0.1)] hover:text-red-600 disabled:opacity-40"
                  title="移除"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tasks.length > 0 && (
        <section className="rounded-3xl border border-[var(--line)] bg-white/85 p-4 md:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[var(--ink)]">实时任务进度</h3>
            <p className="text-xs text-[var(--muted)]">失败步骤会直接标红，方便定位阻断项</p>
          </div>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-[var(--ink)]">{task.videoPath?.split('/').pop() || '处理中任务'}</p>
                  <p className="text-xs font-semibold text-[var(--muted)]">{task.progress}%</p>
                </div>
                <div className="mb-3 h-2 rounded-full bg-[var(--panel-2)]">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-3">
                  {Object.entries(task.steps).map(([stepName, step]) => (
                    <div key={stepName} className="rounded-lg border border-[var(--line)]/80 bg-white/75 px-2 py-1.5">
                      <p className="font-medium text-[var(--ink-soft)]">{getStepLabel(stepName)}</p>
                      <p
                        className={`mt-0.5 ${
                          step.status === 'completed'
                            ? 'text-emerald-600'
                            : step.status === 'processing'
                              ? 'text-sky-600'
                              : step.status === 'failed'
                                ? 'text-red-600'
                                : 'text-[var(--muted)]'
                        }`}
                      >
                        {step.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default UploadPage;
