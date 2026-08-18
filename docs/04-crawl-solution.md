# 文章采集方案详解

> **文档状态**：采集功能的设计与实现说明，已按当前代码修订（HTTP 引擎为 `requests`，浏览器渲染为可选的 Playwright；站点提取策略链见 `crawl_strategies.py`）。

本文档详细介绍个人博客 CMS 系统中的三种文章采集方案，包括技术选型、实现原理、各平台适配策略，以及前端交互流程。

## 一、总体架构

系统提供 **三种采集入口**，对应不同的技术策略和适用场景：

| 采集方案 | 前端入口 | 后端路由 | 核心引擎 | 适用场景 |
|---------|---------|---------|---------|---------|
| **通用网页采集**（方案一） | "采集文章" | `/api/crawl/` | `requests` + `Playwright` | 传统网站：人人都是产品经理、博客园、菜鸟教程等 |
| **微信公众号采集**（方案二） | "公众号采集" | `/api/wechat-crawl/` | `Playwright` + `playwright_stealth` | 微信公众号文章（`mp.weixin.qq.com`） |
| **通用采集**（方案三） | "通用采集" | `/api/universal-crawl/` | `requests` + `Playwright` | 新一代技术社区：InfoQ、掘金、CSDN、51CTO、博客园等 |

三种方案的前端交互流程完全一致（输入 URL → 预览 → 编辑 → 保存入库），区别仅在于后端采集引擎和平台适配策略。

## 二、方案一：通用网页采集（`crawl.py`）

这是系统最早实现的采集方案，采用**多引擎组合**策略，根据目标站点的特征选择最合适的请求方式。

### 2.1 技术栈

- **HTTP 请求**：`requests`（默认）
- **浏览器渲染**：`Playwright`（用于 SPA/JS 渲染型站点）
- **HTML 解析**：`BeautifulSoup`（`lxml` 加速）
- **Markdown 转换**：`markdownify`（备选）+ 自研 `html_to_markdown`（主用）

### 2.2 核心流程

```
1. 提取标题          → extract_title_from_html(html)
2. 判断站点类型       → is_spa_site(html) ? SPA : 传统站点
3. 获取页面 HTML      → requests / Playwright
4. 提取主要内容       → extract_main_content(html) / convert_spa_html_to_markdown()
5. 修复编码乱码       → fix_encoding(text)
6. HTML 转 Markdown   → html_to_markdown(html, url)
7. 提取文章图片       → extract_images(html, url)
8. 下载图片到本地     → download_image() / download_all_images()
9. 替换 Markdown 中的图片 URL 为本地路径
10. 保存到数据库
```

### 2.3 引擎选择策略

系统根据目标域名自动判断使用哪个引擎获取 HTML：

```python
# 强制使用 Playwright 的域名（SPA / JS 渲染 / 反爬严格）
browser_domains = [
    'mp.weixin.qq.com',    # 微信公众号
    'juejin.cn',           # 掘金
    'zhihu.com',           # 知乎
    'segmentfault.com',    # SegmentFault
    'infoq.cn',            # InfoQ
]

# 默认使用 requests（高性能、带浏览器指纹）
# 备选 requests（纯文本站点）
```

### 2.4 平台专用适配

`extract_main_content()` 内置了多个平台的 CSS 选择器优先级列表：

| 平台 | 选择器 | 说明 |
|------|--------|------|
| 人人都是产品经理 | `.article--content.grap` | 文章正文区域 |
| 博客园 | `#cnblogs_post_body` | 博客正文容器 |
| 菜鸟教程 | `.article-intro` | 教程内容区域 |
| 掘金 | `article` | 文章标签 |
| 通用 | `article`, `main`, `.post-content`, `.article-content`, `.entry-content`, `#content` | 回退选择器 |

如果 BeautifulSoup 解析失败，系统会回退到**正则表达式匹配**。

### 2.5 上层业务逻辑

#### 2.5.1 编码修复（`fix_encoding`）

