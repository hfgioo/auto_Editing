import React, { useState, useEffect } from 'react';
import { CloudArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface CloudConfig {
  cloudProvider: 'local' | 'oss' | 'cos';
  ossRegion: string;
  ossAccessKeyId: string;
  ossAccessKeySecret: string;
  ossBucket: string;
  cosSecretId: string;
  cosSecretKey: string;
  cosBucket: string;
  cosRegion: string;
}

export default function CloudSettings() {
  const [config, setConfig] = useState<CloudConfig>({
    cloudProvider: 'local',
    ossRegion: '',
    ossAccessKeyId: '',
    ossAccessKeySecret: '',
    ossBucket: '',
    cosSecretId: '',
    cosSecretKey: '',
    cosBucket: '',
    cosRegion: '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!window.electronAPI) return;
    const settings = await window.electronAPI.loadSettings();
    setConfig({
      cloudProvider: settings.cloudProvider || 'local',
      ossRegion: settings.ossRegion || '',
      ossAccessKeyId: settings.ossAccessKeyId || '',
      ossAccessKeySecret: settings.ossAccessKeySecret || '',
      ossBucket: settings.ossBucket || '',
      cosSecretId: settings.cosSecretId || '',
      cosSecretKey: settings.cosSecretKey || '',
      cosBucket: settings.cosBucket || '',
      cosRegion: settings.cosRegion || '',
    });
  };

  const handleSave = async () => {
    if (!window.electronAPI) return;
    const prev = await window.electronAPI.loadSettings();
    await window.electronAPI.saveSettings({
      ...prev,
      ...config,
    });
    alert('云存储配置已保存');
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (config.cloudProvider === 'local') {
        setTestResult({ success: true, message: '本地存储无需测试' });
      } else if (config.cloudProvider === 'oss') {
        if (!config.ossAccessKeyId || !config.ossAccessKeySecret || !config.ossRegion || !config.ossBucket) {
          setTestResult({ success: false, message: '请填写完整的 OSS 配置' });
        } else {
          setTestResult({ success: true, message: 'OSS 配置完整，可用于上传' });
        }
      } else if (config.cloudProvider === 'cos') {
        if (!config.cosSecretId || !config.cosSecretKey || !config.cosRegion || !config.cosBucket) {
          setTestResult({ success: false, message: '请填写完整的 COS 配置' });
        } else {
          setTestResult({ success: true, message: 'COS 配置完整，可用于上传' });
        }
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">云存储配置</h3>
        <p className="text-sm text-gray-500 mb-6">
          配置云存储服务，支持将视频上传到阿里云 OSS 或腾讯云 COS
        </p>
      </div>

      {/* 云服务提供商选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          存储方式
        </label>
        <select
          value={config.cloudProvider}
          onChange={(e) => setConfig({ ...config, cloudProvider: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="local">本地存储</option>
          <option value="oss">阿里云 OSS</option>
          <option value="cos">腾讯云 COS</option>
        </select>
      </div>

      {/* 阿里云 OSS 配置 */}
      {config.cloudProvider === 'oss' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-gray-900">阿里云 OSS 配置</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region (地域)
            </label>
            <input
              type="text"
              value={config.ossRegion}
              onChange={(e) => setConfig({ ...config, ossRegion: e.target.value })}
              placeholder="例如: oss-cn-hangzhou"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Key ID
            </label>
            <input
              type="text"
              value={config.ossAccessKeyId}
              onChange={(e) => setConfig({ ...config, ossAccessKeyId: e.target.value })}
              placeholder="输入 Access Key ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Key Secret
            </label>
            <input
              type="password"
              value={config.ossAccessKeySecret}
              onChange={(e) => setConfig({ ...config, ossAccessKeySecret: e.target.value })}
              placeholder="输入 Access Key Secret"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bucket 名称
            </label>
            <input
              type="text"
              value={config.ossBucket}
              onChange={(e) => setConfig({ ...config, ossBucket: e.target.value })}
              placeholder="输入 Bucket 名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* 腾讯云 COS 配置 */}
      {config.cloudProvider === 'cos' && (
        <div className="space-y-4 p-4 bg-green-50 rounded-lg">
          <h4 className="font-medium text-gray-900">腾讯云 COS 配置</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region (地域)
            </label>
            <input
              type="text"
              value={config.cosRegion}
              onChange={(e) => setConfig({ ...config, cosRegion: e.target.value })}
              placeholder="例如: ap-guangzhou"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret ID
            </label>
            <input
              type="text"
              value={config.cosSecretId}
              onChange={(e) => setConfig({ ...config, cosSecretId: e.target.value })}
              placeholder="输入 Secret ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secret Key
            </label>
            <input
              type="password"
              value={config.cosSecretKey}
              onChange={(e) => setConfig({ ...config, cosSecretKey: e.target.value })}
              placeholder="输入 Secret Key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bucket 名称
            </label>
            <input
              type="text"
              value={config.cosBucket}
              onChange={(e) => setConfig({ ...config, cosBucket: e.target.value })}
              placeholder="例如: my-bucket-1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      )}

      {/* 测试结果 */}
      {testResult && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {testResult.success ? (
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleTest}
          disabled={testing || config.cloudProvider === 'local'}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CloudArrowUpIcon className="w-5 h-5" />
          <span>{testing ? '测试中...' : '测试连接'}</span>
        </button>

        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          保存配置
        </button>
      </div>

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">使用说明</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>本地存储：视频将保存在本地磁盘</li>
          <li>阿里云 OSS：需要在阿里云控制台创建 Bucket 并获取密钥</li>
          <li>腾讯云 COS：需要在腾讯云控制台创建存储桶并获取密钥</li>
          <li>配置完成后，上传视频时可选择存储位置</li>
        </ul>
      </div>
    </div>
  );
}
