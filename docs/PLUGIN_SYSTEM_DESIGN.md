# 插件系统架构设计（P2）

## 设计目标

1. 支持自定义剪辑策略
2. 支持第三方 AI 模型集成
3. 热插拔，无需重启应用
4. 沙箱隔离，保证安全性

---

## 架构概览

```
┌─────────────────────────────────────────┐
│         Application Core                │
│  ┌───────────────────────────────────┐  │
│  │     Plugin Manager                │  │
│  │  - 加载/卸载插件                   │  │
│  │  - 生命周期管理                    │  │
│  │  - 权限控制                        │  │
│  └───────────────────────────────────┘  │
│              ↓                          │
│  ┌───────────────────────────────────┐  │
│  │     Plugin Registry               │  │
│  │  - 插件发现                        │  │
│  │  - 版本管理                        │  │
│  │  - 依赖解析                        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Plugin Sandbox                  │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  Strategy   │  │  AI Model   │      │
│  │  Plugin     │  │  Plugin     │      │
│  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────┘
```

---

## 插件接口规范

### 1. 插件元数据（plugin.json）

```json
{
  "id": "custom-highlight-strategy",
  "name": "智能高光剪辑策略",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "基于情感分析的高光片段提取",
  "type": "strategy",
  "entry": "index.js",
  "permissions": [
    "video:read",
    "ai:analyze"
  ],
  "dependencies": {
    "@google/generative-ai": "^0.1.0"
  },
  "config": {
    "minHighlightDuration": 3,
    "emotionThreshold": 0.7
  }
}
```

### 2. 剪辑策略插件接口

```typescript
interface IEditingStrategy {
  /**
   * 插件初始化
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * 分析视频并生成剪辑方案
   */
  analyze(video: VideoInput): Promise<EditingPlan>;

  /**
   * 执行剪辑
   */
  execute(plan: EditingPlan): Promise<VideoOutput>;

  /**
   * 清理资源
   */
  dispose(): Promise<void>;
}

interface VideoInput {
  path: string;
  duration: number;
  metadata: VideoMetadata;
}

interface EditingPlan {
  segments: Segment[];
  transitions: Transition[];
  effects: Effect[];
}

interface Segment {
  startTime: number;
  endTime: number;
  importance: number;
  reason: string;
}
```

### 3. AI 模型插件接口

```typescript
interface IAIModelPlugin {
  /**
   * 模型初始化
   */
  initialize(config: ModelConfig): Promise<void>;

  /**
   * 分析视频内容
   */
  analyzeVideo(frames: Frame[]): Promise<AnalysisResult>;

  /**
   * 生成字幕
   */
  generateSubtitles?(audio: AudioBuffer): Promise<Subtitle[]>;

  /**
   * 获取模型信息
   */
  getModelInfo(): ModelInfo;
}

interface ModelConfig {
  apiKey?: string;
  baseURL?: string;
  modelId: string;
  options?: Record<string, any>;
}

interface AnalysisResult {
  theme: string;
  scenes: Scene[];
  emotions: Emotion[];
  objects: DetectedObject[];
}
```

---

## 插件生命周期

```
┌──────────┐
│  发现    │ ← 扫描 plugins/ 目录
└────┬─────┘
     ↓
┌──────────┐
│  验证    │ ← 检查 plugin.json 和权限
└────┬─────┘
     ↓
┌──────────┐
│  加载    │ ← 创建沙箱环境
└────┬─────┘
     ↓
┌──────────┐
│  初始化  │ ← 调用 initialize()
└────┬─────┘
     ↓
┌──────────┐
│  运行    │ ← 响应用户操作
└────┬─────┘
     ↓
┌──────────┐
│  卸载    │ ← 调用 dispose()
└──────────┘
```

---

## 沙箱隔离方案

### 方案 A：Node.js VM2（推荐）

