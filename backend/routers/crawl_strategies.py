"""
站点提取策略化重构（v2）
========================
将散落在 crawl.py / universal_crawl.py 中的站点特判逻辑收敛为「策略注册表」，
接口设计借鉴 crawl4ai 的 ContentScrapingStrategy(ABC) 思想。

双轨调度：
- 轨A（Legacy）：调用方现有的 if-else 站点特判，逐行保留，不删除
- 轨B（Strategy）：本文件中的策略链，每个策略类内部逻辑 = 现有代码「原样搬迁」
- 优先级由 STRATEGY_FIRST_DOMAINS 配置决定：
    - 默认空集：全部走旧逻辑（轨A），策略链仅作未来兜底
    - 白名单命中：策略链优先（轨B），质量不达标自动回退旧逻辑（轨A）
"""

from abc import ABC, abstractmethod
from typing import Optional
import re

from bs4 import BeautifulSoup

from .crawl import (
    extract_title_from_html,
    html_to_markdown,
    is_spa_site,
    convert_spa_html_to_markdown,
)

# 试点白名单：命中这些域名的站点「新策略优先」，质量不达标回退旧逻辑
STRATEGY_FIRST_DOMAINS = {"juejin.cn", "csdn.net"}  # 试点：命中域名策略链优先，质量不达标自动回退旧逻辑；测试后改回 set()

# 质量门控：Markdown 最短长度（复用现有「内容过短」经验值 300）
MIN_CONTENT_CHARS = 300
FALLBACK_TITLE = "未获取到标题"


class SiteExtractor(ABC):
    """站点提取策略基类。每个策略类内部逻辑 = 现有代码原样搬迁，行为零改动。"""

    name: str = "generic"

    @abstractmethod
    def match(self, url: str) -> bool:
        """URL 是否命中该站点"""

    def needs_browser(self, url: str) -> bool:
        """是否需要浏览器渲染（Playwright）"""
        return False

    def extract_title(self, html: str, url: str) -> Optional[str]:
        """站点专用标题提取；返回 None 时由 run_extractor 回退通用提取"""
        return None

    def extract_content_html(self, html: str, url: str) -> str:
        """提取正文容器 HTML；未命中选择器时返回原 HTML"""
        return html

    def filter_images(self, images: list, url: str) -> list:
        """过滤站点 UI 图标等噪音图片"""
        return images

    def to_markdown(self, content_html: str, url: str, images: list) -> str:
        """将正文容器 HTML 转为 Markdown"""
        return html_to_markdown(content_html, url)


class JuejinExtractor(SiteExtractor):
    """掘金：requests 返回混淆代码必须浏览器渲染；正文 article.article"""
    name = "juejin"

    def match(self, url: str) -> bool:
        return 'juejin.cn' in url

    def needs_browser(self, url: str) -> bool:
        return True

    def extract_title(self, html: str, url: str) -> Optional[str]:
        # 原样搬迁 universal_crawl._extract_juejin_title
        match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if match:
            title = match.group(1).strip()
            # 去掉 " - 掘金" 后缀
            title = re.sub(r'\s*[-–—]\s*掘金\s*$', '', title, flags=re.IGNORECASE).strip()
            if len(title) > 5:
                return title
        return None

    def extract_content_html(self, html: str, url: str) -> str:
        # 原样搬迁 universal_crawl._extract_juejin_content
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


class CsdnExtractor(SiteExtractor):
    """CSDN：正文 #content_views / .article_content；过滤 csdnimg UI 图标"""
    name = "csdn"

    def match(self, url: str) -> bool:
        return 'csdn.net' in url or 'csdn.com' in url

    def extract_title(self, html: str, url: str) -> Optional[str]:
        # 原样搬迁 universal_crawl._extract_csdn_title
        match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if match:
            title = match.group(1).strip()
            # 去掉 " - CSDN博客" / "-CSDN博客" 后缀
            title = re.sub(r'\s*[-–—]?\s*CSDN博客\s*$', '', title, flags=re.IGNORECASE).strip()
            if len(title) > 5:
                return title
        return None

    def extract_content_html(self, html: str, url: str) -> str:
        # 原样搬迁 universal_crawl._extract_csdn_content
        soup = BeautifulSoup(html, 'lxml')
        # 优先使用 #content_views（CSDN 正文主容器）
        container = soup.select_one('#content_views')
        if not container:
            # fallback 到 .article_content
            container = soup.select_one('.article_content')
        if container:
            return str(container)
        return html

    def filter_images(self, images: list, url: str) -> list:
        # 原样搬迁 universal_crawl._filter_csdn_images
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
            img_url = img.original_url.lower()
            if any(p in img_url for p in skip_patterns):
                continue
            filtered.append(img)
        return filtered


class GenericExtractor(SiteExtractor):
    """通用兜底：不做站点特判，复刻旧逻辑的通用分支（含 SPA 判断）"""
    name = "generic"

    def match(self, url: str) -> bool:
        return True

    def to_markdown(self, content_html: str, url: str, images: list) -> str:
        if is_spa_site(content_html):
            return convert_spa_html_to_markdown(content_html, images, url)
        return html_to_markdown(content_html, url)


# 策略注册表：有序列表，先匹配先命中；GenericExtractor 永远兜底
SITE_EXTRACTORS = [
    JuejinExtractor(),
    CsdnExtractor(),
    GenericExtractor(),
]


def get_extractor_for_url(url: str) -> Optional[SiteExtractor]:
    """返回第一个匹配的策略；GenericExtractor 恒匹配（兜底）"""
    for extractor in SITE_EXTRACTORS:
        if extractor.match(url):
            return extractor
    return None


def is_strategy_first(url: str) -> bool:
    """url 是否命中试点白名单（新策略优先，失败回退旧逻辑）"""
    return any(domain in url for domain in STRATEGY_FIRST_DOMAINS)


class ExtractorResult:
    """策略链输出，与旧逻辑 _legacy_extract 返回 (title, markdown, images) 同构"""

    __slots__ = ("title", "markdown", "images")

    def __init__(self, title: str, markdown: str, images: list):
        self.title = title
        self.markdown = markdown
        self.images = images


def run_extractor(extractor: SiteExtractor, url: str, html: str, images: list) -> ExtractorResult:
    """执行策略链：专用标题 → 通用标题降级 → 图片过滤 → 正文容器 → Markdown"""
    title = extractor.extract_title(html, url) or extract_title_from_html(html) or FALLBACK_TITLE
    filtered_images = extractor.filter_images(images, url)
    content_html = extractor.extract_content_html(html, url)
    markdown = extractor.to_markdown(content_html, url, filtered_images)
    return ExtractorResult(title=title, markdown=markdown, images=filtered_images)


def is_strategy_success(result: ExtractorResult, min_chars: int = MIN_CONTENT_CHARS) -> bool:
    """质量门控：标题有效 + Markdown 长度达标（复用现有「内容过短」经验值）"""
    if not result.title or result.title == FALLBACK_TITLE:
        return False
    if len((result.markdown or "").strip()) < min_chars:
        return False
    return True
