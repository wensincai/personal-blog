# Personal Blog - Markdown 渲染技术方案

> **文档状态**：早期设计方案。当前实现以访客端 `PostDetail.jsx` 的前端渲染为准（KaTeX 已本地化到 `frontend/public/vendor`）；本文部分章节（如"后端预渲染"）为设计稿，细节以源码为准。相关总览见 `01-architecture-overview.md`、`03-frontend-design.md`。

> 后端生成 HTML → 访客端直接渲染  
> 管理端实时预览 → react-markdown

---

## 1. 整体策略

项目采用 **"后端预渲染 HTML + 前端直接展示"** 的架构：

```
数据库 (Markdown 文本)
         │
         ▼
后端 FastAPI ── article_to_html() ──► HTML 字符串
         │                              │
         │         API 响应              │
         │    { content_html: "..." }    │
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
              访客端 React
         dangerouslySetInnerHTML
                        │
                        ▼
              浏览器渲染最终页面
```

### 1.1 为什么选择后端预渲染？

1. **性能**：访客端不需要加载 Markdown 解析库，减少 JS bundle 体积
2. **一致性**：前后端解析规则统一，避免渲染差异
3. **SEO**：服务端返回的 HTML 可被搜索引擎抓取（配合 SSR 或预渲染更优）
4. **安全**：后端可控 HTML 净化，防止 XSS

---

## 2. 后端渲染 (app.py)

### 2.1 核心函数：`article_to_html`

```python
def article_to_html(content: str) -> str:
    """将 Markdown 内容转换为 HTML"""
    if not content:
        return ""

    # 转换 Markdown → HTML
    html_content = markdown.markdown(
        content,
        extensions=[
            'extra',      # 表格、属性列表、定义列表等
            'codehilite', # 代码语法高亮
            'toc',        # 目录生成
            'fenced_code', # 围栏代码块
        ]
    )

    # 包装容器
    return f'<div class="article-content">{html_content}</div>'
```

### 2.2 Markdown 扩展说明

| 扩展 | 功能 |
|------|------|
| `extra` | 支持表格、缩写、属性列表、定义列表、围栏代码块、脚注等 |
| `codehilite` | 代码块语法高亮（需 Pygments） |
| `toc` | 自动生成目录（Table of Contents） |
| `fenced_code` | GitHub 风格的三反引号代码块 |

### 2.3 支持的 Markdown 语法

| 语法 | 示例 | 输出 |
|------|------|------|
| 标题 | `# 一级标题` | `<h1>` |
| 加粗 | `**文字**` | `<strong>` |
| 斜体 | `*文字*` | `<em>` |
| 链接 | `[文字](url)` | `<a>` |
| 图片 | `![描述](url)` | `<img>` |
| 引用 | `> 引用内容` | `<blockquote>` |
| 列表 | `- 项目` / `1. 项目` | `<ul>` / `<ol>` |
| 代码行 | `` `代码` `` | `<code>` |
| 代码块 | ` ```python ` | `<pre><code class="language-python">` |
| 表格 | `| 列1 | 列2 |` | `<table>` |
| 分隔线 | `---` | `<hr>` |

### 2.4 代码高亮

`codehilite` 扩展配合 Pygments 实现代码高亮：

```python
# 输入 (Markdown)
```python
def hello():
    print("Hello World")
```

# 输出 (HTML)
<div class="codehilite">
  <pre><span></span><code>
    <span class="k">def</span> <span class="nf">hello</span><span class="p">():</span>
        <span class="nb">print</span><span class="p">(</span><span class="s2">"Hello World"</span><span class="p">)</span>
  </code></pre>
