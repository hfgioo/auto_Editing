# Auto Editing - 全自动视频剪辑工具

## 项目概述
基于 Gemini AI 的全自动视频剪辑桌面应用，支持长视频/多段短视频智能剪辑、字幕生成、音乐添加。

## 技术栈选择

### 桌面框架
**Electron + React** (推荐)
- 跨平台：Win/Mac 一套代码
- 成熟生态：打包工具完善
- 前端技术栈：React + TypeScript

### UI 组件库
**Ant Design** 或 **Material-UI**
- 完整图标库
- 专业组件
- 开箱即用

### 视频处理
**FFmpeg** (通过 fluent-ffmpeg)
- 视频剪辑
- 字幕嵌入
- 音频混合

### AI 集成
**Google Gemini API**
- 视频内容分析
- 核心片段识别
- 字幕生成

### 云存储（可选）
- AWS S3 / 阿里云 OSS
- 本地文件系统

## 项目结构

```
auto_Editing/
├── electron/           # Electron 主进程
├── src/               # React 前端
│   ├── components/    # UI 组件
│   ├── services/      # 业务逻辑
│   │   ├── gemini/    # Gemini API
│   │   ├── video/     # 视频处理
│   │   ├── subtitle/  # 字幕生成
│   │   └── storage/   # 云端/本地存储
│   ├── utils/         # 工具函数
│   └── App.tsx        # 主应用
├── assets/            # 资源文件
└── build/             # 打包配置
```

## 核心功能模块

### 1. 视频上传模块
- 本地文件选择
- 云端上传（可选）
- 多文件批量处理

### 2. AI 分析模块
- Gemini 视频分析
- 核心片段识别
- 时间轴标记

### 3. 视频剪辑模块
- FFmpeg 剪辑
- 片段拼接
- 转场效果

### 4. 字幕模块
- 语音识别
- 字幕生成
- 字幕嵌入

### 5. 音乐模块
- 背景音乐添加
- 音量调节
- 音频混合

### 6. 导出模块
- 视频渲染
- 格式选择
- 质量设置

## 开发分工

### Phase 1: 基础架构（我来做）
- [x] 项目规划
- [ ] Electron + React 脚手架
- [ ] 基础 UI 框架
- [ ] 路由和状态管理

### Phase 2: UI 开发（需要 UI skill）
- [ ] 主界面设计
- [ ] 上传界面
- [ ] 进度显示
- [ ] 预览界面
- [ ] 设置界面

### Phase 3: 业务逻辑（我来做）
- [ ] Gemini API 集成
- [ ] FFmpeg 视频处理
- [ ] 字幕生成逻辑
- [ ] 音乐混合逻辑
- [ ] 存储管理

### Phase 4: 打包发布（我来做）
- [ ] Windows 安装包
- [ ] macOS 安装包
- [ ] 自动更新

## 下一步

1. 搜索合适的 UI skill
2. 初始化项目结构
3. 开始开发

---
创建时间: 2026-03-03
