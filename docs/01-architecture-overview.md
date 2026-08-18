# Personal Blog - 架构总览

> 本文档基于当前源码整理（FastAPI 后端 + React/Vite 前端 + SQLite）。

---

## 1. 项目定位

一个面向个人使用的全栈博客系统，具备以下核心能力：

- **内容管理**：文章 CRUD、分类/标签体系、草稿与发布状态
- **内容采集**：支持通用网页采集、微信公众号文章采集和通用采集（含站点提取策略链）
- **访客端展示**：基于 Markdown 的文章渲染、SEO 友好的 URL
- **图片管理**：本地上传（自动缩略图）与远程图片下载统一管理

---

## 2. 技术栈

### 2.1 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 运行环境 |
| FastAPI | 0.115.0 | Web 框架 |
| Uvicorn | 0.32.0 | ASGI 服务器 |
| SQLAlchemy | 2.0.36 | ORM |
| Pydantic | 2.9.2 | 数据校验 |
| python-jose | 3.3.0 | JWT 签名/验证 |
| passlib[bcrypt] | 1.7.4 | 密码哈希 |
| python-multipart | 0.0.17 | 文件上传解析 |
| Pillow | 11.0.0 | 图片处理（缩略图） |
| Playwright | 可选 | SPA / 公众号文章采集 |

