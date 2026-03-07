import React from 'react';
import { ProcessTask } from '../types';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/solid';

interface ProcessStepsProps {
  task: ProcessTask;
}

const ProcessSteps: React.FC<ProcessStepsProps> = ({ task }) => {
  const stepLabels: Record<string, string> = {
    upload: '上传',
    analyze: 'AI 分析',
    cut: '剪辑',
    subtitle: '字幕',
    music: '音乐',
    render: '渲染',
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-600" />;
      case 'processing':
        return (
          <div className="w-5 h-5 border-2 border-claude-accent-primary border-t-transparent rounded-full animate-spin" />
        );
      case 'skipped':
        return <div className="w-5 h-5 rounded-full bg-gray-300" />;
      default:
        return <ClockIcon className="w-5 h-5 text-claude-text-tertiary" />;
    }
  };

  return (
    <div className="border border-claude-border rounded-claude p-4">
      {/* 总进度 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-claude-text-primary">
            总进度
          </span>
          <span className="text-sm font-medium text-claude-accent-primary">
            {Math.round(task.progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-claude-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-claude-accent-primary transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="space-y-3">
        {task.steps.map((step) => (
          <div key={step.step} className="flex items-center gap-3">
            {getStepIcon(step.status)}
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  step.status === 'processing' 
                    ? 'text-claude-accent-primary' 
                    : step.status === 'completed'
                    ? 'text-green-600'
                    : step.status === 'error'
                    ? 'text-red-600'
                    : 'text-claude-text-secondary'
                }`}>
                  {stepLabels[step.step] || step.step}
                </span>
                {step.status === 'processing' && (
                  <span className="text-xs text-claude-text-tertiary">
                    {Math.round(step.progress)}%
                  </span>
                )}
              </div>
              
              {step.status === 'processing' && (
                <div className="w-full h-1 bg-claude-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-claude-accent-primary transition-all duration-300"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 错误信息 */}
      {task.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-claude">
          <p className="text-sm text-red-600">{task.error}</p>
        </div>
      )}

      {/* 完成信息 */}
      {task.status === 'completed' && task.outputPath && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-claude">
          <p className="text-sm text-green-600">
            ✓ 处理完成: {task.outputPath}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProcessSteps;
