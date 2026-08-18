# Personal Blog - Preline UI 迁移方案

> **迁移目标**: 逐步将管理后台从 Neobrutalism 迁移到 Preline UI  
> **迁移策略**: 渐进式迁移，不影响现有功能  
> **预计工作量**: 2-3 天（分阶段进行）  
> **文档状态**: 历史迁移方案（管理后台现已基于 Preline UI，见 `components-preline/`），本文保留作参考。

---

## 1. 迁移总览

### 1.1 迁移范围

| 区域 | 当前风格 | 目标风格 | 优先级 |
|------|----------|----------|--------|
| **访客端 (Home/PostDetail)** | Neobrutalism | **保持 Neobrutalism** | - |
| **登录页 (Login)** | Neobrutalism | Preline Modern | P1 |
| **后台首页 (Dashboard)** | Neobrutalism | Preline Admin | P1 |
| **文章管理 (Posts)** | Neobrutalism | Preline Admin | P2 |
| **文章编辑 (PostEdit)** | Neobrutalism | Preline Admin | P2 |
| **分类/标签/图片管理** | Neobrutalism | Preline Admin | P3 |
| **系统设置 (Settings)** | Neobrutalism | Preline Admin | P1 (试点) |
| **采集页面 (CrawlEdit)** | Neobrutalism | Preline Admin | P3 |

### 1.2 为什么这样分？

- **访客端保持原样**: 博客展示需要个性风格，Neobrutalism 很适合
- **后台用 Preline**: 管理后台需要专业、高效、统一
- **渐进式迁移**: 每次只改一个页面，确保稳定

---

## 2. 技术准备

### 2.1 已安装依赖

```bash
npm install preline @tailwindcss/forms
```

### 2.2 需要修改的配置文件

#### 步骤 1: 更新 CSS 入口文件

**文件**: `src/index.css`

