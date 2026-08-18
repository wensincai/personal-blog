"""
标签管理路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Tag
from schemas import TagCreate, TagResponse
from routers.auth import get_current_admin

router = APIRouter(prefix="/api/tags", tags=["标签"])


@router.get("/", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db)):
    """获取所有标签"""
    tags = db.query(Tag).all()
    return tags


@router.post("/", response_model=TagResponse)
def create_tag(
    tag_data: TagCreate,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """创建标签"""
    # 检查数量限制
    count = db.query(Tag).count()
    if count >= 20:
        raise HTTPException(status_code=400, detail="标签数量已达上限(20个)")
    
    # 检查名称重复
    existing = db.query(Tag).filter(Tag.name == tag_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="标签名称已存在")
    
    tag = Tag(**tag_data.dict())
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/{tag_id}")
def delete_tag(
    tag_id: int,
    current_admin=Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """删除标签"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="标签不存在")
    
    db.delete(tag)
    db.commit()
    return {"message": "标签已删除"}
