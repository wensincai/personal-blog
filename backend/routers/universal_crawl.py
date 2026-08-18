"""
通用采集路由 - 基于 Scrapling 引擎
结合上层业务逻辑：编码修复、数学公式处理、微信防盗链、图片下载等
"""

import os
import re
import sys
import uuid
import asyncio
import tempfile
import base64
from datetime import datetime
from typing import Optional, List
from urllib.parse import urljoin, urlparse
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup

# Scrapling 引擎（可选依赖）：缺少时 _fetch_with_scrapling 报错，
# 调用方回退到原生 Playwright / requests 路径，不影响应用启动。
try:
    from scrapling import Fetcher, StealthyFetcher
    SCRAPLING_AVAILABLE = True
except ImportError:
    Fetcher = None
    StealthyFetcher = None
    SCRAPLING_AVAILABLE = False

# 策略化重构（v2）：站点提取策略注册表 + 双轨调度
from .crawl_strategies import (
    get_extractor_for_url,
    is_strategy_first,
    run_extractor,
    is_strategy_success,
)

# 复用 crawl.py 的通用工具函数
from .crawl import (
    fix_encoding,
    fix_math_formulas,
    html_to_markdown,
    extract_title_from_html,
    extract_main_content,
    download_image,
    extract_images,
    extract_images_from_markdown,
    is_spa_site,
    convert_spa_html_to_markdown,
    CrawlRequest,
    CrawlResponse,
    CrawlImage,
)


class CrawlSaveRequest(BaseModel):
    """通用采集保存请求"""
    title: str
    content: str
    content_html: Optional[str] = ""
    images: List[CrawlImage] = []
    summary: Optional[str] = ""
    category_id: Optional[int] = None
    is_draft: bool = True
    is_published: bool = False
    tags: Optional[List[str]] = []
    source_url: Optional[str] = None

# 复用图片处理
from .images import generate_thumbnail, get_image_dimensions

# 数据库
from database import get_db
from models import Post, Category, Tag, PostTag, Image

router = APIRouter(prefix="/api/universal-crawl", tags=["通用采集"])

# 确保上传目录存在
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
TEMP_DIR = Path("uploads/temp_crawl")
TEMP_DIR.mkdir(exist_ok=True)


class UniversalCrawlRequest(BaseModel):
    url: str


def _needs_browser(url: str) -> bool:
    """判断是否需要使用浏览器渲染"""
    domain = urlparse(url).netloc.lower()
    browser_domains = [
        'mp.weixin.qq.com',
        'juejin.cn',
        'zhihu.com',
        'segmentfault.com',
        'infoq.cn',
        'infoq.com',
        '51cto.com',
        'eeworld.com.cn',   # JS WAF 防护，必须用浏览器渲染
    ]
    return any(d in domain for d in browser_domains)


def _fetch_with_scrapling(url: str) -> str:
    """使用 Scrapling Fetcher (curl_cffi) 获取页面"""
    if not SCRAPLING_AVAILABLE:
        raise Exception("Scrapling 引擎未安装（pip install scrapling），请使用 Playwright 路径")
    fetcher = Fetcher()
    response = fetcher.get(url)
    if response.status != 200:
        raise Exception(f"HTTP {response.status}: {response.reason}")
    # Scrapling Response 的 text 属性返回解析后的文本，html_content 返回原始 HTML
    return response.html_content if hasattr(response, 'html_content') else response.text


async def _fetch_with_stealth(url: str) -> str:
    """使用 Scrapling StealthyFetcher 获取页面，失败时回退到原生 Playwright"""
    try:
        from scrapling import StealthyFetcher
        # Scrapling v0.3+ 推荐使用类方法直接调用，无需实例化
        response = await StealthyFetcher.async_fetch(url, wait=3000)
        if not response or response.status != 200:
            raise Exception(f"HTTP {response.status}")
        html = response.html_content if hasattr(response, 'html_content') else response.text
        if not html or len(html) < 100:
            raise Exception("Empty page")
        print(f"[Universal Crawl] StealthyFetcher success: {len(html)} bytes")
        return html
    except Exception as e:
        print(f"[Universal Crawl] StealthyFetcher failed: {e}")
        print("[Universal Crawl] Falling back to native Playwright")
        return await _fetch_with_playwright(url)


