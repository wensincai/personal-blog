"""
正文区 vs 噪音过滤（crawl4ai Pruning 思路的本地化实现）。

应用场景：HTML → Markdown 转换前对整页 DOM 做剪枝，去掉导航/侧栏/评论区/
相关推荐等噪音容器，避免噪音进入正文 Markdown。

设计来源：crawl4ai 的 PruningContentFilter（crawl4ai/crawl4ai/content_filter_strategy.py），核心为递归评分剪枝：
    score = 0.4*text_density + 0.2*link_density + 0.2*tag_weight
            + 0.1*class_id_weight + 0.1*text_length

相对原版的两处修正（实测 CSDN 文章页验证，7505 → 2776 字符、正文零丢失）：
1. 原版 text_length 项 = log(text_len+1) 无上限，超大噪音容器（如 3600+
   字符的相关推荐列表）得分 0.90 远超阈值 0.48 而残留；
   本实现将其封顶为 5.0。
2. 原版对命中负面模式（recommend/comment/sidebar/ads...）的类名仅做 -0.5
   小惩罚；本实现改为硬删——类名/ID 命中负面模式的容器几乎必然是噪音。

安全性：质量门控——剪枝后正文文本 < min_output_chars 或 < 原文本 min_ratio
时回退返回原 HTML，避免误删导致正文丢失。对已定位正文容器的局部 HTML
调用时无副作用（正文容器内节点评分普遍高于阈值）。
"""

import math
import re

from bs4 import BeautifulSoup, Comment

# 确定的噪音标签：直接删除整个子树
EXCLUDED_TAGS = {
    "nav", "footer", "header", "aside",
    "script", "style", "form", "iframe", "noscript",
}

# 负面类名/ID：命中直接硬删（相对 crawl4ai 的 -0.5 惩罚改为硬删）
NEGATIVE_PATTERN = re.compile(
    r"nav|header|footer|sidebar|comment|ads|advert|promo|social|share|"
    r"recommend|related|breadcrumb|toolbar|menu|pagination|qr|qrcode|"
    r"copyright|tip|hot|rank",
    re.I,
)

# 正文标签权重（决定文本块的评分加成）
TAG_WEIGHT = {
    "div": 0.5, "p": 1.0, "article": 1.5, "section": 1.2, "main": 1.5,
    "li": 0.5, "td": 0.5, "th": 0.5,
}

# 保护标签：正文关键内容（代码/表格/图片/引用）不参与剪枝
PROTECT_TAGS = {"pre", "code", "table", "figure", "blockquote", "img"}


def _class_id_text(node) -> str:
    return " ".join(node.get("class", []) + [node.get("id", "")])


def _prune_tree(node, threshold: float) -> None:
    """递归剪枝：对直接子节点评分，低于阈值或命中负面类名则删除。"""
    for child in list(node.find_all(recursive=False)):
        if child.name in PROTECT_TAGS:
            continue
        # 硬规则：负面类名/ID 直接删除
        if (child.get("class") or child.get("id")) and NEGATIVE_PATTERN.search(
            _class_id_text(child)
        ):
            child.decompose()
            continue
        text_len = len(child.get_text(strip=True))
        tag_len = len(str(child))
        if tag_len == 0:
            continue
        link_text_len = sum(len(a.get_text(strip=True)) for a in child.find_all("a"))
        text_density = text_len / tag_len
        link_density = 1.0 - (link_text_len / text_len if text_len else 0.0)
        tag_weight = TAG_WEIGHT.get(child.name, 0.5)
        text_length = min(math.log(text_len + 1), 5.0)  # 长度项封顶，避免大容器评分失真
        score = (
            0.4 * text_density
            + 0.2 * link_density
            + 0.2 * tag_weight
            + 0.1 * text_length
        )
        if score < threshold:
            child.decompose()
        else:
            _prune_tree(child, threshold)


def prune_html_noise(
    html: str,
    threshold: float = 0.5,
    min_output_chars: int = 300,
    min_ratio: float = 0.2,
) -> str:
    """
    对整页 HTML 做正文区 vs 噪音过滤，返回剪枝后的 HTML。

    质量门控：剪枝后正文文本 < min_output_chars 或 < 原文本 min_ratio 时，
    认为剪枝疑似误删，回退返回原 HTML（安全兜底）。
    """
    if not html or not isinstance(html, str) or "<body" not in html.lower():
        return html
    try:
        soup = BeautifulSoup(html, "lxml")
    except Exception:
        soup = BeautifulSoup(html, "html.parser")
    if not soup.body:
        return html

    before_text = soup.body.get_text(strip=True)
    if len(before_text) < min_output_chars:
        return html  # 页面本身就没多少文本，不剪

    # 删除噪音标签与注释
    for tag in list(soup.find_all(EXCLUDED_TAGS)):
        tag.decompose()
    for comment in list(soup.find_all(string=lambda s: isinstance(s, Comment))):
        comment.extract()

    _prune_tree(soup.body, threshold)

    after_text = soup.body.get_text(strip=True)
    if len(after_text) < min_output_chars or len(after_text) < len(before_text) * min_ratio:
        return html  # 疑似误删，回退原 HTML
    return str(soup.body)
