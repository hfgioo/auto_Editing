#!/bin/bash

# AI 视频编辑应用启动脚本

echo "🚀 启动 AI 视频编辑应用..."
echo ""

cd /root/.openclaw/workspace/auto_Editing

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📦 安装依赖..."
  npm install
fi

# 检查 ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ 错误: 未找到 ffmpeg"
  echo "请运行: apt-get install ffmpeg"
  exit 1
fi

echo "✅ 环境检查完成"
echo ""
echo "🎬 启动应用..."
echo ""

# 启动应用
npm run dev