```css
/* ========== Preline UI 迁移 - 双主题共存方案 ========== */

/* 基础 Tailwind */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Preline UI 支持 */
@source "./node_modules/preline/dist/*.js";
@import "./node_modules/preline/variants.css";

/* Preline 需要的基础样式 */
@plugin "@tailwindcss/forms";

/* ============================================ */
/* 主题 1: Neobrutalism (访客端 + 默认) */
/* ============================================ */

@layer base {
  :root {
    /* 色彩系统 */
    --brutal-cream: #FEF9E7;
    --brutal-yellow: #FFDE59;
    --brutal-pink: #FF6B9D;
    --brutal-cyan: #00D9FF;
    --brutal-lavender: #C084FC;
    --brutal-green: #4ADE80;
    
    /* 默认应用 Neobrutalism */
    --color-bg: var(--brutal-cream);
    --color-card: #FFFFFF;
    --color-primary: var(--brutal-pink);
    --color-text: #000000;
    --border-width: 2px;
    --border-radius: 0px;
    --shadow: 4px 4px 0px 0px rgba(0,0,0,1);
  }
  
  body {
    @apply bg-[var(--color-bg)] text-[var(--color-text)];
    font-family: system-ui, -apple-system, sans-serif;
  }
}

/* ============================================ */
/* 主题 2: Preline Admin (管理后台) */
/* ============================================ */

[data-theme="preline"] {
  /* Preline 默认配色 */
  --color-bg: #F8FAFC;
  --color-card: #FFFFFF;
  --color-primary: #10B981;
  --color-text: #0F172A;
  --color-text-secondary: #64748B;
  --color-border: #E2E8F0;
  --color-sidebar: #0F172A;
  --color-sidebar-active: #1E293B;
  
  /* 样式变量 */
  --border-width: 1px;
  --border-radius: 0.75rem;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

/* ============================================ */
/* Neobrutalism 组件样式 (保留) */
/* ============================================ */

@layer components {
  .btn-brutal {
    @apply inline-flex items-center justify-center px-4 py-2 
           border-2 border-black font-bold text-sm
           transition-all duration-150
           shadow-brutal hover:shadow-none
           hover:translate-x-[2px] hover:translate-y-[2px]
           active:translate-x-[4px] active:translate-y-[4px];
  }
  
  .card-brutal {
    @apply bg-white border-2 border-black shadow-brutal;
  }
  
  .input-brutal {
    @apply w-full px-3 py-2 border-2 border-black bg-white 
           focus:outline-none focus:ring-2 focus:ring-brutal-yellow
           placeholder:text-black/40;
  }
}

/* ============================================ */
/* Preline Admin 组件样式 (新增) */
/* ============================================ */

@layer components {
  /* Preline 风格按钮 */
  .btn-preline {
    @apply inline-flex items-center justify-center gap-2 
           px-4 py-2.5 rounded-lg font-medium text-sm
           bg-[var(--color-primary)] text-white
           hover:opacity-90 focus:outline-none focus:ring-2 
           focus:ring-[var(--color-primary)] focus:ring-offset-2
           transition-all duration-200;
  }
  
  .btn-preline-secondary {
    @apply inline-flex items-center justify-center gap-2 
           px-4 py-2.5 rounded-lg font-medium text-sm
           bg-white text-[var(--color-text)]
           border border-[var(--color-border)]
           hover:bg-gray-50 focus:outline-none focus:ring-2
           focus:ring-gray-200 transition-all duration-200;
  }
  
  /* Preline 风格卡片 */
  .card-preline {
    @apply bg-[var(--color-card)] rounded-xl 
           border border-[var(--color-border)]
           shadow-sm hover:shadow-md transition-shadow duration-200;
  }
  
  /* Preline 风格输入框 */
  .input-preline {
    @apply w-full px-4 py-2.5 rounded-lg 
           border border-[var(--color-border)] bg-white
           text-[var(--color-text)]
           focus:outline-none focus:ring-2 
           focus:ring-[var(--color-primary)]/20 
           focus:border-[var(--color-primary)]
           placeholder:text-gray-400
           transition-all duration-200;
  }
  
  /* Preline 侧边栏 */
  .sidebar-preline {
    @apply w-64 bg-[var(--color-sidebar)] min-h-screen
           fixed left-0 top-0 z-40;
  }
  
  .sidebar-nav-item {
    @apply flex items-center gap-3 px-4 py-2.5 rounded-lg
           text-gray-400 hover:bg-[var(--color-sidebar-active)]
           hover:text-white transition-colors duration-200;
  }
  
  .sidebar-nav-item.active {
    @apply bg-[var(--color-sidebar-active)] text-white font-medium;
  }
}

/* ============================================ */
/* 工具类扩展 */
/* ============================================ */

@layer utilities {
  .shadow-brutal {
    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
  }
  
  .shadow-brutal-sm {
    box-shadow: 2px 2px 0px 0px rgba(0,0,0,1);
  }
}

/* ============================================ */
/* Neobrutalism 滚动条 (仅访客端) */
/* ============================================ */

:not([data-theme="preline"]) ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

:not([data-theme="preline"]) ::-webkit-scrollbar-track {
  background: #FEF9E7;
  border-left: 2px solid black;
}

:not([data-theme="preline"]) ::-webkit-scrollbar-thumb {
  background: #000;
  border: 2px solid #FEF9E7;
}

/* ============================================ */
/* Preline 滚动条 (管理后台) */
/* ============================================ */

[data-theme="preline"] ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

[data-theme="preline"] ::-webkit-scrollbar-track {
  background: transparent;
}

[data-theme="preline"] ::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 4px;
}

[data-theme="preline"] ::-webkit-scrollbar-thumb:hover {
  background: #94A3B8;
}
```

#### 步骤 2: 更新 tailwind.config.js

