import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ProcessTask } from '../types';
import { api } from '../services/api';

const ProcessPage: React.FC = () => {
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadTasks();

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

  const loadTasks = async () => {
    try {
      const allTasks = await api.getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error('[ProcessPage] 加载任务失败:', error);
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 animate-spin text-sky-600" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-[var(--muted)]" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <ArrowPathIcon className="h-7 w-7 animate-spin text-[var(--muted)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex justify-end">
        <button
          onClick={loadTasks}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-white"
        >
          <ArrowPathIcon className="h-4 w-4" />
          刷新
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-3xl border border-[var(--line)] bg-white/80 p-16 text-center">
          <ChartBarIcon className="mx-auto mb-4 h-14 w-14 text-[var(--muted)]" />
          <p className="text-sm font-medium text-[var(--ink-soft)]">暂无任务</p>
          <p className="mt-1 text-xs text-[var(--muted)]">上传页开始处理后会在这里显示</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white/85">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <p className="max-w-[44vw] truncate text-sm font-semibold text-[var(--ink)] md:max-w-[60vw]">
                      {task.videoPath?.split('/').pop() || '未知视频'}
                    </p>
                    <p className="text-xs text-[var(--muted)]">状态: {task.status} · 进度: {task.progress}%</p>
                  </div>
                </div>

                {task.status === 'completed' && task.result?.outputPath && (
                  <button
                    onClick={async () => {
                      const result = await api.openPath(task.result!.outputPath!);
                      if (!result?.success) {
                        alert(`打开失败: ${result?.error || '未知错误'}`);
                      }
                    }}
                    className="rounded-lg bg-[var(--panel-2)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)] transition hover:bg-[var(--line)]"
                  >
                    打开文件
                  </button>
                )}
              </div>

              <div className="px-5 py-3">
                <div className="h-2 rounded-full bg-[var(--panel-2)]">
                  <div
                    className={`h-2 rounded-full ${
                      task.status === 'completed'
                        ? 'bg-emerald-500'
                        : task.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-[linear-gradient(90deg,var(--accent),var(--accent-2))]'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 px-5 pb-5 md:grid-cols-3">
                {Object.entries(task.steps).map(([stepName, step]) => (
                  <div key={stepName} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2.5">
                    <p className="text-xs font-medium text-[var(--ink-soft)]">{getStepLabel(stepName)}</p>
                    <p
                      className={`mt-1 text-xs ${
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

              {task.error && (
                <div className="border-t border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                  <span className="font-semibold">错误：</span>
                  {task.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProcessPage;
