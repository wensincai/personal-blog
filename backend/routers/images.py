"""
图片上传管理路由
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import subprocess
from datetime import datetime
from PIL import Image as PILImage
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Image, Post, Setting, Page
from routers.auth import get_current_admin

router = APIRouter(prefix="/api/images", tags=["图片"])

# 上传配置
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
THUMB_DIR = os.path.join(UPLOAD_DIR, "thumbnails")
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
THUMB_WIDTH = 320  # 缩略图宽度
THUMB_QUALITY = 85

# 确保上传目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMB_DIR, exist_ok=True)


def generate_thumbnail(img_path: str, thumb_path: str) -> bool:
    """生成缩略图"""
    try:
        # 检查是否是 SVG 文件
        if img_path.lower().endswith('.svg'):
            # SVG 直接复制作为"缩略图"（矢量图不需要缩放）
            import shutil
            shutil.copy2(img_path, thumb_path)
            return True
        
        # 使用 Pillow 生成缩略图（不需要 ImageMagick，更轻量）
        with PILImage.open(img_path) as img:
            # 转换为 RGB（处理 PNG 透明背景等）
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # 计算等比例缩放后的高度
            ratio = THUMB_WIDTH / img.width
            thumb_height = int(img.height * ratio)
            
            # 生成缩略图
            thumb = img.resize((THUMB_WIDTH, thumb_height), PILImage.Resampling.LANCZOS)
            
            # 保存
            ext = os.path.splitext(thumb_path)[1].lower()
            if ext == '.png':
                thumb.save(thumb_path, 'PNG')
            else:
                thumb.save(thumb_path, 'JPEG', quality=THUMB_QUALITY)
        return True
    except Exception as e:
        print(f"生成缩略图失败: {e}")
        return False


def get_image_dimensions(img_path: str) -> tuple:
    """获取图片尺寸"""
    try:
        # SVG 文件特殊处理
        if img_path.lower().endswith('.svg'):
            return get_svg_dimensions(img_path)
        
        with PILImage.open(img_path) as img:
            return img.width, img.height
    except:
        return None, None


def get_svg_dimensions(svg_path: str) -> tuple:
    """从 SVG 文件中提取宽度和高度"""
    try:
        import xml.etree.ElementTree as ET
        
        # 解析 SVG 文件
        tree = ET.parse(svg_path)
        root = tree.getroot()
        
        # 获取 width 和 height 属性
        width = root.get('width', '')
        height = root.get('height', '')
        
        # 解析 viewBox 作为备选
        viewbox = root.get('viewBox', '')
        
        def parse_value(val):
            """解析数值，移除单位（如 px）"""
            if not val:
                return None
            # 移除常见单位
            val = val.strip().replace('px', '').replace('pt', '').replace('em', '').replace('rem', '')
            try:
                return int(float(val))
            except:
                return None
        
        w = parse_value(width)
        h = parse_value(height)
        
        # 如果没有 width/height，尝试从 viewBox 解析
        if (w is None or h is None) and viewbox:
            parts = viewbox.replace(',', ' ').split()
            if len(parts) >= 4:
                # viewBox="minX minY width height"
                w = parse_value(parts[2]) if w is None else w
                h = parse_value(parts[3]) if h is None else h
        
        # 返回默认值如果无法解析
        return w or 100, h or 100
    except Exception as e:
        print(f"解析 SVG 尺寸失败: {e}")
        return 100, 100


def allowed_file(filename):
    """检查文件扩展名"""
    return os.path.splitext(filename.lower())[1] in ALLOWED_EXTENSIONS


@router.get("")
def get_images(
    skip: int = 0, 
    limit: int = 50, 
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    """获取图片列表（按时间倒序）"""
    total = db.query(Image).count()
    images = db.query(Image).order_by(Image.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "items": [
            {
                "id": img.id,
                "filename": img.filename,
                "original_name": img.original_name,
                "file_path": img.file_path,
                "thumb_path": img.thumb_path,
                "description": img.description,
                "file_size": img.file_size,
                "width": img.width,
                "height": img.height,
                "created_at": img.created_at.isoformat() if img.created_at else None
            }
            for img in images
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    description: str = "",
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """上传图片（自动生成缩略图）"""
    # 检查文件类型
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400, 
            detail="不支持的文件格式，仅支持 JPG、PNG、GIF、WebP"
        )
    
    # 读取文件内容检查大小
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"文件大小超过10MB限制"
        )
    
    # 生成唯一文件名（统一转 jpg 以便处理）
    ext = os.path.splitext(file.filename.lower())[1]
    if ext == '.webp':
        ext = '.jpg'  # webp 转 jpg
    unique_filename = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    thumb_filename = f"thumb_{unique_filename}"
    thumb_path_full = os.path.join(THUMB_DIR, thumb_filename)
    
    # 保存原文件
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 获取图片尺寸
    width, height = get_image_dimensions(file_path)
    
    # 生成缩略图
    thumb_path_db = None
    if generate_thumbnail(file_path, thumb_path_full):
        thumb_path_db = f"/uploads/thumbnails/{thumb_filename}"
    
    # 保存到数据库
    image = Image(
        filename=unique_filename,
        original_name=file.filename,
        file_path=f"/uploads/{unique_filename}",
        thumb_path=thumb_path_db,
        description=description,
        file_size=len(content),
        width=width,
        height=height
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    
    return {
        "id": image.id,
        "filename": image.filename,
        "original_name": image.original_name,
        "description": image.description,
        "file_size": image.file_size,
        "file_path": image.file_path,
        "thumb_path": image.thumb_path,
        "width": image.width,
        "height": image.height,
        "created_at": image.created_at
    }


async def process_single_image(file: UploadFile, db: Session):
    """处理单张图片（内部函数，用于批量上传）"""
    # 检查文件类型
    if not allowed_file(file.filename):
        raise ValueError(f"不支持的文件格式")
    
    # 读取内容
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"文件大小超过10MB限制")
    
    # 生成唯一文件名
    ext = os.path.splitext(file.filename.lower())[1]
    if ext == '.webp':
        ext = '.jpg'
    unique_filename = f"{datetime.now().strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    thumb_filename = f"thumb_{unique_filename}"
    thumb_path_full = os.path.join(THUMB_DIR, thumb_filename)
    
    # 保存原文件
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 获取图片尺寸
    width, height = get_image_dimensions(file_path)
    
    # 生成缩略图
    thumb_path_db = None
    if generate_thumbnail(file_path, thumb_path_full):
        thumb_path_db = f"/uploads/thumbnails/{thumb_filename}"
    
    # 保存到数据库
    image = Image(
        filename=unique_filename,
        original_name=file.filename,
        file_path=f"/uploads/{unique_filename}",
        thumb_path=thumb_path_db,
        file_size=len(content),
        width=width,
        height=height
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    
    return {
        "id": image.id,
        "filename": image.filename,
        "original_name": image.original_name,
        "file_path": image.file_path,
        "thumb_path": image.thumb_path,
        "width": image.width,
        "height": image.height,
        "file_size": image.file_size,
        "created_at": image.created_at
    }


@router.post("/upload-multiple")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """批量上传图片（最多10张，自动生成缩略图）"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="一次最多上传10张图片")
    
    uploaded = []
    errors = []
    
    for file in files:
        try:
            result = await process_single_image(file, db)
            uploaded.append(result)
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
    
    return {
        "uploaded": uploaded,
        "errors": errors,
        "total": len(files),
        "success": len(uploaded)
    }


