"""
数据库模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Admin(Base):
    """管理员账号"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, default="admin")
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Post(Base):
    """文章"""
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, index=True)  # URL友好的标识
    content = Column(Text, nullable=False)
    content_type = Column(String(20), default="markdown")  # markdown 或 html
    summary = Column(String(500))
    cover_image = Column(String(500))  # 封面图路径
    is_published = Column(Boolean, default=True)
    is_draft = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="posts")
    tags = relationship("Tag", secondary="post_tags", back_populates="posts")

class Category(Base):
    """栏目/分类"""
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    posts = relationship("Post", back_populates="category")

class Tag(Base):
    """标签"""
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(30), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    posts = relationship("Post", secondary="post_tags", back_populates="tags")

# 文章-标签关联表
class PostTag(Base):
    __tablename__ = "post_tags"
    
    post_id = Column(Integer, ForeignKey("posts.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)

class Image(Base):
    """上传的图片"""
    __tablename__ = "images"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255))
    file_path = Column(String(500), nullable=False)  # 原图路径 /uploads/xxx.jpg
    thumb_path = Column(String(500))  # 缩略图路径 /uploads/thumbnails/xxx.jpg
    description = Column(String(500))
    file_size = Column(Integer)  # 字节
    width = Column(Integer)  # 图片宽度
    height = Column(Integer)  # 图片高度
    created_at = Column(DateTime, default=datetime.utcnow)

class Setting(Base):
    """博客设置"""
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    blog_name = Column(String(20), default="我的博客")
    blog_description = Column(String(200), default="")
    welcome_message = Column(String(300), default="欢迎来到我的博客 👋 分享技术、生活与思考")
    blog_logo = Column(String(500))
    banner_image = Column(String(500))
    banner_type = Column(String(20), default="text")  # text或carousel
    banner_images = Column(String(1000), default="[]")  # JSON数组存储轮播图
    theme = Column(String(20), default="neobrutalism")  # 默认新粗野主义
    layout = Column(String(20), default="card")  # card或list
    theme_colors = Column(Text, default='{"primary":"#7c3aed","secondary":"#06b6d4","bg":"#ffffff","text":"#1f2937","sidebar":"#1e293b"}')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Page(Base):
    """自定义页面"""
    __tablename__ = "pages"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)  # URL标识
    content = Column(Text, nullable=False)
    is_nav = Column(Boolean, default=True)  # 是否在导航显示
    nav_order = Column(Integer, default=0)  # 导航排序
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