处理 UTF-8 内容被错误解码为 Latin-1 的情况（常见于老旧网站或代理转发），支持**单层修复**和**双重编码修复**：

```python
# 检测乱码特征：Ã©, Ã¨, Ã, Â, Ã¥, â€, æ, å, è, § 等
garbled_patterns = ['Ã©', 'Ã¨', 'Ã', 'Â', 'Ã¥', 'Ã¼', 'Ã¶', 'Ã¤', 'ÃŸ', 'â€', 'æ', 'å', 'è', '§']

# 单层修复：latin1 → utf-8
text.encode('latin1').decode('utf-8')

# 双重编码修复：utf-8 → latin1 → utf-8 → latin1 → utf-8
text.encode('utf-8').decode('latin1').encode('latin1').decode('utf-8')
```

#### 2.5.2 数学公式修复（`fix_math_formulas`）

检测 Markdown 中混排的 LaTeX 数学公式，进行规范化包裹：

- **块级公式**（含 `\begin{array}`, `\sum_`, `\int_`, `\frac`, `\prod`, `\lim`, `\mathbf`, `\alpha`, `\beta`, `\gamma` 等）→ 用 `$$...$$` 包裹
- **行内公式**（含 `_{`, `^{`, `\mathbf`, `\alpha`, `\sum`, `\int`, `\frac`, `\sqrt`, `\lim`, `\prod`, `\binom`, `\overline`, `\underline`, `\widehat`, `\widetilde`, `\mathcal`, `\mathbb` 等）→ 用 `\(...\)` 包裹
- 清理已渲染的 Unicode 数学运算符
- 规范化双重反斜杠为单重

#### 2.5.3 HTML → Markdown 转换（`html_to_markdown`）

自研转换器，支持以下标签：

- `<img>` → `![alt](url)`，自动将相对 URL 转为绝对 URL
- `<h1>`~`<h6>` → `#` ~ `######`
- `<p>` → 段落文本
- `<pre><code>` → 代码块（自动识别 `language-xxx` 类名）
- `<code>` → 行内代码
- `<strong>`, `<b>` → `**粗体**`
- `<em>`, `<i>` → `*斜体*`
- 修复混合内容问题（HTTPS 页面中的 HTTP 图片自动升级）
- 处理 HTML 实体（`&nbsp;`, `&lt;`, `&gt;` 等）

#### 2.5.4 图片下载（`download_image`）

- 下载图片统一使用 `requests`（携带 UA / Referer 头）
- 限制最大 10MB，超时 15 秒
- 生成唯一文件名：`{timestamp}_{hash[:8]}{ext}`
- 保存到 `uploads/` 目录
- 保存后返回本地 URL 映射表

### 2.6 已知局限

- 对 InfoQ 的 `.ProseMirror` 容器支持不够精细，会混入导航噪声
- 对掘金、CSDN、51CTO 等平台无专用提取逻辑，正文可能夹杂大量 UI 元素
- 对知乎无登录态支持，无法采集

---

## 三、方案二：微信公众号文章采集（`wechat_crawl.py`）

专门针对微信公众号文章（`mp.weixin.qq.com`）设计的采集方案，处理微信特有的反爬机制和页面结构。

### 3.1 技术栈

- **浏览器引擎**：`Playwright` + `playwright_stealth`（反检测）
- **HTML 解析**：`BeautifulSoup`
- **Markdown 转换**：`markdownify` + 自研微信专用修复函数

### 3.2 核心流程

```
1. Playwright 打开微信文章 URL（wait_until="networkidle", 60s 超时）
2. 注入反检测脚本（隐藏 webdriver、伪造插件列表、模拟 chrome.runtime）
3. 启用 playwright_stealth（如果可用）
4. 提取标题（优先 page.title()，回退到 #activity_name）
5. 提取公众号名称（#js_name）
6. 提取正文 HTML（#js_content）
7. 提取封面图（og:image meta）
8. 提取文章内图片（data-src 属性）
9. 微信专用 HTML 修复
10. 转换为 Markdown
11. 预览 → 下载图片（带 Referer 防盗链） → 入库
```

