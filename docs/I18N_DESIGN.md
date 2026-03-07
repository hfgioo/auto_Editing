# 多语言支持方案设计（P2）

## 设计目标

1. 支持中文、英文、日文等多语言
2. 运行时动态切换语言
3. 支持 RTL（从右到左）语言（如阿拉伯语）
4. 翻译文件易于维护和扩展

---

## 技术选型对比

### react-i18next vs FormatJS

| 特性 | react-i18next | FormatJS (react-intl) |
|------|---------------|----------------------|
| **学习曲线** | 低 | 中 |
| **包体积** | ~50KB | ~80KB |
| **性能** | 优秀 | 良好 |
| **复数规则** | ✅ 支持 | ✅ 支持 |
| **日期/数字格式化** | 需要额外库 | ✅ 内置 |
| **TypeScript 支持** | ✅ 优秀 | ✅ 优秀 |
| **生态系统** | 成熟 | 成熟 |
| **Electron 兼容性** | ✅ 完美 | ✅ 完美 |

### 推荐方案：react-i18next

**理由**：
1. 更轻量（50KB vs 80KB）
2. API 更简洁直观
3. 社区活跃，文档完善
4. 与 Electron 集成更简单

---

## 架构设计

```
┌─────────────────────────────────────────┐
│         Application                     │
│  ┌───────────────────────────────────┐  │
│  │     i18n Provider                 │  │
│  │  - 语言检测                        │  │
│  │  - 语言切换                        │  │
│  │  - 翻译加载                        │  │
│  └───────────────────────────────────┘  │
│              ↓                          │
│  ┌───────────────────────────────────┐  │
│  │     Translation Files             │  │
│  │  - locales/zh-CN/                 │  │
│  │  - locales/en-US/                 │  │
│  │  - locales/ja-JP/                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 翻译文件结构

### 目录组织

```
locales/
├── zh-CN/                    # 简体中文
│   ├── common.json           # 通用文本
│   ├── video.json            # 视频相关
│   ├── settings.json         # 设置页面
│   ├── errors.json           # 错误信息
│   └── ai.json               # AI 分析相关
├── en-US/                    # 美式英语
│   ├── common.json
│   ├── video.json
│   ├── settings.json
│   ├── errors.json
│   └── ai.json
├── ja-JP/                    # 日语
│   └── ...
└── index.ts                  # 语言配置入口
```

### 翻译文件示例

**locales/zh-CN/common.json**
```json
{
  "app": {
    "name": "AI 视频剪辑工具",
    "version": "版本 {{version}}"
  },
  "actions": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑",
    "export": "导出",
    "import": "导入"
  },
  "messages": {
    "success": "操作成功",
    "error": "操作失败：{{message}}",
    "confirm": "确认要执行此操作吗？"
  }
}
```

**locales/zh-CN/video.json**
```json
{
  "upload": {
    "title": "上传视频",
    "dragHint": "拖拽视频文件到此处，或点击选择",
    "formats": "支持格式：MP4, MOV, AVI",
    "maxSize": "最大文件大小：{{size}}MB"
  },
  "analysis": {
    "title": "AI 分析",
    "analyzing": "正在分析视频...",
    "progress": "进度：{{percent}}%",
    "complete": "分析完成",
    "scenes_count": "识别到 {{count}} 个场景",
    "scenes_count_plural": "识别到 {{count}} 个场景"
  },
  "export": {
    "title": "导出视频",
    "format": "输出格式",
    "quality": "视频质量",
    "resolution": "分辨率",
    "exporting": "正在导出...",
    "success": "导出成功！文件保存在：{{path}}"
  }
}
```

**locales/en-US/video.json**
```json
{
  "upload": {
    "title": "Upload Video",
    "dragHint": "Drag video file here, or click to select",
    "formats": "Supported formats: MP4, MOV, AVI",
    "maxSize": "Max file size: {{size}}MB"
  },
  "analysis": {
    "title": "AI Analysis",
    "analyzing": "Analyzing video...",
    "progress": "Progress: {{percent}}%",
    "complete": "Analysis complete",
    "scenes_count": "{{count}} scene detected",
    "scenes_count_plural": "{{count}} scenes detected"
  },
  "export": {
    "title": "Export Video",
    "format": "Output Format",
    "quality": "Video Quality",
    "resolution": "Resolution",
    "exporting": "Exporting...",
    "success": "Export successful! File saved at: {{path}}"
  }
}
```

---

## 实现方案

### 1. 安装依赖

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### 2. 配置 i18n

**src/i18n/config.ts**
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译文件
import zhCN from '../locales/zh-CN';
import enUS from '../locales/en-US';
import jaJP from '../locales/ja-JP';

const resources = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
};

i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 集成 React
  .init({
    resources,
    fallbackLng: 'zh-CN', // 默认语言
    defaultNS: 'common', // 默认命名空间
    ns: ['common', 'video', 'settings', 'errors', 'ai'],
    
    interpolation: {
      escapeValue: false, // React 已经处理 XSS
    },

    detection: {
      // 语言检测顺序
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    react: {
      useSuspense: false, // 禁用 Suspense（Electron 中可能有问题）
    },
  });

export default i18n;
```

