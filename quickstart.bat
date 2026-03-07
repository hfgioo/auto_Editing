@echo off
REM Auto Editing - 快速开始脚本 (Windows)

echo 🎬 Auto Editing - 快速开始
echo ================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 未安装 Node.js
    echo 请访问 https://nodejs.org 下载安装
    exit /b 1
)

echo ✓ Node.js 已安装
node -v

REM 检查 npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 错误: 未安装 npm
    exit /b 1
)

echo ✓ npm 已安装
npm -v
echo.

REM 安装依赖
if not exist "node_modules" (
    echo 📦 安装依赖...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ 依赖安装失败
        exit /b 1
    )
    echo ✓ 依赖安装完成
) else (
    echo ✓ 依赖已安装
)

echo.

REM 运行测试
echo 🧪 运行测试...
call npm test
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 测试失败
    exit /b 1
)

echo.
echo ✓ 所有测试通过
echo.

REM 提示下一步
echo ================================
echo 🚀 准备就绪！
echo.
echo 运行开发模式:
echo   npm run dev
echo.
echo 构建生产版本:
echo   npm run build
echo.
echo 打包安装程序:
echo   npm run build:win
echo.
echo 查看文档:
echo   type README.md
echo   type USER_GUIDE.md
echo.
echo ================================
pause