```javascript
const { VM } = require('vm2');

class PluginSandbox {
  constructor(pluginPath) {
    this.vm = new VM({
      timeout: 30000,
      sandbox: {
        // 提供受限的 API
        console: console,
        require: this.createSafeRequire(),
        Buffer: Buffer,
      },
      require: {
        external: true,
        builtin: ['path', 'fs'],
        root: pluginPath,
      },
    });
  }

  createSafeRequire() {
    // 只允许加载白名单模块
    const allowedModules = [
      '@google/generative-ai',
      'axios',
      'lodash',
    ];

    return (moduleName) => {
      if (!allowedModules.includes(moduleName)) {
        throw new Error(`Module ${moduleName} is not allowed`);
      }
      return require(moduleName);
    };
  }

  run(code) {
    return this.vm.run(code);
  }
}
```

### 方案 B：Web Worker（浏览器端）

```typescript
// 渲染进程中运行插件
class BrowserPluginSandbox {
  private worker: Worker;

  constructor(pluginCode: string) {
    const blob = new Blob([pluginCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url);
  }

  async execute(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ method, params });
      this.worker.onmessage = (e) => resolve(e.data);
      this.worker.onerror = (e) => reject(e);
    });
  }
}
```

---

## 权限系统

### 权限定义

```typescript
enum PluginPermission {
  VIDEO_READ = 'video:read',
  VIDEO_WRITE = 'video:write',
  AI_ANALYZE = 'ai:analyze',
  NETWORK_ACCESS = 'network:access',
  FILE_SYSTEM = 'fs:access',
  DATABASE_READ = 'db:read',
  DATABASE_WRITE = 'db:write',
}

interface PermissionRequest {
  permission: PluginPermission;
  reason: string;
}
```

### 权限检查

```typescript
class PermissionManager {
  private grantedPermissions: Map<string, Set<PluginPermission>>;

  async requestPermission(
    pluginId: string,
    permission: PluginPermission
  ): Promise<boolean> {
    // 检查插件清单
    const manifest = await this.loadManifest(pluginId);
    if (!manifest.permissions.includes(permission)) {
      return false;
    }

    // 用户确认（首次请求）
    if (!this.isGranted(pluginId, permission)) {
      const granted = await this.showPermissionDialog(pluginId, permission);
      if (granted) {
        this.grant(pluginId, permission);
      }
      return granted;
    }

    return true;
  }

  private isGranted(pluginId: string, permission: PluginPermission): boolean {
    return this.grantedPermissions.get(pluginId)?.has(permission) ?? false;
  }
}
```

---

## 插件管理器实现

```typescript
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private registry: PluginRegistry;
  private permissionManager: PermissionManager;

  async loadPlugin(pluginPath: string): Promise<void> {
    // 1. 读取插件元数据
    const manifest = await this.loadManifest(pluginPath);

    // 2. 验证签名（可选）
    await this.verifySignature(manifest);

    // 3. 检查依赖
    await this.resolveDependencies(manifest);

    // 4. 创建沙箱
    const sandbox = new PluginSandbox(pluginPath);

    // 5. 加载插件代码
    const pluginCode = await fs.readFile(
      path.join(pluginPath, manifest.entry),
      'utf-8'
    );

    // 6. 实例化插件
    const PluginClass = sandbox.run(pluginCode);
    const plugin = new PluginClass();

    // 7. 初始化
    const context = this.createPluginContext(manifest);
    await plugin.initialize(context);

    // 8. 注册
    this.plugins.set(manifest.id, {
      manifest,
      instance: plugin,
      sandbox,
    });

    console.log(`Plugin ${manifest.id} loaded successfully`);
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // 1. 清理资源
    await plugin.instance.dispose();

    // 2. 销毁沙箱
    plugin.sandbox.destroy();

    // 3. 移除注册
    this.plugins.delete(pluginId);

    console.log(`Plugin ${pluginId} unloaded`);
  }

  getPlugin<T>(pluginId: string): T | undefined {
    return this.plugins.get(pluginId)?.instance as T;
  }

  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }
}
```

---

## 插件上下文（API 桥接）

```typescript
interface PluginContext {
  // 视频处理 API
  video: {
    read(path: string): Promise<VideoMetadata>;
    extract(path: string, segment: Segment): Promise<string>;
  };

  // AI 服务 API
  ai: {
    analyze(frames: Frame[]): Promise<AnalysisResult>;
    generateSubtitles(audio: AudioBuffer): Promise<Subtitle[]>;
  };

  // 数据库 API
  db: {
    query(sql: string, params: any[]): Promise<any[]>;
    save(table: string, data: any): Promise<number>;
  };

  // 配置 API
  config: {
    get(key: string): any;
    set(key: string, value: any): Promise<void>;
  };

  // 日志 API
  logger: {
    info(message: string): void;
    error(message: string, error?: Error): void;
  };
}
```

