# Personal Blog 设计系统文档

> **设计风格**: 新粗野主义 (Neobrutalism)  
> **参考来源**: [Slock.ai](https://slock.ai/)  
> **版本**: v1.0  
> **更新日期**: 2026-04-06  
> **文档状态**: 历史设计文档（访客端早期设计稿），实际实现以源码及 `01/02/03` 文档为准。

---

## 1. 设计理念

### 1.1 什么是新粗野主义？

新粗野主义 (Neobrutalism) 是一种现代网页设计风格，特点包括：

- **高对比度**: 黑色粗边框 + 明亮背景色
- **硬阴影**: 明显的偏移阴影营造立体感
- **大胆排版**: 粗体文字、大字号标题
- **鲜艳色彩**: 使用高饱和度的强调色
- **无圆角**: 直角设计，拒绝圆润
- **交互反馈**: 按钮点击时有明显的位移效果

### 1.2 与 Slock.ai 的对比

| 特性 | Slock.ai | 我们的博客 |
|------|----------|-----------|
| 主背景色 | `#FFFFFF` 纯白 | `#FEF9E7` 奶油色 |
| 边框风格 | 2px 纯黑 | 2px 纯黑 |
| 阴影效果 | 4px 硬阴影 | 4px 硬阴影 |
| 强调色 | 粉色、紫色、青色 | 粉色、青色、黄色、绿色 |
| 布局风格 | 卡片式网格 | 卡片式/列表式可选 |
| 交互反馈 | 点击位移 | 点击位移 + 阴影消失 |

---

## 2. 色彩系统

### 2.1 主色调

```javascript
// tailwind.config.js
colors: {
  'brutal': {
    'cream': '#FEF9E7',    // 主背景色 - 温暖奶油色
    'yellow': '#FFDE59',   // 强调色 - 明黄
    'pink': '#FF6B9D',     // 强调色 - 粉红 (主按钮)
    'cyan': '#00D9FF',     // 强调色 - 青色 (次要按钮)
    'lavender': '#C084FC', // 强调色 - 薰衣草紫
    'green': '#4ADE80',    // 强调色 - 鲜绿 (成功状态)
  }
}
```

### 2.2 使用规范

| 颜色 | 用途 |
|------|------|
| `brutal-cream` | 页面背景、卡片背景 |
| `brutal-pink` | 主按钮、主要操作、醒目标题 |
| `brutal-cyan` | 次要按钮、链接、信息提示 |
| `brutal-yellow` | 警告按钮、高亮文字、选中状态 |
| `brutal-green` | 成功状态、确认按钮 |
| `brutal-lavender` | 装饰元素、标签背景 |
| `black` | 文字、边框、阴影 |
| `white` | 卡片背景、输入框背景 |

---

## 3. 排版系统

### 3.1 字体

```javascript
fontFamily: {
  'display': ['system-ui', '-apple-system', 'sans-serif'],
}
```

- 使用系统字体栈，确保跨平台一致性
- 无需加载外部字体，提升性能

### 3.2 字号规范

| 元素 | 字号 | 字重 | 用途 |
|------|------|------|------|
| 页面标题 | `text-2xl` (24px) | `font-bold` (700) | 后台页面标题栏 |
| 卡片标题 | `text-lg` (18px) | `font-bold` (700) | 文章卡片标题 |
| 正文 | `text-sm` (14px) | `font-normal` (400) | 段落文字 |
| 小字 | `text-xs` (12px) | `font-medium` (500) | 标签、时间戳 |
| 按钮文字 | `text-sm`/`text-xs` | `font-bold` (700) | 按钮内文字 |

---

## 4. 阴影系统

### 4.1 阴影定义

```javascript
boxShadow: {
  'brutal': '4px 4px 0px 0px rgba(0,0,0,1)',    // 标准阴影
  'brutal-sm': '2px 2px 0px 0px rgba(0,0,0,1)',  // 小阴影
  'brutal-lg': '6px 6px 0px 0px rgba(0,0,0,1)',  // 大阴影
}
```

### 4.2 使用场景

| 阴影 | 用途 |
|------|------|
| `shadow-brutal-lg` | 登录卡片、模态框 |
| `shadow-brutal` | 标准卡片、按钮（默认状态） |
| `shadow-brutal-sm` | 输入框、小按钮、标签 |
| `shadow-none` | 按钮（悬停/点击状态） |

---

## 5. 组件规范

### 5.1 按钮 (Button)

```jsx
// 基础样式
const baseClasses = 'inline-flex items-center justify-center font-bold 
  transition-all duration-150 border-2 border-black'

// 变体
primary:   'bg-brutal-pink text-black shadow-brutal ...'
secondary: 'bg-brutal-cyan text-black shadow-brutal ...'
success:   'bg-brutal-green text-black shadow-brutal ...'
warning:   'bg-brutal-yellow text-black shadow-brutal ...'
danger:    'bg-red-500 text-white shadow-brutal ...'
outline:   'bg-white text-black shadow-brutal-sm ...'

// 尺寸
sm: 'px-3 py-1.5 text-xs'
md: 'px-4 py-2 text-sm'
lg: 'px-6 py-3 text-base'
```

**交互效果**:
- 默认: 有阴影，无位移
- 悬停: `hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`
- 点击: `active:translate-x-[4px] active:translate-y-[4px]`

### 5.2 卡片 (Card)

```jsx
// 基础样式
'bg-white border-2 border-black shadow-brutal'

// 内边距选项
none: ''
small: 'p-3'
normal: 'p-4'
large: 'p-6'
```

**结构组件**:
- `CardHeader`: 带底部边框的头部区域
- `CardTitle`: 粗体标题
- `CardContent`: 内容区域

### 5.3 输入框 (Input)

```jsx
// 样式
'w-full px-3 py-2 border-2 border-black bg-white 
 focus:outline-none focus:ring-2 focus:ring-brutal-yellow
 placeholder:text-black/40'
```

### 5.4 导航

```jsx
// 导航链接 - 默认
'px-3 py-1 font-bold text-sm border-2 border-transparent
 hover:border-black hover:bg-white transition-all duration-150'

// 导航链接 - 激活状态
'px-3 py-1 font-bold text-sm border-2 border-black bg-brutal-yellow'
```

---

## 6. 布局系统

### 6.1 后台布局 (Layout)

```
┌─────────────────────────────────────────────┐
│  Sidebar  │  Header (标题 + 操作按钮)        │
│           ├─────────────────────────────────┤
│  导航菜单  │                                 │
│           │                                 │
│  📁 文章   │      Content Area              │
│  🏷️ 分类   │      (可滚动内容区域)            │
│  🖼️ 图片   │                                 │
│  ⚙️ 设置   │                                 │
│           │                                 │
└───────────┴─────────────────────────────────┘
```

**结构**:
- 左侧固定侧边栏 (Sidebar)
- 右侧主内容区
- 顶部标题栏带操作按钮区域

### 6.2 首页布局 (Home)

两种展示模式：

**卡片模式 (Card)**:
```
┌──────────────────────────────────────────┐
│  🏠 博客名称          🔍 分类筛选器        │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ 文章卡片  │  │ 文章卡片  │  │文章卡片 │ │
│  │          │  │          │  │        │ │
│  └──────────┘  └──────────┘  └────────┘ │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ 文章卡片  │  │ 文章卡片  │             │
│  └──────────┘  └──────────┘             │
│                                          │
└──────────────────────────────────────────┘
```

**列表模式 (List)**:
```
┌──────────────────────────────────────────┐
│  文章标题 1 .................... 2024-01 │
├──────────────────────────────────────────┤
│  文章标题 2 .................... 2024-01 │
├──────────────────────────────────────────┤
│  文章标题 3 .................... 2024-01 │
└──────────────────────────────────────────┘
```

---

## 7. 动效规范

### 7.1 过渡时间

```css
transition-all duration-150  /* 按钮、链接 */
transition-all duration-200  /* 卡片悬停 */
transition-all duration-300  /* 页面切换 */
```

### 7.2 交互模式

**按钮点击**:
1. 默认: 阴影 `4px 4px 0px black`
2. 悬停: 阴影消失，元素右下移 2px
3. 点击: 元素继续右下移 4px

**卡片悬停**:
```css
hover:shadow-brutal-lg hover:-translate-y-1
```

**页面过渡**:
使用 React Router 的默认过渡，无需额外动画。

---

## 8. 自定义样式

### 8.1 滚动条

```css
/* 自定义滚动条 - 新粗野主义风格 */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: #FEF9E7;
  border-left: 2px solid black;
}

::-webkit-scrollbar-thumb {
  background: #000;
  border: 2px solid #FEF9E7;
}
```

### 8.2 文字选中

```css
::selection {
  background: #FFDE59;  /* 黄色高亮 */
  color: #000;
}
```

---

## 9. 响应式设计

### 9.1 断点

使用 Tailwind 默认断点：
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 9.2 适配规则

| 元素 | 桌面端 | 平板 | 手机 |
|------|--------|------|------|
| 侧边栏 | 固定显示 | 可折叠 | 隐藏/汉堡菜单 |
| 文章网格 | 3列 | 2列 | 1列 |
| 卡片内边距 | `p-6` | `p-4` | `p-3` |
| 标题字号 | `text-2xl` | `text-xl` | `text-lg` |

---

## 10. 技术栈

### 10.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| React Router | 6.x | 路由管理 |
| Tailwind CSS | 3.x | 样式系统 |
| react-markdown | latest | Markdown 渲染 |

### 10.2 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | latest | Web 框架 |
| SQLAlchemy | 2.x | ORM |
| SQLite | 3.x | 数据库 |
| Pydantic | 2.x | 数据验证 |
| JWT | latest | 认证 |

### 10.3 部署

- 前端: 静态文件通过 Nginx  serving
- 后端: Systemd 服务管理
- 端口: 8888 (前端), 8889 (后端)

---

## 11. 文件结构

```
personal-blog/
├── DESIGN.md                 # 本文档
├── backend/                  # FastAPI 后端
│   ├── app.py               # 主入口
│   ├── models.py            # 数据库模型
│   ├── database.py          # 数据库连接
│   └── routers/             # API 路由
│       ├── auth.py          # 认证
│       ├── posts.py         # 文章
│       ├── categories.py    # 分类
│       ├── images.py        # 图片
│       ├── settings.py      # 设置
│       └── crawl.py         # 文章采集
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   │   ├── Button.jsx   # 按钮组件
│   │   │   ├── Card.jsx     # 卡片组件
│   │   │   ├── Input.jsx    # 输入组件
│   │   │   ├── Layout.jsx   # 布局组件
│   │   │   └── Sidebar.jsx  # 侧边栏
│   │   ├── pages/           # 页面组件
│   │   │   ├── Home.jsx     # 访客首页
│   │   │   ├── PostDetail.jsx # 文章详情
│   │   │   ├── Login.jsx    # 登录页
│   │   │   ├── Dashboard.jsx # 后台首页
│   │   │   ├── Posts.jsx    # 文章管理
│   │   │   └── admin/       # 管理页面
│   │   ├── api/             # API 封装
│   │   ├── index.css        # 全局样式
│   │   └── main.jsx         # 入口
│   └── tailwind.config.js   # Tailwind 配置
└── uploads/                  # 上传文件目录
```

---

## 12. 扩展建议

### 12.1 短期优化

1. **代码高亮**: 添加 Prism.js 或 highlight.js 支持代码高亮
2. **暗色模式**: 考虑添加暗色主题切换
3. **动画增强**: 添加页面加载动画、列表进入动画
4. **搜索功能**: 添加文章搜索功能

### 12.2 长期规划

1. **主题市场**: 支持多套主题切换
2. **插件系统**: 允许第三方插件扩展
3. **统计分析**: 添加访问统计面板
4. **多语言**: i18n 国际化支持

---

## 13. 参考资源

- [Slock.ai](https://slock.ai/) - 新粗野主义设计参考
- [Neobrutalism.dev](https://neobrutalism.dev/) - 组件库参考
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [React 文档](https://react.dev/)
- [FastAPI 文档](https://fastapi.tiangolo.com/)

---

## 14. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-06 | v1.0 | 初始版本，整合 Slock.ai 风格 |

---

*本文档由 AI 助手生成，如有疑问请联系维护人员。*