**src/locales/zh-CN/index.ts**
```typescript
import common from './common.json';
import video from './video.json';
import settings from './settings.json';
import errors from './errors.json';
import ai from './ai.json';

export default {
  common,
  video,
  settings,
  errors,
  ai,
};
```

### 3. 在应用中使用

**src/main.tsx**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/config'; // 初始化 i18n

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**src/components/VideoUpload.tsx**
```typescript
import { useTranslation } from 'react-i18next';

function VideoUpload() {
  const { t } = useTranslation('video');

  return (
    <div>
      <h2>{t('upload.title')}</h2>
      <p>{t('upload.dragHint')}</p>
      <p>{t('upload.formats')}</p>
      <p>{t('upload.maxSize', { size: 500 })}</p>
    </div>
  );
}
```

### 4. 语言切换组件

**src/components/LanguageSwitcher.tsx**
```typescript
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
];

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    // 保存到数据库
    window.electron.saveSettings({ language: lng });
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

### 5. 复数规则

```typescript
// 中文没有复数形式
t('analysis.scenes_count', { count: 1 }); // "识别到 1 个场景"
t('analysis.scenes_count', { count: 5 }); // "识别到 5 个场景"

// 英文有复数形式
t('analysis.scenes_count', { count: 1 }); // "1 scene detected"
t('analysis.scenes_count', { count: 5 }); // "5 scenes detected"
```

**配置复数规则**
```json
{
  "analysis": {
    "scenes_count_one": "{{count}} scene detected",
    "scenes_count_other": "{{count}} scenes detected"
  }
}
```

### 6. 日期和数字格式化

```typescript
import { useTranslation } from 'react-i18next';

function VideoInfo({ createdAt, fileSize }) {
  const { t, i18n } = useTranslation();

  // 日期格式化
  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(createdAt));

  // 数字格式化
  const formattedSize = new Intl.NumberFormat(i18n.language, {
    style: 'unit',
    unit: 'megabyte',
  }).format(fileSize);

  return (
    <div>
      <p>{t('video.createdAt')}: {formattedDate}</p>
      <p>{t('video.fileSize')}: {formattedSize}</p>
    </div>
  );
}
```

---

## 主进程国际化

### Electron 主进程中使用 i18n

**electron/i18n.js**
```javascript
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .init({
    lng: 'zh-CN',
    fallbackLng: 'zh-CN',
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
    },
  });

module.exports = i18next;
```

**electron/main.js**
```javascript
const i18n = require('./i18n');

// 在 IPC 处理中使用
ipcMain.handle('video:process', async (event, videoPath) => {
  try {
    // ...
    return {
      success: true,
      message: i18n.t('video.processSuccess'),
    };
  } catch (error) {
    return {
      success: false,
      message: i18n.t('errors.videoProcessFailed', { error: error.message }),
    };
  }
});
```

---

## TypeScript 类型支持

### 生成类型定义

**scripts/generate-i18n-types.js**
```javascript
const fs = require('fs');
const path = require('path');

function generateTypes() {
  const localesDir = path.join(__dirname, '../src/locales/zh-CN');
  const files = fs.readdirSync(localesDir);

  const types = files
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const namespace = f.replace('.json', '');
      const content = require(path.join(localesDir, f));
      return `  ${namespace}: ${JSON.stringify(content, null, 2)}`;
    })
    .join(',\n');

  const output = `
// Auto-generated by scripts/generate-i18n-types.js
export interface Resources {
${types}
}

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: Resources;
  }
}
`;

  fs.writeFileSync(
    path.join(__dirname, '../src/i18n/types.d.ts'),
    output
  );
}

generateTypes();
```

**使用类型安全的翻译**
```typescript
// ✅ 类型安全
t('video.upload.title'); // OK
t('video.upload.invalidKey'); // ❌ TypeScript 错误

// ✅ 参数类型检查
t('video.upload.maxSize', { size: 500 }); // OK
t('video.upload.maxSize', { invalidParam: 500 }); // ❌ TypeScript 错误
```

---

## 翻译工作流

### 1. 提取待翻译文本

**scripts/extract-translations.js**
```javascript
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function extractTranslations(sourceDir) {
  const keys = new Set();

  function scanFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    traverse(ast, {
      CallExpression(path) {
        if (path.node.callee.name === 't') {
          const key = path.node.arguments[0].value;
          if (key) keys.add(key);
        }
      },
    });
  }

  // 扫描所有源文件
  // ...

  return Array.from(keys).sort();
}

// 生成待翻译文件
const keys = extractTranslations('./src');
fs.writeFileSync(
  './locales/to-translate.json',
  JSON.stringify(keys, null, 2)
);
```

### 2. 翻译管理平台集成

推荐使用：
- [Crowdin](https://crowdin.com/)
- [Lokalise](https://lokalise.com/)
- [POEditor](https://poeditor.com/)

**集成示例（Crowdin）**
```yaml
# crowdin.yml
project_id: "your-project-id"
api_token: "your-api-token"

