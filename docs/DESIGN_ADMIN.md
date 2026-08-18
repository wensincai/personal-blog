# Personal Blog - Admin Dashboard UI 设计与实现文档

> **设计风格**: Modern Admin Dashboard  
> **版本**: v2.0  
> **更新日期**: 2026-04-19  
> **文档状态**: 历史设计文档（管理后台早期设计稿），实际实现以源码及 `01/02/03` 文档为准。

---

## 1. 设计概述

### 1.1 设计理念

Admin Dashboard 采用现代化的 SaaS 管理后台设计，强调：

- **专业感**: 深色侧边栏 + 浅色内容区的高对比度设计
- **效率优先**: 信息密度适中，关键数据一目了然
- **视觉层次**: 清晰的视觉层级引导用户操作
- **一致性**: 所有组件遵循统一的设计语言

### 1.2 与访客端的区别

| 维度 | Admin Dashboard | 访客端 (Neobrutalism) |
|------|-----------------|----------------------|
| 用户 | 管理员 | 普通访客 |
| 目标 | 高效管理内容 | 阅读体验 |
| 风格 | 专业、现代 | 个性、艺术 |
| 色调 | 深墨绿 + 翠绿 | 奶油色 + 粉红 |

---

## 2. 色彩系统

### 2.1 CSS 变量定义

```css
:root {
  /* 侧边栏 */
  --admin-sidebar-bg: #0F172A;
  --admin-sidebar-hover: #1E293B;
  --admin-sidebar-active: #334155;
  --admin-sidebar-text: #94A3B8;
  --admin-sidebar-text-active: #FFFFFF;
  
  /* 主内容区 */
  --admin-bg: #F8FAFC;
  --admin-card: #FFFFFF;
  --admin-border: #E2E8F0;
  
  /* 主色调 - 翠绿 */
  --admin-primary: #10B981;
  --admin-primary-hover: #059669;
  --admin-primary-light: #D1FAE5;
  --admin-primary-subtle: #ECFDF5;
  
  /* 状态色 */
  --admin-success: #10B981;
  --admin-warning: #F59E0B;
  --admin-danger: #EF4444;
  --admin-info: #3B82F6;
  
  /* 文字 */
  --admin-text-primary: #0F172A;
  --admin-text-secondary: #64748B;
  --admin-text-muted: #94A3B8;
  --admin-text-inverse: #FFFFFF;
  
  /* 阴影 */
  --admin-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --admin-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --admin-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --admin-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  /* 圆角 */
  --admin-radius-sm: 6px;
  --admin-radius: 8px;
  --admin-radius-lg: 12px;
  --admin-radius-xl: 16px;
}
```

### 2.2 Tailwind 配置扩展

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      admin: {
        sidebar: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
          active: '#334155',
          text: '#94A3B8',
          'text-active': '#FFFFFF',
        },
        bg: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        primary: {
          DEFAULT: '#10B981',
          hover: '#059669',
          light: '#D1FAE5',
          subtle: '#ECFDF5',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          muted: '#94A3B8',
        }
      }
    },
    boxShadow: {
      'admin': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      'admin-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      'admin-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    }
  }
}
```

---

## 3. 布局架构

### 3.1 整体结构

```
┌─────────────────────────────────────────────────────────────┐
│ ┌────────────┐  ┌─────────────────────────────────────────┐ │
│ │            │  │ Header: Logo + Search + Actions         │ │
│ │  Sidebar   │  ├─────────────────────────────────────────┤ │
│ │  (240px)   │  │                                         │ │
│ │            │  │  Breadcrumbs (可选)                     │ │
│ │ 🏠 Dashboard│  │                                         │ │
│ │ 📝 Posts   │  │  ┌─────────────────────────────────┐   │ │
│ │ 🏷️ Tags    │  │  │ Page Title + Actions            │   │ │
│ │ 📁 Categories│ │  └─────────────────────────────────┘   │ │
│ │ 🖼️ Images  │  │                                         │ │
│ │ 💬 Comments│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │ │
│ │ ⚙️ Settings│  │  │Stat │ │Stat │ │Stat │ │Stat │       │ │
│ │            │  │  └─────┘ └─────┘ └─────┘ └─────┘       │ │
│ │ ───────────│  │                                         │ │
│ │ 🔗 External│  │  ┌─────────────────────────────────┐   │ │
│ │ 📊 Analytics│  │  │         Main Content            │   │ │
│ │ 🛒 Shop    │  │  │                                 │   │ │
│ └────────────┘  │  └─────────────────────────────────┘   │ │
│                 └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 布局组件

```jsx
// AdminLayout.jsx
const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-admin-bg flex">
      {/* 侧边栏 */}
      <Sidebar className="w-60 bg-admin-sidebar fixed h-full" />
      
      {/* 主内容区 */}
      <main className="flex-1 ml-60 min-h-screen">
        <Header className="sticky top-0 z-30 bg-white border-b border-admin-border" />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
```

---

## 4. 组件实现规范

### 4.1 侧边栏 (Sidebar)

