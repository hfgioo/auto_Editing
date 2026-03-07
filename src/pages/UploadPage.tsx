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
    // 监听视频处理进度
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
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    const videoFiles = newFiles.filter(file => file.type.startsWith('video/'));
    setFiles([...files, ...videoFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const handleStartProcessing = async () => {
    if (files.length === 0) {
      alert('请先上传视频文件');
      return;
    }

    console.log('[UploadPage] 开始处理，文件数量:', files.length);
    
    try {
      const settings = await api.loadSettings();
      console.log('[UploadPage] 加载的设置:', settings);
      
      // 检查 API Key
      if (settings.aiProvider === 'gemini' && !settings.geminiApiKey) {
        alert('请先在设置中配置 Gemini API Key');
        return;
      }
      if (settings.aiProvider === 'openai' && !settings.openaiApiKey) {
        alert('请先在设置中配置 OpenAI API Key');
        return;
      }
      if (settings.aiProvider === 'custom' && (!settings.customApiKey || !settings.customBaseURL)) {
        alert('请先在设置中配置自定义 API');
        return;
      }

      setIsProcessing(true);

      // 处理每个视频文件
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[UploadPage] 处理第 ${i + 1}/${files.length} 个文件:`, file.name);
        
        // 在 Electron 中使用 file.path
        const filePath = (file as any).path;
        if (!filePath) {
          throw new Error('无法获取文件路径，请在 Electron 环境中运行');
        }
        
        const task = await api.processVideo(filePath, settings);
        console.log('[UploadPage] 任务已创建:', task.id);
      }
      
      console.log('[UploadPage] 所有视频已提交处理');
      alert('✅ 所有视频处理完成！');
      setFiles([]);
    } catch (error) {
      console.error('[UploadPage] 处理失败:', error);
      alert('❌ 处理失败: ' + (error instanceof Error ? error.message : '未知错误'));
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

  const getStepStatus = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '等待中', color: 'text-gray-500' },
      processing: { text: '处理中...', color: 'text-blue-600' },
      completed: { text: '已完成', color: 'text-green-600' },
      failed: { text: '失败', color: 'text-red-600' },
      skipped: { text: '已跳过', color: 'text-gray-400' },
    };
    return statusMap[status] || statusMap.pending;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">上传视频</h1>
        <p className="text-sm text-gray-600 mt-1">
          上传视频文件，AI 将自动分析并生成精彩片段
        </p>
      </div>

      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all
          ${isDragging 
            ? 'border-orange-500 bg-orange-50' 
            : 'border-gray-300 bg-white hover:border-orange-400 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <CloudArrowUpIcon className="w-8 h-8 text-orange-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isDragging ? '松开以上传文件' : '拖拽视频文件到这里'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            或点击选择文件
          </p>
          
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <VideoCameraIcon className="w-4 h-4" />
              <span>支持 MP4、MOV、AVI</span>
            </div>
            <div className="flex items-center gap-1">
              <DocumentIcon className="w-4 h-4" />
              <span>支持批量上传</span>
            </div>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                已选择 {files.length} 个视频
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                总大小 {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </p>
            </div>
            <button
              onClick={handleStartProcessing}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <PlayIcon className="w-4 h-4" />
              {isProcessing ? '处理中...' : '开始处理'}
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {files.map((file, index) => (
              <div key={index} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isProcessing}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                  title="移除"
                >
                  <XMarkIcon className="w-5 h-5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 处理进度 */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">处理进度</h3>
            <p className="text-xs text-gray-600 mt-0.5">
              AI 正在分析视频内容并生成精彩片段
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {tasks.map((task) => (
              <div key={task.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {task.videoPath?.split('/').pop() || '处理中'}
                  </h4>
                  <span className="text-sm text-gray-600">{task.progress}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(task.steps).map(([stepName, step]) => {
                    const status = getStepStatus(step.status);
                    return (
                      <div key={stepName} className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                          step.status === 'failed' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                        <span className="text-gray-700">{getStepLabel(stepName)}</span>
                        <span className={status.color}>{status.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