### 2.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.2 | UI 框架 |
| Vite | ^5.0 | 构建工具 |
| React Router | ^6.20 | 客户端路由 |
| Axios | ^1.6 | HTTP 客户端 |
| Tailwind CSS | ^3.3.6 | 样式框架 |
| Preline UI | ^4.1.3 | 管理后台组件库 |
| @uiw/react-md-editor | ^4.1.1 | Markdown 编辑器/预览 |
| react-quill-new | ^3.8.3 | 富文本编辑器 |
| dompurify | ^3.4.9 | HTML 净化（XSS 防护） |

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       用户浏览器                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  前端 (Vite, Port 8888)│
              │  访客端 + 管理后台     │
              └───────────┬───────────┘
                          │ /api /uploads（开发环境经 Vite 代理）
                          ▼
              ┌───────────────────────┐
              │  FastAPI 后端 (8889)  │
              │  /api/* + /uploads    │
              │  ┌─────────────────┐  │
              │  │ routers/        │  │
              │  │ auth, posts,    │  │
              │  │ categories, tags│  │
              │  │ images, settings│  │
              │  │ crawl,          │  │
              │  │ wechat_crawl,   │  │
              │  │ universal_crawl │  │
              │  └─────────────────┘  │
              │  SQLAlchemy + SQLite  │
              │  (blog.db)            │
              │  uploads/ 静态图片    │
              └───────────────────────┘
```

---

## 4. 部署架构（示意）

```
服务器（Linux）
│
├── Nginx（反向代理，可选）
│   └── 80/443 → 前端:8888 / 后端:8889
│
├── systemd / 容器
│   ├── personal-blog-frontend  (Vite dev / 构建产物托管)
│   └── personal-blog-backend   (Uvicorn + FastAPI)
│
└── 项目目录
    ├── backend/    FastAPI 后端
    ├── frontend/   React 前端
    └── docs/       项目文档
```

---

## 5. 数据流

### 5.1 正常发布流程

```
管理员 → 管理后台 → 编辑文章 → 保存草稿 / 发布
                                   │
                                   ▼
                          FastAPI /api/posts
                                   │
                                   ▼
                          SQLite (Post, Category, Tag)
                                   │
                                   ▼
                           访客端读取 /api/posts → 渲染
```

### 5.2 采集流程

```
管理员 → 采集页面 → 输入 URL → 请求 / 浏览器渲染抓取
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
            通用网页/通用采集                   公众号采集
            (crawl.py / universal_crawl.py)   (wechat_crawl.py)
            - 站点策略链（掘金/CSDN/通用）     - Playwright 抓取
            - 正文噪音剪枝 (content_prune)     - 微信图片修复/下载
            - HTML → Markdown                  - 防盗链图片下载
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                          前端预览 → 编辑 → 保存/发布
```

---

## 6. 安全设计

| 层面 | 措施 |
|------|------|
| 认证 | JWT (HS256)，支持 Bearer Header 与 SSO Cookie 双模式 |
| 密钥 | 集中配置（`backend/config.py` / 环境变量），仓库只含占位符 |
| 密码 | bcrypt 哈希存储 |
| 后台路由 | 全路由 `get_current_admin` 鉴权 |
| 访客路由 | 公开访问，无鉴权 |
| 文件上传 | 扩展名白名单 (jpg, jpeg, png, gif, webp, svg)，10MB 上限 |
| CORS | 允许来源集中配置（`BLOG_CORS_ORIGINS`） |

---

## 7. 目录结构

```
personal-blog/
├── backend/
│   ├── app.py                 # FastAPI 应用入口
│   ├── config.py              # 集中配置（环境变量 + 占位符）
│   ├── models.py              # SQLAlchemy 数据模型
│   ├── schemas.py             # Pydantic 请求/响应模型
│   ├── database.py            # 数据库引擎与 Session
│   ├── sso_client.py          # SSO Cookie 本地验签
│   ├── requirements.txt       # Python 依赖
│   ├── .env.example           # 环境变量示例
│   ├── routers/
│   │   ├── auth.py            # 认证/登录/Token/默认管理员
│   │   ├── posts.py           # 文章 CRUD + 统计
│   │   ├── categories.py      # 分类管理
│   │   ├── tags.py            # 标签管理
│   │   ├── images.py          # 图片上传/缩略图/清理
│   │   ├── settings.py        # 系统设置/自定义页面
│   │   ├── crawl.py           # 通用网页采集
│   │   ├── wechat_crawl.py    # 公众号文章采集
│   │   ├── universal_crawl.py # 通用采集（策略链）
│   │   ├── crawl_strategies.py# 站点提取策略
│   │   └── content_prune.py   # 正文噪音剪枝
│   └── uploads/               # 图片上传目录（不入库）
├── frontend/
│   ├── index.html             # HTML 入口
│   ├── vite.config.js         # Vite 配置（代理）
│   ├── package.json           # Node 依赖
│   ├── .env.example           # 前端环境变量示例
│   └── src/
│       ├── main.jsx           # React 入口（主题加载）
│       ├── App.jsx            # 根路由 + 路由守卫
│       ├── api/               # Axios 封装（config/posts/...）
│       ├── pages/             # 访客端与采集页面
│       ├── components/        # 访客端组件
│       └── components-preline/# 管理后台组件
└── docs/                      # 项目文档
```

---

## 8. 环境配置

### 8.1 后端

```bash
cd backend
# 创建虚拟环境（推荐）
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
# 安装依赖
pip install -r requirements.txt
# 按需安装 Playwright（SPA/公众号采集）
playwright install chromium
# 配置环境变量（复制示例并填入真实值）
copy .env.example .env          # Windows；Linux: cp .env.example .env
# 启动
uvicorn app:app --host 0.0.0.0 --port 8889 --reload
```

### 8.2 前端

```bash
cd frontend
npm install
copy .env.example .env          # 按需填写 VITE_* 变量
npm run dev                     # 开发模式（端口 8888）
npm run build                   # 生产构建
```

### 8.3 配置项一览

所有部署相关配置均通过环境变量注入（详见各目录 `.env.example`）：

| 变量 | 所属 | 说明 |
|------|------|------|
| `BLOG_SECRET_KEY` | 后端 | JWT 签名密钥（与 SSO 中心一致） |
| `BLOG_ACCESS_TOKEN_EXPIRE_DAYS` | 后端 | 本地 token 有效期（天） |
| `BLOG_SSO_COOKIE_DOMAIN` | 后端 | 删除 SSO Cookie 时的 domain |
| `BLOG_ADMIN_USERNAME` / `BLOG_ADMIN_PASSWORD` | 后端 | 默认管理员（首次建库时创建） |
| `BLOG_CORS_ORIGINS` | 后端 | 允许跨域的前端来源（逗号分隔） |
| `BLOG_BACKEND_HOST` / `BLOG_BACKEND_PORT` | 后端 | 服务监听地址与端口 |
| `BLOG_DATABASE_URL` | 后端 | 数据库连接串（默认 SQLite） |
| `VITE_API_BASE_URL` | 前端 | 后端 API 基础地址 |
| `VITE_SSO_URL` | 前端 | SSO 中心地址 |

---

