# Personal Blog - Modern Dashboard 设计风格文档

> **设计风格**: Modern SaaS Dashboard  
> **参考来源**: [Apex Dashboard](https://apex-dashboard.pages.dev/)  
> **版本**: v1.0  
> **更新日期**: 2026-04-18  
> **文档状态**: 历史设计文档（早期方案稿），实际实现以源码及 `01/02/03` 文档为准。

---

## 1. 设计理念

### 1.1 什么是 Modern Dashboard 风格？

Modern Dashboard 是一种现代化的 SaaS 管理后台设计风格，特点包括：

- **深色侧边导航**: 高对比度的深色侧边栏，聚焦内容区域
- **浅色主内容区**: 干净、明亮的白色/浅灰背景
- **柔和圆角**: 8px-16px 圆角，友好且现代
- **微阴影**: 柔和的投影营造层次感
- **绿色主色调**: 代表增长、成功、活力
- **数据驱动**: 强调指标卡片、图表展示
- **简洁图标**: 线性图标，统一风格

### 1.2 与当前 Neobrutalism 风格对比

| 特性 | Neobrutalism (当前) | Modern Dashboard (新风格) |
|------|---------------------|---------------------------|
| 侧边栏 | 奶油色 `#FEF9E7` | 深墨绿 `#0F172A` |
| 主背景 | 奶油色 | 浅灰白 `#F8FAFC` |
| 边框 | 2px 纯黑硬边框 | 1px 浅灰边框或无 |
| 圆角 | 0px (直角) | 8-16px (圆角) |
| 阴影 | 4px 硬阴影 | 柔和弥散阴影 |
| 主色调 | 粉红 `#FF6B9D` | 翠绿 `#10B981` |
| 按钮风格 | 位移点击效果 | 悬停微动 + 渐变 |
| 卡片风格 | 硬边框 + 硬阴影 | 无边框 + 软阴影 |

---

## 2. 色彩系统

### 2.1 主色调

```javascript
// tailwind.config.js - Modern Dashboard 配色
colors: {
  'dashboard': {
    // 侧边栏深色
    'sidebar': '#0F172A',      // 深墨绿/深蓝灰
    'sidebar-active': '#1E293B', // 激活项背景
    'sidebar-text': '#94A3B8',   // 侧边栏文字
    'sidebar-text-active': '#FFFFFF', // 激活文字
    
    // 主内容区
    'bg': '#F8FAFC',           // 主背景 - 极浅灰
    'card': '#FFFFFF',         // 卡片背景 - 纯白
    
    // 强调色
    'primary': '#10B981',      // 主色调 - 翠绿
    'primary-hover': '#059669', // 悬停深绿
    'primary-light': '#D1FAE5', // 浅绿背景
    
    // 状态色
    'success': '#10B981',      // 成功 - 绿
    'warning': '#F59E0B',      // 警告 - 橙
    'danger': '#EF4444',       // 危险 - 红
    'info': '#3B82F6',         // 信息 - 蓝
    
    // 文字
    'text-primary': '#0F172A',   // 主要文字
    'text-secondary': '#64748B', // 次要文字
    'text-muted': '#94A3B8',     // 弱化文字
    
    // 边框
    'border': '#E2E8F0',       // 浅色边框
  }
}
```

### 2.2 使用规范

| 颜色 | 用途 |
|------|------|
| `dashboard-sidebar` | 侧边栏背景 |
| `dashboard-sidebar-active` | 当前选中菜单项 |
| `dashboard-bg` | 主内容区背景 |
| `dashboard-card` | 卡片、面板背景 |
| `dashboard-primary` | 主按钮、链接、强调 |
| `dashboard-primary-light` | 图标背景、标签背景 |
| `dashboard-success` | 增长指标、成功状态 |
| `dashboard-warning` | 警告提示 |
| `dashboard-danger` | 删除操作、错误提示 |
| `dashboard-text-primary` | 标题、主要内容 |
| `dashboard-text-secondary` | 描述、辅助文字 |
| `dashboard-border` | 分割线、卡片边框 |

---

## 3. 排版系统

### 3.1 字体

```javascript
fontFamily: {
  'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
}
```

- **Inter** 作为主要字体，现代、清晰、专业
- 系统字体栈作为后备

### 3.2 字号规范

| 元素 | 字号 | 字重 | 用途 |
|------|------|------|------|
| 页面标题 | `text-2xl` (24px) | `font-semibold` (600) | Dashboard 标题 |
| 卡片标题 | `text-base` (16px) | `font-medium` (500) | 卡片/面板标题 |
| 大数字 | `text-3xl` (30px) | `font-bold` (700) | 统计数据展示 |
| 正文 | `text-sm` (14px) | `font-normal` (400) | 段落文字 |
| 小字 | `text-xs` (12px) | `font-medium` (500) | 标签、时间戳 |
| 按钮文字 | `text-sm` (14px) | `font-medium` (500) | 按钮内文字 |
| 侧边栏菜单 | `text-sm` (14px) | `font-medium` (500) | 导航菜单 |

---

## 4. 阴影系统

### 4.1 阴影定义

```javascript
boxShadow: {
  'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
}
```

### 4.2 使用场景

| 阴影 | 用途 |
|------|------|
| `shadow-card` | 标准卡片、面板 |
| `shadow-card-hover` | 卡片悬停状态 |
| `shadow-dropdown` | 下拉菜单、弹窗 |

---

## 5. 组件规范

### 5.1 按钮 (Button)

```jsx
// 基础样式
const baseClasses = 'inline-flex items-center justify-center font-medium 
  transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 
  focus:ring-offset-2'

// 变体
primary:   'bg-dashboard-primary text-white hover:bg-dashboard-primary-hover 
            focus:ring-dashboard-primary shadow-sm'
secondary: 'bg-white text-dashboard-text-primary border border-dashboard-border 
            hover:bg-gray-50 focus:ring-dashboard-border'
ghost:     'bg-transparent text-dashboard-text-secondary 
            hover:bg-gray-100 hover:text-dashboard-text-primary'
danger:    'bg-dashboard-danger text-white hover:bg-red-600 
            focus:ring-red-500'

// 尺寸
sm: 'px-3 py-1.5 text-xs rounded-md'
md: 'px-4 py-2 text-sm rounded-lg'
lg: 'px-6 py-2.5 text-base rounded-lg'
```

**交互效果**:
- 默认: 轻微阴影
- 悬停: 背景色加深，阴影增强
- 点击: 轻微下沉效果

### 5.2 卡片 (Card)

```jsx
// 样式
'bg-white rounded-xl shadow-card border border-dashboard-border'

// 悬停效果 (可选)
'hover:shadow-card-hover transition-shadow duration-200'
```

**结构组件**:
- `CardHeader`: 头部区域，含标题和可选操作
- `CardContent`: 内容区域
- `CardFooter`: 底部操作区

### 5.3 统计卡片 (Stats Card)

```jsx
// 示例结构
<div className="bg-white rounded-xl shadow-card p-6 border border-dashboard-border">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-dashboard-text-secondary">
        总文章数
      </p>
      <p className="text-3xl font-bold text-dashboard-text-primary mt-2">
        128
      </p>
      <div className="flex items-center mt-2 text-sm">
        <span className="text-dashboard-success flex items-center">
          ↑ 12.5%
        </span>
        <span className="text-dashboard-text-muted ml-2">较上月</span>
      </div>
    </div>
    <div className="p-3 rounded-lg bg-dashboard-primary-light">
      <FileText className="w-6 h-6 text-dashboard-primary" />
    </div>
  </div>
</div>
```

### 5.4 输入框 (Input)

```jsx
// 样式
'w-full px-4 py-2.5 rounded-lg border border-dashboard-border bg-white
 text-dashboard-text-primary placeholder:text-dashboard-text-muted
 focus:outline-none focus:ring-2 focus:ring-dashboard-primary/20 
 focus:border-dashboard-primary transition-all duration-200'
```

### 5.5 侧边栏导航

```jsx
// 菜单项样式 - 默认
'flex items-center gap-3 px-4 py-2.5 rounded-lg text-dashboard-sidebar-text
 hover:bg-dashboard-sidebar-active hover:text-white transition-colors duration-200'

// 菜单项样式 - 激活
'flex items-center gap-3 px-4 py-2.5 rounded-lg bg-dashboard-sidebar-active
 text-white font-medium'

// 分组标题
'px-4 py-2 text-xs font-semibold text-dashboard-text-muted uppercase tracking-wider'
```

---

## 6. 布局系统

### 6.1 后台布局 (Layout)

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌─────────────────────────────────────┐  │
│  │          │  │  Search                    [🔔][👤] │  │
│  │  Sidebar │  ├─────────────────────────────────────┤  │
│  │  (dark)  │  │                                     │  │
│  │          │  │  ┌───────────────────────────────┐  │  │
│  │  🏠 Dashboard │  │  Dashboard                    │  │  │
│  │  📝 Posts     │  │  Welcome back...              │  │  │
│  │  🏷️ Categories│  │                               │  │  │
│  │  🖼️ Images    │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ │  │  │
│  │  ⚙️ Settings  │  │  │Card│ │Card│ │Card│ │Card│ │  │  │
│  │               │  │  └────┘ └────┘ └────┘ └────┘ │  │  │
│  │  ─────────    │  │                               │  │  │
│  │  📊 Analytics │  │  ┌───────────────────────┐   │  │  │
│  │  💼 eCommerce │  │  │    Content Area       │   │  │  │
│  │               │  │  └───────────────────────┘   │  │  │
│  └──────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**结构**:
- 左侧深色固定侧边栏 (240px)
- 右侧主内容区，可滚动
- 顶部固定 Header，含搜索和用户操作

### 6.2 首页布局 (Home)

两种展示模式：

**卡片模式**:
```
┌─────────────────────────────────────────────────────────┐
│  Logo  Search...                        [分类筛选]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ 封面图      │  │ 封面图      │  │ 封面图      │     │
│  │             │  │             │  │             │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │ 标题        │  │ 标题        │  │ 标题        │     │
│  │ 摘要...     │  │ 摘要...     │  │ 摘要...     │     │
│  │ 分类 · 时间 │  │ 分类 · 时间 │  │ 分类 · 时间 │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**列表模式**:
```
┌─────────────────────────────────────────────────────────┐
│  标题 1                                      2024-01-01 │
│  摘要预览文字...                                        │
│  分类 · 标签1 · 标签2                          👁 128    │
├─────────────────────────────────────────────────────────┤
│  标题 2                                      2024-01-01 │
│  摘要预览文字...                                        │
│  分类 · 标签1 · 标签2                          👁 256    │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 动效规范

### 7.1 过渡时间

```css
transition-all duration-150  /* 按钮、链接 */
transition-all duration-200  /* 卡片、阴影 */
transition-all duration-300  /* 页面切换、侧边栏 */
```

### 7.2 交互模式

**按钮悬停**:
- 背景色加深
- 轻微阴影增强
- 平滑过渡 200ms

**卡片悬停**:
```css
hover:shadow-card-hover hover:-translate-y-0.5
transition-all duration-200
```

**侧边栏菜单**:
- 默认: 灰色文字
- 悬停: 白色文字 + 深色背景
- 激活: 白色文字 + 更深的背景

**页面加载**:
- 内容区域淡入
- 卡片依次出现 (stagger 100ms)

---

## 8. 响应式设计

### 8.1 断点

使用 Tailwind 默认断点：
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 8.2 适配规则

| 元素 | 桌面端 | 平板 | 手机 |
|------|--------|------|------|
| 侧边栏 | 固定显示 240px | 可折叠 | 隐藏/汉堡菜单 |
| 文章网格 | 3列 | 2列 | 1列 |
| 统计卡片 | 4列 | 2列 | 1列 |
| 卡片内边距 | `p-6` | `p-5` | `p-4` |
| 标题字号 | `text-2xl` | `text-xl` | `text-lg` |

---

## 9. 技术栈

### 9.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| React Router | 6.x | 路由管理 |
| Tailwind CSS | 3.x | 样式系统 |
| Lucide React | latest | 图标库 |
| Recharts | latest | 数据图表 (可选) |

### 9.2 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | latest | Web 框架 |
| SQLAlchemy | 2.x | ORM |
| SQLite | 3.x | 数据库 |
| Pydantic | 2.x | 数据验证 |
| JWT | latest | 认证 |

---

## 10. 文件结构

```
personal-blog/
├── DESIGN.md                    # Neobrutalism 设计文档
├── DESIGN_MODERN.md            # 本文档 (Modern Dashboard)
├── backend/                    # FastAPI 后端
│   ├── app.py                 # 主入口
│   ├── models.py              # 数据库模型
│   ├── database.py            # 数据库连接
│   └── routers/               # API 路由
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── components/        # 通用组件
│   │   ├── pages/             # 页面组件
│   │   ├── styles/            # 主题配置
│   │   │   ├── themes/        # 主题文件
│   │   │   │   ├── neobrutalism.js
│   │   │   │   └── modern.js
│   │   │   └── index.js
│   │   └── api/
│   └── tailwind.config.js     # Tailwind 配置
└── uploads/
```

---

## 11. 主题切换实现建议

### 11.1 切换方案

**方案 A: CSS 变量切换 (推荐)**

```css
/* styles/themes/neobrutalism.css */
:root[data-theme="neobrutalism"] {
  --color-bg: #FEF9E7;
  --color-card: #FFFFFF;
  --color-primary: #FF6B9D;
  --border-width: 2px;
  --border-radius: 0px;
  --shadow: 4px 4px 0px 0px rgba(0,0,0,1);
}

/* styles/themes/modern.css */
:root[data-theme="modern"] {
  --color-bg: #F8FAFC;
  --color-card: #FFFFFF;
  --color-primary: #10B981;
  --border-width: 1px;
  --border-radius: 0.75rem;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
```

**方案 B: Tailwind 配置切换**

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 根据主题动态加载
      }
    }
  }
}
```

### 11.2 存储与切换

```javascript
// 主题切换逻辑
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('theme') || 'neobrutalism'
})

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
}, [theme])
```

### 11.3 后台切换界面

在设置页面添加主题选择器：

```jsx
<div className="space-y-4">
  <h3>界面主题</h3>
  <div className="flex gap-4">
    <button 
      onClick={() => setTheme('neobrutalism')}
      className={theme === 'neobrutalism' ? 'active' : ''}
    >
      <div className="w-20 h-16 bg-[#FEF9E7] border-2 border-black" />
      <span>新粗野主义</span>
    </button>
    <button 
      onClick={() => setTheme('modern')}
      className={theme === 'modern' ? 'active' : ''}
    >
      <div className="w-20 h-16 bg-[#0F172A] rounded-lg" />
      <span>现代仪表盘</span>
    </button>
  </div>
</div>
```

---

## 12. 参考资源

- [Apex Dashboard](https://apex-dashboard.pages.dev/) - 设计参考
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [Inter Font](https://rsms.me/inter/)

---

## 13. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-18 | v1.0 | 初始版本，基于 Apex Dashboard |

---

*本文档为 Modern Dashboard 风格设计规范，可与 Neobrutalism 风格并存，通过主题切换实现。*
