import { useState, useCallback } from 'react';
import { VideoFile, ProcessTask, AppSettings } from '../types';
import { VideoProcessor } from '../services/VideoProcessor';

export function useVideoProcessor() {
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processVideos = useCallback(async (files: VideoFile[], settings: AppSettings) => {
    if (isProcessing) {
      throw new Error('已有处理任务正在进行');
    }

    setIsProcessing(true);

    try {
      const processor = new VideoProcessor(settings);

      await processor.processMultipleVideos(files, (updatedTasks) => {
        setTasks(updatedTasks);
      });
    } catch (error) {
      console.error('视频处理失败:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  const clearTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  return {
    tasks,
    isProcessing,
    processVideos,
    clearTasks,
    removeTask,
  };
}