### 3.3 微信专用处理

#### 3.3.1 data-src 修复（`fix_wechat_images`）

微信文章使用 `data-src` 存放真实图片 URL，`src` 往往是 SVG 占位图或空值：

```python
for img in soup.find_all('img'):
    data_src = img.get('data-src', '')
    src = img.get('src', '')
    # data-src 是真实 URL，且 src 不是有效的 http URL
    if data_src and data_src.startswith('http') and (
        not src or src.startswith('data:image') or not src.startswith('http')
    ):
        img['src'] = data_src
    # 清理无意义的占位属性
    del img['data-src']
```

#### 3.3.2 代码块修复（`fix_wechat_code_blocks`）

微信代码块使用 `<pre class="code-snippet__js">` + `<code>` + `<span class="code-snippet__line">` 结构，需要按行重组：

```python
for pre in soup.find_all('pre', class_=re.compile('code-snippet')):
    code_tag = pre.find('code')
    lines = []
    for span in code_tag.find_all('span', class_='code-snippet__line'):
        lines.append(span.get_text(separator='', strip=False))
    code_tag.clear()
    for line in lines:
        code_tag.append(NavigableString(line + '\n'))
```

#### 3.3.3 空段落清理（`remove_empty_paragraphs`）

移除没有文本内容也没有图片的空 `<p>` 标签。

#### 3.3.4 微信图片防盗链绕过

微信图片服务器（`mmbiz.qpic.cn`）对直接访问会返回 403，必须在请求头中带上 `Referer`：

```python
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://mp.weixin.qq.com/",   # 关键！
}
```

下载时通过 `requests` 发送带 Referer 的请求，成功后将图片保存到本地。

### 3.4 测试结果

微信公众号文章采集**测试通过**，标题、正文、代码块、图片均能正常采集。腾讯的反爬策略主要集中在异常流量检测，Playwright + stealth 组合可以稳定绕过。

---

## 四、方案三：通用采集（`universal_crawl.py`）

这是为**新一代技术社区**专门设计的采集方案，核心理念是**"专用选择器提取 + 复用上层业务逻辑"**。

### 4.1 设计目标

- 针对各平台页面结构差异大、通用提取效果差的问题
- 为每个主流平台编写专用 CSS 选择器，精准提取正文
- 复用 `crawl.py` 中已验证成熟的上层业务逻辑（编码修复、数学公式、HTML→Markdown、图片下载）
- 保持与方案一/方案二完全一致的前端交互流程

### 4.2 技术栈

- **HTTP 请求**：`requests`（默认）+ `Playwright`（SPA / 反爬严格站点）
- **HTML 解析**：`BeautifulSoup`（`lxml` 加速）
- **上层逻辑**：全部从 `crawl.py` 复用：`extract_title_from_html`、`fix_encoding`、`fix_math_formulas`、`html_to_markdown`、`extract_images`、`extract_images_from_markdown`、`download_image`、`download_all_images`

### 4.3 引擎选择策略

```python
browser_domains = [
    'mp.weixin.qq.com',    # 微信公众号
    'juejin.cn',           # 掘金（JS 渲染）
    'zhihu.com',           # 知乎（未登录无法采集）
    'segmentfault.com',    # SegmentFault（WAF 拦截）
    'infoq.cn',            # InfoQ（JS 渲染）
    '51cto.com',           # 51CTO（JS 渲染）
]
```

对于非 browser_domains 的站点，默认使用 `requests` 获取 HTML，性能更好。

### 4.4 Playwright 反爬配置

通用采集的 Playwright 配置比方案一更完善：

```python
browser = await p.chromium.launch(
    headless=True,
    args=[
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-dev-shm-usage",
        "--no-sandbox",
    ]
)
context = await browser.new_context(
    user_agent="...Chrome/120.0.0.0 Edg/120.0.0.0...",
    viewport={"width": 1920, "height": 1080},
    locale="zh-CN",
    timezone_id="Asia/Shanghai",
    extra_http_headers={
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    },
)
```