**文件**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Preline UI 支持
    "./node_modules/preline/dist/*.js",
  ],
  theme: {
    extend: {
      // 保留 Neobrutalism 颜色
      colors: {
        brutal: {
          cream: '#FEF9E7',
          yellow: '#FFDE59',
          pink: '#FF6B9D',
          cyan: '#00D9FF',
          lavender: '#C084FC',
          green: '#4ADE80',
        },
        // Preline 配色
        preline: {
          primary: '#10B981',
          'primary-hover': '#059669',
          'primary-light': '#D1FAE5',
          sidebar: '#0F172A',
          'sidebar-active': '#1E293B',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        // Preline 柔和阴影
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      fontFamily: {
        display: ['system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [
    // Preline 需要
    require('@tailwindcss/forms'),
  ],
}
```

#### 步骤 3: 添加 Preline JS

**文件**: `src/main.jsx`

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Preline UI JavaScript
import 'preline'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

---

## 3. 组件迁移计划

### 3.1 新建 Preline 组件目录

```
src/
├── components/           # 现有 Neobrutalism 组件
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   ├── Layout.jsx
│   └── Sidebar.jsx
├── components-preline/   # 新建 Preline 组件
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   ├── Layout.jsx        # Preline 风格后台布局
│   ├── Sidebar.jsx       # Preline 深色侧边栏
│   ├── StatsCard.jsx     # 统计卡片
│   ├── DataTable.jsx     # 数据表格
│   └── PageHeader.jsx    # 页面头部
```

### 3.2 核心组件对照表

| 功能 | Neobrutalism | Preline |
|------|--------------|---------|
| 按钮 | `btn-brutal` | `hs-btn` + Tailwind 类 |
| 卡片 | `card-brutal` | `hs-card` |
| 输入框 | `input-brutal` | `hs-input` |
| 侧边栏 | 奶油色 + 硬边框 | 深色 + 柔和圆角 |
| 表格 | 自定义 | `hs-table` |
| 模态框 | 自定义 | `hs-overlay` |
| 下拉菜单 | 自定义 | `hs-dropdown` |

---

## 4. 分阶段实施计划

### Phase 1: 基础配置 (第 1 天)

**目标**: 让 Preline 跑起来，不影响现有功能

- [ ] 更新 `src/index.css` 添加双主题支持
- [ ] 更新 `tailwind.config.js`
- [ ] 更新 `main.jsx` 引入 Preline JS
- [ ] 创建 `components-preline/` 目录结构
- [ ] 测试：确认现有页面正常

**验证点**: 现有 Neobrutalism 风格页面不受影响

---

### Phase 2: Settings 页面试点 (第 1-2 天)

**目标**: 用 Settings 页面验证迁移方案

**为什么选 Settings？**
- 功能单一，改动风险小
- 表单元素多，能验证 Preline 表单组件
- 有保存/成功提示，能验证交互

**具体改动**:
- [ ] 新建 `components-preline/Layout.jsx` (Preline 风格后台布局)
- [ ] 新建 `components-preline/Sidebar.jsx` (深色侧边栏)
- [ ] 新建 `components-preline/Input.jsx` (Preline 输入框)
- [ ] 新建 `components-preline/Button.jsx` (Preline 按钮)
- [ ] 改写 `pages/admin/Settings.jsx`
- [ ] 添加主题切换开关

**Settings 页面新结构**:
```jsx
// pages/admin/Settings.jsx
import { AdminLayout } from '../../components-preline/Layout'
import { Card } from '../../components-preline/Card'
import { Input } from '../../components-preline/Input'
import { Button } from '../../components-preline/Button'

export default function Settings() {
  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">博客设置</h1>
        
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">基本信息</h3>
          </Card.Header>
          <Card.Body>
            {/* Preline 风格表单 */}
          </Card.Body>
        </Card>
      </div>
    </AdminLayout>
  )
}
```

**验证点**: Settings 页面显示正常，表单能正常提交

---

### Phase 3: Dashboard 首页 (第 2 天)

**目标**: 后台首页改用 Preline 风格

**改动内容**:
- [ ] 新建 `components-preline/StatsCard.jsx` (统计卡片)
- [ ] 改写 `pages/Dashboard.jsx`
- [ ] 添加图表支持 (可选，用 Recharts 或 Preline Charts)

**Dashboard 新布局**:
```
┌─────────────────────────────────────────────────────────┐
│  [Sidebar]  │  Header: Dashboard            [🔔][👤]    │
│  (dark)     ├───────────────────────────────────────────┤
│             │                                           │
│  Dashboard  │  ┌──────────┬──────────┬──────────┐      │
│  Posts      │  │ StatsCard│ StatsCard│ StatsCard│      │
│  Categories │  └──────────┴──────────┴──────────┘      │
│  Images     │                                           │
│  Settings   │  ┌───────────────────────────────┐       │
│             │  │   Recent Posts Table          │       │
│             │  └───────────────────────────────┘       │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

---

### Phase 4: Posts 管理页面 (第 2-3 天)

**目标**: 文章列表改用 Preline 风格

**改动内容**:
- [ ] 新建 `components-preline/DataTable.jsx` (数据表格)
- [ ] 新建 `components-preline/Badge.jsx` (状态标签)
- [ ] 新建 `components-preline/Pagination.jsx` (分页)
- [ ] 改写 `pages/Posts.jsx`

---

### Phase 5: PostEdit 编辑页面 (第 3 天)

**目标**: 文章编辑改用 Preline 风格

**改动内容**:
- [ ] 新建 `components-preline/Textarea.jsx` (Markdown 编辑器容器)
- [ ] 改写 `pages/PostEdit.jsx`

---

### Phase 6: 剩余页面 (后续)

- [ ] Login 页面
- [ ] Categories 页面
- [ ] Images 页面
- [ ] CrawlEdit 页面

---

### Phase 7: 主题切换功能 (可选)

**目标**: 支持在 Settings 切换后台主题

- [ ] 后端 Setting 表添加 `admin_theme` 字段
- [ ] 主题切换逻辑
- [ ] 主题持久化

---

## 5. 文件清单

### 5.1 需要新建的组件

```
src/components-preline/
├── Layout.jsx          # 后台布局 (深色侧边栏 + 顶部栏)
├── Sidebar.jsx         # 侧边栏导航
├── Header.jsx          # 顶部栏
├── Button.jsx          # 按钮
├── Card.jsx            # 卡片
├── Input.jsx           # 输入框
├── Textarea.jsx        # 文本域
├── Select.jsx          # 下拉选择
├── Badge.jsx           # 标签
├── DataTable.jsx       # 数据表格
├── Pagination.jsx      # 分页
├── StatsCard.jsx       # 统计卡片
├── PageHeader.jsx      # 页面标题
├── Modal.jsx           # 模态框
├── Alert.jsx           # 提示消息
└── index.js            # 统一导出
```

### 5.2 需要改写的页面

```
src/pages/
├── Dashboard.jsx       # Phase 3
├── Posts.jsx           # Phase 4
├── PostEdit.jsx        # Phase 5
├── Login.jsx           # Phase 6
└── admin/
    ├── Settings.jsx    # Phase 2 (试点)
    ├── Categories.jsx  # Phase 6
    └── Images.jsx      # Phase 6
```

---

## 6. 风险与回滚方案

### 6.1 潜在风险

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| CSS 冲突 | 中 | 样式错乱 | 双主题 CSS 变量隔离 |
| JS 兼容 | 低 | Preline 组件失效 | 保留原有组件作为后备 |
| 构建失败 | 低 | 无法部署 | 每次改动后单独测试 |
| 功能回归 | 中 | 原有功能失效 | 逐个页面迁移，充分测试 |

### 6.2 回滚方案

如果某个页面迁移后出问题：

```bash
# 回滚单个页面
git checkout src/pages/Posts.jsx

# 或者使用原有组件
# 把 import { Button } from '../components-preline/Button'
# 改回 import { Button } from '../components/Button'
```

---

## 7. 验证清单

每个 Phase 完成后检查：

- [ ] 页面能正常加载
- [ ] 样式显示正确
- [ ] 表单能正常提交
- [ ] 响应式正常 (移动端/平板/桌面)
- [ ] 访客端页面不受影响
- [ ] 构建无警告/错误

---

## 8. 参考资源

- [Preline Documentation](https://preline.co/docs/index.html)
- [Preline Components](https://preline.co/docs/buttons.html)
- [Preline Admin Templates](https://preline.co/templates.html)
- [Preline React Integration](https://preline.co/docs/frameworks-react.html)

---

## 9. 下一步行动

确认方案后，从 **Phase 1** 开始执行：

1. ✅ 先更新配置文件 (CSS + Tailwind + main.jsx)
2. ✅ 然后 Phase 2: Settings 页面试点
3. ✅ 验证通过后继续后续 Phase

---

**确认开始执行吗？** 先确认一下理解：

> 采用双主题共存方案，访客端保持 Neobrutalism 奶油色粗边框风格，管理后台逐步迁移到 Preline 深色侧边栏现代风格，从 Settings 页面开始试点迁移。

确认后我开始写 Phase 1 的代码。
