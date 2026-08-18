"""
个人博客后端 - FastAPI
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import CORS_ORIGINS, BACKEND_HOST, BACKEND_PORT
from database import engine, Base
from routers import auth, posts, categories, tags, images, settings, crawl, wechat_crawl, universal_crawl

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 初始化默认管理员
from database import SessionLocal
from routers.auth import init_admin
db = SessionLocal()
init_admin(db)
db.close()

app = FastAPI(
    title="Personal Blog API",
    description="个人博客后端API",
    version="1.0.0",
    redirect_slashes=False
)

# CORS配置 - 允许的来源见 config.py（BLOG_CORS_ORIGINS）
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(images.router)
app.include_router(settings.router)
app.include_router(crawl.router)
app.include_router(wechat_crawl.router)
app.include_router(universal_crawl.router)

# 静态文件服务（图片访问）
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
def root():
    return {
        "message": "Personal Blog API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=BACKEND_HOST, port=BACKEND_PORT)
