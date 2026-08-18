#!/usr/bin/env python3
"""站点提取策略化重构（v2）单元测试。

核心断言：策略链（轨B）与旧逻辑（轨A）对同一 HTML 的输出完全一致。
运行：cd backend && python3 test_crawl_strategies.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routers.crawl import CrawlImage, extract_images
from routers.crawl_strategies import (
    JuejinExtractor,
    CsdnExtractor,
    GenericExtractor,
    SITE_EXTRACTORS,
    get_extractor_for_url,
    is_strategy_first,
    is_strategy_success,
    run_extractor,
    ExtractorResult,
    STRATEGY_FIRST_DOMAINS,
    FALLBACK_TITLE,
)
from routers.universal_crawl import (
    _extract_juejin_title,
    _extract_juejin_content,
    _extract_csdn_title,
    _extract_csdn_content,
    _filter_csdn_images,
    _legacy_extract,
)

PASS = 0
FAIL = 0


def check(name, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {name}")
    else:
        FAIL += 1
        print(f"  FAIL  {name}")


# 掘金 HTML：article.article 为正文，sidebar 为噪音
JUEGIN_HTML = f"""<html><head><title>深入理解 React 并发特性 - 掘金</title></head><body>
<article class="article"><h1>深入理解 React 并发特性</h1>
<p>{'这是掘金正文内容，用于验证策略链与旧逻辑提取一致性。' * 12}</p>
<img src="https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/abc.webp"></article>
<div class="sidebar">侧栏内容不应被提取</div></body></html>"""

# CSDN HTML：content_views 为正文，含 UI 图标噪音图（avatar/copyright 全小写 pattern 能命中；
# newHeart2023 等混合大小写 pattern 因 img_url.lower() 永远匹配不上，属既有 bug，保持原样）
CSDN_HTML = f"""<html><head><title>Python 异步编程指南 - CSDN博客</title></head><body>
<div id="content_views">
<p>{'这是 CSDN 正文内容，用于验证策略链与旧逻辑提取一致性。' * 12}</p>
<img src="https://img-blog.csdnimg.cn/avatar-1.png">
<img src="https://img-blog.csdnimg.cn/copyright.png">
<img src="https://img-blog.csdnimg.cn/real-article.png">
</div>
<div class="recommend">推荐文章列表不应被提取</div></body></html>"""

# 未知站点 HTML：走 GenericExtractor
GENERIC_HTML = f"""<html><head><title>某某技术博客</title></head><body>
<article><p>{'普通网站正文内容，用于验证通用兜底策略。' * 12}</p></article></body></html>"""

URL_JUEGIN = "https://juejin.cn/post/7420000000000000000"
URL_CSDN = "https://blog.csdn.net/xxx/article/details/140000000"
URL_GENERIC = "https://example.com/post/123"


def test_registry():
    print("[1] 注册表匹配")
    check("juejin -> JuejinExtractor", isinstance(get_extractor_for_url(URL_JUEGIN), JuejinExtractor))
    check("csdn -> CsdnExtractor", isinstance(get_extractor_for_url(URL_CSDN), CsdnExtractor))
    check("unknown -> GenericExtractor", isinstance(get_extractor_for_url(URL_GENERIC), GenericExtractor))
    check("GenericExtractor 恒兜底", SITE_EXTRACTORS[-1].name == "generic")
    check("策略链默认关闭（白名单为空）", is_strategy_first(URL_JUEGIN) is False)
    check("白名单为空集", STRATEGY_FIRST_DOMAINS == set())


def test_juejin_consistency():
    print("[2] 掘金策略与旧逻辑一致性")
    ext = JuejinExtractor()
    title_new = ext.extract_title(JUEGIN_HTML, URL_JUEGIN)
    title_old = _extract_juejin_title(JUEGIN_HTML)
    check("标题一致且去掉「- 掘金」后缀", title_new == title_old == "深入理解 React 并发特性")

    content_new = ext.extract_content_html(JUEGIN_HTML, URL_JUEGIN)
    content_old = _extract_juejin_content(JUEGIN_HTML)
    check("正文容器一致", content_new == content_old)
    check("正文容器不含侧栏", "侧栏内容" not in content_new and "sidebar" not in content_new)
    check("needs_browser=True", ext.needs_browser(URL_JUEGIN) is True)


def test_csdn_consistency():
    print("[3] CSDN 策略与旧逻辑一致性")
    ext = CsdnExtractor()
    title_new = ext.extract_title(CSDN_HTML, URL_CSDN)
    title_old = _extract_csdn_title(CSDN_HTML)
    check("标题一致且去掉「- CSDN博客」后缀", title_new == title_old == "Python 异步编程指南")

    content_new = ext.extract_content_html(CSDN_HTML, URL_CSDN)
    content_old = _extract_csdn_content(CSDN_HTML)
    check("正文容器一致", content_new == content_old)
    check("正文容器不含推荐列表", "推荐文章列表" not in content_new)

    images = extract_images(CSDN_HTML, URL_CSDN)
    check("图片提取到 3 张", len(images) == 3)
    filtered_new = ext.filter_images(images, URL_CSDN)
    filtered_old = _filter_csdn_images(images)
    check("图片过滤结果一致", [i.original_url for i in filtered_new] == [i.original_url for i in filtered_old])
    check("UI 图标被过滤（avatar/copyright）", len(filtered_new) == 1 and filtered_new[0].original_url.endswith("real-article.png"))

    # 既有 bug 行为记录：newHeart2023 混合大小写 pattern 因 img_url.lower() 永不匹配，保持原样不修
    mixed_case = extract_images('<img src="https://img-blog.csdnimg.cn/newHeart2023.png">', URL_CSDN)
    check("历史行为：newHeart2023 不被过滤（既有 bug，保持原样）", len(ext.filter_images(mixed_case, URL_CSDN)) == 1)


def test_run_extractor():
    print("[4] 策略链集成（run_extractor）")
    images = extract_images(JUEGIN_HTML, URL_JUEGIN)
    result = run_extractor(JuejinExtractor(), URL_JUEGIN, JUEGIN_HTML, images)
    check("标题正确", result.title == "深入理解 React 并发特性")
    check("Markdown 含正文", "掘金正文内容" in result.markdown)
    check("Markdown 不含侧栏", "侧栏内容" not in result.markdown)
    check("图片 1 张", len(result.images) == 1)

    # 标题降级：专用提取失败时回退通用 <title>
    degraded_html = "<html><head><title>通用标题兜底</title></head><body>" + JUEGIN_HTML.split("<body>")[1]
    result2 = run_extractor(JuejinExtractor(), URL_JUEGIN, degraded_html, images)
    check("标题降级到通用提取", result2.title == "通用标题兜底")


def test_quality_gate():
    print("[5] 质量门控 is_strategy_success")
    ok = ExtractorResult(title="好标题", markdown="x" * 500, images=[])
    check("正常结果通过", is_strategy_success(ok) is True)
    check("空标题失败", is_strategy_success(ExtractorResult(title="", markdown="x" * 500, images=[])) is False)
    check("兜底标题失败", is_strategy_success(ExtractorResult(title=FALLBACK_TITLE, markdown="x" * 500, images=[])) is False)
    check("内容过短失败", is_strategy_success(ExtractorResult(title="好标题", markdown="x" * 100, images=[])) is False)


def test_legacy_vs_strategy_equivalence():
    print("[6] 新旧轨全链路等价（title/markdown/images）")
    for url, html, extractor in [
        (URL_JUEGIN, JUEGIN_HTML, JuejinExtractor()),
        (URL_CSDN, CSDN_HTML, CsdnExtractor()),
        (URL_GENERIC, GENERIC_HTML, GenericExtractor()),
    ]:
        old_title, old_md, old_images = _legacy_extract(url, html)
        new = run_extractor(extractor, url, html, extract_images(html, url))
        check(f"{extractor.name}: 标题等价", old_title == new.title)
        check(f"{extractor.name}: Markdown 等价", old_md == new.markdown)
        check(f"{extractor.name}: 图片等价", [i.original_url for i in old_images] == [i.original_url for i in new.images])


if __name__ == "__main__":
    test_registry()
    test_juejin_consistency()
    test_csdn_consistency()
    test_run_extractor()
    test_quality_gate()
    test_legacy_vs_strategy_equivalence()
    print(f"\n结果: {PASS} 通过, {FAIL} 失败")
    sys.exit(1 if FAIL else 0)
