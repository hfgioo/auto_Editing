import React, { useRef, useState } from 'react';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface VideoUploadProps {
  onUploadComplete: (file: File) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onUploadComplete,
  maxSizeMB = 500,
  acceptedFormats = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'],
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    if (!acceptedFormats.includes(file.type)) {
      return `不支持的文件格式。请上传 ${acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} 格式的视频。`;
    }

    // 检查文件大小
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `文件大小超过限制。最大支持 ${maxSizeMB}MB，当前文件 ${fileSizeMB.toFixed(2)}MB。`;
    }

    return null;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);

    try {
      // 使用真实 API 上传
      const formData = new FormData();
      formData.append('video', file);
      
      const xhr = new XMLHttpRequest();
      abortControllerRef.current = new AbortController();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          onUploadComplete(file);
        } else {
          throw new Error('上传失败');
        }
      });
      
      xhr.addEventListener('error', () => {
        throw new Error('上传失败');
      });
      
      xhr.addEventListener('abort', () => {
        throw new Error('上传已取消');
      });
      
      abortControllerRef.current.signal.addEventListener('abort', () => {
        xhr.abort();
      });
      
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
      
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error('上传失败'));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('上传失败')));
        xhr.addEventListener('abort', () => reject(new Error('上传已取消')));
      });
    } catch (err) {
      if (err instanceof Error && err.message === '上传已取消') {
        setError('上传已取消');
      } else {
        setError('上传失败，请重试');
      }
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedFile(null);
    }
  };

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      {/* 上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {!isUploading && !uploadedFile && (
          <>
            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              拖拽视频文件到此处，或点击选择文件
            </p>
            <p className="text-sm text-gray-500">
              支持格式: {acceptedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}
            </p>
            <p className="text-sm text-gray-500">
              最大文件大小: {maxSizeMB}MB
            </p>
          </>
        )}

        {isUploading && uploadedFile && (
          <div className="space-y-4">
            <CloudArrowUpIcon className="w-12 h-12 mx-auto text-blue-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>

            {/* 进度条 */}
            <div className="w-full max-w-md mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>上传中...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            {/* 取消按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelUpload();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 
                       hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
              取消上传
            </button>
          </div>
        )}

        {uploadedFile && !isUploading && !error && (
          <div className="space-y-3">
            <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {uploadedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
            <p className="text-sm text-green-600 font-medium">上传成功！</p>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">上传失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          💡 提示：为获得最佳处理效果，建议上传高清视频（1080p 或以上）
        </p>
      </div>
    </div>
  );
};
