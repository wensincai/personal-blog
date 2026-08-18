# Personal Blog - 后端设计文档

> FastAPI + SQLAlchemy + SQLite 架构，配置集中管理（`backend/config.py`）。

---

## 1. 应用入口 (app.py)

### 1.1 启动流程

```
1. 从 config.py 读取配置（密钥、CORS、端口等）
2. 创建数据库表 (Base.metadata.create_all)
3. 初始化默认管理员（不存在时创建，账号密码来自配置）
4. 创建 FastAPI 实例，配置 CORS（BLOG_CORS_ORIGINS）
5. 注册全部路由模块
6. 挂载 /uploads 静态文件服务
```

### 1.2 CORS 配置

允许来源从 `config.py` 读取（`BLOG_CORS_ORIGINS` 环境变量，逗号分隔），本地开发默认放行 `localhost:5173/3000/8888`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 1.3 路由注册

| 路由前缀 | 文件 | 说明 |
|----------|------|------|
| `/api/auth` | `routers/auth.py` | 登录、改密、双模式鉴权、默认管理员 |
| `/api/posts` | `routers/posts.py` | 文章 CRUD、统计 |
| `/api/categories` | `routers/categories.py` | 分类 CRUD |
| `/api/tags` | `routers/tags.py` | 标签 CRUD |
| `/api/images` | `routers/images.py` | 图片上传/缩略图/清理 |
| `/api/settings` | `routers/settings.py` | 系统设置、自定义页面 |
| `/api/crawl` | `routers/crawl.py` | 通用网页采集 |
| `/api/wechat-crawl` | `routers/wechat_crawl.py` | 公众号文章采集 |
| `/api/universal-crawl` | `routers/universal_crawl.py` | 通用采集（策略链） |
| `/uploads` | `app.py` | 静态图片文件服务 |
| `/` `/api/health` | `app.py` | 根信息 / 健康检查 |

---

## 2. 数据库模型 (models.py)

### 2.1 模型总览

| 模型 | 表名 | 说明 |
|------|------|------|
| `Admin` | `admins` | 管理员账号（username 唯一，密码 bcrypt 哈希） |
| `Post` | `posts` | 文章（title/slug/content/content_type/summary/cover_image/状态/浏览数） |
| `Category` | `categories` | 分类（name 唯一） |
| `Tag` | `tags` | 标签（name 唯一） |
| `PostTag` | `post_tags` | 文章-标签多对多关联表 |
| `Image` | `images` | 上传图片（原图/缩略图路径、尺寸） |
| `Setting` | `settings` | 站点设置（单记录） |
| `Page` | `pages` | 自定义页面（最多 5 个） |

### 2.2 Setting（系统设置）

单记录表（`get_or_create_settings` 保证只有一条），字段：

| 字段 | 说明 |
|------|------|
| `blog_name` | 站点名称 |
| `blog_description` | 站点描述 |
| `welcome_message` | 欢迎语 |
| `blog_logo` / `banner_image` | Logo / 横幅图 |
| `banner_type` / `banner_images` | 横幅类型（text/carousel）与轮播图 JSON |
| `theme` / `layout` | 主题（默认 neobrutalism）与布局（card/list） |
| `theme_colors` | 主题色 JSON（primary/secondary/bg/...） |

### 2.3 Page（自定义页面）

`title` / `slug`（唯一）/ `content` / `is_nav` / `nav_order`，后端限制最多 5 个。

---

## 3. 认证机制 (routers/auth.py)

### 3.1 JWT Token

- **算法**：HS256
- **密钥**：`config.py` 的 `SECRET_KEY`（环境变量 `BLOG_SECRET_KEY` 覆盖，与 SSO 中心共享）
- **有效期**：`ACCESS_TOKEN_EXPIRE_DAYS`（默认 7 天）
- **签发内容**：`{"sub": username, "exp": timestamp}`

### 3.2 双模式鉴权（get_current_admin）

1. **Bearer Token**（管理后台使用）：`Authorization: Bearer <token>`，本地验签；
2. **SSO Cookie**（可选）：无 Header 时读取 `access_token` Cookie，由 `sso_client.py` 用共享密钥本地验签，再查本地 `admins` 表。

两者都失败返回 401。

