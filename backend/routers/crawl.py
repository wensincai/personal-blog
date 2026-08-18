"""
文章采集路由 - 从网页URL采集内容
支持SPA网站采集
"""
import base64
import os
import re
import uuid
import requests
from datetime import datetime
from typing import Optional, List
from urllib.parse import urljoin, urlparse

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

# 正文区 vs 噪音过滤（crawl4ai Pruning 思路），两个 HTML→Markdown 转换函数的统一入口
from .content_prune import prune_html_noise

# Playwright用于SPA采集
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# Playwright Stealth 用于绕过WAF
try:
    from playwright_stealth import stealth_async
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Image
from routers.auth import get_current_admin
from routers.images import generate_thumbnail, get_image_dimensions

router = APIRouter(prefix="/api/crawl", tags=["文章采集"])


def fix_encoding(text: str) -> str:
    """
    修复常见的编码问题
    处理UTF-8内容被错误解码为Latin-1的情况
    支持双重编码错误（UTF-8 -> Latin-1 -> UTF-8）
    """
    if not text:
        return text
    
    # 检测是否包含乱码特征（UTF-8被错误解码为Latin-1）
    # 常见的乱码模式：Ã©, Ã¨, Ã, Â, Ã¥ 等
    garbled_patterns = ['Ã©', 'Ã¨', 'Ã', 'Â', 'Ã¥', 'Ã¼', 'Ã¶', 'Ã¤', 'ÃŸ', 'â€', 'æ', 'å', 'è', '§']
    
    # 检查是否包含乱码特征
    has_garbled = any(pattern in text for pattern in garbled_patterns)
    
    if has_garbled:
        try:
            # 尝试单层修复：文本以latin1存储但实际是utf-8内容
            fixed = text.encode('latin1').decode('utf-8')
            
            # 检查是否还有乱码（双重编码错误）
            still_garbled = any(p in fixed for p in garbled_patterns)
            if still_garbled:
                try:
                    # 双重修复
                    fixed = fixed.encode('latin1').decode('utf-8')
                except:
                    pass
            
            return fixed
        except (UnicodeEncodeError, UnicodeDecodeError):
            # 如果修复失败，返回原文本
            pass
    
    return text


class CrawlRequest(BaseModel):
    url: str


class CrawlImage(BaseModel):
    id: Optional[int] = None  # 数据库ID
    original_url: str
    local_path: Optional[str] = None
    filename: Optional[str] = None
    success: bool = False


class CrawlResponse(BaseModel):
    success: bool
    title: Optional[str] = None
    content: Optional[str] = None  # Markdown内容
    summary: Optional[str] = None
    images: List[CrawlImage] = []
    error: Optional[str] = None


def clean_html_tags(text: str) -> str:
    """移除文本中的HTML标签"""
    # 移除所有HTML标签
    text = re.sub(r'<[^>]+>', '', text)
    # 解码HTML实体
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    return text.strip()


def fix_math_formulas(text: str) -> str:
    """修复数学公式格式，处理混合格式问题"""
    import re
    
    # 1. 清理已渲染的数学符号（保留LaTeX代码）
    # 移除 Unicode 数学运算符，但保留后面的LaTeX
    text = re.sub(r'[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+', '', text)
    
    # 2. 规范化反斜杠（双重转义变单重）
    text = text.replace('\\\\', '\\')
    
    # 3. 检测并包裹行内公式
    # 匹配常见的行内数学模式：\mathbf{x}, \alpha, x_{i}, x^{2}, \sum 等
    inline_patterns = [
        r'\\[a-zA-Z]+\{[^}]*\}',  # \mathbf{x}, \frac{a}{b}
        r'\\[a-zA-Z]+',  # \alpha, \beta
        r'[a-zA-Z]_[a-zA-Z0-9]+',  # x_i, y_j
        r'[a-zA-Z]\^[a-zA-Z0-9]+',  # x^2, y^n
    ]
    
    # 4. 检测块级公式（多行或包含 array, matrix 等）
    block_keywords = ['\\begin{array}', '\\begin{matrix}', '\\begin{equation}', 
                      '\\sum_', '\\int_', '\\prod_', '\\lim_']
    
    lines = text.split('\n')
    result_lines = []
    in_block = False
    block_content = []
    
    for line in lines:
        stripped = line.strip()
        
        # 检测块级公式开始
        if any(kw in stripped for kw in block_keywords):
            if not in_block:
                in_block = True
                block_content = []
            block_content.append(line)
            continue
        
        # 如果在块内，继续收集
        if in_block:
            block_content.append(line)
            # 检测块结束
            if '\\end{array}' in stripped or '\\end{matrix}' in stripped or '\\end{equation}' in stripped:
                # 包裹整个块
                block_text = '\n'.join(block_content)
                if not block_text.startswith('$$') and not block_text.startswith('\\['):
                    result_lines.append('$$' + block_text + '$$')
                else:
                    result_lines.append(block_text)
                in_block = False
                block_content = []
            continue
        
        # 处理行内公式
        # 如果一行中有明显的LaTeX命令，但还没有被包裹
        if re.search(r'\\[a-zA-Z]+', line) and not re.search(r'\\\(|\\\)|\\\[|\\\]', line):
            # 简单处理：如果包含复杂结构，作为块级；否则作为行内
            if re.search(r'\\(frac|sum|int|prod|lim)\{', line):
                line = '$$' + line + '$$'
            else:
                line = '\\(' + line + '\\)'
        
        result_lines.append(line)
    
    # 处理未闭合的块
    if in_block and block_content:
        block_text = '\n'.join(block_content)
        result_lines.append('$$' + block_text + '$$')
    
    return '\n'.join(result_lines)