对于知乎，采用**先访问首页建立 Cookie，再跳转目标页面**的策略：

```python
if 'zhihu.com' in url:
    await page.goto("https://www.zhihu.com", wait_until="domcontentloaded", timeout=15000)
    await asyncio.sleep(2)
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await asyncio.sleep(3)
    # 等待正文加载
    await page.wait_for_selector(".Post-RichTextContainer, .RichContent-inner", timeout=10000)
```

### 4.5 平台专用适配

#### 4.5.1 专用内容提取

| 平台 | 主选择器 | 备选选择器 | 说明 |
|------|---------|-----------|------|
| **InfoQ** | `.ProseMirror` | `article` | InfoQ 使用 ProseMirror 编辑器渲染正文，包含干净的结构化内容 |
| **掘金** | `article.article` | `.article-viewer`, `#article-root` | 掘金文章正文在 `<article class="article">` 中 |
| **CSDN** | `#content_views` | `.article_content` | CSDN 正文主容器，排除侧边栏、评论等噪声 |
| **博客园** | `#cnblogs_post_body` | `.postBody` | 博客园经典正文容器 |
| **51CTO** | `.article-content` | `article` | 51CTO 文章正文区域 |

#### 4.5.2 专用标题提取

各平台 `<title>` 标签通常包含站点后缀，需要清洗：

| 平台 | 清洗规则 |
|------|---------|
| **InfoQ** | 去掉 `" - InfoQ"` 后缀 |
| **掘金** | 去掉 `" - 掘金"` 后缀 |
| **CSDN** | 去掉 `"-CSDN博客"` / `" - CSDN博客"` 后缀 |
| **博客园** | 去掉 `" - 博客园"` 后缀 |
| **51CTO** | 去掉 `"-51CTO.COM"` 后缀 |

#### 4.5.3 图片过滤

各平台正文容器中常常混入 UI 图标（收藏、点赞、logo、二维码等），需要过滤：

| 平台 | 过滤规则 |
|------|---------|
| **CSDN** | 跳过 `newHeart2023`、`tobarCollect`、`tobarCollection`、`copyright`、`avatar`、`blogv2/dist/pc/img` 等关键词的图片 |
| **博客园** | 跳过 `assets.cnblogs.com/logo`、`assets.cnblogs.com/icons`、`skins/custom/images/logo` |
| **51CTO** | 跳过公众号矩阵二维码（`oss/202302`）、软考二维码（`oss/202408`）、顶部横幅（`oss/202506/06`）、APP 下载图（`oss/202302/07`） |

### 4.6 测试结果汇总

| 平台 | 测试链接 | 结果 | 正文长度 | 图片数 | 说明 |
|------|---------|------|---------|--------|------|
| **微信公众号** | `mp.weixin.qq.com/s/...` | ✅ 正常 | ~6000 | 24 | Playwright + stealth 稳定采集，防盗链通过 |
| **InfoQ** | `infoq.cn/article/...` | ✅ 正常 | ~9000 | 2 | `.ProseMirror` 精准提取，无导航噪声 |
| **掘金** | `juejin.cn/post/...` | ✅ 正常 | ~6253 | 26 | `article.article` 精准提取，JS 渲染正常 |
| **CSDN** | `blog.csdn.net/...` | ✅ 正常 | ~9678 | 91 | `#content_views` 精准提取，过滤 UI 图标 |
| **博客园** | `cnblogs.com/...` | ✅ 正常 | ~17092 | 17 | `#cnblogs_post_body` 精准提取，过滤 logo |
| **51CTO** | `51cto.com/article/...` | ✅ 正常 | ~14177 | 36 | `.article-content` 精准提取，过滤广告二维码 |
| **知乎** | `zhuanlan.zhihu.com/...` | ❌ 失败 | — | — | 强制登录，未登录跳转登录页，无法采集 |
| **SegmentFault** | `segmentfault.com/...` | ❌ 失败 | — | — | 雷池 WAF 拦截，返回 "客户端异常，请确认您是合法用户" |

