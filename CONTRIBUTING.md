# 贡献指南

感谢你对 Auto Editing 的兴趣！我们欢迎各种形式的贡献。

## 如何贡献

### 报告 Bug

1. 检查 [Issues](https://github.com/hfgioo/auto_Editing/issues) 是否已有相同问题
2. 如果没有，创建新 Issue
3. 提供详细信息：
   - 操作系统和版本
   - 应用版本
   - 复现步骤
   - 错误信息和截图
   - 预期行为

### 建议新功能

1. 在 Issues 中创建 Feature Request
2. 描述功能需求和使用场景
3. 说明为什么这个功能有用

### 提交代码

#### 准备工作

1. Fork 本仓库
2. 克隆到本地：
   ```bash
   git clone https://github.com/YOUR_USERNAME/auto_Editing.git
   cd auto_Editing
   ```
3. 安装依赖：
   ```bash
   npm install
   ```
4. 创建分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### 开发流程

1. 编写代码
2. 遵循代码规范（见下文）
3. 添加测试（如果适用）
4. 确保所有测试通过：
   ```bash
   npm test
   ```
5. 提交更改：
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

#### 提交 Pull Request

1. 推送到你的 Fork：
   ```bash
   git push origin feature/your-feature-name
   ```
2. 在 GitHub 上创建 Pull Request
3. 填写 PR 模板
4. 等待 Review

## 代码规范

### TypeScript

- 使用 TypeScript 编写所有代码
- 提供完整的类型定义
- 避免使用 `any`

### 命名规范

- 文件名：`PascalCase.tsx` (组件) 或 `camelCase.ts` (工具)
- 组件：`PascalCase`
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 类型/接口：`PascalCase`

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 行尾不加分号
- 使用 Prettier 格式化

### 注释

- 为复杂逻辑添加注释
- 使用 JSDoc 注释公共 API
- 注释应该解释"为什么"而不是"是什么"

### 示例

```typescript
/**
 * 处理视频文件
 * @param file 视频文件对象
 * @param settings 处理设置
 * @returns 处理后的文件路径
 */
async function processVideo(
  file: VideoFile,
  settings: AppSettings
): Promise<string> {
  // 验证文件格式
  if (!isValidFormat(file)) {
    throw new Error('不支持的文件格式')
  }

  // 开始处理
  const result = await processor.process(file, settings)
  return result.outputPath
}
```

## 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: add video preview feature
fix: resolve subtitle timing issue
docs: update installation guide
```

## 测试

### 运行测试

```bash
# 所有测试
npm test

# 单个文件
npm test -- VideoService.test.ts

# 监听模式
npm test -- --watch
```

### 编写测试

- 为新功能添加测试
- 测试文件命名：`*.test.ts` 或 `*.spec.ts`
- 使用 Jest 和 React Testing Library

## 项目结构

```
auto_Editing/
├── electron/           # Electron 主进程
├── src/
│   ├── components/    # React 组件
│   ├── pages/         # 页面组件
│   ├── services/      # 业务逻辑
│   ├── hooks/         # 自定义 Hooks
│   ├── store/         # 状态管理
│   ├── types/         # TypeScript 类型
│   └── utils/         # 工具函数
├── assets/            # 静态资源
└── tests/             # 测试文件
```

## 开发环境

### 推荐工具

- VS Code
- ESLint 插件
- Prettier 插件
- TypeScript 插件

### VS Code 设置

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 发布流程

1. 更新版本号（`package.json`）
2. 更新 CHANGELOG.md
3. 创建 Git tag
4. 推送到 GitHub
5. GitHub Actions 自动构建和发布

## 行为准则

- 尊重所有贡献者
- 保持友好和专业
- 接受建设性批评
- 关注项目目标

## 许可证

贡献的代码将采用 MIT 许可证。

## 问题？

如有疑问，请：
- 查看现有 Issues
- 在 Discussions 中提问
- 发送邮件到 dev@autoediting.app

---

再次感谢你的贡献！🎉