```jsx
const Sidebar = () => {
  const menuGroups = [
    {
      title: '内容管理',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: FileText, label: '文章管理', path: '/admin/posts' },
        { icon: FolderOpen, label: '分类管理', path: '/admin/categories' },
        { icon: Tags, label: '标签管理', path: '/admin/tags' },
        { icon: Image, label: '图片管理', path: '/admin/images' },
        { icon: MessageSquare, label: '评论管理', path: '/admin/comments' },
      ]
    },
    {
      title: '系统设置',
      items: [
        { icon: Settings, label: '系统设置', path: '/admin/settings' },
      ]
    }
  ]

  return (
    <aside className="w-60 bg-admin-sidebar min-h-screen flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <span className="text-xl font-bold text-white">Blog Admin</span>
      </div>
      
      {/* Menu */}
      <nav className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-xs font-semibold text-admin-sidebar-text uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-admin-sidebar-active text-white' 
                      : 'text-admin-sidebar-text hover:bg-admin-sidebar-hover hover:text-white'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      
      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-admin-sidebar-hover">
          <div className="w-8 h-8 rounded-full bg-admin-primary flex items-center justify-center text-white font-medium">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin</p>
            <p className="text-xs text-admin-sidebar-text truncate">admin@blog.com</p>
          </div>
          <LogOut className="w-4 h-4 text-admin-sidebar-text hover:text-white cursor-pointer" />
        </div>
      </div>
    </aside>
  )
}
```

### 4.2 头部 (Header)

```jsx
const Header = () => {
  return (
    <header className="h-16 bg-white border-b border-admin-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-text-muted" />
          <input
            type="text"
            placeholder="搜索文章、评论..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm
              placeholder:text-admin-text-muted
              focus:bg-white focus:border-admin-primary/30 focus:ring-2 focus:ring-admin-primary/20
              transition-all duration-200"
          />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-admin-text-secondary hover:text-admin-text-primary hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-admin-danger rounded-full"></span>
        </button>
        <button className="p-2 text-admin-text-secondary hover:text-admin-text-primary hover:bg-gray-100 rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <div className="h-6 w-px bg-admin-border mx-1"></div>
        <a href="/" target="_blank" className="flex items-center gap-2 px-3 py-1.5 text-sm text-admin-primary hover:bg-admin-primary-subtle rounded-lg transition-colors">
          <ExternalLink className="w-4 h-4" />
          查看网站
        </a>
      </div>
    </header>
  )
}
```

### 4.3 统计卡片 (StatsCard)

```jsx
const StatsCard = ({ title, value, change, changeType, icon: Icon, color = 'primary' }) => {
  const colorMap = {
    primary: 'bg-admin-primary-light text-admin-primary',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-blue-100 text-blue-600',
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-admin-border shadow-admin hover:shadow-admin-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-admin-text-secondary">{title}</p>
          <p className="text-2xl font-bold text-admin-text-primary mt-2">{value}</p>
          {change && (
            <div className="flex items-center mt-2 text-sm">
              <span className={`flex items-center font-medium ${
                changeType === 'up' ? 'text-admin-success' : 'text-admin-danger'
              }`}>
                {changeType === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                {change}
              </span>
              <span className="text-admin-text-muted ml-2">较上月</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
```

### 4.4 数据表格 (DataTable)

```jsx
const DataTable = ({ columns, data, onEdit, onDelete }) => {
  return (
    <div className="bg-white rounded-xl border border-admin-border shadow-admin overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-admin-border">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-4 text-left text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
                {col.title}
              </th>
            ))}
            <th className="px-6 py-4 text-right text-xs font-semibold text-admin-text-secondary uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => onEdit(row)}
                    className="p-2 text-admin-text-muted hover:text-admin-primary hover:bg-admin-primary-subtle rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(row)}
                    className="p-2 text-admin-text-muted hover:text-admin-danger hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### 4.5 按钮组件 (Button)

```jsx
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  disabled = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-admin-primary text-white hover:bg-admin-primary-hover focus:ring-admin-primary',
    secondary: 'bg-white text-admin-text-primary border border-admin-border hover:bg-gray-50 focus:ring-gray-200',
    ghost: 'bg-transparent text-admin-text-secondary hover:bg-gray-100 hover:text-admin-text-primary',
    danger: 'bg-admin-danger text-white hover:bg-red-600 focus:ring-red-500',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-2.5 text-base rounded-lg',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
      `}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
```

### 4.6 表单组件