</div>
```

**注意**：当前项目 `requirements.txt` 未包含 `pygments`，代码高亮样式可能不生效。如需完整高亮，需额外安装：

```bash
pip install pygments
```

### 2.5 文章 API 的 HTML 字段

文章详情接口返回双字段：

```json
{
  "id": 1,
  "title": "文章标题",
  "content": "# Markdown 原文\n\n正文内容...",
  "content_html": "<div class=\"article-content\"><h1>Markdown 原文</h1><p>正文内容...</p></div>",
  "summary": "摘要",
  "...": "..."
}
```

- `content`：原始 Markdown，用于管理端编辑
- `content_html`：预渲染 HTML，用于访客端展示

---

## 3. 访客端渲染 (PostDetail.jsx)

### 3.1 渲染方式

访客端直接使用 `dangerouslySetInnerHTML` 注入后端返回的 HTML：

```jsx
// PostDetail.jsx
<div
  className="article-content"
  dangerouslySetInnerHTML={{ __html: post.content_html }}
/>
```

### 3.2 样式隔离

通过 CSS 类 `.article-content` 对文章正文进行样式隔离，避免与页面其他样式冲突：

```css
/* index.css 中的文章样式 */
.article-content {
  @apply text-gray-800 leading-relaxed;
}

.article-content h1 {
  @apply text-2xl font-bold mt-8 mb-4;
}

.article-content h2 {
  @apply text-xl font-bold mt-6 mb-3;
}

.article-content p {
  @apply mb-4;
}

.article-content pre {
  @apply bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4;
}

.article-content code {
  @apply bg-gray-100 px-1 py-0.5 rounded text-sm;
}

.article-content pre code {
  @apply bg-transparent p-0;
}

.article-content blockquote {
  @apply border-l-4 border-brutal-yellow pl-4 italic my-4;
}

.article-content img {
  @apply max-w-full rounded-lg;
}

.article-content table {
  @apply w-full border-collapse mb-4;
}

.article-content th,
.article-content td {
  @apply border border-gray-300 px-3 py-2;
}

.article-content th {
  @apply bg-gray-100 font-bold;
}
```

### 3.3 XSS 防护

当前项目依赖 **后端输出可信 HTML** 来防范 XSS：

- Markdown 解析在后端完成
- 不渲染用户直接输入的 HTML（Markdown 语法会被转义为纯文本）
- 图片 URL 经过下载到本地处理，避免外链图片的潜在风险

**局限性**：当前未使用 `bleach` 等 HTML 净化库对输出进行过滤。如果管理员在 Markdown 中嵌入恶意 HTML（如 `<script>`），会直接输出到页面。

**建议改进**：

```python
# 使用 bleach 净化 HTML
import bleach

allowed_tags = [
    'p', 'br', 'strong', 'em', 'a', 'img', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
    'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
    'div', 'span'
]

allowed_attrs = {
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title'],
    '*': ['class'],
}

html_content = bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attrs)
```

---

## 4. 管理端实时预览 (PostEdit.jsx)

### 4.1 预览实现

管理端文章编辑页面使用 `react-markdown` 实现实时预览：

```jsx
import ReactMarkdown from 'react-markdown'

// 编辑页面
<div className="grid grid-cols-2 gap-4">
  {/* 左侧：编辑区 */}
  <textarea
    value={content}
    onChange={(e) => setContent(e.target.value)}
  />

  {/* 右侧：实时预览 */}
  <div className="prose max-w-none">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
</div>
```

### 4.2 react-markdown 配置

```jsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

<ReactMarkdown
  remarkPlugins={[remarkGfm]}  // 支持 GitHub Flavored Markdown
  components={{
    // 自定义组件映射
    img: ({ node, ...props }) => (
      <img {...props} className="max-w-full rounded-lg" />
    ),
    code: ({ node, inline, className, children, ...props }) => {
      if (inline) {
        return <code className="bg-gray-100 px-1 py-0.5 rounded" {...props}>{children}</code>
      }
      return (
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
          <code className={className} {...props}>{children}</code>
        </pre>
      )
    }
  }}
>
  {content}
