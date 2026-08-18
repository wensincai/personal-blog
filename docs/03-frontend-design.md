# Personal Blog - 前端设计文档

> React 18 + Vite + Tailwind CSS + 双主题架构，配置通过 Vite 环境变量注入。

---

## 1. 项目结构

```
frontend/
├── index.html              # HTML 入口（Vite 注入 JS，含本地 KaTeX）
├── vite.config.js          # Vite 配置（host/port/proxy）
├── tailwind.config.js      # Tailwind CSS 配置
├── package.json            # 依赖管理
├── .env.example            # 环境变量示例（VITE_*）
└── src/
    ├── main.jsx            # React 根渲染（先加载主题配色）
    ├── App.jsx             # 根路由 + 路由守卫
    ├── index.css           # 全局样式（双主题 CSS 变量 + 组件类）
    ├── api/                # API 封装层
    │   ├── config.js       # Axios 实例 + 拦截器（baseURL 来自环境变量）
    │   ├── auth.js         # 认证 API
    │   ├── posts.js        # 文章 API
    │   ├── categories.js   # 分类 API
    │   ├── tags.js         # 标签 API
    │   └── settings.js     # 设置 API
    ├── pages/              # 页面组件（路由级）
    │   ├── Home.jsx        # 访客端首页
    │   ├── PostDetail.jsx  # 访客端文章详情
    │   ├── Login.jsx       # 登录页（本地 + SSO）
    │   ├── Dashboard.jsx   # 管理仪表盘
    │   ├── Posts.jsx / PostEdit.jsx
    │   ├── CrawlEdit.jsx / WechatCrawlEdit.jsx / UniversalCrawlEdit.jsx
    ├── components/         # 访客端通用组件
    ├── components-preline/ # 管理后台组件库（Button/Card/Input/Sidebar）
    └── utils/              # colorPalette / errorMessage
```

---

## 2. 路由架构 (App.jsx)

```
React Router v6 (BrowserRouter)
│
├── 访客公开路由
│   ├── /                     → Home.jsx        首页文章列表
│   └── /post/:slug           → PostDetail.jsx  文章详情
│
├── /login                    → Login.jsx       登录页
│
└── 管理后台路由（PrivateRoute 守卫）
    ├── /admin                → Dashboard.jsx   仪表盘
    ├── /admin/posts          → Posts.jsx       文章列表
    ├── /admin/posts/new      → PostEdit.jsx    新建文章
    ├── /admin/posts/edit/:id → PostEdit.jsx    编辑文章
    ├── /admin/crawl          → CrawlEdit.jsx   通用网页采集
    ├── /admin/wechat-crawl   → WechatCrawlEdit.jsx 公众号采集
    ├── /admin/universal-crawl→ UniversalCrawlEdit.jsx 通用采集
    ├── /admin/categories     → Categories.jsx  分类管理
    ├── /admin/tags           →（开发中）
    ├── /admin/images         → Images.jsx      图片管理
    ├── /admin/pages          →（开发中）
    └── /admin/settings       → Settings.jsx    系统设置

旧路径 /posts、/posts/new、/posts/edit/:id 重定向到 /admin/* 对应路由
```

### 2.1 路由守卫（PrivateRoute）

管理后台路由通过 `PrivateRoute` 组件鉴权，支持双模式：

```jsx
// 1. 本地 token 优先
const token = localStorage.getItem('token')
if (token) { setAuthState('ok'); return }
// 2. 无本地 token 时，尝试用 SSO Cookie 调 /api/auth/me
authApi.getMe().then(() => setAuthState('ok')).catch(() => setAuthState('redirect'))
```

- 校验期间显示"加载中..."；未登录跳转 `/login`

---

## 3. 双主题设计

项目同时存在两种视觉风格，通过 CSS 变量和独立组件类实现共存。

### 3.1 主题对比

| 维度 | 访客端 (Neobrutalism) | 管理后台 (Preline Admin) |
|------|----------------------|-------------------------|
| **定位** | 面向读者，活泼有趣 | 面向管理员，专业高效 |
| **色彩** | 奶油色底 + 高饱和撞色 | 白色底 + 深蓝灰 |
| **边框** | 粗黑实线（2px），直角 | 细灰实线（1px），圆角 |
| **阴影** | 硬阴影偏移（4px 4px 0） | 柔和阴影（shadow-sm/md） |
| **滚动条** | 自定义粗黑风格 | 浏览器默认 |