```jsx
// Input
const Input = ({ label, error, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-admin-text-secondary">{label}</label>}
      <input
        className={`
          w-full px-4 py-2.5 rounded-lg border bg-white text-admin-text-primary
          placeholder:text-admin-text-muted
          focus:outline-none focus:ring-2 focus:ring-admin-primary/20 focus:border-admin-primary
          transition-all duration-200
          ${error ? 'border-admin-danger focus:border-admin-danger focus:ring-red-200' : 'border-admin-border'}
        `}
        {...props}
      />
      {error && <p className="text-sm text-admin-danger">{error}</p>}
    </div>
  )
}

// Select
const Select = ({ label, options, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-admin-text-secondary">{label}</label>}
      <div className="relative">
        <select
          className="w-full px-4 py-2.5 rounded-lg border border-admin-border bg-white text-admin-text-primary
            appearance-none focus:outline-none focus:ring-2 focus:ring-admin-primary/20 focus:border-admin-primary
            transition-all duration-200"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-text-muted pointer-events-none" />
      </div>
    </div>
  )
}

// Textarea
const Textarea = ({ label, error, rows = 4, ...props }) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-admin-text-secondary">{label}</label>}
      <textarea
        rows={rows}
        className={`
          w-full px-4 py-2.5 rounded-lg border bg-white text-admin-text-primary
          placeholder:text-admin-text-muted resize-vertical
          focus:outline-none focus:ring-2 focus:ring-admin-primary/20 focus:border-admin-primary
          transition-all duration-200
          ${error ? 'border-admin-danger focus:border-admin-danger focus:ring-red-200' : 'border-admin-border'}
        `}
        {...props}
      />
      {error && <p className="text-sm text-admin-danger">{error}</p>}
    </div>
  )
}
```

### 4.7 卡片组件 (Card)

```jsx
const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-admin-border shadow-admin ${className}`}>
      {children}
    </div>
  )
}

const CardHeader = ({ title, description, action }) => {
  return (
    <div className="px-6 py-4 border-b border-admin-border flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-admin-text-primary">{title}</h3>
        {description && <p className="text-sm text-admin-text-secondary mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

const CardContent = ({ children, className = '' }) => {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

const CardFooter = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-admin-border bg-gray-50 rounded-b-xl ${className}`}>
      {children}
    </div>
  )
}
```

### 4.8 模态框 (Modal)

```jsx
const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-admin-lg w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border">
          <h3 className="text-lg font-semibold text-admin-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 text-admin-text-muted hover:text-admin-text-primary rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-6 py-4">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 border-t border-admin-border bg-gray-50 rounded-b-xl flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
```

### 4.9 Toast 通知

```jsx
const Toast = ({ message, type = 'success', onClose }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const Icon = icons[type]

  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-admin-lg animate-in slide-in-from-right ${colors[type]}`}>
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### 4.10 分页组件 (Pagination)

```jsx
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-admin-border">
      <div className="text-sm text-admin-text-secondary">
        第 <span className="font-medium text-admin-text-primary">{currentPage}</span> 页，共 <span className="font-medium">{totalPages}</span> 页
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-admin-border text-admin-text-secondary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-admin-primary text-white'
                  : 'text-admin-text-secondary hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          )
        })}
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-admin-border text-admin-text-secondary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

---

## 5. 页面实现

### 5.1 Dashboard 页面

```jsx
const Dashboard = () => {
  const stats = [
    { title: '总文章数', value: '128', change: '12%', changeType: 'up', icon: FileText },
    { title: '本月发布', value: '24', change: '8%', changeType: 'up', icon: TrendingUp },
    { title: '总浏览量', value: '45.2K', change: '23%', changeType: 'up', icon: Eye },
    { title: '待审评论', value: '18', change: '5%', changeType: 'down', icon: MessageSquare },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-primary">Dashboard</h1>
          <p className="text-admin-text-secondary mt-1">欢迎回来，今天也是创作的好日子！</p>
        </div>
        <Button>
          <Plus className="w-4 h-4" />
          写文章
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Posts */}
      <Card>
        <CardHeader 
          title="最近文章" 
          description="最近发布的 5 篇文章"
          action={<Button variant="ghost" size="sm">查看全部 →</Button>}
        />
        <CardContent>
          <DataTable 
            columns={[
              { key: 'title', title: '标题' },
              { key: 'category', title: '分类' },
              { key: 'views', title: '浏览量' },
              { key: 'date', title: '发布时间' },
            ]}
            data={recentPosts}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 6. 文件结构

```
frontend/src/
├── components/
│   └── admin/
│       ├── AdminLayout.jsx      # 后台布局
│       ├── Sidebar.jsx          # 侧边栏
│       ├── Header.jsx           # 顶部导航
│       ├── StatsCard.jsx        # 统计卡片
│       ├── DataTable.jsx        # 数据表格
│       ├── Button.jsx           # 按钮
│       ├── Card.jsx             # 卡片组件
│       ├── Input.jsx            # 输入框
│       ├── Select.jsx           # 下拉选择
│       ├── Modal.jsx            # 模态框
│       ├── Toast.jsx            # 通知提示
│       └── Pagination.jsx       # 分页
├── pages/
│   └── admin/
│       ├── Dashboard.jsx
│       ├── Posts.jsx
│       ├── PostEdit.jsx
│       ├── Categories.jsx
│       ├── Tags.jsx
│       ├── Images.jsx
│       ├── Comments.jsx
│       └── Settings.jsx
├── styles/
│   └── admin.css                # Admin 主题样式
└── hooks/
    └── useToast.js              # Toast 状态管理
```

---

## 7. 更新日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-04-19 | v2.0 | 初始版本，完整的 Admin Dashboard 设计规范 |

---

*本文档定义了个人博客后台管理的完整 UI 设计规范与组件实现。*