</ReactMarkdown>
```

### 4.3 预览 vs 访客端渲染差异

| 维度 | 管理端预览 | 访客端渲染 |
|------|-----------|-----------|
| **库** | react-markdown + remark-gfm | Python markdown 库 |
| **扩展** | remark 插件生态 | Python-markdown 扩展 |
| **代码高亮** | 需额外配置 prismjs/highlight.js | codehilite + Pygments |
| **表格** | ✅ 支持 | ✅ 支持 |
| **任务列表** | ✅ (remark-gfm) | ❌ 不支持 |
| **数学公式** | ❌ 不支持 | ❌ 不支持 |
| **目录** | ❌ 不支持 | ✅ (toc 扩展) |

**说明**：由于前后端使用不同的 Markdown 解析引擎，极端情况下可能出现渲染差异。建议在管理端预览后，再到访客端确认最终效果。

---

## 5. 图片渲染

### 5.1 图片 URL 类型

| 来源 | URL 格式 | 示例 |
|------|---------|------|
| 本地上传 | `/uploads/{filename}` | `/uploads/abc123.jpg` |
| 采集图片 | `/uploads/{filename}` | `/uploads/crawl_abc123.jpg` |
| 微信图片 | `/uploads/wechat_{timestamp}/{filename}` | `/uploads/wechat_123/xxx.jpg` |
| 外部链接 | `https://...` | `https://example.com/img.jpg` |

### 5.2 图片路径解析

后端 `app.py` 注册了静态文件服务：

```python
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

前端开发环境通过 Vite proxy 代理到后端：

```javascript
// vite.config.js
server: {
  proxy: {
    '/uploads': { target: 'http://localhost:8889', changeOrigin: true },
  },
}
```

生产环境 Nginx 直接代理：

```nginx
location /uploads/ {
    proxy_pass http://localhost:8889/uploads/;
}
```

---

## 6. 首页摘要渲染 (Home.jsx)

首页文章列表不展示完整正文，而是展示摘要：

### 6.1 摘要来源

1. **优先使用 `summary` 字段**：管理员手动输入的摘要
2. **自动截取正文**：如 `summary` 为空，从 `content` 截取前 120 个字符

### 6.2 截取逻辑

```javascript
// Home.jsx
const readMore = (content, maxLength = 120) => {
  if (!content) return ''
  // 移除 Markdown 标记
  const plainText = content
    .replace(/#+ /g, '')      // 移除标题标记
    .replace(/\*\*/g, '')     // 移除加粗
    .replace(/\*/g, '')       // 移除斜体
    .replace(/`{1,3}/g, '')   // 移除代码标记
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接 → 文本
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')  // 移除图片
    .replace(/\n+/g, ' ')     // 换行 → 空格
    .trim()

  if (plainText.length <= maxLength) return plainText
  return plainText.substring(0, maxLength) + '...'
}
```

### 6.3 摘要渲染

```jsx
<p className="text-gray-600 text-sm line-clamp-3">
  {post.summary || readMore(post.content, 120)}
</p>
```

使用 Tailwind 的 `line-clamp-3` 限制最多 3 行显示。

---

## 7. 渲染流程总结

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   管理端编辑     │     │   后端存储       │     │   访客端展示     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│                 │     │                 │     │                 │
│ Textarea 输入   │────►│ SQLite          │────►│ GET /api/posts  │
│ Markdown 文本   │     │ content 字段    │     │                 │
│                 │     │                 │     │ 返回 content    │
│ react-markdown  │     │ article_to_html │     │ + content_html  │
│ 实时预览        │     │ 预渲染 HTML     │     │                 │
│                 │     │ content_html    │     │ dangerouslySet  │
│                 │     │                 │     │ InnerHTML 渲染   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 8. 扩展建议

### 8.1 增加语法高亮

```bash
pip install pygments
```

后端 `article_to_html` 已配置 `codehilite` 扩展，安装 Pygments 后即可自动生效。

前端管理端可集成 `react-syntax-highlighter`：

```bash
npm install react-syntax-highlighter
```

### 8.2 增加数学公式支持

后端：使用 `python-markdown-math` 扩展
前端：使用 `remark-math` + `rehype-katex`

### 8.3 增加目录生成

后端 `toc` 扩展已启用，可在 `content_html` 中生成 `<div class="toc">` 目录结构。访客端需在 PostDetail.jsx 中单独展示目录。

### 8.4 HTML 净化

建议引入 `bleach` 库对 `content_html` 输出进行白名单过滤，防止 XSS。

---

*本文档由 AI 根据项目源码自动生成。*