files:
  - source: /src/locales/zh-CN/*.json
    translation: /src/locales/%locale%/%original_file_name%
```

---

## RTL（从右到左）语言支持

### 检测 RTL 语言

```typescript
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

function isRTL(language: string): boolean {
  return RTL_LANGUAGES.some((rtl) => language.startsWith(rtl));
}

// 在应用根组件中设置
function App() {
  const { i18n } = useTranslation();
  const dir = isRTL(i18n.language) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
  }, [dir]);

  return <div dir={dir}>{/* ... */}</div>;
}
```

### CSS 适配

```css
/* 使用逻辑属性 */
.container {
  margin-inline-start: 20px; /* LTR: margin-left, RTL: margin-right */
  padding-inline-end: 10px;  /* LTR: padding-right, RTL: padding-left */
}

/* 或使用 CSS 变量 */
:root {
  --text-align: left;
}

[dir="rtl"] {
  --text-align: right;
}

.text {
  text-align: var(--text-align);
}
```

---

## 性能优化

### 1. 懒加载翻译文件

```typescript
i18n.init({
  // ...
  backend: {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
  },
  ns: ['common'], // 只预加载 common
  defaultNS: 'common',
});

// 按需加载其他命名空间
function VideoPage() {
  const { t } = useTranslation(['common', 'video']);
  // ...
}
```

### 2. 缓存翻译

```typescript
i18n.init({
  // ...
  cache: {
    enabled: true,
    expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 天
  },
});
```

### 3. 预编译翻译文件

```javascript
// scripts/compile-translations.js
const fs = require('fs');
const path = require('path');

function compileTranslations() {
  const locales = ['zh-CN', 'en-US', 'ja-JP'];

  locales.forEach((locale) => {
    const localeDir = path.join(__dirname, `../src/locales/${locale}`);
    const files = fs.readdirSync(localeDir);

    const compiled = {};
    files.forEach((file) => {
      if (file.endsWith('.json')) {
        const ns = file.replace('.json', '');
        compiled[ns] = require(path.join(localeDir, file));
      }
    });

    fs.writeFileSync(
      path.join(__dirname, `../dist/locales/${locale}.json`),
      JSON.stringify(compiled)
    );
  });
}

compileTranslations();
```

---

## 测试

### 单元测试

```typescript
import { renderHook } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import '../i18n/config';

describe('i18n', () => {
  it('should translate correctly', () => {
    const { result } = renderHook(() => useTranslation('video'));
    
    expect(result.current.t('upload.title')).toBe('上传视频');
  });

  it('should handle interpolation', () => {
    const { result } = renderHook(() => useTranslation('video'));
    
    expect(result.current.t('upload.maxSize', { size: 500 }))
      .toBe('最大文件大小：500MB');
  });

  it('should switch language', async () => {
    const { result } = renderHook(() => useTranslation('video'));
    
    await result.current.i18n.changeLanguage('en-US');
    
    expect(result.current.t('upload.title')).toBe('Upload Video');
  });
});
```

### E2E 测试

```typescript
import { test, expect } from '@playwright/test';

test('language switcher', async ({ page }) => {
  await page.goto('http://localhost:5176');

  // 默认中文
  await expect(page.locator('h1')).toHaveText('AI 视频剪辑工具');

  // 切换到英文
  await page.selectOption('select[name="language"]', 'en-US');
  await expect(page.locator('h1')).toHaveText('AI Video Editor');

  // 刷新页面，语言应该保持
  await page.reload();
  await expect(page.locator('h1')).toHaveText('AI Video Editor');
});
```

---

## 实施计划

### Phase 1：基础设施（1 周）
- [ ] 安装和配置 react-i18next
- [ ] 设计翻译文件结构
- [ ] 实现语言切换组件
- [ ] 添加 TypeScript 类型支持

### Phase 2：翻译内容（2 周）
- [ ] 提取所有待翻译文本
- [ ] 完成中文翻译
- [ ] 完成英文翻译
- [ ] 完成日文翻译（可选）

### Phase 3：优化和测试（1 周）
- [ ] 实现懒加载
- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 性能优化

---

## 维护指南

### 添加新语言

1. 创建新的语言目录：`locales/fr-FR/`
2. 复制 `zh-CN/` 下的所有文件
3. 翻译内容
4. 在 `src/i18n/config.ts` 中注册新语言
5. 在 `LanguageSwitcher` 中添加选项

### 添加新翻译键

1. 在 `locales/zh-CN/` 中添加新键
2. 运行 `npm run i18n:extract` 提取待翻译文本
3. 翻译到其他语言
4. 运行 `npm run i18n:types` 更新类型定义

### 翻译质量检查

```bash
# 检查缺失的翻译键
npm run i18n:check

# 检查未使用的翻译键
npm run i18n:unused

# 验证翻译文件格式
npm run i18n:validate
```

---

## 参考资料

- [react-i18next 官方文档](https://react.i18next.com/)
- [i18next 最佳实践](https://www.i18next.com/principles/best-practices)
- [Electron 国际化指南](https://www.electronjs.org/docs/latest/tutorial/i18n)
