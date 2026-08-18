"""
Pydantic 数据验证模型
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==================== 认证相关 ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=20)

# ==================== 文章相关 ====================

class TagBase(BaseModel):
    name: str = Field(..., max_length=30)

class TagCreate(TagBase):
    pass

class TagResponse(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=50)
    description: Optional[str] = Field(None, max_length=200)

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    post_count: int = 0
    
    class Config:
        from_attributes = True

class PostBase(BaseModel):
    title: str = Field(..., max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    content: str
    content_type: Optional[str] = Field(default="markdown", max_length=20)  # markdown 或 html
    summary: Optional[str] = Field(None, max_length=500)
    cover_image: Optional[str] = None
    is_published: bool = True
    is_draft: bool = False
    category_id: Optional[int] = None
    tag_ids: List[int] = []

class PostCreate(PostBase):
    pass

class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    slug: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    content_type: Optional[str] = Field(None, max_length=20)
    summary: Optional[str] = Field(None, max_length=500)
    cover_image: Optional[str] = None
    is_published: Optional[bool] = None
    is_draft: Optional[bool] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None

class PostResponse(BaseModel):
    id: int
    title: str
    slug: Optional[str] = None
    content: str
    content_type: Optional[str] = None
    summary: Optional[str]
    cover_image: Optional[str]
    is_published: bool
    is_draft: bool
    view_count: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse]
    tags: List[TagResponse]

    class Config:
        from_attributes = True

class PostListItem(BaseModel):
    id: int
    title: str
    slug: Optional[str] = None
    summary: Optional[str]
    cover_image: Optional[str]
    content_type: Optional[str] = None
    is_published: bool
    view_count: int
    created_at: datetime
    category: Optional[CategoryResponse]
    tags: List[TagResponse]

    class Config:
        from_attributes = True

# ==================== 图片相关 ====================

class ImageResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    description: Optional[str]
    file_size: int
    file_path: str
    thumb_path: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ImageListResponse(BaseModel):
    items: List[ImageResponse]
    total: int
    skip: int
    limit: int

# ==================== 设置相关 ====================

class SettingBase(BaseModel):
    blog_name: str = Field(..., max_length=20)
    blog_description: Optional[str] = Field(None, max_length=200)
    welcome_message: Optional[str] = Field(default="欢迎来到我的博客 👋 分享技术、生活与思考", max_length=300)
    blog_logo: Optional[str] = None
    banner_image: Optional[str] = None
    banner_type: str = Field(default="text")  # text或carousel
    banner_images: Optional[str] = Field(default="[]")  # JSON数组
    theme: str = Field(default="neobrutalism")
    layout: str = Field(default="card")
    theme_colors: Optional[str] = Field(default='{"primary":"#7c3aed","secondary":"#06b6d4","bg":"#ffffff","text":"#1f2937","sidebar":"#1e293b"}')

class SettingUpdate(BaseModel):
    blog_name: Optional[str] = Field(None, max_length=20)
    blog_description: Optional[str] = Field(None, max_length=200)
    welcome_message: Optional[str] = Field(None, max_length=300)
    blog_logo: Optional[str] = None
    banner_image: Optional[str] = None
    banner_type: Optional[str] = None
    banner_images: Optional[str] = None
    theme: Optional[str] = None
    layout: Optional[str] = None
    theme_colors: Optional[str] = None

class SettingResponse(SettingBase):
    id: int
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ==================== 页面相关 ====================

class PageBase(BaseModel):
    title: str = Field(..., max_length=50)
    slug: str = Field(..., max_length=50)
    content: str
    is_nav: bool = True
    nav_order: int = 0

class PageCreate(PageBase):
    pass

class PageUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=50)
    slug: Optional[str] = Field(None, max_length=50)
    content: Optional[str] = None
    is_nav: Optional[bool] = None
    nav_order: Optional[int] = None

class PageResponse(PageBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ==================== 统计相关 ====================

class StatsResponse(BaseModel):
    total_posts: int
    total_views: int
    today_views: int
    category_counts: dict
    recent_posts: List[PostListItem]
