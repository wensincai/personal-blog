"""
集中配置 - 所有部署相关的值统一从这里读取。

优先级：环境变量 > 占位符默认值。所有占位符都需要在部署时通过环境变量
（或 backend/.env，见 .env.example）覆盖为真实值。

绝不把真实密钥提交到仓库。
"""
import os

# ── JWT / SSO ────────────────────────────────────────────────────────────────
# 与 SSO 中心共享的 JWT 签名密钥（必须与 SSO 中心 sso_config.py 完全一致）
SECRET_KEY = os.environ.get("BLOG_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
# 本地登录签发的 token 有效期（天）
ACCESS_TOKEN_EXPIRE_DAYS = int(os.environ.get("BLOG_ACCESS_TOKEN_EXPIRE_DAYS", "7"))

# 删除 SSO Cookie 时使用的 domain（同源部署留空即可）
SSO_COOKIE_DOMAIN = os.environ.get("BLOG_SSO_COOKIE_DOMAIN", "localhost")

# ── 默认管理员（仅首次建库时使用，创建后请立即在后台修改密码）────────────
DEFAULT_ADMIN_USERNAME = os.environ.get("BLOG_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("BLOG_ADMIN_PASSWORD", "change-me-please")

# ── CORS ─────────────────────────────────────────────────────────────────────
# 逗号分隔的前端来源列表；本地开发默认放行 Vite dev server
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "BLOG_CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8888",
    ).split(",")
    if origin.strip()
]

# ── 服务端口（uvicorn 启动默认值，生产环境可用命令行参数覆盖）────────────
BACKEND_HOST = os.environ.get("BLOG_BACKEND_HOST", "0.0.0.0")
BACKEND_PORT = int(os.environ.get("BLOG_BACKEND_PORT", "8889"))

# ── 数据库 ───────────────────────────────────────────────────────────────────
# 默认 SQLite 文件位于 backend/blog.db，可通过 BLOG_DATABASE_URL 覆盖
DATABASE_URL = os.environ.get(
    "BLOG_DATABASE_URL",
    f"sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'blog.db')}",
)