@router.get("/serve/{filename}")
def serve_image(filename: str):
    """提供原图访问"""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="图片不存在")
    
    return FileResponse(
        file_path,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/thumb/{filename}")
def serve_thumbnail(filename: str):
    """提供缩略图访问"""
    file_path = os.path.join(THUMB_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="缩略图不存在")
    
    return FileResponse(
        file_path,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.delete("/{image_id}")
def delete_image(
    image_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除图片（同时删除缩略图）"""
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="图片不存在")
    
    # 删除原图
    file_path = os.path.join(UPLOAD_DIR, image.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # 删除缩略图
    if image.thumb_path:
        thumb_filename = os.path.basename(image.thumb_path)
        thumb_path = os.path.join(THUMB_DIR, thumb_filename)
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
    
    # 删除数据库记录
    db.delete(image)
    db.commit()
    
    return {"message": "图片已删除"}


@router.post("/cleanup-unused")
def cleanup_unused_images(
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """清理未使用的图片（未被任何文章、页面、设置引用）"""
    import json
    
    # 获取所有图片
    all_images = db.query(Image).all()
    
    # 收集所有被使用的图片路径
    used_paths = set()
    
    # 1. 检查文章content和cover_image
    posts = db.query(Post).all()
    for post in posts:
        if post.cover_image:
            used_paths.add(post.cover_image)
        if post.content:
            # 提取content中的所有图片路径 /uploads/xxx
            import re
            paths = re.findall(r'/uploads/[^\s"\')<>]+', post.content)
            used_paths.update(paths)
    
    # 2. 检查页面content
    pages = db.query(Page).all()
    for page in pages:
        if page.content:
            import re
            paths = re.findall(r'/uploads/[^\s"\')<>]+', page.content)
            used_paths.update(paths)
    
    # 3. 检查设置
    settings = db.query(Setting).first()
    if settings:
        if settings.blog_logo:
            used_paths.add(settings.blog_logo)
        if settings.banner_image:
            used_paths.add(settings.banner_image)
        # 轮播图
        if settings.banner_images:
            try:
                banner_list = json.loads(settings.banner_images)
                if isinstance(banner_list, list):
                    used_paths.update(banner_list)
            except:
                pass
    
    # 找出未使用的图片
    unused_images = []
    for img in all_images:
        if img.file_path not in used_paths:
            unused_images.append(img)
    
    # 删除未使用的图片
    deleted_count = 0
    freed_space = 0
    
    for img in unused_images:
        # 删除原图文件
        file_path = os.path.join(UPLOAD_DIR, img.filename)
        if os.path.exists(file_path):
            freed_space += os.path.getsize(file_path)
            os.remove(file_path)
        
        # 删除缩略图文件
        if img.thumb_path:
            thumb_filename = os.path.basename(img.thumb_path)
            thumb_path = os.path.join(THUMB_DIR, thumb_filename)
            if os.path.exists(thumb_path):
                freed_space += os.path.getsize(thumb_path)
                os.remove(thumb_path)
        
        # 删除数据库记录
        db.delete(img)
        deleted_count += 1
    
    db.commit()
    
    return {
        "message": f"清理完成，删除 {deleted_count} 张未使用的图片",
        "deleted_count": deleted_count,
        "freed_space_bytes": freed_space,
        "freed_space_mb": round(freed_space / (1024 * 1024), 2)
    }


@router.get("/usage-stats")
def get_image_usage_stats(
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """获取图片使用统计"""
    import json
    
    total_images = db.query(Image).count()
    
    # 收集所有被使用的图片路径
    used_paths = set()
    
    # 检查文章
    posts = db.query(Post).all()
    for post in posts:
        if post.cover_image:
            used_paths.add(post.cover_image)
        if post.content:
            import re
            paths = re.findall(r'/uploads/[^\s"\')<>]+', post.content)
            used_paths.update(paths)
    
    # 检查页面
    pages = db.query(Page).all()
    for page in pages:
        if page.content:
            import re
            paths = re.findall(r'/uploads/[^\s"\')<>]+', page.content)
            used_paths.update(paths)
    
    # 检查设置
    settings = db.query(Setting).first()
    if settings:
        if settings.blog_logo:
            used_paths.add(settings.blog_logo)
        if settings.banner_image:
            used_paths.add(settings.banner_image)
        if settings.banner_images:
            try:
                banner_list = json.loads(settings.banner_images)
                if isinstance(banner_list, list):
                    used_paths.update(banner_list)
            except:
                pass
    
    # 计算未使用图片
    all_images = db.query(Image).all()
    unused_count = 0
    unused_space = 0
    
    for img in all_images:
        if img.file_path not in used_paths:
            unused_count += 1
            unused_space += (img.file_size or 0)
    
    return {
        "total_images": total_images,
        "used_images": len(used_paths),
        "unused_images": unused_count,
        "unused_space_bytes": unused_space,
        "unused_space_mb": round(unused_space / (1024 * 1024), 2)
    }