---

## 插件示例

### 示例 1：自定义剪辑策略

```javascript
// plugins/highlight-strategy/index.js
class HighlightStrategy {
  async initialize(context) {
    this.context = context;
    this.config = context.config.get('highlight-strategy');
  }

  async analyze(video) {
    // 1. 提取关键帧
    const frames = await this.context.video.extractFrames(video.path, 30);

    // 2. AI 分析
    const analysis = await this.context.ai.analyze(frames);

    // 3. 筛选高光片段
    const highlights = analysis.scenes.filter(
      (scene) => scene.emotion.intensity > this.config.emotionThreshold
    );

    // 4. 生成剪辑方案
    return {
      segments: highlights.map((h) => ({
        startTime: h.startTime,
        endTime: h.endTime,
        importance: h.emotion.intensity,
        reason: `高光片段：${h.emotion.type}`,
      })),
      transitions: this.generateTransitions(highlights),
      effects: [],
    };
  }

  async execute(plan) {
    // 调用核心视频处理服务
    return this.context.video.compose(plan);
  }

  async dispose() {
    // 清理资源
  }
}

module.exports = HighlightStrategy;
```

### 示例 2：第三方 AI 模型

```javascript
// plugins/openai-vision/index.js
const OpenAI = require('openai');

class OpenAIVisionPlugin {
  async initialize(config) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.modelId || 'gpt-4-vision-preview';
  }

  async analyzeVideo(frames) {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '分析这些视频帧，识别关键场景和情感' },
          ...frames.map((f) => ({
            type: 'image_url',
            image_url: { url: f.dataUrl },
          })),
        ],
      },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
    });

    return this.parseResponse(response.choices[0].message.content);
  }

  getModelInfo() {
    return {
      name: 'OpenAI GPT-4 Vision',
      version: this.model,
      capabilities: ['scene-detection', 'emotion-analysis', 'object-detection'],
    };
  }
}

module.exports = OpenAIVisionPlugin;
```

---

## 插件市场（未来扩展）

### 插件发布流程

1. 开发者提交插件到 GitHub
2. CI 自动验证插件格式和安全性
3. 人工审核代码质量
4. 发布到插件市场（clawhub.com/plugins）
5. 用户在应用内浏览和安装

### 插件安装

```typescript
class PluginMarket {
  async search(keyword: string): Promise<PluginInfo[]> {
    const response = await fetch(
      `https://api.clawhub.com/plugins/search?q=${keyword}`
    );
    return response.json();
  }

  async install(pluginId: string): Promise<void> {
    // 1. 下载插件包
    const pluginPackage = await this.download(pluginId);

    // 2. 验证签名
    await this.verifyPackage(pluginPackage);

    // 3. 解压到 plugins/ 目录
    await this.extract(pluginPackage);

    // 4. 加载插件
    await pluginManager.loadPlugin(pluginId);
  }
}
```

---

## 实施计划

### Phase 1：核心框架（2 周）
- [ ] 实现 PluginManager
- [ ] 实现沙箱隔离
- [ ] 定义插件接口规范
- [ ] 实现权限系统

### Phase 2：示例插件（1 周）
- [ ] 开发高光剪辑策略插件
- [ ] 开发 OpenAI Vision 插件
- [ ] 编写插件开发文档

### Phase 3：插件市场（3 周）
- [ ] 设计插件市场 UI
- [ ] 实现插件搜索和安装
- [ ] 建立插件审核流程

---

## 风险与挑战

1. **安全性**：插件可能包含恶意代码
   - 缓解：沙箱隔离 + 权限系统 + 代码审核

2. **性能**：插件运行在沙箱中可能影响性能
   - 缓解：使用 Worker 线程 + 异步 API

3. **兼容性**：插件依赖可能与主应用冲突
   - 缓解：独立的 node_modules + 版本锁定

4. **维护成本**：插件 API 变更需要向后兼容
   - 缓解：语义化版本 + 弃用警告

---

## 参考资料

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
