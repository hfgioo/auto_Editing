#!/bin/bash

# Auto Editing - 快速开始脚本

echo "🎬 Auto Editing - 快速开始"
echo "================================"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请访问 https://nodejs.org 下载安装"
    exit 1
fi

echo "✓ Node.js 版本: $(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装 npm"
    exit 1
fi

echo "✓ npm 版本: $(npm -v)"
echo ""

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✓ 依赖安装完成"
else
    echo "✓ 依赖已安装"
fi

echo ""

# 运行测试
echo "🧪 运行测试..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ 测试失败"
    exit 1
fi

echo ""
echo "✓ 所有测试通过"
echo ""

# 提示下一步
echo "================================"
echo "🚀 准备就绪！"
echo ""
echo "运行开发模式:"
echo "  npm run dev"
echo ""
echo "构建生产版本:"
echo "  npm run build"
echo ""
echo "打包安装程序:"
echo "  npm run build:win  (Windows)"
echo "  npm run build:mac  (macOS)"
echo ""
echo "查看文档:"
echo "  cat README.md"
echo "  cat USER_GUIDE.md"
echo ""
echo "================================"