async def _fetch_with_playwright(url: str) -> str:
    """使用原生 Playwright 异步获取页面，带完善反爬配置"""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
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
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
            timezone_id="Asia/Shanghai",
            extra_http_headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Accept-Encoding": "gzip, deflate, br",
                "Cache-Control": "max-age=0",
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
        page = await context.new_page()
        try:
            # SegmentFault 需要先访问首页建立信任，再跳转目标页面
            if 'segmentfault.com' in url:
                await page.goto("https://segmentfault.com", wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(5)
            # 知乎需要先访问首页建立 cookie，再跳转目标页面
            elif 'zhihu.com' in url:
                await page.goto("https://www.zhihu.com", wait_until="domcontentloaded", timeout=15000)
                await asyncio.sleep(2)
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(3)
                # 等待正文加载（知乎专栏文章正文在 .Post-RichTextContainer 或 .RichContent-inner 里）
                try:
                    await page.wait_for_selector(".Post-RichTextContainer, .RichContent-inner", timeout=10000)
                    await asyncio.sleep(1)
                except Exception:
                    pass
            else:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)
            html = await page.content()
        finally:
            await context.close()
            await browser.close()
    return html


def _bypass_wechat_images(html: str, url: str) -> str:
    """
    微信图片防盗链绕过：在页面上下文中执行 fetch 获取图片 base64
    这里我们在后端模拟：如果检测到 mmbiz.qpic.cn 图片，
    将其 src 替换为 data-src（微信文章中 data-src 通常包含真实 URL）
    """
    if 'mp.weixin.qq.com' not in url:
        return html

    soup = BeautifulSoup(html, 'lxml')
    for img in soup.find_all('img'):
        data_src = img.get('data-src')
        if data_src and 'mmbiz.qpic.cn' in data_src:
            img['src'] = data_src
    return str(soup)


def _extract_infoq_content(html: str) -> str:
    """提取 InfoQ 文章正文（.ProseMirror 或 article 标签）"""
    soup = BeautifulSoup(html, 'lxml')
    # 优先使用 .ProseMirror（InfoQ 正文编辑器容器）
    container = soup.select_one('.ProseMirror')
    if not container:
        # fallback 到 article 标签
        container = soup.find('article')
    if container:
        return str(container)
    return html


def _extract_infoq_title(html: str) -> Optional[str]:
    """提取 InfoQ 文章标题，从 <title> 中去掉 ' - InfoQ' 后缀"""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        # 去掉 " - InfoQ" 后缀
        title = re.sub(r'\s*[-–—]\s*InfoQ\s*$', '', title, flags=re.IGNORECASE).strip()
        if len(title) > 5:
            return title
    return None


def _extract_juejin_content(html: str) -> str:
    """提取掘金文章正文（article.article 或 .article-viewer）"""
    soup = BeautifulSoup(html, 'lxml')
    # 优先使用 article.article
    container = soup.select_one('article.article')
    if not container:
        # fallback 到 .article-viewer
        container = soup.select_one('.article-viewer')
    if not container:
        # 再 fallback 到 #article-root
        container = soup.select_one('#article-root')
    if container:
        return str(container)
    return html


def _extract_juejin_title(html: str) -> Optional[str]:
    """提取掘金文章标题，从 <title> 中去掉 ' - 掘金' 后缀"""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        # 去掉 " - 掘金" 后缀
        title = re.sub(r'\s*[-–—]\s*掘金\s*$', '', title, flags=re.IGNORECASE).strip()
        if len(title) > 5:
            return title
    return None


def _extract_csdn_content(html: str) -> str:
    """提取 CSDN 文章正文（#content_views 或 .article_content）"""
    soup = BeautifulSoup(html, 'lxml')
    # 优先使用 #content_views（CSDN 正文主容器）
    container = soup.select_one('#content_views')
    if not container:
        # fallback 到 .article_content
        container = soup.select_one('.article_content')
    if container:
        return str(container)
    return html


def _extract_csdn_title(html: str) -> Optional[str]:
    """提取 CSDN 文章标题，从 <title> 中去掉 '-CSDN博客' 后缀"""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        # 去掉 " - CSDN博客" / "-CSDN博客" 后缀
        title = re.sub(r'\s*[-–—]?\s*CSDN博客\s*$', '', title, flags=re.IGNORECASE).strip()
        if len(title) > 5:
            return title
    return None


