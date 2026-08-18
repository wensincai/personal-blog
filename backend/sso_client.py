"""SSO Cookie 本地验签 —— 与 SSO 中心共享 SECRET_KEY（见 config.py）"""
from fastapi import Request
from jose import jwt, JWTError

from config import SECRET_KEY, ALGORITHM


def get_current_user_from_cookie(request: Request) -> dict:
    """从请求 Cookie 中读取 access_token，本地验签后返回用户信息"""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None
        return {"username": username}
    except JWTError:
        return None
