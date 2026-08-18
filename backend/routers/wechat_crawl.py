"""
微信公众号文章采集路由
使用 Playwright + Stealth 绕过反爬虫
支持 Markdown 转换、图片下载、预览编辑、确认入库
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import httpx
import re
import os
import uuid
import asyncio
from urllib.parse import urlparse
from datetime import datetime
from bs4 import BeautifulSoup, NavigableString

from database import get_db
from models import Post, Tag, Category
from schemas import PostResponse
from routers.auth import get_current_admin

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("[WeChat] Playwright not available")

try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False
    print("[WeChat] Stealth not available")

router = APIRouter(prefix="/api/wechat-crawl", tags=["wechat-crawl"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "thumbnails"), exist_ok=True)


class WechatCrawlRequest(BaseModel):
    url: str


class WechatSaveRequest(BaseModel):
    title: str
    content: str
    summary: Optional[str] = ""
    cover_image: Optional[str] = ""
    category_id: Optional[int] = None
    tag_names: Optional[List[str]] = []
    source_url: Optional[str] = ""
    author: Optional[str] = ""
    is_draft: Optional[bool] = False


# ============================================================
# 辅助函数
# ============================================================

def is_wechat_url(url: str) -> bool:
    return "mp.weixin.qq.com" in url.lower()


def generate_slug(title: str, suffix: str = "") -> str:
    slug = re.sub(r'[^\w\u4e00-\u9fa5]+', '-', title.strip())
    slug = slug.strip('-').lower()
    if len(slug) > 80:
        slug = slug[:80]
    if not slug:
        slug = "wechat-article"
    if suffix:
        slug = f"{slug}-{suffix}"
    return slug


def remove_empty_paragraphs(soup):
    """移除空的 p 标签"""
    for p in soup.find_all('p'):
        txt = p.get_text(strip=True)
        if not txt:
            imgs = p.find_all('img')
            if not imgs:
                p.decompose()
    return soup


def fix_wechat_code_blocks(soup):
    """
    修复微信代码块：
    <pre class="code-snippet__js"> 里的 <code> 下直接是文本
    或多个 <span class="code-snippet__line">...
    按行拆成多个 code block 以便 markdownify 正确处理
    """
    for pre in soup.find_all('pre', class_=re.compile('code-snippet')):
        code_tag = pre.find('code')
        if not code_tag:
            continue
        # 收集纯文本
        lines = []
        for span in code_tag.find_all('span', class_='code-snippet__line'):
            line_text = span.get_text(separator='', strip=False)
            if line_text:
                lines.append(line_text)
        if lines:
            code_tag.clear()
            for line in lines:
                code_tag.append(NavigableString(line + '\n'))
    return soup


def fix_wechat_images(soup):
    """
    修复微信图片：
    微信文章使用 data-src 存放真实图片URL，src 往往是 svg 占位图。
    把 data-src 复制到 src，让 markdownify 正确识别图片。
    """
    for img in soup.find_all('img'):
        data_src = img.get('data-src', '')
        src = img.get('src', '')
        # data-src 是真实微信图片URL，且 src 不是有效的 http URL
        if data_src and data_src.startswith('http') and (
            not src or src.startswith('data:image') or not src.startswith('http')
        ):
            img['src'] = data_src
        # 清理无意义的占位属性
        if 'data-src' in img.attrs:
            del img['data-src']
    return soup


def convert_html_to_markdown(html: str) -> str:
    """使用 markdownify 将 HTML 转为 Markdown"""
    try:
        import markdownify
    except ImportError:
        # 降级：用 BeautifulSoup 提取纯文本
        soup = BeautifulSoup(html, 'html.parser')
        return soup.get_text(separator='\n\n', strip=True)

    soup = BeautifulSoup(html, 'html.parser')
    soup = fix_wechat_images(soup)
    soup = fix_wechat_code_blocks(soup)
    soup = remove_empty_paragraphs(soup)

    # markdownify 配置
    md = markdownify.markdownify(
        str(soup),
        heading_style="ATX",
        bullets="-",
        strip=['script', 'style', 'iframe', 'noscript']
    )
    # 清理多余空行
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip()


def generate_filename(original_url: str, article_id: str = "") -> str:
    """生成唯一文件名"""
    ext = os.path.splitext(urlparse(original_url).path)[1].lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']:
        ext = '.jpg'
    uid = str(uuid.uuid4())[:8]
    return f"wechat_{article_id}_{uid}{ext}"


async def download_image(url: str, filepath: str, headers: dict) -> bool:
    """下载单张图片"""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(url, headers=headers, follow_redirects=True)
            if r.status_code == 200:
                with open(filepath, 'wb') as f:
                    f.write(r.content)
                return True
    except Exception as e:
        print(f"[WeChat] 下载图片失败 {url}: {e}")
    return False


async def download_all_images(image_tasks: list, headers: dict):
    """并发下载所有图片"""
    async def task_wrapper(task):
        url, filepath = task
        success = await download_image(url, filepath, headers)
        return url, filepath, success

    return await asyncio.gather(*(task_wrapper(t) for t in image_tasks))


# ============================================================
# 核心采集函数
# ============================================================

async def crawl_wechat_article(url: str) -> dict:
    """采集微信公众号文章"""
    if not PLAYWRIGHT_AVAILABLE:
        raise Exception("Playwright 未安装，无法采集微信文章")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
        )
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='zh-CN',
            timezone_id='Asia/Shanghai',
            java_script_enabled=True,
        )
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
            window.chrome = { runtime: {} };
        """)
        page = await context.new_page()
        if STEALTH_AVAILABLE:
            await stealth_async(page)

        try:
            print(f"[WeChat] 访问: {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            await page.wait_for_timeout(3000)

            # 获取标题
            title = ""
            try:
                title = await page.title()
                if title in ["微信公众平台", ""]:
                    h2 = await page.query_selector("#activity_name")
                    if h2:
                        title = await h2.inner_text()
            except:
                pass
            title = title.strip() or "未命名文章"

            # 获取公众号名称
            author = ""
            try:
                name_el = await page.query_selector("#js_name")
                if name_el:
                    author = await name_el.inner_text()
                    author = author.strip()
            except:
                pass

            # 获取正文 HTML
            content_html = ""
            try:
                content_el = await page.query_selector("#js_content")
                if content_el:
                    content_html = await content_el.inner_html()
            except:
                pass

            # 获取封面图
            cover_image = ""
            try:
                meta = await page.query_selector('meta[property="og:image"]')
                if meta:
                    cover_image = await meta.get_attribute("content")
            except:
                pass

            # 获取正文中的图片
            images = []
            if content_html:
                soup = BeautifulSoup(content_html, 'html.parser')
                for img in soup.find_all('img'):
                    src = img.get('data-src') or img.get('src', '')
                    if src and ('mmbiz.qpic.cn' in src or 'mmbiz.qlogo.cn' in src):
                        images.append({
                            'original_url': src,
                            'description': img.get('alt', '')
                        })

            print(f"[WeChat] 标题: {title[:50]}")
            print(f"[WeChat] 作者: {author}")
            print(f"[WeChat] 内容长度: {len(content_html)}")
            print(f"[WeChat] 图片数: {len(images)}")

            return {
                "title": title,
                "content_html": content_html,
                "author": author,
                "cover_image": cover_image,
                "images": images,
            }

        finally:
            await browser.close()


# ============================================================
# 图片下载处理
# ============================================================

async def process_images(images: list, article_id: str) -> dict:
    """下载图片并返回 URL 映射"""
    if not images:
        return {}

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://mp.weixin.qq.com/",
    }

    tasks = []
    url_map = {}
    for img in images:
        original_url = img['original_url']
        filename = generate_filename(original_url, article_id)
        filepath = os.path.join(UPLOADS_DIR, filename)
        tasks.append((original_url, filepath))
        url_map[original_url] = f"/uploads/{filename}"

    results = await download_all_images(tasks, headers)

    # 过滤失败的
    for original_url, filepath, success in results:
        if not success and os.path.exists(filepath):
            os.remove(filepath)
        if not success:
            # 保留原 URL
            url_map[original_url] = original_url

    return url_map


