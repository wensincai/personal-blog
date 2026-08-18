#!/usr/bin/env python3
"""测试 wechat-crawl API 端点"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

url = "https://example.com/sample-article"
print(f"测试 API: /api/wechat-crawl/preview")
print(f"URL: {url}\n")

res = client.post("/api/wechat-crawl/preview", json={"url": url})
print(f"状态码: {res.status_code}")
print(f"响应: {res.text[:2000]}")
