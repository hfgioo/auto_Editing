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

const cardCls = 'rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]';
const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none transition focus:border-[rgba(225,107,66,0.55)]';

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
    analysisApiKey: '',
    analysisBaseURL: '',
    analysisModelId: '',
    transcriptionApiKey: '',
    transcriptionBaseURL: '',
    transcriptionModel: 'whisper-1',
    outputPath: './output',
    videoQuality: 'high',
    autoSubtitle: true,
    autoMusic: true,
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [testingAI, setTestingAI] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    void loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loaded = await window.electronAPI.loadSettings();
      if (loaded) setSettings(loaded);
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
      if (path) setSettings({ ...settings, outputPath: path });
    } catch (error) {
      console.error('选择输出目录失败:', error);
    }
  };

  const handleTestAIConnection = async () => {
    setTestingAI(true);
    setAiTestResult(null);
    try {
      const result = await window.electronAPI.testAIConnection(settings);
      setAiTestResult(result);
    } catch (error) {
      setAiTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败',
      });
    } finally {
      setTestingAI(false);
    }
  };

  const tabBtn = (tab: 'ai' | 'cloud' | 'general', label: string, Icon: React.ComponentType<any>) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        activeTab === tab
          ? 'border-[rgba(225,107,66,0.45)] bg-[rgba(225,107,66,0.14)] text-[var(--ink)]'
          : 'border-[var(--line)] bg-white/70 text-[var(--ink-soft)] hover:bg-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-3xl border border-[var(--line)] bg-white/85 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-[var(--panel-2)] p-2.5">
            <Cog6ToothIcon className="h-6 w-6 text-[var(--ink-soft)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--ink)]">应用设置</h3>
            <p className="text-xs text-[var(--muted)]">配置 AI、云存储与处理参数</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tabBtn('ai', 'AI 服务', CpuChipIcon)}
          {tabBtn('cloud', '云存储', CloudIcon)}
          {tabBtn('general', '通用设置', Cog6ToothIcon)}
        </div>
      </section>

      {activeTab === 'cloud' ? (
        <CloudSettings />
      ) : (
        <section className="space-y-4 rounded-3xl border border-[var(--line)] bg-white/85 p-5">
          {activeTab === 'ai' && (
            <>
              <div className={cardCls}>
                <label className={labelCls}>AI 供应商</label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { value: 'gemini', label: 'Google Gemini' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'custom', label: '自定义兼容 API' },
                    { value: 'compatible', label: '兼容网关模式' },
                  ].map((provider) => (
                    <button
                      key={provider.value}
                      onClick={() => setSettings({ ...settings, aiProvider: provider.value as any })}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                        settings.aiProvider === provider.value
                          ? 'border-[rgba(225,107,66,0.45)] bg-[rgba(225,107,66,0.14)]'
                          : 'border-[var(--line)] bg-white hover:bg-[var(--panel)]'
                      }`}
                    >
                      <span className="font-semibold text-[var(--ink-soft)]">{provider.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>分析接口（可选覆盖）</label>
                <p className="mb-3 text-xs text-[var(--muted)]">
                  填写后将优先使用 OpenAI 兼容协议调用此接口，可对接任意模型网关（不限 Gemini/OpenAI）。
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Analysis API Key</label>
                    <input
                      type="password"
                      value={settings.analysisApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, analysisApiKey: e.target.value })}
                      placeholder="输入分析接口 API Key"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Analysis Base URL</label>
                    <input
                      type="text"
                      value={settings.analysisBaseURL || ''}
                      onChange={(e) => setSettings({ ...settings, analysisBaseURL: e.target.value })}
                      placeholder="https://your-gateway.example.com/v1"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Analysis Model ID</label>
                    <input
                      type="text"
                      value={settings.analysisModelId || ''}
                      onChange={(e) => setSettings({ ...settings, analysisModelId: e.target.value })}
                      placeholder="gpt-4o-mini / qwen-vl / glm-4v ..."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>字幕转写接口（可选覆盖）</label>
                <p className="mb-3 text-xs text-[var(--muted)]">
                  填写后，自动字幕将优先使用该转写接口；不填则回退到可用的 OpenAI 兼容配置。
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Transcription API Key</label>
                    <input
                      type="password"
                      value={settings.transcriptionApiKey || ''}
                      onChange={(e) => setSettings({ ...settings, transcriptionApiKey: e.target.value })}
                      placeholder="输入字幕转写 API Key"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transcription Base URL</label>
                    <input
                      type="text"
                      value={settings.transcriptionBaseURL || ''}
                      onChange={(e) => setSettings({ ...settings, transcriptionBaseURL: e.target.value })}
                      placeholder="https://your-transcription.example.com/v1"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Transcription Model</label>
                    <input
                      type="text"
                      value={settings.transcriptionModel || settings.transcriptionModelId || ''}
                      onChange={(e) => setSettings({ ...settings, transcriptionModel: e.target.value, transcriptionModelId: e.target.value })}
                      placeholder="whisper-1 / gpt-4o-mini-transcribe ..."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {settings.aiProvider === 'gemini' && (
                <div className={cardCls}>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Gemini API Key</label>
                      <input
                        type="password"
                        value={settings.geminiApiKey}
                        onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                        placeholder="输入 Gemini API Key"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Base URL</label>
                      <input
                        type="text"
                        value={settings.geminiBaseURL}
                        onChange={(e) => setSettings({ ...settings, geminiBaseURL: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>模型</label>
                      <select
                        value={settings.geminiModelId}
                        onChange={(e) => setSettings({ ...settings, geminiModelId: e.target.value })}
                        className={inputCls}
                      >
                        {geminiModels.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {settings.aiProvider === 'openai' && (
                <div className={cardCls}>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>OpenAI API Key</label>
                      <input
                        type="password"
                        value={settings.openaiApiKey}
                        onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                        placeholder="sk-..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Base URL</label>
                      <input
                        type="text"
                        value={settings.openaiBaseURL}
                        onChange={(e) => setSettings({ ...settings, openaiBaseURL: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>模型</label>
                      <select
                        value={settings.openaiModelId}
                        onChange={(e) => setSettings({ ...settings, openaiModelId: e.target.value })}
                        className={inputCls}
                      >
                        {openaiModels.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {settings.aiProvider === 'custom' && (
                <div className={cardCls}>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>API Key</label>
                      <input
                        type="password"
                        value={settings.customApiKey}
                        onChange={(e) => setSettings({ ...settings, customApiKey: e.target.value })}
                        placeholder="输入 API Key"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Base URL</label>
                      <input
                        type="text"
                        value={settings.customBaseURL}
                        onChange={(e) => setSettings({ ...settings, customBaseURL: e.target.value })}
                        placeholder="https://your-api.example.com/v1"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>模型 ID</label>
                      <input
                        type="text"
                        value={settings.customModelId}
                        onChange={(e) => setSettings({ ...settings, customModelId: e.target.value })}
                        placeholder="your-model-name"
                        className={inputCls}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={cardCls}>
                <button
                  onClick={handleTestAIConnection}
                  disabled={testingAI}
                  className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:bg-[var(--panel)] disabled:opacity-50"
                >
                  {testingAI ? '测试中...' : '测试 AI 连接'}
                </button>
                {aiTestResult && (
                  <p className={`mt-2 text-sm ${aiTestResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                    {aiTestResult.message}
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === 'general' && (
            <>
              <div className={cardCls}>
                <label className={labelCls}>输出目录</label>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    type="text"
                    value={settings.outputPath}
                    onChange={(e) => setSettings({ ...settings, outputPath: e.target.value })}
                    className={inputCls}
                  />
                  <button
                    onClick={handleSelectOutputDir}
                    className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink-soft)] transition hover:bg-[var(--panel)]"
                  >
                    选择文件夹
                  </button>
                </div>
              </div>

              <div className={cardCls}>
                <label className={labelCls}>视频质量</label>
                <select
                  value={settings.videoQuality}
                  onChange={(e) => setSettings({ ...settings, videoQuality: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="low">低 (720p, 快速)</option>
                  <option value="medium">中 (1080p, 平衡)</option>
                  <option value="high">高 (1080p, 推荐)</option>
                  <option value="ultra">超高 (4K, 最慢)</option>
                </select>
              </div>

              <div className={cardCls}>
                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
                    <span className="text-[var(--ink-soft)]">自动生成字幕</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSubtitle}
                      onChange={(e) => setSettings({ ...settings, autoSubtitle: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
                    <span className="text-[var(--ink-soft)]">自动添加背景音乐</span>
                    <input
                      type="checkbox"
                      checked={settings.autoMusic}
                      onChange={(e) => setSettings({ ...settings, autoMusic: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-[var(--line)] pt-2">
            <div className="text-sm">
              {saveStatus === 'success' && (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  设置已保存
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <ExclamationCircleIcon className="h-5 w-5" />
                  保存失败
                </span>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {saveStatus === 'saving' ? '保存中...' : '保存设置'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;