#### 详细说明

**✅ 微信公众号**
- 使用 Playwright + `playwright_stealth` 模拟真实浏览器
- 注入反检测脚本隐藏 `navigator.webdriver`
- 图片使用 `data-src` 修复，下载时带 `Referer: https://mp.weixin.qq.com/` 绕过防盗链
- 代码块、空段落、标题均处理正常

**✅ InfoQ**
- InfoQ 页面使用 JS 渲染，必须走 Playwright
- 通用提取会把导航栏、推荐阅读等混入正文（37265 字符）
- 使用 `.ProseMirror` 专用选择器后，正文精简到 9000 字符，完全无噪声

**✅ 掘金**
- 掘金是 SPA，必须走 Playwright
- 通用提取会混入头部导航和底部推荐
- 使用 `article.article` 专用选择器后，正文从导航处开始，干净整洁

**✅ CSDN**
- CSDN 页面为服务端渲染，可用 requests 获取
- 通用提取会混入收藏按钮、版权声明、专栏信息、相关推荐等
- 使用 `#content_views` 专用选择器 + UI 图标过滤后，正文从第一张图开始

**✅ 博客园**
- 博客园页面为服务端渲染，可用 requests 获取
- 通用提取混入博客园 logo、会员周边、搜索栏、用户头像等
- 使用 `#cnblogs_post_body` 专用选择器 + logo 过滤后，正文干净

**✅ 51CTO**
- 51CTO 使用 JS 渲染，必须走 Playwright
- 通用提取混入首页导航、AI 社区、博客学堂、公众号矩阵二维码等
- 使用 `.article-content` 专用选择器 + 二维码过滤后，正文从编辑信息开始

**❌ 知乎**
- 知乎对所有未登录的浏览器请求强制跳转登录页
- 即使先访问首页建立 Cookie、使用 stealth、调整 viewport 均无效
- 这是知乎的反爬策略，与采集工具无关，必须提供登录态 Cookie 才能解决

**❌ SegmentFault**
- SegmentFault 部署了**雷池 WAF**（SafeLine Web Application Firewall）
- 无论 requests（多种浏览器指纹）还是 Playwright（先访问首页建立信任）均被拦截
- 返回 HTTP 468 + "安全检测能力由 雷池 WAF 驱动 / 客户端异常，请确认您是合法用户"
- 可能需要更换代理 IP 或使用更高级的设备指纹模拟才能绕过

### 4.7 扩展新平台的方法

要为新平台添加支持，只需在 `universal_crawl.py` 中完成四步：

1. **判断域名**：在 `fetch()` 中添加 `is_xxx = 'xxx.com' in url`
2. **提取标题**：编写 `_extract_xxx_title(html)` 函数，清洗 `<title>` 后缀
3. **提取正文**：编写 `_extract_xxx_content(html)` 函数，返回精准容器的 HTML
4. **过滤图片**（可选）：编写 `_filter_xxx_images(images)` 函数，过滤 UI 图标
5. **接入主流程**：在 `fetch()` 的标题提取、正文转换、图片过滤三个分支中加入新平台

不需要修改 `html_to_markdown`、`fix_encoding`、`fix_math_formulas` 等上层逻辑，它们对所有平台通用。

> ⚠️ **注意**：上述「四步接入新平台」的方式正在被第八章的**策略化重构**取代。新方案下新增平台只需写一个策略类并注册，不再需要修改 `fetch()` 主流程。

---

## 五、三种方案对比

