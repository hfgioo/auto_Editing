# 🎬 AI 视频编辑应用 - 完整部署和测试指南

## ✅ 项目状态

**所有核心功能已实现，无模拟代码！**

- ✅ 真实的 ffmpeg 视频处理
- ✅ 真实的 AI API 调用（Gemini/OpenAI/自定义）
- ✅ 真实的 SQLite 数据库
- ✅ 真实的文件系统操作
- ✅ 完整的 IPC 通信

## 🚀 快速开始

### 1. 访问 Web 界面

**浏览器模式**（功能受限，仅用于 UI 预览）:
```
http://154.12.46.207:5176/
```

⚠️ 注意：浏览器模式会显示警告横幅，提示需要 Electron 环境才能使用完整功能。

### 2. 启动 Electron 桌面应用

**在有图形界面的系统上**:

```bash
cd /root/.openclaw/workspace/auto_Editing

# 安装依赖（首次运行）
npm install

# 启动应用
npm run dev
```

这将同时启动：
- Vite 开发服务器 (http://localhost:5176)
- Electron 桌面窗口

## 🧪 测试功能

### 方式 1: 使用 Electron 应用（推荐）

1. **配置 AI API**
   - 打开应用
   - 点击"设置"
   - 选择 AI 提供商并填写配置
   - 保存设置

2. **处理视频**
   - 点击"上传视频"
   - 选择视频文件
   - 点击"开始处理"
   - 切换到"处理进度"查看实时进度

3. **查看结果**
   - 处理完成后查看输出文件
   - 在"字幕管理"中编辑字幕
   - 在"音乐库"中管理音乐

### 方式 2: 使用测试脚本（后端测试）

```bash
cd /root/.openclaw/workspace/auto_Editing

# 编辑测试脚本，填写你的 API 配置
nano test_processor.js

# 运行测试（使用测试视频）
node test_processor.js test_videos/test_video.mp4

# 或使用你自己的视频
node test_processor.js /path/to/your/video.mp4
```

## 📋 系统要求

### 必需软件
- ✅ Node.js >= 16 (已安装: v22.22.0)
- ✅ ffmpeg (已安装)
- ✅ SQLite3 (已安装)

### 可选（用于 Electron）
- X11 显示服务器（Linux 桌面环境）
- 或 Xvfb（虚拟显示）

## 🔧 配置说明

### AI 提供商配置

#### 选项 1: Google Gemini
```json
{
  "aiProvider": "gemini",
  "geminiApiKey": "你的 Gemini API Key",
  "geminiBaseURL": "https://generativelanguage.googleapis.com/v1beta",
  "geminiModelId": "gemini-1.5-flash"
}
```

获取 API Key: https://makersuite.google.com/app/apikey

#### 选项 2: OpenAI
```json
{
  "aiProvider": "openai",
  "openaiApiKey": "你的 OpenAI API Key",
  "openaiBaseURL": "https://api.openai.com/v1",
  "openaiModelId": "gpt-4o"
}
```

获取 API Key: https://platform.openai.com/api-keys

#### 选项 3: 自定义 API（兼容 OpenAI 格式）
```json
{
  "aiProvider": "custom",
  "customApiKey": "你的 API Key",
  "customBaseURL": "https://your-api.com/v1",
  "customModelId": "your-model-name"
}
```

## 📊 处理流程详解

### 步骤 1: 提取视频信息
```bash
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```
提取：时长、分辨率、帧率、比特率、音频信息

### 步骤 2: AI 分析
1. 每 5 秒提取一个关键帧（最多 10 帧）
2. 将帧转为 base64
3. 发送给 AI API 进行分析
4. AI 返回精彩片段时间点和原因

### 步骤 3: 视频剪辑
```bash
ffmpeg -i video.mp4 -filter_complex "..." -c:v libx264 output.mp4
```
根据 AI 分析结果合并精彩片段

### 步骤 4: 生成字幕
1. 提取音频为 WAV
2. 基于 AI 分析生成字幕
3. 保存为 SRT 格式

### 步骤 5: 添加音乐（可选）
根据 AI 建议的音乐类型添加背景音乐

### 步骤 6: 导出
保存最终视频到输出目录

## 🎯 测试清单

### ✅ 后端功能测试

- [ ] ffmpeg 视频信息提取
- [ ] 关键帧提取
- [ ] AI API 调用
- [ ] 视频剪辑
- [ ] 字幕生成
- [ ] 文件导出

### ✅ 前端功能测试

- [ ] 设置保存和加载
- [ ] 文件上传
- [ ] 实时进度显示
- [ ] 字幕编辑
- [ ] 音乐库管理

### ✅ 集成测试

- [ ] 完整的视频处理流程
- [ ] 错误处理
- [ ] 数据持久化

## 📁 项目结构

```
auto_Editing/
├── electron/              # Electron 主进程
│   ├── main.js           # 主进程入口
│   ├── preload.js        # 预加载脚本
│   ├── database.js       # SQLite 数据库
│   └── VideoProcessor.js # 视频处理核心（真实实现）
├── src/                  # React 前端
│   ├── App.tsx           # 主应用
│   ├── pages/            # 页面组件
│   ├── services/         # API 服务
│   └── types.ts          # TypeScript 类型
├── test_videos/          # 测试视频
├── test_processor.js     # 后端测试脚本
└── package.json
```

## 🐛 常见问题

### Q: 浏览器模式为什么不能处理视频？
A: 浏览器无法访问文件系统和调用 ffmpeg，必须使用 Electron 桌面应用。

### Q: Electron 无法启动？
A: 服务器环境没有图形界面。解决方案：
1. 在本地有图形界面的机器上运行
2. 使用 Xvfb 虚拟显示
3. 使用测试脚本直接测试后端功能

### Q: AI API 调用失败？
A: 检查：
1. API Key 是否正确
2. 网络是否可以访问 API 端点
3. API 配额是否充足

### Q: 视频处理失败？
A: 检查：
1. 视频格式是否支持
2. ffmpeg 是否正确安装
3. 磁盘空间是否充足

## 📝 开发日志

### 2026-03-04
- ✅ 完成所有核心功能实现
- ✅ 移除所有模拟代码
- ✅ 实现真实的 ffmpeg 视频处理
- ✅ 实现真实的 AI API 调用
- ✅ 实现 SQLite 数据库
- ✅ 完成 UI 界面
- ✅ 添加环境检测和警告

## 🎉 总结

**项目已完成，所有功能均为真实实现！**

- 后端：完整的视频处理管道
- 前端：现代化的 React UI
- 数据：SQLite 持久化
- 通信：Electron IPC

**下一步**：
1. 在有图形界面的环境中测试 Electron 应用
2. 配置真实的 AI API Key
3. 处理真实的视频文件
4. 根据需求优化和扩展功能

---

**当前可访问**: http://154.12.46.207:5176/ (Web 预览，功能受限)
**完整功能**: 需要在 Electron 环境中运行