def extract_title_from_html(html: str) -> str:
    """从HTML中提取标题 - 优先提取文章主标题"""
    
    # 1. 尝试提取 Open Graph title (og:title) - 通常是文章主标题
    og_title_match = re.search(
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE
    )
    if not og_title_match:
        og_title_match = re.search(
            r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']',
            html, re.IGNORECASE
        )
    if og_title_match:
        title = clean_html_tags(og_title_match.group(1))
        if len(title) > 5:  # 确保不是太短的无意义标题
            # 清理常见后缀
            title = re.sub(r'\s+[–—-]\s+.*$', '', title).strip()
            return title
    
    # 1.5 博客园/CSDN等特殊平台处理（放在h1之前，因为这些平台的h1可能是博客名而非文章标题）
    # 博客园：h1.postTitle 或 a#cb_post_title_url
    cnblog_title = re.search(r'<h1[^>]+class=["\'][^"\']*postTitle[^"\']*["\'][^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
    if cnblog_title:
        title = clean_html_tags(cnblog_title.group(1))
        if len(title) > 5:
            return title
    
    cnblog_title2 = re.search(r'<a[^>]+id=["\']cb_post_title_url["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
    if cnblog_title2:
        title = clean_html_tags(cnblog_title2.group(1))
        if len(title) > 5:
            return title
    
    # 1.6 人人都是产品经理 (woshipm.com)
    woshipm_title = re.search(r'<[^>]+class=["\'][^"\']*article--title[^"\']*["\'][^>]*>(.*?)</[^>]+>', html, re.IGNORECASE | re.DOTALL)
    if woshipm_title:
        title = clean_html_tags(woshipm_title.group(1))
        if len(title) > 5:
            return title
    
    # 1.7 菜鸟教程：从article-intro内的h1提取标题，或使用title标签
    runoob_title = re.search(r'<div[^>]*class=["\']article-intro["\'][^>]*>.*?<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
    if runoob_title:
        title = clean_html_tags(runoob_title.group(1))
        if len(title) > 5 and "菜鸟教程" not in title:  # 排除网站名
            return title
    
    # 从title标签提取（菜鸟教程等网站）
    title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
    if title_match:
        title = clean_html_tags(title_match.group(1))
        # 移除常见的分隔符和后缀（但保留技术词汇中的连字符如Objective-C）
        # 使用更严格的匹配，确保是标题分隔符而不是单词中的连字符
        title = re.sub(r'\s+[|│┃]\s+.*$', '', title).strip()  # | 分隔符
        title = re.sub(r'\s+[-–—]\s+[^\s]*教程.*$', '', title).strip()  # 匹配 " - 菜鸟教程"
        title = re.sub(r'\s+[-–—]\s+[^\s]*博客.*$', '', title).strip()  # 匹配 " - XXX博客"
        if len(title) > 5:
            return title
    
    # 2. 尝试提取 h1 标题（文章主标题通常是页面第一个h1）
    # 先清理HTML获取纯文本
    h1_matches = re.findall(r'<h1[^>]*>(.*?)</h1>', html, re.IGNORECASE | re.DOTALL)
    for h1 in h1_matches:
        title = clean_html_tags(h1)
        # 过滤掉太短的标题
        if len(title) > 5:
            return title
    
    # 3. 尝试从 article/main 内容区域提取 h2 或 h3（作为备选）
    content_patterns = [
        r'<article[^>]*>.*?<h[23][^>]*>(.*?)</h[23]>.*?</article>',
        r'<main[^>]*>.*?<h[23][^>]*>(.*?)</h[23]>.*?</main>',
        r'<div[^>]*class=["\'][^"\']*(?:content|article|post|entry)[^"\']*["\'][^>]*>.*?<h[23][^>]*>(.*?)</h[23]>',
    ]
    for pattern in content_patterns:
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            title = clean_html_tags(match.group(1))
            if len(title) > 10:  # 内容区标题通常较长
                return title
    
    # 4. 尝试提取 Twitter Card title
    twitter_title_match = re.search(
        r'<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\']([^"\']+)["\']',
        html, re.IGNORECASE
    )
    if twitter_title_match:
        title = clean_html_tags(twitter_title_match.group(1))
        if len(title) > 5:
            return title
    
    # 5. 最后回退到 <title> 标签
    title_match = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    if title_match:
        title = clean_html_tags(title_match.group(1))
        # 清理常见后缀（网站名、分类等）
        # 处理各种分隔符: | - – — :: · •
        title = re.sub(r'\s*[\|\-–—:·•]\s*.+$', '', title)
        # 清理特定后缀词
        title = re.sub(r'\s*[-–]\s*(Home|首页|主页|官网|官方网站|新闻|News|Press Release).*?$', '', title, flags=re.IGNORECASE)
        if title:
            return title
    
    return "未命名文章"


def extract_main_content(html: str) -> str:
    """从HTML中提取主要内容（简化版）"""
    # 使用 BeautifulSoup 如果可用，更精确可靠
    if BS4_AVAILABLE:
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # 移除 script 和 style
            for tag in soup(['script', 'style']):
                tag.decompose()
            
            # 按优先级尝试不同的内容选择器
            content_selectors = [
                # 人人都是产品经理
                '.article--content.grap',
                # 博客园
                '#cnblogs_post_body',
                # 菜鸟教程
                '.article-intro',
                # 掘金
                'article',
                # 通用
                'article', 'main',
                '.post-content', '.article-content', '.entry-content',
                '#content', '#main-content',
            ]
            
            for selector in content_selectors:
                elem = soup.select_one(selector)
                if elem:
                    # 返回元素的HTML内容
                    return str(elem)
            
            # 如果都没找到，返回body内容
            body = soup.find('body')
            if body:
                return str(body)
        except Exception as e:
            print(f"BeautifulSoup提取失败，回退到正则: {e}")
    
    # 回退到正则表达式方式
    # 移除 script 和 style
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    
    # 尝试找到主要内容区域
    content = ""
    
    # 常见的文章容器
    patterns = [
        # 人人都是产品经理 (woshipm.com)
        r'<div[^>]*class=["\']article--content grap["\'][^>]*>(.*?)</div>\s*</div>\s*<div[^>]*class=["\']article--footer',
        r'<div[^>]*class=["\']article--content grap["\'][^>]*>(.*?)</div>\s*</div>\s*<div[^>]*class=["\']article-bottom-meta',
        r'<div[^>]*class=["\']article--content grap["\'][^>]*>(.*?)</div>\s*<div[^>]*class=["\']u-marginTop30',
        # 菜鸟教程
        r'<div[^>]*class=["\']article-intro["\'][^>]*>(.*?)<div[^>]*class=["\'](?:google-auto-placed|pre|next)',
        r'<div[^>]*class=["\']article-intro["\'][^>]*>(.*?)</div>\s*(?:<div|<!--|\Z)',
        r'<div[^>]*class=["\']article-intro["\'][^>]*>(.*?)</div>\s*$',
        r'<div[^>]*class=["\']article-intro["\'][^>]*>(.*)',
        # 博客园
        r'<div[^>]+id=["\']cnblogs_post_body["\'][^>]*>(.*?)</div>\s*<div[^>]+id=["\']blog_post_info_wrap["\']',
        r'<div[^>]+id=["\']cnblogs_post_body["\'][^>]*>(.*?)</div>',
        # 通用
        r'<article[^>]*>(.*?)</article>',
        r'<main[^>]*>(.*?)</main>',
        r'<div[^>]*class=["\'][^"\']*(?:content|article|post|entry)[^"\']*["\'][^>]*>(.*?)</div>',
        r'<div[^>]*id=["\'][^"\']*(?:content|article|post|entry)[^"\']*["\'][^>]*>(.*?)</div>',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            break
    
    # 如果没找到，尝试提取 body
    if not content:
        body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
        if body_match:
            content = body_match.group(1)
    
    return content if content else html


def html_to_markdown(html: str, base_url: str = "") -> str:
    """HTML转Markdown，保留图片在原始位置"""
    # 修复编码问题
    html = fix_encoding(html)
    # 正文区 vs 噪音过滤（Pruning 思路）：剪掉导航/侧栏/评论区/相关推荐，质量门控不达标自动回退
    html = prune_html_noise(html)
    
    # 检查base_url是否为HTTPS
    parsed_base = urlparse(base_url) if base_url else None
    base_is_https = parsed_base and parsed_base.scheme == 'https'
    
    def make_absolute_url(src: str) -> str:
        """将相对URL转换为绝对URL"""
        if not src:
            return src
        if src.startswith('//'):
            src = 'https:' + src
        elif src.startswith('/') and base_url:
            src = f"{parsed_base.scheme}://{parsed_base.netloc}{src}"
        elif not src.startswith(('http://', 'https://')) and base_url:
            src = urljoin(base_url, src)
        # 修复混合内容：页面HTTPS时图片也用HTTPS
        if base_is_https and src.startswith('http://'):
            src = 'https://' + src[7:]
        return src
    
    if BS4_AVAILABLE:
        # 使用BeautifulSoup更精确地处理
        soup = BeautifulSoup(html, 'html.parser')
        
        # 处理所有图片，保留在原位置
        for img in soup.find_all('img'):
            src = img.get('src', '')
            alt = img.get('alt', '')
            if src and not src.startswith('data:'):
                src = make_absolute_url(src)
                # 创建Markdown图片标记
                md_img = f'![{alt}]({src})'
                img.replace_with(md_img)
            elif src.startswith('data:'):
                # 移除 data URL 图片
                img.decompose()
        
        # 处理标题
        for tag in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(tag.name[1])
            tag.replace_with(f'\n{"#" * level} {tag.get_text().strip()}\n')
        
        # 处理段落
        for p in soup.find_all('p'):
            text = p.get_text()
            # 保留段落中的Markdown图片标记
            for content in p.contents:
                if isinstance(content, str) and content.startswith('!['):
                    text = text.replace(content, content)
            p.replace_with(f'\n{text}\n')
        
        # 处理换行
        for br in soup.find_all('br'):
            br.replace_with('\n')
        
        # 处理代码块 <pre><code>...</code></pre>
        for pre in soup.find_all('pre'):
            code = pre.find('code')
            if code:
                # 获取代码内容，保留原始格式
                code_text = code.get_text()
                # 检测语言（从class属性）
                lang = ''
                code_classes = code.get('class', [])
                for cls in code_classes:
                    if 'language-' in cls or 'lang-' in cls:
                        lang = cls.replace('language-', '').replace('lang-', '')
                        break
                # 创建Markdown代码块
                md_code = f'\n```{lang}\n{code_text}\n```\n'
                pre.replace_with(md_code)
            else:
                # 纯pre标签
                pre_text = pre.get_text()
                md_code = f'\n```\n{pre_text}\n```\n'
                pre.replace_with(md_code)
        
        # 处理行内代码 <code>...</code>
        for code in soup.find_all('code'):
            code_text = code.get_text()
            # 检查是否在pre内（已处理过）
            if not code.find_parent('pre'):
                code.replace_with(f'`{code_text}`')
        
        # 处理粗体
        for tag in soup.find_all(['strong', 'b']):
            tag.replace_with(f'**{tag.get_text()}**')
        
        # 处理斜体
        for tag in soup.find_all(['em', 'i']):
            tag.replace_with(f'*{tag.get_text()}*')
        
        # 获取文本
        text = soup.get_text()
    else:
        # 回退到正则方式
        def convert_img_to_markdown(match):
            src = match.group(1)
            alt = match.group(2) if match.lastindex and match.lastindex >= 2 else ""
            src = make_absolute_url(src)
            return f'![{alt}]({src})'
        
        text = html
        # 先处理图片
        text = re.sub(
            r'<img[^>]+src=["\']([^"\']+)["\'][^>]*alt=["\']([^"\']*)["\'][^>]*>',
            convert_img_to_markdown, text, flags=re.IGNORECASE
        )
        text = re.sub(
            r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>',
            lambda m: f'![图片]({make_absolute_url(m.group(1))})',
            text, flags=re.IGNORECASE
        )
        
        # 处理其他标签
        text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n#### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\1\n', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        # 处理代码块 <pre><code>...</code></pre>
        def convert_code_block(match):
            code_content = match.group(1)
            # 提取语言
            lang_match = re.search(r'class=["\'][^"\']*language-([^"\'\s]+)["\']', match.group(0), re.IGNORECASE)
            lang = lang_match.group(1) if lang_match else ''
            return f'\n```{lang}\n{code_content}\n```\n'
        
        text = re.sub(r'<pre[^>]*>\s*<code[^>]*>(.*?)</code>\s*</pre>', convert_code_block, 
                      text, flags=re.DOTALL | re.IGNORECASE)
        # 处理纯pre标签
        text = re.sub(r'<pre[^>]*>(.*?)</pre>', r'\n```\n\1\n```\n', text, flags=re.DOTALL | re.IGNORECASE)
        # 处理行内代码
        text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text, flags=re.DOTALL | re.IGNORECASE)
        
        text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<i[^>]*>(.*?)</i>', r'*\1*', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', '', text)
    
    # 解码HTML实体
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&amp;', '&')
    text = text.replace('&quot;', '"')
    
    # 修复数学公式格式
    text = fix_math_formulas(text)
    
    # 清理多余空白行
    lines = text.split('\n')
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        stripped = line.strip()
        if stripped == '':
            if not prev_empty:
                cleaned_lines.append('')
            prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
    
    return '\n'.join(cleaned_lines).strip()


from html import unescape


def extract_images(html: str, base_url: str) -> List[CrawlImage]:
    """从HTML中提取图片URL"""
    images = []
    parsed_base = urlparse(base_url)
    base_is_https = parsed_base.scheme == 'https'
    
    # 匹配 <img src="...">
    img_pattern = r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>'
    for match in re.finditer(img_pattern, html, re.IGNORECASE):
        img_url = match.group(1)
        # HTML 实体反转义（如 &amp; -> &）：regex 提取保留原样会导致预览区裂图、替换/签名校验失败
        img_url = unescape(img_url)
        # 跳过 data URL
        if img_url.startswith('data:'):
            continue
        # 转换为绝对URL
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        elif img_url.startswith('/'):
            img_url = f"{parsed_base.scheme}://{parsed_base.netloc}{img_url}"
        elif not img_url.startswith(('http://', 'https://')):
            img_url = urljoin(base_url, img_url)

        # 修复混合内容问题：如果页面是HTTPS，图片也要用HTTPS
        if base_is_https and img_url.startswith('http://'):
            img_url = 'https://' + img_url[7:]

        images.append(CrawlImage(original_url=img_url))
    
    return images


def extract_images_from_markdown(markdown_content: str, base_url: str) -> List[CrawlImage]:
    """从Markdown内容中提取图片URL（确保只提取实际在文章中的图片）"""
    images = []
    parsed_base = urlparse(base_url)
    base_is_https = parsed_base.scheme == 'https'
    
    # 匹配Markdown图片语法: ![alt](url)
    img_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
    for match in re.finditer(img_pattern, markdown_content):
        img_url = match.group(2)
        # 跳过已经是本地路径的图片
        if img_url.startswith('/uploads/'):
            continue
        # 转换为绝对URL
        if img_url.startswith('//'):
            img_url = 'https:' + img_url
        elif img_url.startswith('/'):
            img_url = f"{parsed_base.scheme}://{parsed_base.netloc}{img_url}"
        elif not img_url.startswith(('http://', 'https://')):
            img_url = urljoin(base_url, img_url)
        # 修复混合内容问题
        if base_is_https and img_url.startswith('http://'):
            img_url = 'https://' + img_url[7:]
        
        images.append(CrawlImage(original_url=img_url))
    
    return images


def _merge_images_from_markdown(existing_images: list, markdown_content: str, base_url: str) -> list:
    """从Markdown中提取图片并合并到已有列表，确保所有正文图片都被捕获"""
    md_images = extract_images_from_markdown(markdown_content, base_url)
    existing_urls = {img.original_url for img in existing_images}
    new_count = 0
    for img in md_images:
        if img.original_url not in existing_urls:
            existing_images.append(img)
            existing_urls.add(img.original_url)
            new_count += 1
    if new_count > 0:
        print(f"从Markdown中补充提取 {new_count} 张图片，总数: {len(existing_images)}")
    return existing_images


def download_image(url: str, temp_dir: str) -> tuple:
    """下载图片到临时目录"""
    from html import unescape
    try:
        # HTML 实体反转义（如 &amp; -> &），否则带签名参数的 CDN URL 会 403
        url = unescape(url)
        # 跳过 data URL（base64 内嵌图片）
        if url.startswith('data:'):
            return None, None, False
        
        # 跳过 Google favicon 服务等外部小图标（国内服务器无法访问）
        if 'google.com/s2/favicons' in url or 'google.com/favicon' in url:
            return None, None, False

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }

        # 微信图片需要 referer
        if 'mmbiz.qpic.cn' in url or 'mmbiz.qlogo.cn' in url:
            headers['Referer'] = 'https://mp.weixin.qq.com/'

        response = requests.get(url, headers=headers, timeout=10, stream=True)
        response.raise_for_status()
        
        # 获取文件扩展名
        content_type = response.headers.get('content-type', '')
        ext = '.jpg'
        if 'png' in content_type:
            ext = '.png'
        elif 'gif' in content_type:
            ext = '.gif'
        elif 'webp' in content_type:
            ext = '.webp'
        else:
            # 从URL获取扩展名
            parsed = urlparse(url)
            path_ext = os.path.splitext(parsed.path)[1]
            if path_ext:
                ext = path_ext
        
        # 生成文件名
        filename = f"crawl_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        filepath = os.path.join(temp_dir, filename)
        
        # 保存文件
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # 检查文件大小，微信防盗链返回的占位图通常 < 2KB
        file_size = os.path.getsize(filepath)
        if file_size < 2048 and 'mmbiz.qpic.cn' in url:
            print(f"图片疑似防盗链占位图，跳过: {url} (大小: {file_size} bytes)")
            os.remove(filepath)
            return None, None, False

        return filename, filepath, True
    except Exception as e:
        print(f"下载图片失败 {url}: {e}")
    
    # CDN 子域名回退（如 eewimg.cn 的 66 子域名在部分网络无法解析）
    if 'eewimg.cn' in url and url.startswith('http'):
        fallback_result = _try_eewimg_cdn_fallback(url, temp_dir)
        if fallback_result and fallback_result[2]:
            return fallback_result
    
    return None, None, False


# eewimg.cn CDN 可解析的子域名（66 子域名在海外/部分网络 NXDOMAIN）
_EEWIMG_FALLBACK_SUBDOMAINS = ["8", "2", "10", "11", "12", "3", "1"]


def _try_eewimg_cdn_fallback(url: str, temp_dir: str) -> tuple:
    """尝试用其他 eewimg.cn 子域名下载图片"""
    # 去掉 imageView2 等图片处理参数，获取原始图片
    clean_url = re.sub(r'\?.*$', '', url)
    
    for sub in _EEWIMG_FALLBACK_SUBDOMAINS:
        try:
            # 替换子域名（数字开头的子域名）
            fallback_url = re.sub(r'https?://\d+\.eewimg\.cn', f'https://{sub}.eewimg.cn', clean_url)
            if fallback_url == clean_url:
                continue  # 没替换成功，跳过
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://www.eeworld.com.cn/',
            }
            response = requests.get(fallback_url, headers=headers, timeout=15, stream=True)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', '')
            ext = '.jpg'
            if 'png' in content_type:
                ext = '.png'
            elif 'gif' in content_type:
                ext = '.gif'
            elif 'webp' in content_type:
                ext = '.webp'
            else:
                parsed = urlparse(url)
                path_ext = os.path.splitext(parsed.path)[1]
                if path_ext:
                    ext = path_ext
            
            filename = f"crawl_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
            filepath = os.path.join(temp_dir, filename)
            
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"[CDN fallback] 成功通过 {sub}.eewimg.cn 下载: {url}")
            return filename, filepath, True
        except Exception as e:
            continue
    
    return None, None, False