def _filter_csdn_images(images: list) -> list:
    """过滤掉 CSDN 的 UI 图标图片（csdnimg.cn 的收藏/点赞等图标）"""
    filtered = []
    skip_patterns = [
        'newHeart2023',
        'tobarCollect',
        'tobarCollection',
        'copyright',
        'avatar',
        'blogv2/dist/pc/img',
    ]
    for img in images:
        url = img.original_url.lower()
        if any(p in url for p in skip_patterns):
            continue
        filtered.append(img)
    return filtered


def _extract_cnblogs_content(html: str) -> str:
    """提取博客园文章正文（#cnblogs_post_body 或 .postBody）"""
    soup = BeautifulSoup(html, 'lxml')
    container = soup.select_one('#cnblogs_post_body')
    if not container:
        container = soup.select_one('.postBody')
    if container:
        return str(container)
    return html


def _extract_cnblogs_title(html: str) -> Optional[str]:
    """提取博客园文章标题，从 <title> 中去掉 ' - 博客园' 后缀"""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        title = re.sub(r'\s*[-–—]\s*博客园\s*$', '', title, flags=re.IGNORECASE).strip()
        if len(title) > 5:
            return title
    return None


def _filter_cnblogs_images(images: list) -> list:
    """过滤掉博客园的 UI 图标图片"""
    filtered = []
    skip_patterns = [
        'assets.cnblogs.com/logo',
        'assets.cnblogs.com/icons',
        'skins/custom/images/logo',
    ]
    for img in images:
        url = img.original_url.lower()
        if any(p in url for p in skip_patterns):
            continue
        filtered.append(img)
    return filtered


def _extract_51cto_content(html: str) -> str:
    """提取 51CTO 文章正文（.article-content 或 article）"""
    soup = BeautifulSoup(html, 'lxml')
    container = soup.select_one('.article-content')
    if not container:
        container = soup.find('article')
    if container:
        return str(container)
    return html


def _extract_51cto_title(html: str) -> Optional[str]:
    """提取 51CTO 文章标题，从 <title> 中去掉 '-51CTO.COM' 后缀"""
    match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if match:
        title = match.group(1).strip()
        title = re.sub(r'\s*[-–—]?\s*51CTO\.COM\s*$', '', title, flags=re.IGNORECASE).strip()
        if len(title) > 5:
            return title
    return None


def _filter_51cto_images(images: list) -> list:
    """过滤掉 51CTO 的 UI 图标和二维码图片"""
    filtered = []
    skip_patterns = [
        'oss/202302',     # 公众号矩阵二维码
        'oss/202408',     # 软考二维码
        'oss/202506/06',  # 顶部横幅
        'oss/202302/07',  # APP下载图
    ]
    for img in images:
        url = img.original_url.lower()
        if any(p in url for p in skip_patterns):
            continue
        filtered.append(img)
    return filtered


