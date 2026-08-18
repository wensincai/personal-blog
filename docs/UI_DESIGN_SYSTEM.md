# Personal Blog - UI 设计规范

> **文档类型**: 设计系统 (Design System)  
> **适用范围**: Admin Dashboard 后台管理  
> **版本**: v1.0  
> **更新日期**: 2026-04-19  
> **文档状态**: 历史设计规范（早期版本），实际实现以源码及 `01/02/03` 文档为准。

---

## 目录

1. [设计原则](#1-设计原则)
2. [色彩系统](#2-色彩系统)
3. [排版系统](#3-排版系统)
4. [间距系统](#4-间距系统)
5. [阴影与圆角](#5-阴影与圆角)
6. [组件规范](#6-组件规范)
7. [布局规范](#7-布局规范)
8. [动效规范](#8-动效规范)
9. [图标规范](#9-图标规范)
10. [响应式规范](#10-响应式规范)

---

## 1. 设计原则

### 1.1 核心原则

| 原则 | 描述 | 实践方式 |
|------|------|---------|
| **清晰 (Clarity)** | 信息层级明确，用户一眼找到重点 | 足够的对比度、合理的留白 |
| **效率 (Efficiency)** | 减少操作步骤，提高工作流效率 | 快捷操作、批量处理 |
| **一致 (Consistency)** | 相同元素表现一致，降低学习成本 | 统一的组件、颜色、间距 |
| **反馈 (Feedback)** | 操作后有明确的状态反馈 | Toast、Loading、过渡动画 |

### 1.2 设计价值观

- **内容优先**: 界面服务于内容，而非干扰
- **克制美学**: 减少不必要的装饰，保持专业感
- **渐进披露**: 复杂功能分层展示，避免信息过载

---

## 2. 色彩系统

### 2.1 色彩层级

```
┌─────────────────────────────────────────────────────────┐
│                    色彩层级金字塔                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    ▲ 强调色                              │
│                   ╱ ╲    10% (主按钮、链接)               │
│                  ╱   ╲                                  │
│                 ▲ 主色                                 │
│                ╱ ╲      20% (交互元素、状态)              │
│               ╱   ╲                                     │
│              ▲ 文字色                                  │
│             ╱ ╲        30% (标题、正文)                  │
│            ╱   ╲                                        │
│           ▲ 背景色                                     │
│          ╱   ╲       40% (页面、卡片背景)                │
│         ╱     ╲                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 主色板

#### 主色调 (Primary)

| 色值 | 名称 | 用途 |
|------|------|------|
| `#10B981` | Primary | 主按钮、主链接、强调 |
| `#059669` | Primary Hover | 悬停状态 |
| `#D1FAE5` | Primary Light | 图标背景、标签背景 |
| `#ECFDF5` | Primary Subtle | 选中状态背景 |

#### 侧边栏色 (Sidebar)

| 色值 | 名称 | 用途 |
|------|------|------|
| `#0F172A` | Sidebar BG | 侧边栏背景 |
| `#1E293B` | Sidebar Hover | 菜单项悬停 |
| `#334155` | Sidebar Active | 当前选中项 |
| `#94A3B8` | Sidebar Text | 默认文字 |
| `#FFFFFF` | Sidebar Text Active | 选中文字 |

#### 中性色 (Neutral)

| 色值 | 名称 | 用途 |
|------|------|------|
| `#0F172A` | Text Primary | 主要文字、标题 |
| `#64748B` | Text Secondary | 次要文字、描述 |
| `#94A3B8` | Text Muted | 弱化文字、占位符 |
| `#E2E8F0` | Border | 分割线、边框 |
| `#F8FAFC` | BG Main | 主背景 |
| `#FFFFFF` | BG Card | 卡片背景 |

#### 功能色 (Functional)

| 色值 | 名称 | 用途 |
|------|------|------|
| `#10B981` | Success | 成功、增长 |
| `#F59E0B` | Warning | 警告、提示 |
| `#EF4444` | Danger | 错误、删除 |
| `#3B82F6` | Info | 信息、提示 |

### 2.3 色彩使用规则

```
✅ 正确用法:
- 主色仅用于主要操作按钮和重要链接
- 功能色用于状态指示和反馈
- 文字色保持 3 个层级以内

❌ 错误用法:
- 同一页面使用超过 3 种强调色
- 正文使用纯黑 (#000000)
- 边框颜色过深，喧宾夺主
```

### 2.4 对比度要求

| 场景 | 最小对比度 | 推荐对比度 |
|------|-----------|-----------|
| 正文文字 | 4.5:1 | 7:1 |
| 大号文字 | 3:1 | 4.5:1 |
| 图标 | 3:1 | 4.5:1 |
| 按钮 | 3:1 | 4.5:1 |

---

## 3. 排版系统

### 3.1 字体族

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

- **主要**: Inter (现代、清晰、专业)
- **后备**: 系统字体栈

### 3.2 字号规范

| 名称 | 类名 | 尺寸 | 行高 | 字重 | 用途 |
|------|------|------|------|------|------|
| Display | `text-3xl` | 30px | 36px | 700 | 大数字展示 |
| H1 | `text-2xl` | 24px | 32px | 600 | 页面标题 |
| H2 | `text-xl` | 20px | 28px | 600 | 区块标题 |
| H3 | `text-lg` | 18px | 28px | 500 | 卡片标题 |
| Body | `text-base` | 16px | 24px | 400 | 正文 |
| Body Sm | `text-sm` | 14px | 20px | 400 | 次要正文 |
| Caption | `text-xs` | 12px | 16px | 500 | 标签、辅助 |

### 3.3 字重使用

| 字重 | 数值 | 用途 |
|------|------|------|
| Regular | 400 | 正文、描述 |
| Medium | 500 | 按钮、标签、导航 |
| Semibold | 600 | 标题、重要文字 |
| Bold | 700 | 大数字、强调 |

### 3.4 排版规则

```
标题规范:
- 页面标题: text-2xl font-semibold
- 卡片标题: text-lg font-semibold
- 表单标签: text-sm font-medium

正文规范:
- 主要文字: text-base text-admin-text-primary
- 次要文字: text-sm text-admin-text-secondary
- 辅助文字: text-xs text-admin-text-muted

行高规则:
- 标题: 行高 = 1.25 × 字号
- 正文: 行高 = 1.5 × 字号
- 紧凑: 行高 = 1.25 × 字号
```

---

## 4. 间距系统

### 4.1 间距 Token

| Token | 值 | 用途 |
|-------|-----|------|
| `space-1` | 4px | 图标与文字间距 |
| `space-2` | 8px | 紧凑内边距、小间隙 |
| `space-3` | 12px | 按钮内边距、列表项间距 |
| `space-4` | 16px | 标准内边距、卡片间距 |
| `space-6` | 24px | 区块间距、大内边距 |
| `space-8` | 32px | 页面级间距 |
| `space-10` | 40px | 大区块分隔 |
| `space-12` | 48px | 章节间距 |

### 4.2 组件间距

| 组件 | 内边距 | 外边距 |
|------|--------|--------|
| 按钮 (sm) | px-3 py-1.5 | - |
| 按钮 (md) | px-4 py-2 | - |
| 按钮 (lg) | px-6 py-2.5 | - |
| 卡片 | p-6 | mb-6 |
| 卡片头部 | px-6 py-4 | - |
| 卡片内容 | px-6 py-4 | - |
| 表单输入框 | px-4 py-2.5 | mb-4 |
| 表格行 | px-6 py-4 | - |

### 4.3 布局间距

```
页面布局:
├── 主内容区: p-6 (24px)
├── 区块间距: space-y-6 (24px)
├── 卡片网格: gap-6 (24px)
└── 卡片内部: space-y-4 (16px)

表单布局:
├── 表单区块: space-y-6 (24px)
├── 表单项: space-y-1.5 (6px)
├── 标签与输入: 间距 6px
└── 按钮组: gap-3 (12px)
```

---

## 5. 阴影与圆角

### 5.1 阴影规范

| 名称 | 值 | 用途 |
|------|-----|------|
| `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | 输入框、小按钮 |
| `shadow` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)` | 标准卡片 |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)` | 悬停卡片 |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)` | 下拉菜单、模态框 |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)` | 特殊强调 |

### 5.2 阴影使用场景

```
✅ 使用阴影:
- 卡片组件: shadow (默认), shadow-md (悬停)
- 下拉菜单: shadow-lg
- 模态框: shadow-lg
- Toast 通知: shadow-lg
- 按钮: shadow-sm (主按钮)

❌ 避免阴影:
- 输入框 (使用 border 代替)
- 分割线
- 纯文本元素
```

### 5.3 圆角规范

| Token | 值 | 用途 |
|-------|-----|------|
| `rounded-sm` | 6px | 小按钮、标签 |
| `rounded` | 8px | 标准按钮、输入框、小卡片 |
| `rounded-lg` | 12px | 卡片、模态框 |
| `rounded-xl` | 16px | 大卡片、特殊组件 |
| `rounded-full` | 50% | 头像、圆形按钮 |

### 5.4 圆角使用规则

```
组件圆角:
├── 按钮 (sm): rounded-md (6px)
├── 按钮 (md/lg): rounded-lg (8px)
├── 卡片: rounded-xl (12px)
├── 输入框: rounded-lg (8px)
├── 下拉菜单: rounded-lg (8px)
├── 模态框: rounded-xl (12px)
├── 头像: rounded-full
└── Toast: rounded-lg (8px)
```

---

## 6. 组件规范

### 6.1 按钮 (Button)

#### 变体规范

```
Primary (主按钮):
├── 背景: bg-admin-primary (#10B981)
├── 文字: text-white
├── 悬停: bg-admin-primary-hover (#059669)
├── 阴影: shadow-sm
└── 用途: 主要操作、保存、提交

Secondary (次按钮):
├── 背景: bg-white
├── 边框: border border-admin-border
├── 文字: text-admin-text-primary
├── 悬停: bg-gray-50
└── 用途: 次要操作、取消

Ghost (幽灵按钮):
├── 背景: transparent
├── 文字: text-admin-text-secondary
├── 悬停: bg-gray-100 text-admin-text-primary
└── 用途: 低优先级操作、图标按钮

Danger (危险按钮):
├── 背景: bg-admin-danger (#EF4444)
├── 文字: text-white
├── 悬停: bg-red-600
└── 用途: 删除、危险操作
```

#### 尺寸规范

| 尺寸 | 内边距 | 字号 | 圆角 | 用途 |
|------|--------|------|------|------|
| sm | px-3 py-1.5 | text-xs | rounded-md | 表格内、紧凑布局 |
| md | px-4 py-2 | text-sm | rounded-lg | 标准按钮 |
| lg | px-6 py-2.5 | text-base | rounded-lg | 强调操作 |

#### 状态规范

```
默认状态:
- 正常显示

悬停状态:
- 背景色加深
- 阴影增强
- 过渡时间: 200ms

点击状态:
- 轻微下沉 (transform: translateY(1px))
- 过渡时间: 100ms

禁用状态:
- opacity: 0.5
- cursor: not-allowed
- 无交互效果

加载状态:
- 显示 Loading 图标
- 禁用点击
```

### 6.2 输入框 (Input)

#### 基础样式

```
默认状态:
├── 背景: bg-white
├── 边框: border border-admin-border
├── 圆角: rounded-lg
├── 内边距: px-4 py-2.5
├── 文字: text-admin-text-primary
└── 占位符: placeholder:text-admin-text-muted

聚焦状态:
├── 边框: border-admin-primary
├── 阴影: ring-2 ring-admin-primary/20
└── 过渡: transition-all duration-200

错误状态:
├── 边框: border-admin-danger
├── 阴影: ring-2 ring-red-200
└── 错误文字: text-sm text-admin-danger
```

#### 尺寸规范

| 尺寸 | 内边距 | 高度 | 用途 |
|------|--------|------|------|
| sm | px-3 py-2 | 36px | 紧凑表单 |
| md | px-4 py-2.5 | 42px | 标准输入 |
| lg | px-4 py-3 | 48px | 强调输入 |

### 6.3 卡片 (Card)

#### 结构规范

```
Card:
├── 背景: bg-white
├── 圆角: rounded-xl (12px)
├── 阴影: shadow
├── 边框: border border-admin-border
└── 内边距: 根据内容调整

CardHeader:
├── 下边框: border-b border-admin-border
├── 内边距: px-6 py-4
├── 标题: text-lg font-semibold
└── 描述: text-sm text-admin-text-secondary

CardContent:
└── 内边距: px-6 py-4

CardFooter:
├── 上边框: border-t border-admin-border
├── 背景: bg-gray-50
├── 圆角: rounded-b-xl
└── 内边距: px-6 py-4
```

#### 变体规范

```
标准卡片:
- shadow
- hover:shadow-md (可选)

扁平卡片:
- shadow-none
- bg-gray-50

强调卡片:
- border-admin-primary/30
- bg-admin-primary-subtle
```

### 6.4 表格 (Table)

#### 结构规范

```
Table:
├── 背景: bg-white
├── 圆角: rounded-xl
├── 阴影: shadow
└── overflow: hidden

TableHead:
├── 背景: bg-gray-50
├── 下边框: border-b border-admin-border
└── 文字: text-xs font-semibold uppercase

TableRow:
├── 下边框: border-b border-admin-border
└── 悬停: bg-gray-50

TableCell:
├── 内边距: px-6 py-4
├── 表头: text-admin-text-secondary
└── 内容: text-admin-text-primary
```

#### 行高规范

| 密度 | 内边距 | 用途 |
|------|--------|------|
| 紧凑 | px-4 py-3 | 数据量大时 |
| 标准 | px-6 py-4 | 默认 |
| 宽松 | px-6 py-5 | 强调行 |

### 6.5 标签 (Tag/Badge)

#### 变体规范

```
Primary:
├── 背景: bg-admin-primary-light
├── 文字: text-admin-primary
└── 圆角: rounded-full

Success:
├── 背景: bg-green-100
├── 文字: text-green-700
└── 圆角: rounded-full

Warning:
├── 背景: bg-amber-100
├── 文字: text-amber-700
└── 圆角: rounded-full

Danger:
├── 背景: bg-red-100
├── 文字: text-red-700
└── 圆角: rounded-full

Secondary:
├── 背景: bg-gray-100
├── 文字: text-gray-700
└── 圆角: rounded-full
```

#### 尺寸规范

| 尺寸 | 内边距 | 字号 | 用途 |
|------|--------|------|------|
| sm | px-2 py-0.5 | text-xs | 表格内、紧凑 |
| md | px-2.5 py-1 | text-xs | 默认 |
| lg | px-3 py-1 | text-sm | 强调 |

---

## 7. 布局规范

### 7.1 页面布局

```
┌─────────────────────────────────────────────┐
│ Sidebar (240px) │ Main Content (flex-1)     │
│                 │                             │
│  Logo           │  Header (64px)              │
│                 │  ────────────────────────   │
│  Navigation     │                             │
│                 │  Page Header                │
│  ───────────    │  ────────────────────────   │
│                 │                             │
│  User Profile   │  Content Area               │
│                 │                             │
└─────────────────────────────────────────────┘
```

### 7.2 网格系统

#### 统计卡片网格

```
桌面端 (lg+):
- grid-cols-4
- gap-6

平板端 (md):
- grid-cols-2
- gap-6

移动端:
- grid-cols-1
- gap-4
```

#### 内容网格

```
两栏布局:
├── 左侧: w-2/3 (主要内容)
└── 右侧: w-1/3 (侧边栏)

表单布局:
├── 单列: max-w-2xl mx-auto
├── 双列: grid-cols-2 gap-6
└── 三列: grid-cols-3 gap-6
```

### 7.3 内容区域

| 区域 | 最大宽度 | 对齐 | 用途 |
|------|---------|------|------|
| 全宽 | 100% | - | 表格、Dashboard |
| 适中 | max-w-4xl (896px) | mx-auto | 表单页面 |
| 窄 | max-w-2xl (672px) | mx-auto | 设置页面 |

---

## 8. 动效规范

### 8.1 过渡时间

| 时长 | 用途 |
|------|------|
| 100ms | 按钮点击、快速反馈 |
| 150ms | 颜色变化、透明度 |
| 200ms | 阴影、边框、transform |
| 300ms | 页面切换、模态框 |
| 500ms | Toast 进入/退出 |

### 8.2 缓动函数

```css
/* 标准 */
transition-timing-function: ease-in-out;

/* 进入 */
transition-timing-function: cubic-bezier(0, 0, 0.2, 1);

/* 退出 */
transition-timing-function: cubic-bezier(0.4, 0, 1, 1);

/* 弹性 */
transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### 8.3 常用动效

#### 按钮悬停

```css
transition: all 200ms ease-in-out;
/* 悬停: 背景色变深 + 阴影增强 */
```

#### 卡片悬停

```css
transition: all 200ms ease-in-out;
/* 悬停: shadow → shadow-md + translateY(-2px) */
```

#### Toast 进入

```css
animation: slideIn 300ms cubic-bezier(0, 0, 0.2, 1);
/* 从右侧滑入 + 淡入 */
```

#### 模态框进入

```css
animation: modalIn 200ms cubic-bezier(0, 0, 0.2, 1);
/* 淡入 + 轻微缩放 */
```

### 8.4 性能优化

```
✅ 性能友好:
- transform (位移、缩放)
- opacity (淡入淡出)
- will-change (提前声明)

❌ 避免使用:
- width/height 动画
- top/left 动画
- box-shadow 大范围变化
```

---

## 9. 图标规范

### 9.1 图标库

- **主要**: [Lucide React](https://lucide.dev/)
- **风格**: 线性图标 (outline)
- **线宽**: 2px
- **端点**: 圆角

### 9.2 图标尺寸

| 尺寸 | 值 | 用途 |
|------|-----|------|
| xs | 14px | 内联文字 |
| sm | 16px | 按钮、表单 |
| md | 20px | 导航菜单 |
| lg | 24px | 独立图标 |
| xl | 32px | 空状态、强调 |

### 9.3 图标使用规则

```
图标 + 文字:
├── 间距: gap-2 (8px)
├── 图标位置: 文字左侧 (默认)
└── 对齐: items-center

图标按钮:
├── 尺寸: p-2 (按钮整体)
├── 图标: w-4 h-4 或 w-5 h-5
└── 圆角: rounded-lg

独立图标:
└── 尺寸: w-6 h-6 或更大
```

---

## 10. 响应式规范

### 10.1 断点定义

| 断点 | 宽度 | 设备 |
|------|------|------|
| sm | 640px | 大手机 |
| md | 768px | 平板 |
| lg | 1024px | 小桌面 |
| xl | 1280px | 桌面 |
| 2xl | 1536px | 大桌面 |

### 10.2 响应式规则

#### 侧边栏

```
桌面端 (lg+):
├── 固定显示
├── 宽度: 240px
└── 位置: fixed left-0

平板/移动端 (< lg):
├── 默认隐藏
├── 触发: 汉堡菜单
└── 遮罩: 半透明背景
```

#### 统计卡片

```
桌面端: grid-cols-4
平板端: grid-cols-2
移动端: grid-cols-1
```

#### 表格

```
桌面端: 完整显示
移动端: 
├── 横向滚动
└── 或卡片式重构
```

### 10.3 触摸优化

```
最小点击区域:
├── 按钮: 44px × 44px
├── 图标按钮: 40px × 40px
└── 列表项: 48px 高度

间距调整:
├── 移动端增加间距
└── 按钮尺寸增大
```

---

## 11. 设计检查清单

### 11.1 新建组件检查

- [ ] 颜色使用设计系统 token
- [ ] 间距使用标准 spacing
- [ ] 字号符合排版规范
- [ ] 圆角统一为 8px/12px
- [ ] 阴影符合层级规范
- [ ] 包含所有状态样式 (默认/悬停/禁用)
- [ ] 过渡动画 150-200ms
- [ ] 支持响应式适配

### 11.2 代码审查检查

- [ ] 无硬编码颜色值
- [ ] 无硬编码间距值
- [ ] 可访问性达标 (对比度)
- [ ] 键盘导航支持
- [ ] 屏幕阅读器友好

---

## 12. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-19 | v1.0 | 初始版本，完整的 UI 设计规范 |

---

*本文档为 Personal Blog Admin Dashboard 的 UI 设计规范，所有组件和页面应遵循此规范进行设计和开发。*
