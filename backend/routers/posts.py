"""
文章管理路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Post, Category, Tag, PostTag, Image
from schemas import PostCreate, PostUpdate, PostResponse, PostListItem
from routers.auth import get_current_admin
import re

router = APIRouter(prefix="/api/posts", tags=["文章"])


@router.get("", response_model=List[PostListItem])
def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    is_draft: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """获取文章列表（支持筛选）"""
    query = db.query(Post)
    
    # 筛选条件
    if category_id:
        query = query.filter(Post.category_id == category_id)
    if tag_id:
        query = query.join(PostTag).filter(PostTag.tag_id == tag_id)
    if is_draft is not None:
        query = query.filter(Post.is_draft == is_draft)
    if search:
        query = query.filter(Post.title.contains(search) | Post.content.contains(search))
    
    # 按时间倒序
    query = query.order_by(Post.created_at.desc())
    
    posts = query.offset(skip).limit(limit).all()
    return posts


@router.get("/{post_id}", response_model=PostResponse)
def get_post(post_id: str, db: Session = Depends(get_db)):
    """获取单篇文章（支持 id 或 slug）"""
    # 尝试作为 id 查询
    try:
        id_int = int(post_id)
        post = db.query(Post).filter(Post.id == id_int).first()
    except ValueError:
        post = None
    
    # 如果不是 id，尝试作为 slug 查询
    if not post:
        post = db.query(Post).filter(Post.slug == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    
    # 增加浏览量
    post.view_count += 1
    db.commit()
    
    return post


@router.post("", response_model=PostResponse)
def create_post(
    post_data: PostCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建文章"""
    # 处理标签
    tags = []
    if post_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(post_data.tag_ids)).all()
    
    # 创建文章
    post = Post(
        title=post_data.title,
        content=post_data.content,
        content_type=post_data.content_type or "markdown",
        summary=post_data.summary or post_data.content[:200] + "...",
        cover_image=post_data.cover_image,
        is_published=post_data.is_published,
        is_draft=post_data.is_draft,
        category_id=post_data.category_id,
        tags=tags
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: int,
    post_data: PostUpdate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新文章"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    
    # 更新字段
    update_data = post_data.dict(exclude_unset=True)
    
    # 处理标签
    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if tag_ids is not None:
            post.tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    
    # 更新其他字段
    for field, value in update_data.items():
        setattr(post, field, value)
    
    # 自动更新摘要
    if post_data.content and not post_data.summary:
        post.summary = post_data.content[:200] + "..."
    
    db.commit()
    db.refresh(post)
    return post


def delete_post_images(post: Post, db: Session):
    """删除文章关联的所有图片（物理删除文件+数据库记录）"""
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    THUMB_DIR = os.path.join(UPLOAD_DIR, "thumbnails")
    
    # 收集所有要删除的图片路径
    image_paths = set()
    
    # 1. 封面图
    if post.cover_image:
        image_paths.add(post.cover_image)
    
    # 2. 内容中的图片
    if post.content:
        paths = re.findall(r'/uploads/[^\s"\')<>]+', post.content)
        image_paths.update(paths)
    
    # 删除每张图片
    for path in image_paths:
        filename = os.path.basename(path)
        
        # 查找数据库记录
        image = db.query(Image).filter(Image.file_path == path).first()
        if image:
            # 删除原图文件
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # 删除缩略图文件
            if image.thumb_path:
                thumb_filename = os.path.basename(image.thumb_path)
                thumb_path = os.path.join(THUMB_DIR, thumb_filename)
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            
            # 删除数据库记录
            db.delete(image)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除文章（同时删除关联的图片）"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="文章不存在")
    
    # 先删除关联图片
    delete_post_images(post, db)
    
    # 再删除文章
    db.delete(post)
    db.commit()
    return {"message": "文章已删除"}


@router.get("/stats/overview")
def get_stats(db: Session = Depends(get_db)):
    """获取统计数据"""
    from sqlalchemy import func
    
    total_posts = db.query(Post).filter(Post.is_draft == False).count()
    total_views = db.query(func.sum(Post.view_count)).scalar() or 0
    
    # 按分类统计
    category_counts = {}
    categories = db.query(Category).all()
    for cat in categories:
        count = db.query(Post).filter(Post.category_id == cat.id).count()
        category_counts[cat.name] = count
    
    # 最近文章
    recent_posts = db.query(Post).order_by(Post.created_at.desc()).limit(5).all()
    
    return {
        "total_posts": total_posts,
        "total_views": total_views,
        "category_counts": category_counts,
        "recent_posts": recent_posts
    }