def _legacy_extract(url: str, html: str, images: Optional[list] = None):
    """旧逻辑（轨A）：现有站点特判提取，逐行保留原实现，不删除。

    返回 (title, markdown_content, images)，与策略链 ExtractorResult 同构。
    images 为 None 时内部自行调用 extract_images；否则复用调用方已提取的结果。
    原第 6 步的 is_wechat 变量从未被使用，搬迁时省略。
    """
    # 5. 提取标题（InfoQ / 掘金 / CSDN / 博客园 / 51CTO 使用专用提取）
    is_infoq = 'infoq.cn' in url or 'infoq.com' in url
    is_juejin = 'juejin.cn' in url
    is_csdn = 'csdn.net' in url or 'csdn.com' in url
    is_cnblogs = 'cnblogs.com' in url
    is_51cto = '51cto.com' in url
    if is_infoq:
        title = _extract_infoq_title(html)
    elif is_juejin:
        title = _extract_juejin_title(html)
    elif is_csdn:
        title = _extract_csdn_title(html)
    elif is_cnblogs:
        title = _extract_cnblogs_title(html)
    elif is_51cto:
        title = _extract_51cto_title(html)
    else:
        title = None
    if not title:
        title = extract_title_from_html(html)
    if not title:
        title = "未获取到标题"

    # 6. 提取正文和图片
    if images is None:
        images = extract_images(html, url)
    if is_csdn:
        images = _filter_csdn_images(images)
    elif is_cnblogs:
        images = _filter_cnblogs_images(images)
    elif is_51cto:
        images = _filter_51cto_images(images)

    # 7. 转换为 Markdown（InfoQ / 掘金 / CSDN / 博客园 / 51CTO 使用专用提取）
    if is_infoq:
        infoq_html = _extract_infoq_content(html)
        markdown_content = html_to_markdown(infoq_html, url)
    elif is_juejin:
        juejin_html = _extract_juejin_content(html)
        markdown_content = html_to_markdown(juejin_html, url)
    elif is_csdn:
        csdn_html = _extract_csdn_content(html)
        markdown_content = html_to_markdown(csdn_html, url)
    elif is_cnblogs:
        cnblogs_html = _extract_cnblogs_content(html)
        markdown_content = html_to_markdown(cnblogs_html, url)
    elif is_51cto:
        cto_html = _extract_51cto_content(html)
        markdown_content = html_to_markdown(cto_html, url)
    elif is_spa_site(html):
        # 正文区 vs 噪音过滤（Pruning 思路）统一在 crawl.py 的
        # convert_spa_html_to_markdown / html_to_markdown 入口处理，此处不重复剪枝
        markdown_content = convert_spa_html_to_markdown(html, images, url)
    else:
        markdown_content = html_to_markdown(html, url)

    return title, markdown_content, images


@router.post("/fetch", response_model=CrawlResponse)
async def universal_fetch(request: UniversalCrawlRequest):
    """通用采集：使用 Scrapling 引擎获取文章"""
    try:
        url = str(request.url)
        print(f"[Universal Crawl] Fetching: {url}")

        # 1. 判断采集策略
        use_browser = _needs_browser(url)

        # 2. 使用 Scrapling 获取页面
        if use_browser:
            print(f"[Universal Crawl] Using StealthyFetcher (browser) for {url}")
            html = await _fetch_with_stealth(url)
        else:
            print(f"[Universal Crawl] Using Fetcher (curl_cffi) for {url}")
            html = _fetch_with_scrapling(url)

        if not html or len(html) < 100:
            raise HTTPException(status_code=400, detail="无法获取页面内容，页面可能为空或需要登录")

        # 3. 编码修复
        html = fix_encoding(html)

        # 4. 微信图片防盗链处理
        html = _bypass_wechat_images(html, url)

        # 5. 提取标题和正文（双轨调度 v2：默认旧逻辑优先；白名单站点新策略优先，质量不达标回退旧逻辑）
        extractor = get_extractor_for_url(url)
        if extractor and is_strategy_first(url):
            images = extract_images(html, url)
            result = run_extractor(extractor, url, html, images)
            if is_strategy_success(result):
                title, markdown_content, images = result.title, result.markdown, result.images
                print(f"[Universal Crawl] 策略链成功: {extractor.name}")
            else:
                print(f"[Universal Crawl] 策略链质量不达标({extractor.name})，回退旧逻辑")
                title, markdown_content, images = _legacy_extract(url, html, images)
        else:
            title, markdown_content, images = _legacy_extract(url, html)

        # 5.1 只保留正文中实际出现的图片（全页提取会带入头像/侧栏/推荐位等噪音图）
        # 正文无图（如该掘金文章）时 images 会被清空，不再下载噪音图
        def _norm_img_url(u: str) -> str:
            return u.replace('&amp;', '&')
        markdown_images = {_norm_img_url(img.original_url) for img in extract_images_from_markdown(markdown_content, url)}
        images = [img for img in images if _norm_img_url(img.original_url) in markdown_images]

        # 6. 数学公式修复
        markdown_content = fix_math_formulas(markdown_content)

        # 7. 清理 Markdown 中的 HTML 标签
        markdown_content = re.sub(r'<[^>]+>', '', markdown_content)
        markdown_content = re.sub(r'\n{3,}', '\n\n', markdown_content)
        markdown_content = markdown_content.strip()

        return CrawlResponse(
            success=True,
            title=title,
            content=markdown_content,
            images=images,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Universal Crawl] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"采集失败: {str(e)}")