# ============================================================
# API 端点
# ============================================================

@router.post("/preview")
async def preview_wechat(request: WechatCrawlRequest):
    """第1步：采集并返回预览数据"""
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL 不能为空")
    if not is_wechat_url(url):
        raise HTTPException(status_code=400, detail="不是微信公众号文章链接")

    try:
        result = await crawl_wechat_article(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"采集失败: {str(e)}")

    if not result['content_html']:
        raise HTTPException(status_code=500, detail="未能获取到文章内容，可能需要等待页面加载或文章已被删除")

    # 转换为 Markdown（预览阶段不下载图片，保留原始 URL）
    md_content = convert_html_to_markdown(result['content_html'])

    # 提取摘要（前200字符）
    plain = BeautifulSoup(result['content_html'], 'html.parser').get_text(strip=True)
    summary = plain[:200] if len(plain) > 200 else plain

    return {
        "title": result['title'],
        "content_md": md_content,
        "summary": summary,
        "author": result['author'],
        "cover_image": result['cover_image'],
        "images": result['images'],
        "source_url": url,
    }


@router.post("/save")
async def save_wechat(request: WechatSaveRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    """第2步：确认入库（下载图片、替换URL、保存文章）"""

    # 生成唯一 article_id 用于图片命名
    article_id = str(uuid.uuid4())[:8]

    # 从 content 中提取所有微信图片 URL
    image_urls = re.findall(
        r'https?://mmbiz\.(?:qpic|qlogo)\.cn/[^\s\)"\'>\]]+',
        request.content
    )

    # 去重
    unique_urls = list(set(image_urls))
    images_info = [{'original_url': u, 'description': ''} for u in unique_urls]

    # 下载图片
    url_map = await process_images(images_info, article_id)

    # 替换 content 中的图片 URL
    final_content = request.content
    for original_url, local_url in url_map.items():
        final_content = final_content.replace(original_url, local_url)

    # 替换封面图
    final_cover = request.cover_image
    if final_cover and 'mmbiz' in final_cover:
        # 封面图也下载
        cover_filename = generate_filename(final_cover, article_id)
        cover_filepath = os.path.join(UPLOADS_DIR, cover_filename)
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Referer": "https://mp.weixin.qq.com/",
        }
        success = await download_image(final_cover, cover_filepath, headers)
        if success:
            final_cover = f"/uploads/{cover_filename}"

    # 生成 slug
    base_slug = generate_slug(request.title, article_id)
    slug = base_slug
    counter = 1
    while db.query(Post).filter(Post.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # 创建文章
    is_draft = request.is_draft if request.is_draft is not None else False
    post = Post(
        title=request.title,
        slug=slug,
        content=final_content,
        summary=request.summary or "",
        cover_image=final_cover or "",
        is_published=not is_draft,
        is_draft=is_draft,
    )

    # 分类
    if request.category_id:
        category = db.query(Category).filter(Category.id == request.category_id).first()
        if category:
            post.category = category

    # 标签
    if request.tag_names:
        for tag_name in request.tag_names:
            tag_name = tag_name.strip()
            if not tag_name:
                continue
            tag = db.query(Tag).filter(Tag.name == tag_name).first()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
                db.flush()
            post.tags.append(tag)

    db.add(post)
    db.commit()
    db.refresh(post)

    return {
        "success": True,
        "message": "文章已保存",
        "post": {
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
        }
    }