def is_spa_site(html: str) -> bool:
    """检测是否为SPA网站"""
    # 检测标志
    spa_indicators = [
        # React/Vue/Angular常见标记
        '<div id="root"></div>',
        '<div id="app"></div>',
        '<div id="__next">',
        # Nuxt.js SSR: <div data-server-rendered="true" id="__nuxt"> or <div id="__nuxt">
        '__nuxt',
        'You need to enable JavaScript',
        # 加载中标记
        'Please wait',
        'Loading...',
        # 常见SPA框架
        'react-root',
        'ng-app',
        'data-reactroot',
        # 动态加载标记
        'window.__INITIAL_STATE__',
        'window.__DATA__',
    ]
    html_lower = html.lower()
    for indicator in spa_indicators:
        if indicator.lower() in html_lower:
            return True
    
    # 检查内容是否极少（只有JS没有实际内容）
    # 先剔除 script 和 style 标签及其内容，因为 Next.js RSC 等框架会在
    # script 中塞入大量序列化数据，干扰文字量判断
    html_for_check = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
    html_for_check = re.sub(r'<style[^>]*>.*?</style>', '', html_for_check, flags=re.DOTALL | re.IGNORECASE)
    text_content = re.sub(r'<[^>]+>', '', html_for_check)
    text_content = re.sub(r'\s+', '', text_content)
    if len(text_content) < 200:
        return True
    
    return False


