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
    loadTasks();
    
    // 监听实时进度更新
    api.onVideoProgress((task: ProcessTask) => {
      setTasks(prev => {
        const index = prev.findIndex(t => t.id === task.id);
        if (index >= 0) {
          const newTasks = [...prev];
          newTasks[index] = task;
          return newTasks;
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
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      skipped: '已跳过',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">处理进度</h1>
          <p className="text-sm text-gray-600 mt-1">
            查看视频处理状态和进度
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <ArrowPathIcon className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-600 mb-2">暂无处理任务</p>
          <p className="text-sm text-gray-500">上传视频后将在这里显示处理进度</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 任务头部 */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(task.status)}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {task.videoPath?.split('/').pop() || '未知视频'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      状态: {getStatusText(task.status)} · 进度: {task.progress}%
                    </p>
                  </div>
                </div>
                
                {task.status === 'completed' && task.result?.outputPath && (
                  <button
                    onClick={() => {
                      // 打开输出文件夹
                      console.log('打开:', task.result.outputPath);
                    }}
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                  >
                    查看文件
                  </button>
                )}
              </div>

              {/* 进度条 */}
              <div className="px-6 py-3 border-b border-gray-200">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      task.status === 'completed' ? 'bg-green-600' :
                      task.status === 'failed' ? 'bg-red-600' :
                      'bg-orange-600'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              {/* 步骤详情 */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(task.steps).map(([stepName, step]) => (
                    <div key={stepName} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {step.status === 'completed' ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : step.status === 'processing' ? (
                          <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : step.status === 'failed' ? (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {getStepLabel(stepName)}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {getStatusText(step.status)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 错误信息 */}
              {task.error && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200">
                  <p className="text-sm text-red-800">
                    <span className="font-medium">错误:</span> {task.error}
                  </p>
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
