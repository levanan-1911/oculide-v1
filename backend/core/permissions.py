from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any, Callable
from core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Dependency trích xuất và xác thực người dùng hiện tại từ JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id = payload.get("sub") or payload.get("user_id")
    role = payload.get("role")
    username = payload.get("username")
    
    if user_id is None:
        raise credentials_exception
        
    return {
        "user_id": int(user_id),
        "username": username,
        "role": role,
        "email": payload.get("email"),
        "full_name": payload.get("full_name")
    }

def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency decorator kiểm tra quyền hạn (Role-Based Access Control)"""
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản không đủ quyền hạn. Yêu cầu một trong các vai trò: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker

# Shortcuts cho các vai trò thông dụng
admin_required = require_roles(["admin"])
instructor_or_admin_required = require_roles(["instructor", "admin"])
student_required = require_roles(["student"])
