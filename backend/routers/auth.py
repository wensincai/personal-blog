"""
认证路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from models import Admin
from schemas import LoginRequest, LoginResponse, PasswordChange
from sso_client import get_current_user_from_cookie
from config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_DAYS,
    SSO_COOKIE_DOMAIN,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD,
)

router = APIRouter(prefix="/api/auth", tags=["认证"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def verify_password(plain_password, hashed_password):
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    """生成密码哈希"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """创建JWT令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_admin(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """获取当前登录管理员 —— 双模式认证
    1. 优先读取 Authorization Header（原有本地登录）
    2. 无 Header 则读取 Cookie 中的 SSO token，本地验签后查本地 Admin 表
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )

    username = None

    # 模式一：原有 Bearer Token
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
        except JWTError:
            pass

    # 模式二：SSO Cookie
    if not username:
        sso_user = get_current_user_from_cookie(request)
        if sso_user:
            username = sso_user.get("username")

    if not username:
        raise credentials_exception

    admin = db.query(Admin).filter(Admin.username == username).first()
    if admin is None:
        raise credentials_exception
    return admin


@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """管理员登录"""
    admin = db.query(Admin).filter(Admin.username == login_data.username).first()
    
    if not admin or not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )
    
    access_token = create_access_token(data={"sub": admin.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """修改密码"""
    # 验证原密码
    if not verify_password(password_data.old_password, current_admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    # 更新密码
    current_admin.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "密码修改成功"}


@router.get("/me")
def get_me(current_admin: Admin = Depends(get_current_admin)):
    """获取当前管理员信息"""
    return {"username": current_admin.username}


@router.post("/logout")
def logout(response: Response):
    """退出登录：清除本地 token 状态并删除 SSO Cookie"""
    response.delete_cookie("access_token", domain=SSO_COOKIE_DOMAIN, path="/")
    return {"message": "退出成功"}


def init_admin(db: Session):
    """初始化默认管理员账号（账号密码来自 config.py / 环境变量）"""
    admin = db.query(Admin).filter(Admin.username == DEFAULT_ADMIN_USERNAME).first()
    if not admin:
        admin = Admin(
            username=DEFAULT_ADMIN_USERNAME,
            password_hash=get_password_hash(DEFAULT_ADMIN_PASSWORD)
        )
        db.add(admin)
        db.commit()
        print(f"✅ 默认管理员账号已创建: {DEFAULT_ADMIN_USERNAME}（请尽快修改默认密码）")