@router.post("/save")
async def universal_save(request: CrawlSaveRequest, db: Session = Depends(get_db)):
    """保存通用采集的文章，下载图片到本地并替换内容中的远程 URL"""
    try:
        title = request.title
        content = request.content
        excerpt = request.summary or ""
        category_id = request.category_id
        source_url = request.source_url
        image_list = request.images
        is_draft = request.is_draft
        is_published = request.is_published
        
        print(f"[Universal Crawl] Saving article: {title}, images: {len(image_list)}")

        # 创建临时目录
        temp_dir = tempfile.mkdtemp(dir=TEMP_DIR)
        final_dir = UPLOAD_DIR / "images"
        final_dir.mkdir(exist_ok=True)
        thumb_dir = UPLOAD_DIR / "thumbnails"
        thumb_dir.mkdir(exist_ok=True)

        # 下载图片
        downloaded_images = []
        images_saved = 0
        images_failed = 0
        for img in image_list:
            try:
                img_url = str(img.original_url)
                if not img_url:
                    continue
                filename, filepath, success = download_image(img_url, temp_dir)
                if success and filepath:
                    # 移动最终文件
                    final_filename = f"crawl_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{os.path.splitext(filename or 'img.jpg')[1] or '.jpg'}"
                    final_path = final_dir / final_filename
                    os.rename(filepath, str(final_path))

                    # 生成缩略图
                    thumb_filename = f"thumb_{final_filename}"
                    thumb_path = thumb_dir / thumb_filename
                    thumb_path_db = None
                    if generate_thumbnail(str(final_path), str(thumb_path)):
                        thumb_path_db = f"/uploads/thumbnails/{thumb_filename}"

                    # 获取尺寸
                    width, height = get_image_dimensions(str(final_path))

                    # 保存到数据库
                    db_image = Image(
                        filename=final_filename,
                        original_name=final_filename,
                        file_path=f"/uploads/images/{final_filename}",
                        file_size=os.path.getsize(str(final_path)),
                        width=width,
                        height=height,
                        thumb_path=thumb_path_db,
                    )
                    db.add(db_image)
                    db.flush()

                    # 替换内容中的图片 URL
                    new_url = f"/uploads/images/{final_filename}"
                    content = content.replace(img_url, new_url)
                    images_saved += 1

                    downloaded_images.append({
                        "id": db_image.id,
                        "url": new_url,
                        "thumb": thumb_path_db,
                    })
            except Exception as e:
                images_failed += 1
                print(f"[Universal Crawl] Download image error: {e}")
                continue

        # 生成摘要
        summary = excerpt if excerpt else content[:300] if len(content) > 300 else content
        summary = re.sub(r'[#*`\[\]\(\)!]', '', summary).strip()[:300]

        # 创建文章
        now = datetime.now()
        slug = re.sub(r'[^\w\u4e00-\u9fff-]', '-', title)[:50].strip('-')
        slug = f"{slug}-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}"

        # 查找或创建分类
        final_category_id = category_id
        if not final_category_id:
            default_cat = db.query(Category).filter(Category.name == "未分类").first()
            if not default_cat:
                default_cat = Category(name="未分类", slug="uncategorized")
                db.add(default_cat)
                db.flush()
            final_category_id = default_cat.id

        post = Post(
            title=title,
            slug=slug,
            content=content,
            content_type="markdown",
            summary=summary,
            category_id=final_category_id,
            is_published=is_published,
            is_draft=is_draft,
            view_count=0,
            created_at=now,
            updated_at=now,
        )
        db.add(post)
        db.flush()

        # 处理标签
        if request.tags:
            for tag_name in request.tags:
                tag_name = tag_name.strip()
                if not tag_name:
                    continue
                tag = db.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag_slug = re.sub(r'[^\w\u4e00-\u9fff-]', '-', tag_name).strip('-')
                    tag = Tag(name=tag_name, slug=tag_slug)
                    db.add(tag)
                    db.flush()
                post_tag = PostTag(post_id=post.id, tag_id=tag.id)
                db.add(post_tag)

        db.commit()

        return {
            "success": True,
            "post_id": post.id,
            "slug": slug,
            "message": "文章保存成功",
            "images_saved": images_saved,
            "images_failed": images_failed,
        }

    except Exception as e:
        db.rollback()
        print(f"[Universal Crawl] Save error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"保存失败: {str(e)}")
