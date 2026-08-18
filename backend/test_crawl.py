#!/usr/bin/env python3
"""本地测试采集功能，绕过 HTTP API 和数据库"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routers.crawl import crawl_with_playwright, convert_spa_html_to_markdown
from routers.crawl import CrawlImage

async def main():
    url = "https://example.com/sample-article"
    print(f"开始测试采集: {url}\n")

    result = await crawl_with_playwright(url)

    print(f"标题: {result['title']}")
    print(f"图片数: {len(result['images'])}")
    print(f"内容HTML长度: {len(result['content_html'])}")

    markdown = convert_spa_html_to_markdown(
        result['content_html'],
        result['images'],
        url
    )

    print(f"\nMarkdown长度: {len(markdown)}")
    print("\n=== Markdown 前 3000 字符 ===")
    print(markdown[:3000])
    print("\n=== Markdown 末尾 1000 字符 ===")
    print(markdown[-1000:])

    # 检查是否有代码块
    if '```' in markdown:
        print("\n✅ 检测到代码块!")
        code_blocks = markdown.split('```')
        print(f"代码块数量: {len(code_blocks)//2}")
    else:
        print("\n⚠️ 未检测到代码块")

if __name__ == "__main__":
    asyncio.run(main())