| 维度 | 方案一（通用网页） | 方案二（公众号） | 方案三（通用采集） |
|------|------------------|----------------|------------------|
| **目标站点** | 人人都是产品经理、博客园、菜鸟教程 | 微信公众号 | InfoQ、掘金、CSDN、博客园、51CTO |
| **核心引擎** | requests / Playwright | Playwright + stealth | requests / Playwright |
| **平台适配** | 通用选择器（CSS + 正则回退） | 微信专用（data-src、代码块、防盗链） | 各平台专用选择器 |
| **编码修复** | ✅ | ❌（微信无此问题） | ✅（复用方案一） |
| **数学公式** | ✅ | ❌（微信无此问题） | ✅（复用方案一） |
| **图片下载** | ✅ 通用 | ✅ 微信防盗链 | ✅（复用方案一） |
| **SPA 支持** | ✅ | ✅（必须） | ✅ |
| **扩展性** | 修改通用选择器列表 | 固定（仅微信） | 新增平台只需四步 |

---

## 六、前端交互流程

三种采集方案的前端页面结构完全一致（`CrawlEdit.jsx` / `WechatCrawlEdit.jsx` / `UniversalCrawlEdit.jsx`），交互流程为：

```
┌─────────────────────────────────────────┐
│  步骤1：输入 URL                          │
│  ├─ 文本框输入文章链接                     │
│  └─ "采集预览" 按钮                        │
├─────────────────────────────────────────┤
│  步骤2：预览采集结果                       │
│  ├─ 显示文章标题（可编辑）                  │
│  ├─ 显示 Markdown 正文（可编辑）            │
│  ├─ 显示图片列表（可删除）                  │
│  └─ 侧边栏显示文章元信息                    │
├─────────────────────────────────────────┤
│  步骤3：编辑与调整                         │
│  ├─ 修改标题                              │
│  ├─ 修改正文（Markdown 编辑器）             │
│  ├─ 删除不需要的图片                        │
│  └─ 选择文章分类                           │
├─────────────────────────────────────────┤
│  步骤4：保存入库                           │
│  ├─ "保存文章" 按钮                        │
│  ├─ 后端下载图片到本地                      │
│  ├─ 替换 Markdown 中的图片 URL              │
│  └─ 写入 SQLite 数据库                      │
└─────────────────────────────────────────┘
```

API 调用时序：

```
POST /api/{scheme}/preview    → 采集并返回预览数据（标题、正文、图片列表）
POST /api/{scheme}/save       → 确认保存（下载图片、替换 URL、入库）
```

其中 `{scheme}` 对应三种方案：`crawl`（方案一）、`wechat-crawl`（方案二）、`universal-crawl`（方案三）。

---

## 七、总结与建议

### 7.1 使用建议

| 场景 | 推荐方案 |
|------|---------|
| 微信公众号文章 | 方案二（公众号采集） |
| InfoQ、掘金、CSDN、博客园、51CTO | 方案三（通用采集） |
| 人人都是产品经理、菜鸟教程 | 方案一（通用网页采集） |
| 其他未知站点 | 先尝试方案三，失败再尝试方案一 |

### 7.2 未来优化方向

1. **知乎登录态支持**：通过 Cookie 池或扫码登录获取知乎登录态，解决知乎采集问题
2. **SegmentFault 绕过**：尝试更换出口 IP 或更高级的设备指纹模拟
3. **自动平台识别**：通过页面特征自动判断站点类型，减少人工选择采集方案的步骤
4. **智能摘要生成**：接入大模型 API，对采集内容自动生成摘要和标签
5. **更多平台适配**：根据使用需求，逐步添加开源中国（oschina）、简书（jianshu）等平台（见第八章策略化方案，新增平台只需注册一个策略类）

---

## 八、站点提取策略化重构（v2，进行中）

> 本文档是既有采集方案的**增量演进**，目标是把散落在三个文件里的站点特判逻辑收敛为**策略注册表**，同时保证线上行为零回归。现有逻辑全部保留，作为旧轨（Legacy）参与双轨调度。

### 8.1 背景与动机

现状盘点：站点特判逻辑分散在三个文件，且同一站点在不同入口**各写了一遍**：

