# 快速开始指南

## 🚀 5 分钟上手

### 1. 安装依赖

```bash
cd /root/.openclaw/workspace/auto_Editing
npm install
```

### 2. 配置 Gemini API

1. 获取 API Key: https://makersuite.google.com/app/apikey
2. 启动应用: `npm run dev`
3. 进入"设置"页面
4. 选择"AI 服务"选项卡
5. 选择"Gemini API"
6. 输入你的 API Key
7. 点击"测试连接"
8. 保存设置

### 3. 上传视频

1. 进入"上传视频"页面
2. 选择存储方式：
   - **本地存储**：直接保存在电脑上
   - **阿里云 OSS**：需要先在设置中配置
   - **腾讯云 COS**：需要先在设置中配置
3. 点击"选择视频"或拖拽视频文件
4. 点击"开始上传"

### 4. 处理视频

1. 上传完成后，自动进入"处理"页面
2. 点击"开始分析"
3. AI 会自动：
   - 分析视频内容
   - 识别关键场景
   - 生成剪辑建议
4. 点击"开始剪辑"
5. 等待处理完成

### 5. 编辑字幕（可选）

1. 进入"字幕编辑"页面
2. 查看自动生成的字幕
3. 编辑或调整时间轴
4. 保存修改

### 6. 添加音乐（可选）

1. 进入"音乐选择"页面
2. 从音乐库选择背景音乐
3. 或上传自己的音乐
4. 调整音量和淡入淡出

### 7. 导出视频

1. 点击"导出视频"
2. 选择输出格式和质量
3. 等待导出完成
4. 视频保存在设置的输出路径

---

## 🎯 核心功能

### ✅ 已实现
- 视频上传（本地 + 云端）
- Gemini AI 视频分析
- 自动视频剪辑
- 字幕生成和编辑
- 背景音乐添加
- 视频导出

### 🚧 开发中
- Whisper 语音识别
- 音乐智能匹配
- 批量处理
- 视频预览

---

## 📝 配置说明

### AI 服务配置

#### Gemini API（推荐）
- **API Key**: 从 Google AI Studio 获取
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
- **Model ID**: `gemini-1.5-flash` (推荐) 或 `gemini-1.5-pro`

#### OpenAI API
- **API Key**: 从 OpenAI 获取
- **Base URL**: `https://api.openai.com/v1`
- **Model ID**: `gpt-4o` 或 `gpt-4-vision-preview`

#### 自定义 API
- 支持兼容 OpenAI 格式的 API
- 配置自定义 Base URL 和 Model ID

### 云存储配置

#### 阿里云 OSS
1. 登录阿里云控制台
2. 创建 OSS Bucket
3. 获取 Access Key ID 和 Secret
4. 在设置中填写配置

#### 腾讯云 COS
1. 登录腾讯云控制台
2. 创建 COS 存储桶
3. 获取 Secret ID 和 Key
4. 在设置中填写配置

---

## 🛠️ 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build

# 打包 Windows
npm run build:win

# 打包 macOS
npm run build:mac

# 打包所有平台
npm run build:all
```

---

## 📦 系统要求

### 最低要求
- **操作系统**: Windows 10+ / macOS 10.13+
- **内存**: 4GB RAM
- **存储**: 500MB 可用空间
- **FFmpeg**: 自动包含在应用中

### 推荐配置
- **操作系统**: Windows 11 / macOS 12+
- **内存**: 8GB+ RAM
- **存储**: 2GB+ 可用空间
- **网络**: 稳定的互联网连接（用于 AI API）

---

## ❓ 常见问题

### Q: Gemini API 调用失败？
A: 检查：
1. API Key 是否正确
2. 网络连接是否正常
3. API 配额是否用完
4. Base URL 是否正确

### Q: 视频处理很慢？
A: 建议：
1. 降低视频质量设置
2. 减少关键帧数量
3. 使用更快的 AI 模型（如 gemini-1.5-flash）
4. 确保有足够的磁盘空间

### Q: 云上传失败？
A: 检查：
1. 云服务配置是否正确
2. 网络连接是否稳定
3. Bucket 权限是否正确
4. 文件大小是否超过限制

### Q: 字幕不准确？
A: 目前字幕生成是基础实现，后续会集成 Whisper API 提高准确度。

---

## 🔗 相关链接

- **GitHub**: https://github.com/boothby123/auto_Editing
- **Gemini API**: https://makersuite.google.com/app/apikey
- **阿里云 OSS**: https://www.aliyun.com/product/oss
- **腾讯云 COS**: https://cloud.tencent.com/product/cos

---

## 📞 获取帮助

遇到问题？
1. 查看 `DEVELOPMENT_PLAN.md` 了解项目状态
2. 查看 `REAL_STATUS.md` 了解已实现功能
3. 提交 GitHub Issue

---

**祝你使用愉快！🎉**
