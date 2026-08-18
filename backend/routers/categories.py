"""
分类管理路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Category, Post
from schemas import CategoryCreate, CategoryResponse
from routers.auth import get_current_admin

router = APIRouter(prefix="/api/categories", tags=["分类"])


@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """获取所有分类"""
    categories = db.query(Category).all()
    # 添加文章数量
    result = []
    for cat in categories:
        post_count = db.query(Post).filter(Post.category_id == cat.id).count()
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "created_at": cat.created_at,
            "post_count": post_count
        }
        result.append(cat_dict)
    return result


@router.post("", response_model=CategoryResponse)
def create_category(
    category_data: CategoryCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建分类"""
    # 检查数量限制
    count = db.query(Category).count()
    if count >= 25:
        raise HTTPException(status_code=400, detail="分类数量已达上限(25个)")
    
    # 检查名称重复
    existing = db.query(Category).filter(Category.name == category_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="分类名称已存在")
    
    category = Category(**category_data.dict())
    db.add(category)
    db.commit()
    db.refresh(category)
    
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "created_at": category.created_at,
        "post_count": 0
    }


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """更新分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    category.name = category_data.name
    category.description = category_data.description
    db.commit()
    db.refresh(category)
    
    post_count = db.query(Post).filter(Post.category_id == category.id).count()
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "created_at": category.created_at,
        "post_count": post_count
    }


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除分类"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="分类不存在")
    
    # 将该分类下的文章设为未分类
    db.query(Post).filter(Post.category_id == category_id).update({"category_id": None})
    
    db.delete(category)
    db.commit()
    return {"message": "分类已删除"}