### 3.3 默认管理员

首次启动建库时创建，账号/密码来自配置：

```python
DEFAULT_ADMIN_USERNAME = os.environ.get("BLOG_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("BLOG_ADMIN_PASSWORD", "change-me-please")
```

> 生产部署请务必通过环境变量设置强密码，创建后立即在后台修改。

---

## 4. 文章 API (routers/posts.py)

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/posts` | 文章列表（skip/limit/category_id/tag_id/is_draft/search） | 公开 |
| GET | `/api/posts/{id_or_slug}` | 单篇详情（id 或 slug，浏览数 +1） | 公开 |
| POST | `/api/posts` | 创建文章（自动生成摘要） | 管理员 |
| PUT | `/api/posts/{post_id}` | 更新文章（支持标签重绑） | 管理员 |
| DELETE | `/api/posts/{post_id}` | 删除文章（级联删除关联图片） | 管理员 |
| GET | `/api/posts/stats/overview` | 统计（文章数/浏览数/分类分布/最近文章） | 公开 |

- 列表返回 `List[PostListItem]`（裸数组，非分页包装对象）
- 搜索：`title.contains(search) | content.contains(search)`
- 文章支持 `content_type`：`markdown` 或 `html`

---

## 5. 图片 API (routers/images.py)

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/images` | 图片列表（分页，含 total） | 管理员 |
| POST | `/api/images/upload` | 单图上传（自动缩略图） | 管理员 |
| POST | `/api/images/upload-multiple` | 批量上传（最多 10 张） | 管理员 |
| GET | `/api/images/serve/{filename}` | 原图访问 | 管理员 |
| GET | `/api/images/thumb/{filename}` | 缩略图访问 | 管理员 |
| DELETE | `/api/images/{image_id}` | 删除图片（含缩略图） | 管理员 |
| POST | `/api/images/cleanup-unused` | 清理未被引用的图片 | 管理员 |
| GET | `/api/images/usage-stats` | 图片使用统计 | 管理员 |

- 扩展名白名单：`.jpg/.jpeg/.png/.gif/.webp/.svg`；上限 10MB
- 缩略图：320px 宽，Pillow 生成（SVG 直接复制）
- webp 统一转 jpg 存储

---

## 6. 设置与页面 API (routers/settings.py)

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/settings` | 获取站点设置 | 公开 |
| GET | `/api/settings/public` | 公开设置（前端展示字段 + 解析后的主题色） | 公开 |
| PUT | `/api/settings` | 更新设置 | 管理员 |
| GET | `/api/pages` | 自定义页面列表 | 公开 |
| GET | `/api/pages/{slug}` | 按 slug 获取页面 | 公开 |
| POST/PUT/DELETE | `/api/pages...` | 页面增删改（上限 5 个，slug 唯一） | 管理员 |

---

## 7. 数据库连接 (database.py)

```python
# 连接串来自 config.py（默认 backend/blog.db，可用 BLOG_DATABASE_URL 覆盖）
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

通过 FastAPI `Depends(get_db)` 注入到路由处理函数。

---

## 8. Pydantic 模型 (schemas.py)

| Schema | 用途 |
|--------|------|
| `LoginRequest` / `LoginResponse` / `PasswordChange` | 登录/响应/改密 |
| `PostCreate` / `PostUpdate` / `PostResponse` / `PostListItem` | 文章 |
| `CategoryCreate` / `CategoryResponse` | 分类（含 post_count） |
| `TagCreate` / `TagResponse` | 标签 |
| `ImageResponse` / `ImageListResponse` | 图片 |
| `SettingBase` / `SettingUpdate` / `SettingResponse` | 设置 |
| `PageCreate` / `PageUpdate` / `PageResponse` | 自定义页面 |
| `StatsResponse` | 统计 |

---

## 9. 错误处理

后端使用 FastAPI 的 HTTPException 统一返回错误：

```json
{ "detail": "错误描述" }
```

常见错误码：

| 状态码 | 场景 |
|--------|------|
| 400 | 参数错误、数量超限、名称重复 |
| 401 | 未登录/Token 无效 |
| 404 | 资源不存在 |
| 422 | 请求体校验失败 |

---

*本文档由 AI 根据项目源码自动生成，并已按当前代码修订。*
