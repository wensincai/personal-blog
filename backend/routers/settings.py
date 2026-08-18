"""
博客设置路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Setting, Page
from schemas import SettingUpdate, SettingResponse, PageCreate, PageUpdate, PageResponse
from routers.auth import get_current_admin
from typing import List

router = APIRouter(prefix="/api", tags=["设置"])


def get_or_create_settings(db: Session):
    """获取或创建设置"""
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting()
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("/settings", response_model=SettingResponse)
def get_settings(db: Session = Depends(get_db)):
    """获取博客设置"""
    setting = get_or_create_settings(db)
    return setting


@router.get("/settings/public")
def get_settings_public(db: Session = Depends(get_db)):
    """公开获取博客设置（仅返回前端展示所需字段）"""
    setting = get_or_create_settings(db)
    import json
    try:
        colors = json.loads(setting.theme_colors) if setting.theme_colors else {}
    except Exception:
        colors = {}
    return {
        "blog_name": setting.blog_name,
        "blog_description": setting.blog_description,
        "welcome_message": setting.welcome_message,
        "blog_logo": setting.blog_logo,
        "banner_image": setting.banner_image,
        "banner_type": setting.banner_type,
        "banner_images": setting.banner_images,
        "theme": setting.theme,
        "layout": setting.layout,
        "theme_colors": colors,
    }


@router.put("/settings", response_model=SettingResponse)
def update_settings(
    setting_data: SettingUpdate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新博客设置"""
    setting = get_or_create_settings(db)
    
    update_data = setting_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
    
    db.commit()
    db.refresh(setting)
    return setting


# ==================== 自定义页面管理 ====================

@router.get("/pages", response_model=List[PageResponse])
def get_pages(db: Session = Depends(get_db)):
    """获取所有自定义页面"""
    pages = db.query(Page).order_by(Page.nav_order.asc(), Page.created_at.desc()).all()
    return pages


@router.get("/pages/{slug}", response_model=PageResponse)
def get_page_by_slug(slug: str, db: Session = Depends(get_db)):
    """通过slug获取页面"""
    page = db.query(Page).filter(Page.slug == slug).first()
    if not page:
        raise HTTPException(status_code=404, detail="页面不存在")
    return page


@router.post("/pages", response_model=PageResponse)
def create_page(
    page_data: PageCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建自定义页面"""
    # 检查数量限制
    count = db.query(Page).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="自定义页面数量已达上限(5个)")
    
    # 检查slug重复
    existing = db.query(Page).filter(Page.slug == page_data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="页面标识已存在")
    
    page = Page(**page_data.dict())
    db.add(page)
    db.commit()
    db.refresh(page)
    return page


@router.put("/pages/{page_id}", response_model=PageResponse)
def update_page(
    page_id: int,
    page_data: PageUpdate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新自定义页面"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="页面不存在")
    
    update_data = page_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(page, field, value)
    
    db.commit()
    db.refresh(page)
    return page


@router.delete("/pages/{page_id}")
def delete_page(
    page_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除自定义页面"""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="页面不存在")
    
    db.delete(page)
    db.commit()
    return {"message": "页面已删除"}
