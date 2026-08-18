# Personal Blog


## ✨ 功能特性

- **内容管理**：文章 CRUD、分类/标签体系、草稿与发布、Markdown / HTML 双格式
- **内容采集**：
  - 通用网页采集（`/api/crawl`）—— 人人都是产品经理、博客园、菜鸟教程等
  - 公众号文章采集（`/api/wechat-crawl`）—— Playwright 渲染 + 微信图片防盗链处理
  - 通用采集（`/api/universal-crawl`）—— 站点提取策略链（掘金 / CSDN / 通用）
  - 正文噪音剪枝（crawl4ai Pruning 思路本地化）+ 编码/数学公式修复
- **访客端**：Neobrutalism 风格文章渲染、KaTeX 数学公式（本地化）、SEO 友好 URL
- **认证**：本地 JWT（HS256）+ SSO Cookie 双模式，密钥集中配置

## 📁 目录结构

```
personal-blog/
├── backend/     FastAPI 后端（config.py 集中配置，SQLite）
├── frontend/    React 前端（Vite，环境变量 VITE_* 注入）
└── docs/        项目文档（架构/后端/前端/采集/渲染等）
```

## 🚀 快速开始

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 配置环境变量（必做：生成自己的 SECRET_KEY 与管理员密码）
cp .env.example .env            # Windows: copy .env.example .env

# 可选采集引擎（缺失时相应功能自动降级，不影响启动）
pip install playwright && playwright install chromium   # SPA/公众号采集
pip install scrapling                                   # 通用采集增强引擎

uvicorn app:app --host 0.0.0.0 --port 8889 --reload
```

> 首次启动会自动建表并创建默认管理员（账号密码来自 `BLOG_ADMIN_USERNAME` / `BLOG_ADMIN_PASSWORD`），部署后请立即在后台修改密码。

### 前端

```bash
cd frontend
npm install
cp .env.example .env            # Windows: copy .env.example .env
npm run dev                     # http://localhost:8888
```

开发环境下 Vite 会把 `/api`、`/uploads`、`/settings` 代理到后端 `:8889`。

### 生产构建

```bash
cd frontend && npm run build    # 产物在 frontend/dist/
```

## ⚙️ 配置说明

所有部署相关配置通过**环境变量**注入（仓库只保留占位符，绝不提交真实密钥）：

| 变量 | 位置 | 说明 |
|------|------|------|
| `BLOG_SECRET_KEY` | 后端 | JWT 签名密钥（与 SSO 中心一致） |
| `BLOG_ADMIN_USERNAME` / `BLOG_ADMIN_PASSWORD` | 后端 | 默认管理员账号 |
| `BLOG_CORS_ORIGINS` | 后端 | 允许跨域来源（逗号分隔） |
| `BLOG_BACKEND_HOST` / `BLOG_BACKEND_PORT` | 后端 | 服务监听地址与端口 |
| `BLOG_DATABASE_URL` | 后端 | 数据库连接串（默认 SQLite） |
| `VITE_API_BASE_URL` | 前端 | 后端 API 地址 |
| `VITE_SSO_URL` | 前端 | SSO 中心地址 |

完整清单见 `backend/.env.example` 与 `frontend/.env.example`。

## 📚 文档

| 文档 | 说明 |
|------|------|
| [docs/01-architecture-overview.md](docs/01-architecture-overview.md) | 架构总览 |
| [docs/02-backend-design.md](docs/02-backend-design.md) | 后端设计 |
| [docs/03-frontend-design.md](docs/03-frontend-design.md) | 前端设计 |
| [docs/04-crawl-solution.md](docs/04-crawl-solution.md) | 文章采集方案 |
| [docs/05-markdown-rendering.md](docs/05-markdown-rendering.md) | Markdown 渲染方案 |
| [docs/06-dual-format-plan.md](docs/06-dual-format-plan.md) | 双格式改造计划 |
| docs/DESIGN*.md、UI_DESIGN_SYSTEM.md 等 | 历史设计文档（保留参考） |

## 🔒 安全提示

- 仓库中的配置均为**占位符**，部署前务必通过环境变量覆盖（见 `.env.example`）
- `backend/uploads/`、`*.db*` 等运行时数据已被 `.gitignore` 排除，不会入库