| 文件 | 站点特判位置 | 涉及的站点 |
|------|------------|-----------|
| `crawl.py` | `crawl_with_playwright()`（约 796-1451 行） | 微信、腾讯云、飞书、yiigle、掘金、SegmentFault、InfoQ、CSDN、博客园 + eeworld 强制 Playwright |
| `universal_crawl.py` | `universal_fetch()`（约 378-480 行） | InfoQ、掘金、CSDN、博客园、51CTO + `_needs_browser()` 直通列表 |
| `wechat_crawl.py` | 独立路由，专用采集器 | 仅微信（独立 preview/save 流程） |

痛点：

- 同一站点（如掘金）在 `crawl.py` 和 `universal_crawl.py` 各有一套选择器和标题清洗规则，改一处忘另一处
- 新增站点要在标题提取、正文转换、图片过滤三个分支各改一次，容易漏
- 选择器、过滤规则、跳转策略（先访问首页建 cookie 等）与主流程强耦合，无法单独测试

### 8.2 设计：SiteExtractor 抽象基类

新增文件 `backend/routers/crawl_strategies.py`（纯新增，不删不改现有逻辑），借鉴 crawl4ai 的 `ContentScrapingStrategy(ABC)` / `MarkdownGenerationStrategy(ABC)` 接口思想：

```python
class SiteExtractor(ABC):
    name: str                                  # 站点名（日志/调试用）
    @abstractmethod
    def match(self, url: str) -> bool: ...     # URL 是否命中该站点
    def needs_browser(self, url: str) -> bool: return False  # 是否需要 Playwright
    def extract_title(self, html: str, url: str) -> Optional[str]: return None
    def extract_content_html(self, html: str, url: str) -> str: return html  # 返回正文容器 HTML
    def filter_images(self, images: list, url: str) -> list: return images   # 过滤 UI 图标
    def to_markdown(self, content_html: str, url: str, images: list) -> str: return html_to_markdown(...)
```

每个策略类的内部逻辑 = **现有代码原样搬迁**（如 `JuejinExtractor` 直接搬 `_extract_juejin_title` / `_extract_juejin_content`），行为零改动。

### 8.3 策略注册表与双轨降级

`SITE_EXTRACTORS = [JuejinExtractor, CsdnExtractor, ...]` 为有序注册表，末尾挂 `GenericExtractor`（通用兜底）。

双轨调度的**优先级由配置决定**，两种顺序都支持：

```
STRATEGY_FIRST_DOMAINS = set()   # 试点白名单，默认空

crawl 流程:
  提取 extractor = get_extractor_for_url(url)
  若 url 命中白名单  → 轨B优先（新策略）→ 质量不达标回退轨A（旧逻辑）
  否则               → 轨A优先（旧逻辑）→ 失败/过短时兜底轨B（新策略）
```

| 顺序 | 配置 | 适用场景 |
|------|------|---------|
| **旧→新**（默认） | `STRATEGY_FIRST_DOMAINS` 为空 | 线上行为零回归，新策略仅作兜底 |
| **新→旧**（试点） | 白名单加入该域名，如 `{"juejin.cn"}` | 新策略优先，质量不合格自动回退旧逻辑 |

**质量门控**（fallback 判据，复用现有「内容过短」经验）：

- 策略抛异常
- 标题为空或等于「未获取到标题」
- Markdown 内容 < 300 字符
- 图片数为 0（可选判据，默认关闭）

### 8.4 落地步骤与状态

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | 新建 `crawl_strategies.py`：抽象基类 + 注册表 + GenericExtractor（纯新增，不影响线上） | ✅ 完成 |
| 2 | 原样搬迁 Juejin / CSDN 两个策略，单测断言与旧逻辑输出一致 | ✅ 完成 |
| 3 | `universal_fetch()` 接入双轨调度：旧逻辑包成 `_legacy_extract()`，加 `STRATEGY_FIRST_DOMAINS` 开关，默认走旧轨 | ✅ 完成 |
| 4 | 试点验证（掘金/CSDN 加入白名单，对比新旧采集结果），确认后推广到 `crawl.py` Playwright 轨、wechat 轨 | ⏳ 待用户确认 |

### 8.5 wechat_crawl.py 是否需要更新？