async def crawl_with_playwright(url: str) -> dict:
    """使用Playwright异步采集SPA页面"""
    if not PLAYWRIGHT_AVAILABLE:
        raise Exception("Playwright未安装，无法采集SPA网站")
    
    # 检测平台类型
    is_wechat = 'mp.weixin.qq.com' in url
    is_tencent_cloud = 'cloud.tencent.com' in url
    is_lark_wiki = 'larkoffice.com/wiki' in url or 'feishu.cn' in url
    is_yiigle = 'yiigle.com' in url
    
    async with async_playwright() as p:
        # 使用 stealth 参数启动浏览器，绕过WAF
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
        
        # 创建新页面并设置视口和更多参数
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='zh-CN',
            timezone_id='Asia/Shanghai',
            permissions=['geolocation'],
            java_script_enabled=True,
        )
        
        # 添加额外脚本隐藏 webdriver 属性
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            window.chrome = { runtime: {} };
        """)
        
        page = await context.new_page()
        
        # 应用 stealth 模式（绕过反爬虫检测）
        if STEALTH_AVAILABLE:
            await stealth_async(page)
            print("[Playwright] Stealth 模式已启用")
        
        # 打开页面
        # 优先使用 networkidle 等 JS 渲染完成，但很多现代站点有长连接会导致超时
        # 超时后回退到 domcontentloaded + 额外等待
        try:
            if is_tencent_cloud:
                # 腾讯云有大量广告/跟踪脚本，networkidle 容易超时，直接 domcontentloaded
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
            else:
                await page.goto(url, wait_until='networkidle', timeout=15000)
        except Exception as e:
            print(f"[Playwright] networkidle 超时，回退到 domcontentloaded: {e}")
            await page.goto(url, wait_until='domcontentloaded', timeout=15000)
        
        # 微信文章特殊处理
        if is_wechat:
            await page.wait_for_timeout(5000)  # 微信需要更长等待时间
            
            # 提取标题 - 微信文章标题在 #activity_name
            title = ""
            try:
                if await page.locator('#activity_name').count() > 0:
                    title = await page.locator('#activity_name').first.inner_text()
                    title = title.strip()
            except:
                pass
            if not title:
                title = await page.title()
            
            # 提取正文 - 微信文章正文在 #js_content
            content_html = ""
            try:
                if await page.locator('#js_content').count() > 0:
                    content_html = await page.locator('#js_content').first.inner_html()
            except:
                pass
            
            # 提取图片 - 微信图片用data-src，优先取浏览器渲染后的实际URL
            images = []
            try:
                img_elements = await page.locator('#js_content img').all()
                for img in img_elements[:30]:
                    try:
                        # 优先级：dataset.src > currentSrc > data-src > src
                        src = None
                        # 1. 尝试通过 JS 获取 dataset.src（微信懒加载后的真实地址）
                        try:
                            src = await img.evaluate('el => el.dataset?.src || ""')
                        except:
                            pass
                        # 2. 尝试 currentSrc（浏览器实际加载的地址）
                        if not src or src.startswith('data:'):
                            try:
                                src = await img.evaluate('el => el.currentSrc || ""')
                            except:
                                pass
                        # 3. 回退到 data-src 属性
                        if not src or src.startswith('data:'):
                            src = await img.get_attribute('data-src')
                        # 4. 最后回退到 src 属性
                        if not src or src.startswith('data:'):
                            src = await img.get_attribute('src')

                        alt = await img.get_attribute('alt') or ''
                        # 过滤 data URL 和无效地址
                        if src and src.startswith('http') and not src.startswith('data:'):
                            images.append(CrawlImage(original_url=src))
                    except:
                        pass
            except:
                pass

            # 微信图片防盗链：用浏览器 fetch 下载（携带 cookies）
            temp_dir = os.environ.get('TEMP_DIR') or '/tmp'
            downloaded_images = []
            for crawl_img in images[:15]:
                try:
                    img_url = crawl_img.original_url
                    # 在浏览器里 fetch 下载，携带微信 cookies
                    js_code = f"""
                    async () => {{
                        try {{
                            const resp = await fetch("{img_url}", {{ referrer: "https://mp.weixin.qq.com/" }});
                            if (!resp.ok) return null;
                            const blob = await resp.blob();
                            return new Promise((resolve) => {{
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                reader.readAsDataURL(blob);
                            }});
                        }} catch (e) {{
                            return null;
                        }}
                    }}
                    """
                    b64_data = await page.evaluate(js_code)
                    if b64_data:
                        # 确定扩展名
                        ext = os.path.splitext(urlparse(img_url).path)[1].lower() or '.jpg'
                        if not ext or ext == '.':
                            ext = '.jpg'
                        filename = f"crawl_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
                        filepath = os.path.join(temp_dir, filename)
                        with open(filepath, 'wb') as f:
                            f.write(base64.b64decode(b64_data))
                        # 检查文件大小，排除防盗链占位图
                        file_size = os.path.getsize(filepath)
                        if file_size < 2048:
                            os.remove(filepath)
                            print(f"微信图片疑似防盗链占位图，跳过: {img_url} ({file_size} bytes)")
                            downloaded_images.append(crawl_img)
                        else:
                            crawl_img.local_path = filepath
                            crawl_img.filename = filename
                            crawl_img.success = True
                            downloaded_images.append(crawl_img)
                            print(f"微信图片下载成功: {filename} ({file_size} bytes)")
                    else:
                        downloaded_images.append(crawl_img)
                except Exception as e:
                    print(f"浏览器下载微信图片失败: {e}")
                    downloaded_images.append(crawl_img)
            images = downloaded_images

            await context.close()
            await browser.close()
            return {
                'title': title if title else "未命名文章",
                'content_html': content_html,
                'images': images
            }
        
        # 普通SPA网站处理
        # 检测平台（is_tencent_cloud 已在函数开头定义）
        is_juejin = 'juejin.cn' in url
        is_segmentfault = 'segmentfault.com' in url
        
        # 等待内容加载
        if is_juejin:
            # 掘金需要等待article标签
            try:
                await page.wait_for_selector('article', timeout=15000)
            except:
                pass
            await page.wait_for_timeout(3000)
        elif is_tencent_cloud:
            # 腾讯云开发者社区：.mod-content__markdown 一开始存在但为空，需等待 JS 填充
            try:
                await page.wait_for_function(
                    """() => {
                        const el = document.querySelector('.mod-content__markdown');
                        return el && el.innerHTML.length > 500;
                    }""",
                    timeout=15000
                )
            except:
                pass
            await page.wait_for_timeout(2000)
        elif is_segmentfault:
            # SegmentFault 等待文章正文
            print("[Playwright] 等待 SegmentFault 页面加载...")
            try:
                await page.wait_for_load_state('networkidle', timeout=20000)
            except:
                pass
            await page.wait_for_timeout(8000)  # 给JS更多时间渲染
            print("[Playwright] 等待完成，开始提取")
        else:
            try:
                await page.wait_for_selector('h1, .article-title, .content, article, main', timeout=10000)
            except:
                pass
            await page.wait_for_timeout(5000)
        
        # 策略链优先（与通用采集同款双轨调度）：白名单站点先试策略，质量不达标回退旧逻辑
        from .crawl_strategies import get_extractor_for_url, is_strategy_first, run_extractor, is_strategy_success
        extractor = get_extractor_for_url(url)
        if extractor and is_strategy_first(url):
            page_source = await page.content()
            result = run_extractor(extractor, url, page_source, extract_images(page_source, url))
            if is_strategy_success(result):
                print(f"[Playwright] 策略链成功: {extractor.name}")
                # 只保留正文中实际出现的图片（与通用采集一致，过滤头像/侧栏等噪音图）
                _md_urls = {img.original_url.replace('&amp;', '&') for img in extract_images_from_markdown(result.markdown, url)}
                _images = [img for img in result.images if img.original_url.replace('&amp;', '&') in _md_urls]
                await context.close()
                await browser.close()
                return {
                    'title': result.title,
                    'content_html': result.markdown,
                    'images': _images,
                    'is_markdown': True,
                }
            print(f"[Playwright] 策略链质量不达标({extractor.name})，回退旧逻辑")

        # 提取标题
        title = ""
        if is_juejin:
            # 掘金标题选择器
            for selector in ['article h1', 'h1']:
                try:
                    if await page.locator(selector).count() > 0:
                        title = await page.locator(selector).first.inner_text()
                        if title.strip():
                            break
                except:
                    continue
        elif is_segmentfault:
            # SegmentFault 标题选择器
            sf_title_selectors = ['h1.article-title', 'h1', '.article-title', '[class*="title"]', 'title']
            for selector in sf_title_selectors:
                try:
                    count = await page.locator(selector).count()
                    if count > 0:
                        t = await page.locator(selector).first.inner_text()
                        print(f"[Playwright] 标题选择器 '{selector}': '{t[:30] if t else '空'}...'")
                        if t and t.strip():
                            title = t.strip()
                            break
                except Exception as e:
                    print(f"[Playwright] 标题选择器 '{selector}' 失败: {e}")
        elif is_tencent_cloud:
            # 腾讯云开发者社区标题
            for selector in ['h1', '.article-title', '[class*="title"]']:
                try:
                    if await page.locator(selector).count() > 0:
                        title = await page.locator(selector).first.inner_text()
                        if title.strip():
                            break
                except:
                    continue
        elif is_lark_wiki:
            # 飞书/Lark Wiki 标题：page.title() 格式为 "文章标题 - 飞书云文档"
            page_title = await page.title()
            if ' - ' in page_title:
                title = page_title.rsplit(' - ', 1)[0].strip()
            # 如果拆分失败，尝试 h1 的第二个（第一个通常是"飞书云文档"网站名）
            if not title:
                try:
                    h1_count = await page.locator('h1').count()
                    if h1_count >= 2:
                        title = await page.locator('h1').nth(1).inner_text()
                        title = title.strip()
                except:
                    pass
        elif is_yiigle:
            # 中华医学期刊网(yiigle.com)标题：page.title() 格式为 "文章标题 - 期刊名"
            page_title = await page.title()
            if ' - ' in page_title:
                title = page_title.rsplit(' - ', 1)[0].strip()
            # 备选：从 og:title meta 提取
            if not title:
                try:
                    og_title = await page.locator('meta[property="og:title"]').get_attribute('content')
                    if og_title:
                        title = og_title.strip()
                except:
                    pass
            print(f"[Playwright] yiigle 标题: {title}")
        
        if not title:
            for selector in ['h1', '.article-title', '[class*="title"]']:
                try:
                    if await page.locator(selector).count() > 0:
                        title = await page.locator(selector).first.inner_text()
                        if title.strip():
                            break
                except:
                    continue
        if not title:
            title = await page.title()
        
        # 提取正文HTML
        content_html = ""
        print(f"[Playwright] 开始提取内容，URL: {url}")
        print(f"[Playwright] is_segmentfault: {is_segmentfault}")
        if is_juejin:
            # 掘金内容在 .markdown-body 中
            try:
                print(f"[Playwright] 掘金: 检查 .markdown-body")
                mb_count = await page.locator('.markdown-body').count()
                print(f"[Playwright] 掘金: .markdown-body 数量: {mb_count}")
                if mb_count > 0:
                    content_html = await page.locator('.markdown-body').first.inner_html()
                    print(f"[Playwright] 掘金: 从 .markdown-body 提取内容，长度 {len(content_html)}")
                elif await page.locator('article').count() > 0:
                    content_html = await page.locator('article').first.inner_html()
                    print(f"[Playwright] 掘金: 从 article 提取内容，长度 {len(content_html)}")
                else:
                    # 诊断：截图和保存页面源码
                    print(f"[Playwright] 掘金: 未找到内容区域，保存诊断信息")
                    try:
                        await page.screenshot(path='/tmp/juejin_debug.png', full_page=True)
                        page_source = await page.content()
                        with open('/tmp/juejin_debug.html', 'w', encoding='utf-8') as f:
                            f.write(page_source[:50000])  # 保存前50KB
                        print(f"[Playwright] 掘金: 诊断信息已保存到 /tmp/juejin_debug.*")
                    except Exception as e:
                        print(f"[Playwright] 掘金: 保存诊断信息失败: {e}")
            except Exception as e:
                print(f"[Playwright] 掘金: 提取内容异常: {e}")
            
            # 清理掘金内容：移除 style 和 script 标签（掘金有大量内嵌CSS）
            if content_html:
                import re
                # 移除 style 标签及其内容
                content_html = re.sub(r'<style[^>]*>.*?</style>', '', content_html, flags=re.DOTALL | re.IGNORECASE)
                # 移除 script 标签及其内容
                content_html = re.sub(r'<script[^>]*>.*?</script>', '', content_html, flags=re.DOTALL | re.IGNORECASE)
                # 移除所有元素的 style 属性
                content_html = re.sub(r'\s+style="[^"]*"', '', content_html, flags=re.IGNORECASE)
                # 移除 class 属性（减少无用属性）
                content_html = re.sub(r'\s+class="[^"]*"', '', content_html, flags=re.IGNORECASE)
        elif is_segmentfault:
            # SegmentFault 内容提取 - 尝试多种选择器
            sf_selectors = ['.article-content', '.markdown-body', 'article', '.post-content', 
                           '[data-id]', 'main', '#content', '.content']
            for selector in sf_selectors:
                try:
                    count = await page.locator(selector).count()
                    print(f"[Playwright] 检查选择器 '{selector}': {count} 个匹配")
                    if count > 0:
                        html = await page.locator(selector).first.inner_html()
                        if len(html) > 200:  # 确保内容足够长
                            content_html = html
                            print(f"[Playwright] 使用 '{selector}' 提取，长度: {len(content_html)}")
                            break
                except Exception as e:
                    print(f"[Playwright] 选择器 '{selector}' 失败: {e}")
            if not content_html:
                print(f"[Playwright] 未找到 SegmentFault 内容，尝试获取整个body")
                try:
                    content_html = await page.locator('body').first.inner_html()
                    print(f"[Playwright] 使用 body，长度: {len(content_html)}")
                except Exception as e:
                    print(f"[Playwright] 获取 body 失败: {e}")
            
            # 清理 SegmentFault 内容
            if content_html:
                import re
                # 移除 style 和 script 标签
                content_html = re.sub(r'<style[^>]*>.*?</style>', '', content_html, flags=re.DOTALL | re.IGNORECASE)
                content_html = re.sub(r'<script[^>]*>.*?</script>', '', content_html, flags=re.DOTALL | re.IGNORECASE)
                # 移除广告相关元素
                content_html = re.sub(r'<div[^>]*class="[^"]*ad[^"]*"[^>]*>.*?</div>', '', content_html, flags=re.DOTALL | re.IGNORECASE)
        elif is_tencent_cloud:
            # 腾讯云开发者社区内容
            try:
                # 先尝试 .mod-content__markdown（JS 渲染后会有内容）
                if await page.locator('.mod-content__markdown').count() > 0:
                    html = await page.locator('.mod-content__markdown').first.inner_html()
                    if len(html) > 500:
                        content_html = html
                # 如果为空，回退到 .mod-article-content
                if not content_html or len(content_html) < 500:
                    if await page.locator('.mod-article-content').count() > 0:
                        html = await page.locator('.mod-article-content').first.inner_html()
                        if len(html) > 500:
                            content_html = html
            except Exception as e:
                print(f"[Playwright] 腾讯云内容提取异常: {e}")
        elif is_lark_wiki:
            # 飞书/Lark Wiki 内容提取
            # 飞书文档使用 block-based 编辑器 + 虚拟列表懒加载
            # DOM 只渲染可见区域(~30 blocks)，完整数据在 window.DATA.clientVars.data.block_map
            print("[Playwright] 飞书Wiki: 从 JS 数据提取完整内容...")
            try:
                # 等待 page-block-children 出现确保 JS 初始化完成
                await page.wait_for_selector('.page-block-children', timeout=15000)
            except:
                pass
            await page.wait_for_timeout(3000)
            
            # 优先从 JS 数据提取（完整 229 blocks vs DOM 的 ~30 blocks）
            lark_markdown = await page.evaluate("""() => {
                const data = window.DATA?.clientVars?.data;
                if (!data) return null;
                
                const block_map = data.block_map;
                const block_sequence = data.block_sequence || [];
                
                function extractText(blockData) {
                    const textObj = blockData.text;
                    if (!textObj) return '';
                    const iat = textObj.initialAttributedTexts;
                    if (!iat) return '';
                    const texts = iat.text;
                    if (!texts) return '';
                    let parts = [];
                    for (let key of Object.keys(texts).sort((a,b) => Number(a)-Number(b))) {
                        parts.push(texts[key]);
                    }
                    return parts.join('');
                }
                
                function blockToMarkdown(blockId) {
                    const block = block_map[blockId];
                    if (!block) return '';
                    const bd = block.data || block;
                    const type = bd.type || 'unknown';
                    const text = extractText(bd);
                    
                    // Skip root page itself, process its children
                    if (type === 'page' && !bd.parent_id) {
                        let md = '';
                        for (const childId of (bd.children || [])) {
                            md += blockToMarkdown(childId);
                        }
                        return md;
                    }
                    
                    let md = '';
                    switch(type) {
                        case 'heading1': md += '\\n# ' + text + '\\n\\n'; break;
                        case 'heading2': md += '\\n## ' + text + '\\n\\n'; break;
                        case 'heading3': md += '\\n### ' + text + '\\n\\n'; break;
                        case 'heading4': md += '\\n#### ' + text + '\\n\\n'; break;
                        case 'heading5': md += '\\n##### ' + text + '\\n\\n'; break;
                        case 'text':
                            if (text.trim()) md += text + '\\n\\n';
                            else md += '\\n';
                            break;
                        case 'callout':
                            if (text.trim()) md += '> 📌 ' + text + '\\n\\n';
                            break;
                        case 'ordered':
                            if (text.trim()) md += '1. ' + text + '\\n';
                            break;
                        case 'bullet':
                            if (text.trim()) md += '- ' + text + '\\n';
                            break;
                        case 'code':
                            md += '```\\n' + text + '\\n```\\n\\n';
                            break;
                        case 'divider':
                            md += '\\n---\\n\\n';
                            break;
                        case 'quote':
                            if (text.trim()) md += '> ' + text + '\\n\\n';
                            break;
                        default:
                            if (text.trim()) md += text + '\\n\\n';
                    }
                    
                    for (const childId of (bd.children || [])) {
                        md += blockToMarkdown(childId);
                    }
                    return md;
                }
                
                const rootBlockId = block_sequence[0];
                let md = blockToMarkdown(rootBlockId);
                md = md.replace(/\\n{4,}/g, '\\n\\n\\n');
                return md;
            }""")
            
            if lark_markdown and len(lark_markdown) > 500:
                print(f"[Playwright] 飞书Wiki: JS数据提取成功，Markdown 长度 {len(lark_markdown)}")
                content_html = lark_markdown  # 已经是 Markdown
                _is_lark_markdown = True
            else:
                # 回退到 DOM 提取
                print("[Playwright] 飞书Wiki: JS数据为空，回退到 DOM 提取")
                try:
                    if await page.locator('.page-block-children').count() > 0:
                        html = await page.locator('.page-block-children').first.inner_html()
                        if len(html) > 500:
                            content_html = html
                            print(f"[Playwright] 飞书Wiki: DOM 提取内容，长度 {len(content_html)}")
                except Exception as e:
                    print(f"[Playwright] 飞书Wiki DOM 提取异常: {e}")
        elif is_yiigle:
            # 中华医学期刊网(yiigle.com)：文章全文需登录，仅提取可见的摘要和元数据
            print("[Playwright] yiigle: 提取摘要和元数据...")
            try:
                # 等待摘要区域渲染完成
                await page.wait_for_selector('#abstract_sec_main', timeout=15000)
            except:
                pass
            await page.wait_for_timeout(3000)
            
            # 提取摘要HTML
            abstract_html = ""
            if await page.locator('#abstract_sec_main').count() > 0:
                abstract_html = await page.locator('#abstract_sec_main').first.inner_html()
                print(f"[Playwright] yiigle: 摘要区域长度 {len(abstract_html)}")
            
            # 从 meta 标签提取元数据
            meta_info = await page.evaluate("""() => {
                const metas = document.querySelectorAll('meta[name]');
                const info = {};
                for (const m of metas) {
                    const name = m.getAttribute('name');
                    const content = m.getAttribute('content');
                    if (name && content) {
                        if (name.startsWith('eprints.') || name.startsWith('DC.') || name.startsWith('citation_')) {
                            info[name] = content;
                        }
                    }
                }
                return info;
            }""")
            
            # 构建内容HTML：摘要 + 元数据
            parts = []
            if abstract_html:
                parts.append(abstract_html)
            
            # 添加元数据（作者、期刊、DOI等）
            meta_lines = []
            # 作者
            authors = meta_info.get('eprints.creators_name') or meta_info.get('citation_author') or ''
            if authors:
                meta_lines.append(f'<p><strong>作者：</strong>{authors}</p>')
            # 期刊
            journal = meta_info.get('eprints.publication') or meta_info.get('citation_journal_title') or ''
            if journal:
                meta_lines.append(f'<p><strong>期刊：</strong>{journal}</p>')
            # DOI
            doi = meta_info.get('eprints.doi') or meta_info.get('citation_doi') or ''
            if doi:
                meta_lines.append(f'<p><strong>DOI：</strong>{doi}</p>')
            # 出版日期
            pub_date = meta_info.get('eprints.date') or meta_info.get('citation_publication_date') or ''
            if pub_date:
                meta_lines.append(f'<p><strong>出版日期：</strong>{pub_date}</p>')
            # 卷期页码
            vol = meta_info.get('eprints.volume') or meta_info.get('citation_volume') or ''
            issue = meta_info.get('eprints.number') or meta_info.get('citation_issue') or ''
            pages = meta_info.get('eprints.pagerange') or ''
            if vol or issue or pages:
                vol_info = f'第{vol}卷' if vol else ''
                issue_info = f'第{issue}期' if issue else ''
                page_info = f'第{pages}页' if pages else ''
                meta_lines.append(f'<p><strong>卷期页码：</strong>{vol_info} {issue_info} {page_info}</p>'.strip())
            # 全文提示
            meta_lines.append('<p><em>（全文需登录机构账户或个人账户后获取）</em></p>')
            
            meta_html = '\n'.join(meta_lines)
            content_html = f'<div>{abstract_html}\n{meta_html}</div>'
            print(f"[Playwright] yiigle: 构建内容长度 {len(content_html)}")
        
        if not content_html:
            selectors = ['article', '.article-content', '.content', '.post-content', 
                         '.detail-content', '.news-content', 'main', '[class*="content"]']
            for selector in selectors:
                try:
                    if await page.locator(selector).count() > 0:
                        content_html = await page.locator(selector).first.inner_html()
                        if len(content_html) > 500:
                            break
                except:
                    continue
        
        # 提取图片（优先从正文区域提取，不限制数量）
        images = []
        parsed_url = urlparse(url)
        url_is_https = parsed_url.scheme == 'https'

        async def _extract_images_from_elements(elements, images_list):
            for img in elements:
                try:
                    src = await img.get_attribute('src')
                    if src and not src.startswith('data:') and len(src) > 5:
                        # 转为绝对URL
                        if src.startswith('//'):
                            src = 'https:' + src
                        elif src.startswith('/'):
                            src = f"{parsed_url.scheme}://{parsed_url.netloc}{src}"
                        elif not src.startswith(('http://', 'https://')):
                            src = urljoin(url, src)
                        # 修复混合内容：页面HTTPS时图片也用HTTPS
                        if url_is_https and src.startswith('http://'):
                            src = 'https://' + src[7:]
                        images_list.append(CrawlImage(original_url=src))
                except:
                    pass

        try:
            # 优先从正文区域提取图片（避免页头/页脚/广告等无关图片）
            content_selectors = ['article', '.article-content', '.content', '.newstext', '.boxwrapmix', 'main']
            content_container = None
            for selector in content_selectors:
                try:
                    content_container = await page.query_selector(selector)
                    if content_container:
                        break
                except:
                    continue

            if content_container:
                content_imgs = await content_container.query_selector_all('img')
                await _extract_images_from_elements(content_imgs, images)
            else:
                # 回退：从全页提取，不限制数量
                img_elements = await page.locator('img').all()
                await _extract_images_from_elements(img_elements, images)

            print(f"从页面提取到 {len(images)} 张图片")
        except:
            pass
        
        await context.close()
        await browser.close()
        
        # 修复编码问题
        print(f"[Playwright] 编码修复前标题: {repr(title[:50] if title else '空')}")
        print(f"[Playwright] 编码修复前内容前200: {repr(content_html[:200] if content_html else '空')}")
        
        title = fix_encoding(title) if title else title
        content_html = fix_encoding(content_html) if content_html else content_html
        
        print(f"[Playwright] 编码修复后标题: {repr(title[:50] if title else '空')}")
        print(f"[Playwright] 返回结果 - 内容长度: {len(content_html) if content_html else 0}")
        
        return {
            'title': title.strip() if title else "未命名文章",
            'content_html': content_html,
            'images': images,
            'is_markdown': is_lark_wiki and len(content_html) > 500 if content_html else False  # 飞书JS提取的已是Markdown
        }


def convert_spa_html_to_markdown(html: str, images: List[CrawlImage], base_url: str) -> str:
    """将SPA采集的HTML转为Markdown"""
    # 修复编码问题
    html = fix_encoding(html)
    # 正文区 vs 噪音过滤（Pruning 思路）：剪掉导航/侧栏/评论区/相关推荐，质量门控不达标自动回退
    html = prune_html_noise(html)
    # 先清理 style 和 script 标签
    text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'\s+style="[^"]*"', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+class="[^"]*"', '', text, flags=re.IGNORECASE)
    parsed_base = urlparse(base_url)
    base_is_https = parsed_base.scheme == 'https'
    is_wechat = 'mp.weixin.qq.com' in base_url
    
    # 首先将img标签转为Markdown
    def img_to_markdown(match):
        src = match.group(1)
        alt = match.group(2) if match.lastindex and match.lastindex >= 2 else ""
        # 过滤 data URL
        if src.startswith('data:'):
            return ''
        # 处理URL
        if src.startswith('//'):
            src = 'https:' + src
        elif src.startswith('/'):
            src = f"{parsed_base.scheme}://{parsed_base.netloc}{src}"
        # 修复混合内容：页面HTTPS时图片也用HTTPS
        if base_is_https and src.startswith('http://'):
            src = 'https://' + src[7:]
        return f'![{alt}]({src})'
    
    # 微信文章特殊处理：图片使用data-src，过滤data URL
    if is_wechat:
        def wechat_img_replace(m):
            src = m.group(1)
            if src.startswith('data:'):
                return ''
            return f'![图片]({src})'
        text = re.sub(
            r'<img[^>]+data-src=["\']([^"\']+)["\'][^>]*>',
            wechat_img_replace,
            text, flags=re.IGNORECASE
        )
    
    # 匹配普通img标签
    text = re.sub(
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*alt=["\']([^"\']*)["\'][^>]*>',
        img_to_markdown, text, flags=re.IGNORECASE
    )
    # 匹配没有alt的img标签 - 需要处理URL转换！
    def img_to_markdown_no_alt(match):
        src = match.group(1)
        # 过滤 data URL
        if src.startswith('data:'):
            return ''
        # 处理URL（与img_to_markdown保持一致）
        if src.startswith('//'):
            src = 'https:' + src
        elif src.startswith('/'):
            src = f"{parsed_base.scheme}://{parsed_base.netloc}{src}"
        # 修复混合内容
        if base_is_https and src.startswith('http://'):
            src = 'https://' + src[7:]
        return f'![图片]({src})'
    
    text = re.sub(
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>',
        img_to_markdown_no_alt,
        text, flags=re.IGNORECASE
    )
    
    # 处理代码块 <pre><code>...</code></pre> - 必须在其他标签之前处理
    def convert_code_block(match):
        code_content = match.group(1)
        # 提取语言
        lang_match = re.search(r'class=["\'][^"\']*language-([^"\'\s]+)["\']', match.group(0), re.IGNORECASE)
        lang = lang_match.group(1) if lang_match else ''
        return f'\n```{lang}\n{code_content}\n```\n'
    
    text = re.sub(r'<pre[^>]*>\s*<code[^>]*>(.*?)</code>\s*</pre>', convert_code_block, 
                  text, flags=re.DOTALL | re.IGNORECASE)
    # 处理纯pre标签
    text = re.sub(r'<pre[^>]*>(.*?)</pre>', r'\n```\n\1\n```\n', text, flags=re.DOTALL | re.IGNORECASE)
    # 处理行内代码
    text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text, flags=re.DOTALL | re.IGNORECASE)
    
    # 转换其他标签
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<h4[^>]*>(.*?)</h4>', r'\n#### \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\n\1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<b[^>]*>(.*?)</b>', r'**\1**', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    
    # 解码HTML实体
    text = text.replace('&nbsp;', ' ').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&amp;', '&').replace('&quot;', '"')
    
    # 修复数学公式格式（掘金等平台）
    text = fix_math_formulas(text)
    
    # 清理空行
    lines = [line for line in text.split('\n')]
    cleaned = []
    prev_empty = False
    for line in lines:
        stripped = line.strip()
        if stripped == '':
            if not prev_empty:
                cleaned.append('')
            prev_empty = True
        else:
            cleaned.append(line)
            prev_empty = False
    
    return '\n'.join(cleaned).strip()


@router.post("")
async def crawl_article(request: CrawlRequest, db: Session = Depends(get_db), current_admin = Depends(get_current_admin)):
    """
    采集文章（自动检测SPA并使用Playwright）
    """
    # 设置响应头，防止缓存和确保正确编码
    response_headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    try:
        # 验证URL
        if not request.url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="无效的URL")
        
        # 微信文章特殊处理：直接用Playwright（requests会被拦截）
        is_wechat = 'mp.weixin.qq.com' in request.url
        # 掘金文章特殊处理：requests返回的是混淆代码，必须用Playwright
        is_juejin = 'juejin.cn' in request.url
        # eeworld JS WAF 防护：requests 会被直接断开连接，必须用 Playwright
        is_eeworld = 'eeworld.com.cn' in request.url

        if is_wechat or is_juejin or is_eeworld:
            site_name = "微信文章" if is_wechat else ("掘金文章" if is_juejin else "EEPW文章")
            print(f"检测到{site_name}，使用Playwright采集: {request.url}")
            
            if not PLAYWRIGHT_AVAILABLE:
                error_msg = f"{site_name}需要Playwright才能采集。请联系管理员安装: pip install playwright && playwright install chromium"
                return JSONResponse(
                    content={"success": False, "error": error_msg},
                    headers=response_headers
                )
            
            # 使用Playwright采集
            spa_result = await crawl_with_playwright(request.url)
            
            title = spa_result['title']
            images = spa_result['images']
            content_html = spa_result['content_html']
            
            # 转换为Markdown（策略链结果已是Markdown时跳过转换）
            if spa_result.get('is_markdown'):
                markdown_content = content_html
            else:
                markdown_content = convert_spa_html_to_markdown(content_html, images, request.url)
            # 从Markdown中再提取一次图片（确保HTML中所有图片都被捕获）
            images = _merge_images_from_markdown(images, markdown_content, request.url)
            
        else:
            # 第一步：尝试普通requests采集
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate',
                'Cache-Control': 'max-age=0',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            }
            
            try:
                response = requests.get(request.url, headers=headers, timeout=30)
                response.raise_for_status()
            except requests.exceptions.HTTPError as e:
                # 遇到反爬虫拦截(468/403/429)，尝试使用Playwright
                if response.status_code in (468, 403, 429, 503) and PLAYWRIGHT_AVAILABLE:
                    print(f"Requests被拦截({response.status_code})，尝试Playwright: {request.url}")
                    spa_result = await crawl_with_playwright(request.url)

                    title = spa_result['title']
                    images = spa_result['images']
                    content_html = spa_result['content_html']
                    if spa_result.get('is_markdown'):
                        markdown_content = content_html
                    else:
                        markdown_content = convert_spa_html_to_markdown(content_html, images, request.url)
                    images = _merge_images_from_markdown(images, markdown_content, request.url)

                    return JSONResponse(
                        content={
                            "success": True,
                            "title": title,
                            "url": request.url,
                            "content": markdown_content,
                            "images": [{"original_url": img.original_url, "local_path": img.local_path, "filename": img.filename} for img in images]
                        },
                        headers=response_headers
                    )
                else:
                    raise
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                # 连接被拒绝/超时（可能是JS WAF或反爬），回退到Playwright
                if PLAYWRIGHT_AVAILABLE:
                    print(f"Requests连接失败({type(e).__name__})，尝试Playwright: {request.url}")
                    spa_result = await crawl_with_playwright(request.url)

                    title = spa_result['title']
                    images = spa_result['images']
                    content_html = spa_result['content_html']
                    if spa_result.get('is_markdown'):
                        markdown_content = content_html
                    else:
                        markdown_content = convert_spa_html_to_markdown(content_html, images, request.url)
                    images = _merge_images_from_markdown(images, markdown_content, request.url)

                    return JSONResponse(
                        content={
                            "success": True,
                            "title": title,
                            "url": request.url,
                            "content": markdown_content,
                            "images": [{"original_url": img.original_url, "local_path": img.local_path, "filename": img.filename} for img in images]
                        },
                        headers=response_headers
                    )
                else:
                    raise
            
            # 智能编码处理：优先使用声明的编码，而不是猜测
            # 1. 先检查HTTP响应头中的编码
            declared_encoding = None
            if response.encoding:
                declared_encoding = response.encoding
            
            # 2. 如果响应头没有明确编码，从HTML meta标签中提取
            if not declared_encoding or declared_encoding.lower() in ['iso-8859-1', 'latin-1']:
                # 尝试从HTML中提取charset
                raw_content = response.content
                charset_match = re.search(rb'<meta[^>]+charset=["\']?([^"\'>\s]+)', raw_content, re.IGNORECASE)
                if charset_match:
                    declared_encoding = charset_match.group(1).decode('ascii', errors='ignore')
            
            # 3. 使用声明的编码，如果没有才用 apparent_encoding 猜测
            if declared_encoding and declared_encoding.lower() not in ['iso-8859-1', 'latin-1']:
                response.encoding = declared_encoding
            else:
                response.encoding = response.apparent_encoding or 'utf-8'
            
            html = response.text
            
            # 检测是否为SPA
            if is_spa_site(html):
                print(f"检测到SPA网站，使用Playwright采集: {request.url}")
                
                if not PLAYWRIGHT_AVAILABLE:
                    return JSONResponse(
                        content={"success": False, "error": "该网站为SPA单页应用，需要安装Playwright才能采集。请联系管理员安装: pip install playwright && playwright install chromium"},
                        headers=response_headers
                    )
                
                # 使用Playwright采集
                spa_result = await crawl_with_playwright(request.url)
                
                title = spa_result['title']
                images = spa_result['images']
                content_html = spa_result['content_html']
                
                # 转换HTML为Markdown（飞书JS提取的已是Markdown，跳过转换）
                if spa_result.get('is_markdown'):
                    markdown_content = content_html
                    print(f"飞书Wiki: 内容已是Markdown，跳过HTML转换")
                else:
                    markdown_content = convert_spa_html_to_markdown(content_html, images, request.url)
                images = _merge_images_from_markdown(images, markdown_content, request.url)
                
            else:
                # 普通网站，使用原有逻辑
                print(f"普通网站，使用requests采集: {request.url}")
                
                # 提取标题
                title = extract_title_from_html(html)
                
                # 提取主要内容
                main_content = extract_main_content(html)
                
                # 转换HTML为Markdown（必须先执行，用于图片提取）
                markdown_content = html_to_markdown(main_content, request.url)
                
                # 从Markdown内容中提取图片（确保只提取实际在文章中的图片）
                images = extract_images_from_markdown(markdown_content, request.url)
                
                # 安全网：如果提取的内容过短（< 300 chars），可能是 Next.js RSC 等
                # JS 渲染型页面，自动回退到 Playwright
                if len(markdown_content.strip()) < 300 and PLAYWRIGHT_AVAILABLE:
                    print(f"requests提取内容过短({len(markdown_content.strip())} chars)，疑似JS渲染页面，回退Playwright")
                    spa_result = await crawl_with_playwright(request.url)
                    
                    title = spa_result['title']
                    images = spa_result['images']
                    content_html = spa_result['content_html']
                    
                    markdown_content = convert_spa_html_to_markdown(content_html, images, request.url)
                    images = _merge_images_from_markdown(images, markdown_content, request.url)
        
        # 创建临时目录
        temp_dir = "/tmp/blog_crawl"
        os.makedirs(temp_dir, exist_ok=True)
        
        # uploads 目录配置
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        upload_dir = os.path.join(backend_dir, "uploads")
        thumb_dir = os.path.join(upload_dir, "thumbnails")
        os.makedirs(upload_dir, exist_ok=True)
        os.makedirs(thumb_dir, exist_ok=True)
        
        # 下载图片并保存到数据库（不限数量，仅按出现顺序去重）
        downloaded_images = []
        # 去重：保留首次出现的顺序
        seen_urls = set()
        unique_images = []
        for img in images:
            if img.original_url not in seen_urls:
                seen_urls.add(img.original_url)
                unique_images.append(img)
        print(f"准备下载 {len(unique_images)} 张图片（原始 {len(images)}，去重后）")
        for i, img in enumerate(unique_images):
            # 如果已经在 Playwright 里下载好了（如微信文章浏览器 fetch），直接复用
            if img.success and img.local_path and os.path.exists(img.local_path):
                filename = img.filename or os.path.basename(img.local_path)
                filepath = img.local_path
                success = True
                print(f"复用已下载的图片: {filename}")
            else:
                filename, filepath, success = download_image(img.original_url, temp_dir)
            if success:
                try:
                    # 生成新的文件名（避免冲突）
                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
                        ext = '.jpg'
                    new_filename = f"crawl_{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}{ext}"
                    
                    # 移动文件到 uploads 目录
                    new_filepath = os.path.join(upload_dir, new_filename)
                    with open(filepath, 'rb') as src:
                        with open(new_filepath, 'wb') as dst:
                            dst.write(src.read())
                    
                    # 删除临时文件
                    os.remove(filepath)
                    
                    # 生成缩略图
                    thumb_filename = f"thumb_{new_filename}"
                    thumb_filepath = os.path.join(thumb_dir, thumb_filename)
                    thumb_path_db = None
                    if generate_thumbnail(new_filepath, thumb_filepath):
                        thumb_path_db = f"/uploads/thumbnails/{thumb_filename}"
                    
                    # 获取图片尺寸
                    width, height = get_image_dimensions(new_filepath)
                    
                    # 获取文件大小
                    file_size = os.path.getsize(new_filepath)
                    
                    # 保存到数据库 images 表
                    image_record = Image(
                        filename=new_filename,
                        original_name=filename,
                        file_path=f"/uploads/{new_filename}",
                        thumb_path=thumb_path_db,
                        description=f"采集自 {request.url}",
                        file_size=file_size,
                        width=width,
                        height=height
                    )
                    db.add(image_record)
                    db.commit()
                    db.refresh(image_record)
                    
                    # 更新返回的图片信息
                    img.local_path = f"/uploads/{new_filename}"
                    img.filename = new_filename
                    img.success = True
                    img.id = image_record.id  # 保存数据库ID供前端使用
                    downloaded_images.append(img)
                    
                    # 将 content 中的原始URL替换为本地路径
                    # 微信图片URL可能带 #imgIndex=xx 锚点，去掉后再匹配
                    url_for_match = img.original_url.split('#')[0]
                    if url_for_match in markdown_content:
                        markdown_content = markdown_content.replace(
                            url_for_match,
                            f"/uploads/{new_filename}"
                        )
                        print(f"✅ 已将内容中的图片URL替换: {url_for_match[:60]}... -> /uploads/{new_filename}")
                    
                    print(f"图片已保存到数据库: id={image_record.id}, filename={new_filename}")
                    
                except Exception as e:
                    print(f"保存图片到数据库失败: {e}")
                    # 如果数据库保存失败，仍然保留临时文件信息
                    img.local_path = filepath
                    img.filename = filename
                    img.success = True
                    downloaded_images.append(img)
        
        # 生成摘要（前200字符）
        summary = markdown_content[:200].replace('#', '').replace('*', '').strip()
        
        # 序列化图片数据
        images_data = []
        for img in downloaded_images:
            img_dict = {"original_url": img.original_url}
            if hasattr(img, 'local_path') and img.local_path:
                img_dict["local_path"] = img.local_path
            if hasattr(img, 'filename') and img.filename:
                img_dict["filename"] = img.filename
            if hasattr(img, 'id') and img.id:
                img_dict["id"] = img.id
            images_data.append(img_dict)
        
        return JSONResponse(
            content={
                "success": True,
                "title": title,
                "content": markdown_content,
                "summary": summary,
                "images": images_data
            },
            headers=response_headers
        )
        
    except requests.RequestException as e:
        return JSONResponse(
            content={"success": False, "error": f"网络请求失败: {str(e)}"},
            headers=response_headers
        )
    except Exception as e:
        import traceback
        print(f"采集失败: {e}")
        print(traceback.format_exc())
        return JSONResponse(
            content={"success": False, "error": f"采集失败: {str(e)}"},
            headers=response_headers
        )
