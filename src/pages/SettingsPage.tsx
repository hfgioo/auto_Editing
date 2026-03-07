import React, { useState, useEffect } from 'react';
import { 
  Cog6ToothIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CloudIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { AppSettings } from '../types';
import CloudSettings from '../components/CloudSettings';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ai' | 'cloud' | 'general'>('ai');
  const [settings, setSettings] = useState<AppSettings>({
    aiProvider: 'gemini',
    geminiApiKey: '',
    geminiBaseURL: 'https://generativelanguage.googleapis.com/v1beta',
    geminiModelId: 'gemini-1.5-flash',
    openaiApiKey: '',
    openaiBaseURL: 'https://api.openai.com/v1',
    openaiModelId: 'gpt-4o',
    customApiKey: '',
    customBaseURL: '',
    customModelId: '',
    outputPath: './output',
    videoQuality: 'high',
    autoSubtitle: true,
    autoMusic: true,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 常用模型列表
  const geminiModels = [
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (推荐)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (实验)' },
  ];

  const openaiModels = [
    { value: 'gpt-4o', label: 'GPT-4o (推荐)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-vision-preview', label: 'GPT-4 Vision' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await window.electronAPI.loadSettings();
      if (loaded) {
        setSettings(loaded);
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await window.electronAPI.saveSettings(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleSelectOutputDir = async () => {
    try {
      const path = await window.electronAPI.selectOutputDir();
      if (path) {
        setSettings({ ...settings, outputPath: path });
      }
    } catch (error) {
      console.error('选择输出目录失败:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="card">
        {/* 标题 */}
        <div className="p-6 border-b border-claude-border">
          <div className="flex items-center gap-3">
            <Cog6ToothIcon className="w-8 h-8 text-claude-accent-primary" />
            <div>
              <h2 className="text-2xl font-bold text-claude-text-primary">应用设置</h2>
              <p className="text-sm text-claude-text-secondary mt-1">
                配置 AI 服务、云存储和视频处理参数
              </p>
            </div>
          </div>

          {/* 选项卡 */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'ai'
                  ? 'bg-claude-accent-primary text-white'
                  : 'bg-claude-surface text-claude-text-secondary hover:bg-claude-border'
              }`}
            >
              <CpuChipIcon className="w-5 h-5" />
              AI 服务
            </button>
            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'cloud'
                  ? 'bg-claude-accent-primary text-white'
                  : 'bg-claude-surface text-claude-text-secondary hover:bg-claude-border'
              }`}
            >
              <CloudIcon className="w-5 h-5" />
              云存储
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'bg-claude-accent-primary text-white'
                  : 'bg-claude-surface text-claude-text-secondary hover:bg-claude-border'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5" />
              通用设置
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* AI 服务选项卡 */}
          {activeTab === 'ai' && (
            <>
          {/* AI 供应商选择 */}
          <div>
            <h3 className="text-lg font-semibold text-claude-text-primary mb-4">
              AI 服务供应商
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { value: 'gemini', label: 'Google Gemini', desc: '推荐使用' },
                { value: 'openai', label: 'OpenAI', desc: 'GPT-4 Vision' },
                { value: 'custom', label: '自定义', desc: '兼容 OpenAI API' },
              ].map((provider) => (
                <button
                  key={provider.value}
                  onClick={() => setSettings({ ...settings, aiProvider: provider.value as any })}
                  className={`
                    p-4 rounded-claude border-2 transition-all text-left
                    ${settings.aiProvider === provider.value
                      ? 'border-claude-accent-primary bg-claude-accent-light'
                      : 'border-claude-border hover:border-claude-accent-primary'
                    }
                  `}
                >
                  <p className="font-medium text-claude-text-primary">{provider.label}</p>
                  <p className="text-sm text-claude-text-secondary mt-1">{provider.desc}</p>
                </button>
              ))}
            </div>

            {/* Gemini 配置 */}
            {settings.aiProvider === 'gemini' && (
              <div className="space-y-4 p-4 bg-claude-surface rounded-claude">
                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    Gemini API Key *
                  </label>
                  <input
                    type="password"
                    value={settings.geminiApiKey}
                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                    placeholder="输入你的 Gemini API Key"
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    在 <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-claude-accent-primary hover:underline">Google AI Studio</a> 获取
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={settings.geminiBaseURL}
                    onChange={(e) => setSettings({ ...settings, geminiBaseURL: e.target.value })}
                    placeholder="https://generativelanguage.googleapis.com/v1beta"
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    可选，使用代理或自定义端点时填写
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    模型
                  </label>
                  <select
                    value={settings.geminiModelId}
                    onChange={(e) => setSettings({ ...settings, geminiModelId: e.target.value })}
                    className="input-field"
                  >
                    {geminiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* OpenAI 配置 */}
            {settings.aiProvider === 'openai' && (
              <div className="space-y-4 p-4 bg-claude-surface rounded-claude">
                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    OpenAI API Key *
                  </label>
                  <input
                    type="password"
                    value={settings.openaiApiKey}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-claude-accent-primary hover:underline">OpenAI Platform</a> 获取
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    Base URL
                  </label>
                  <input
                    type="text"
                    value={settings.openaiBaseURL}
                    onChange={(e) => setSettings({ ...settings, openaiBaseURL: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    可选，使用代理或第三方服务时填写
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    模型
                  </label>
                  <select
                    value={settings.openaiModelId}
                    onChange={(e) => setSettings({ ...settings, openaiModelId: e.target.value })}
                    className="input-field"
                  >
                    {openaiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* 自定义配置 */}
            {settings.aiProvider === 'custom' && (
              <div className="space-y-4 p-4 bg-claude-surface rounded-claude">
                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={settings.customApiKey}
                    onChange={(e) => setSettings({ ...settings, customApiKey: e.target.value })}
                    placeholder="输入你的 API Key"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    Base URL *
                  </label>
                  <input
                    type="text"
                    value={settings.customBaseURL}
                    onChange={(e) => setSettings({ ...settings, customBaseURL: e.target.value })}
                    placeholder="https://your-api.example.com/v1"
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    支持兼容 OpenAI API 格式的服务（如 Azure OpenAI、本地模型等）
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-claude-text-primary mb-2">
                    模型 ID *
                  </label>
                  <input
                    type="text"
                    value={settings.customModelId}
                    onChange={(e) => setSettings({ ...settings, customModelId: e.target.value })}
                    placeholder="your-model-name"
                    className="input-field"
                  />
                  <p className="text-xs text-claude-text-secondary mt-1">
                    填写你的模型名称或 ID
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 输出设置 */}
          <div>
            <h3 className="text-lg font-semibold text-claude-text-primary mb-4">
              输出设置
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-claude-text-primary mb-2">
                  输出目录
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.outputPath}
                    onChange={(e) => setSettings({ ...settings, outputPath: e.target.value })}
                    className="flex-1 input-field"
                  />
                  <button
                    onClick={handleSelectOutputDir}
                    className="btn-secondary"
                  >
                    选择文件夹
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-claude-text-primary mb-2">
                  视频质量
                </label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value as any })}
                  className="input-field"
                >
                  <option value="low">低 (720p, 较快)</option>
                  <option value="medium">中 (1080p, 平衡)</option>
                  <option value="high">高 (1080p, 高质量)</option>
                  <option value="ultra">超高 (4K, 最慢)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 功能开关 */}
          <div>
            <h3 className="text-lg font-semibold text-claude-text-primary mb-4">
              功能开关
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border border-claude-border rounded-claude hover:bg-claude-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSubtitle}
                  onChange={(e) => setSettings({ ...settings, autoSubtitle: e.target.checked })}
                  className="w-5 h-5 text-claude-accent-primary rounded focus:ring-2 focus:ring-claude-accent-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-claude-text-primary">自动生成字幕</p>
                  <p className="text-sm text-claude-text-secondary">使用 AI 识别语音并生成字幕</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-claude-border rounded-claude hover:bg-claude-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoMusic}
                  onChange={(e) => setSettings({ ...settings, autoMusic: e.target.checked })}
                  className="w-5 h-5 text-claude-accent-primary rounded focus:ring-2 focus:ring-claude-accent-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-claude-text-primary">自动添加背景音乐</p>
                  <p className="text-sm text-claude-text-secondary">根据视频内容智能匹配背景音乐</p>
                </div>
              </label>
            </div>
          </div>
            </>
          )}

          {/* 云存储选项卡 */}
          {activeTab === 'cloud' && (
            <CloudSettings />
          )}

          {/* 通用设置选项卡 */}
          {activeTab === 'general' && (
            <>
          {/* 输出路径 */}
          <div>
            <label className="block text-sm font-medium text-claude-text-primary mb-2">
              输出路径
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={settings.outputPath}
                readOnly
                className="flex-1 px-4 py-2 bg-claude-surface border border-claude-border rounded-claude text-claude-text-primary"
              />
              <button
                onClick={handleSelectOutputPath}
                className="btn-secondary"
              >
                选择文件夹
              </button>
            </div>
            <p className="text-sm text-claude-text-secondary mt-2">
              处理后的视频将保存到此文件夹
            </p>
          </div>

          {/* 视频质量 */}
          <div>
            <label className="block text-sm font-medium text-claude-text-primary mb-2">
              视频质量
            </label>
            <select
              value={settings.videoQuality}
              onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value as any })}
              className="w-full px-4 py-2 bg-claude-surface border border-claude-border rounded-claude text-claude-text-primary focus:ring-2 focus:ring-claude-accent-primary focus:border-transparent"
            >
              <option value="low">低质量 (快速处理)</option>
              <option value="medium">中等质量 (平衡)</option>
              <option value="high">高质量 (推荐)</option>
              <option value="ultra">超高质量 (慢速)</option>
            </select>
          </div>

          {/* 自动功能 */}
          <div>
            <label className="block text-sm font-medium text-claude-text-primary mb-3">
              自动功能
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border border-claude-border rounded-claude hover:bg-claude-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSubtitle}
                  onChange={(e) => setSettings({ ...settings, autoSubtitle: e.target.checked })}
                  className="w-5 h-5 text-claude-accent-primary rounded focus:ring-2 focus:ring-claude-accent-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-claude-text-primary">自动生成字幕</p>
                  <p className="text-sm text-claude-text-secondary">使用 AI 自动识别语音并生成字幕</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border border-claude-border rounded-claude hover:bg-claude-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoMusic}
                  onChange={(e) => setSettings({ ...settings, autoMusic: e.target.checked })}
                  className="w-5 h-5 text-claude-accent-primary rounded focus:ring-2 focus:ring-claude-accent-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-claude-text-primary">自动添加背景音乐</p>
                  <p className="text-sm text-claude-text-secondary">根据视频内容智能匹配背景音乐</p>
                </div>
              </label>
            </div>
          </div>
            </>
          )}
        </div>

        {/* 底部保存按钮 */}
        {activeTab !== 'cloud' && (
          <div className="p-6 border-t border-claude-border bg-claude-surface">
            <div className="flex items-center justify-between">
              <div className="text-sm text-claude-text-secondary">
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>设置已保存</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <ExclamationCircleIcon className="w-5 h-5" />
                    <span>保存失败，请重试</span>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="btn-primary min-w-32"
              >
                {saveStatus === 'saving' ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
