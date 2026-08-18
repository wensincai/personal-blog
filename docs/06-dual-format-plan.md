# Personal Blog - Markdown + HTML 双格式文章改造计划

> **文档状态**：改造计划。标记"已完成"的部分（`Post.content_type` 字段、PostEdit 双格式编辑器）已落地，其余为历史规划。

> 目标：支持 Markdown 和 HTML 两种格式录入文章，访客端正确渲染，图片路径兼容现有规则。

---

## 1. 整体策略

```
┌─────────────────────────────────────────────────────────────┐
│  后台编辑器                                                    │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ @uiw/react-  │  │ react-quill  │                         │
│  │ md-editor    │  │ -new (HTML)  │                         │
│  └──────┬───────┘  └──────┬───────┘                         │
│         │                 │                                  │
│         ▼                 ▼                                  │
│    content_type='markdown'  content_type='html'              │
│         │                 │                                  │
│         └────────┬────────┘                                  │
│                  ▼                                           │
│            后端 API (posts.py)                                │
│            保存到数据库 (content_type 字段)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  访客端渲染                                                    │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ content_type    │  │ content_type    │                   │
│  │ == 'markdown'   │  │ == 'html'       │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│    renderMarkdown()     DOMPurify.sanitize()                 │
│    (现有轻量渲染)       (XSS 过滤后渲染)                      │
│           │                    │                             │
│           └────────┬───────────┘                             │
│                    ▼                                         │
│            dangerouslySetInnerHTML                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 改造步骤清单

| 步骤 | 模块 | 状态 | 说明 |
|------|------|------|------|
| 2.1 | 后端 models.py | ✅ 已完成 | Post 表新增 `content_type` 字段，默认 `'markdown'` |
| 2.2 | 后端 schemas.py | ✅ 已完成 | PostCreate, PostUpdate, PostOut 均添加 `content_type` |
| 2.3 | 后端 posts.py | ✅ 已完成 | 创建/更新接口读写 `content_type`，列表/详情接口返回 |
| 2.4 | 前端依赖 | ✅ 已完成 | 安装 `@uiw/react-md-editor`、`react-quill-new`、`dompurify` |
| 2.5 | 前端 PostEdit.jsx | ✅ 已完成 | 重写编辑器，支持 Markdown/HTML 切换，图片上传兼容现有规则 |
| 2.6 | 前端 PostDetail.jsx | ✅ 已完成 | 根据 `content_type` 选择渲染方式，HTML 需 DOMPurify 过滤 |
| 2.7 | 前端 Posts.jsx | ✅ 已完成 | 文章列表显示 `content_type` 标签 |
| 2.8 | 数据库兼容 | ✅ 已完成 | SQLite 添加字段，现有 111 篇文章默认设为 `markdown` |
| 2.9 | 构建验证 | ✅ 已完成 | `npm run build` 通过（7.21s），有 CSS 警告但非阻塞 |

---

## 3. 后端变更详情

### 3.1 models.py

```python
class Post(Base):
    # ... 现有字段 ...
    content_type = Column(String(10), default='markdown')  # 'markdown' | 'html'
```

### 3.2 schemas.py

```python
class PostCreate(BaseModel):
    # ...
    content_type: str = Field(default='markdown', pattern='^(markdown|html)$')

class PostUpdate(BaseModel):
    # ...
    content_type: Optional[str] = None

class PostOut(PostBase):
    # ...
    content_type: str
```

### 3.3 posts.py

- `create_post`: 自动写入 `content_type`
- `update_post`: 自动透传 `content_type`
- 列表/详情接口返回 `content_type`

---

## 4. 前端变更详情

### 4.1 PostEdit.jsx（已完成）

- 引入 `MDEditor`（Markdown）和 `ReactQuill`（HTML）
- 增加格式切换按钮（Markdown / 富文本 HTML）
- 图片上传复用现有 `/api/upload` 接口
- Markdown 模式插入 `![描述](/uploads/xxx.jpg)`
- HTML 模式插入 `<img src="/uploads/xxx.jpg" />`
- 缩略图路径格式：`/uploads/thumbnails/xxx.jpg`

### 4.2 PostDetail.jsx（待完成）

- 引入 `DOMPurify`
- 判断 `post.content_type`：
  - `'markdown'` → 调用现有 `renderMarkdown()`
  - `'html'` → `DOMPurify.sanitize(post.content, { FORBID_TAGS: ['script', 'iframe'] })`

### 4.3 Posts.jsx（待完成）

- 在文章列表项中增加 `content_type` 标签显示

---

## 5. 图片路径规则

| 项目 | 路径格式 | 说明 |
|------|----------|------|
| 原图 | `/uploads/{filename}` | 上传接口返回的 `file_path` |
| 缩略图 | `/uploads/thumbnails/{filename}` | 上传接口返回的 `thumb_path` |
| 完整 URL | `{API_BASE_URL.replace('/api', '')}{path}` | 前端拼接 |

编辑器插入的图片路径使用相对路径 `/uploads/xxx.jpg`，访客端渲染时自动补全为完整 URL。

---

## 6. XSS 防护策略

- **输入侧**：Quill 编辑器本身会过滤部分危险标签；后端不二次过滤 HTML 内容（保留用户原始输入）
- **输出侧**：访客端使用 `DOMPurify.sanitize()` 过滤，禁止：
  - `<script>`、`<iframe>`、`<object>`、`<embed>`
  - 事件处理器属性：`onerror`、`onload`、`onclick` 等

---

## 7. 数据库迁移记录

```sql
-- 2026-06-12 执行
ALTER TABLE posts ADD COLUMN content_type VARCHAR(10) DEFAULT 'markdown';
UPDATE posts SET content_type = 'markdown' WHERE content_type IS NULL;
```

影响：111 篇现有文章全部标记为 `markdown`。

---

## 8. 测试清单

- [ ] 新建 Markdown 文章，保存成功，访客端正确渲染
- [ ] 新建 HTML 文章，保存成功，访客端正确渲染
- [ ] 编辑现有 Markdown 文章，content_type 保持为 markdown
- [ ] HTML 文章中插入 `<script>`，访客端被 DOMPurify 过滤
- [ ] 图片上传路径符合 `/uploads/xxx.jpg` 规则
- [ ] `npm run build` 无报错