### 3.2 主题色运行时注入（main.jsx）

`main.jsx` 在渲染前请求 `/api/settings/public`，把后端下发的主题色（含 primary 50–950 色阶）注入为 CSS 变量：

- 语义变量：`--color-primary` / `--color-bg` / `--color-text` / `--color-sidebar` 等
- 色阶变量：`--color-primary-{50..950}`（后端 shades，缺失时前端用 `generateShades` 生成）

---

## 4. API 层 (src/api/config.js)

### 4.1 Axios 实例配置

```javascript
// baseURL 来自环境变量 VITE_API_BASE_URL，默认走同源 /api（Vite 代理）
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,   // 跨域携带 Cookie（SSO 必需）
})
```

### 4.2 请求拦截器

```javascript
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')   // 注意键名为 'token'
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 4.3 响应拦截器

401 时清除本地 token 并跳转 `/login`（登录页自身不触发，避免死循环）。

---

## 5. 环境变量配置（.env.example）

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE_URL` | 后端 API 基础地址（默认 `/api`） |
| `VITE_SSO_URL` | SSO 中心登录地址（默认 `http://localhost:9000`） |

> `VITE_*` 变量仅在构建时注入，构建产物中不包含真实密钥以外的部署信息；`.env` 已加入 `.gitignore`，请勿提交。

---

## 6. 登录与 SSO（Login.jsx）

- **本地登录**：`POST /api/auth/login` → 保存 `token` 到 localStorage
- **SSO 登录**：跳转 `VITE_SSO_URL/?redirect=<当前站点>/admin`，SSO 登录后回跳，通过 Cookie 由后端 `get_current_admin` 验签
- 页面挂载时自动检测：已有 token 或 SSO 已登录则直接进入 `/admin`

---

## 7. 核心页面详解

### 7.1 访客端首页 (Home.jsx)

- 文章卡片网格、分类/标签筛选、搜索、分页
- 卡片：封面图、标题、摘要、分类、日期 + 阅读数

### 7.2 访客端文章详情 (PostDetail.jsx)

- 标题、元信息（日期/分类/标签）、封面图
- 正文渲染（Markdown 渲染细节见 `05-markdown-rendering.md`）
- 上一篇/下一篇导航

### 7.3 文章编辑 (PostEdit.jsx)

- 新建/编辑双模式，左右双栏布局
- Markdown 编辑器（`@uiw/react-md-editor`）与富文本（`react-quill-new`）
- 保存草稿 / 发布 / 取消

### 7.4 采集页面

- `CrawlEdit.jsx`：通用网页采集（URL → 预览 → 编辑 → 保存）
- `WechatCrawlEdit.jsx`：公众号文章采集
- `UniversalCrawlEdit.jsx`：通用采集（策略链，支持更多站点）


- 基于 WebSocket 的实时对话，支持图片（≤4 张、每张 ≤8MB）

---

## 8. 状态管理

未使用 Redux/Zustand，采用 **React 内置状态 + 服务端状态**：

| 数据 | 管理方式 |
|------|----------|
| 登录 Token | `localStorage`（键名 `token`） |
| 文章/分类/标签/设置 | `useState` + `useEffect` 调 API |
| 表单数据 | `useState`（受控组件） |

---

## 9. 构建配置 (vite.config.js)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 8888,
    proxy: {
      '/api':      { target: 'http://localhost:8889', changeOrigin: true },
      '/uploads':  { target: 'http://localhost:8889', changeOrigin: true },
      '/settings': { target: 'http://localhost:8889', changeOrigin: true },
    },
  },
})
```

开发环境下 `/api`、`/uploads`、`/settings` 自动代理到后端（:8889），解决跨域。

---

## 10. Tailwind 配置

- 自定义颜色：`brutal-*`（访客端 Neobrutalism 色板）与 `preline-*`（管理后台色板，含动态生成）
- 插件：`@tailwindcss/forms`、`preline`

---