**不需要**（本阶段）。原因：

1. `wechat_crawl.py` 是独立路由 `/api/wechat-crawl/`，有自己的 preview/save 两阶段流程，是「微信专用采集器」而非「散落的站点特判逻辑」，不存在重复规则问题
2. 微信的提取逻辑会以 `WechatExtractor` 策略类形式注册到 `crawl_strategies.py`，供通用入口（`universal_fetch` / `crawl_article`）遇到微信 URL 时兜底复用——这是**新增复用**，不改动 wechat_crawl.py 本体
3. 若未来想让 wechat_crawl.py 内部也复用策略类，属于可选优化（消除与 crawl.py 微信段的重复），不在本次重构范围

---

## 九、正文噪音过滤（Pruning 思路，已落地）

### 9.1 背景与动机

HTML → Markdown 转换面对的是整页 DOM，导航栏、侧栏、评论区、相关推荐、
广告等噪音容器会一并进入正文 Markdown，污染文章内容（CSDN 实测整页文本
7505 字符，正文仅 2714 字符，噪音占 64%）。

参考 crawl4ai 的 PruningContentFilter（crawl4ai/crawl4ai/content_filter_strategy.py）实现本地化方案。

### 9.2 评分模型

对 DOM 递归评分，低于阈值删除：

```
score = 0.4*text_density + 0.2*link_density + 0.2*tag_weight
        + 0.1*class_id_weight + 0.1*text_length
```

- `text_density` = 节点文本 / 节点 HTML 长度，越纯文本越高
- `link_density` = 1 - 链接文本占比，链接越少越像正文
- `tag_weight`：p/article/section/main=1.0~1.5，div/li/td=0.5
- `text_length` = min(log(文本长度+1), 5.0)，长度项封顶

### 9.3 相对 crawl4ai 原版的两处修正

1. **长度项封顶 5.0**：原版 `log(text_len+1)` 无上限，超大噪音容器
   （如 3600+ 字符的相关推荐列表）得分 0.90 远超阈值 0.48 而残留；
   封顶后大容器不再因体量大而误判为正文。
2. **负面类名硬删**：原版对命中负面模式（recommend/comment/sidebar/ads…）
   的类名仅 -0.5 小惩罚；本实现直接删除整个子树，因为类名/ID 命中
   负面模式的容器几乎必然是噪音。

### 9.4 安全兜底（质量门控）

剪枝后若正文文本 < 300 字符，或 < 原文本的 20%，判定为疑似误删，
回退返回原 HTML。对已定位正文容器的局部 HTML（如 CSDN `#content_views`）
调用时无副作用，正文容器内节点评分普遍高于阈值。

### 9.5 接入点（crawl.py + universal_crawl.py）

新增 `backend/routers/content_prune.py`，`prune_html_noise()` 在**两个
HTML → Markdown 转换函数的统一入口**调用（`fix_encoding` 之后）：

- `crawl.py::html_to_markdown()` —— 覆盖 `/api/crawl/` 旧轨
- `crawl.py::convert_spa_html_to_markdown()` —— 覆盖 Playwright SPA 轨

`universal_crawl.py` 的 `_legacy_extract()` 调用上述两个函数（站点特判
分支传已提取的正文容器，SPA/通用分支传整页），**自动获得剪枝，无需
重复调用**（避免双重剪枝开销），仅在调用处加注释说明。

策略轨（`run_extractor → extractor.to_markdown`）同样经由 `crawl.py`
转换函数获得剪枝。

### 9.6 验证结果

- 真实 CSDN 文章页：7505 → 2817 字符（-62%），`#content_views` 正文
  保留率 99.8%，博主/评论/点赞/分享/扫码等噪音关键词全部删除
- 构造页面：导航/相关推荐/侧栏/评论区全部删除，正文与 `<pre><code>` 保留
- 质量门控：剪后 2817 > 300 且 38% > 20%，正常通过
- `test_crawl_strategies.py` + `test_crawl.py` 回归：6 passed，无回归
