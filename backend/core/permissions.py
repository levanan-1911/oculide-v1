from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any, Callable
from core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Dependency trích xuất và xác thực người dùng hiện tại từ JWT + đối chiếu trạng thái thực tế trong CSDL."""
    if token:
        payload = decode_access_token(token)
        # Không cho phép dùng Refresh Token (dài hạn 7 ngày) thay cho Access Token
        if payload and payload.get("token_type") != "refresh":
            raw_id = payload.get("user_id") or payload.get("sub")
            uid = None
            if raw_id is not None:
                try:
                    uid = int(raw_id)
                except (ValueError, TypeError):
                    from database.user_db import get_user_by_username
                    u = get_user_by_username(str(raw_id))
                    if u:
                        uid = u["user_id"]

            if uid is not None:
                from database.user_db import get_user_by_id
                db_user = get_user_by_id(uid)
                if not db_user:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Tài khoản không tồn tại hoặc đã bị xóa",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                if not db_user.get("is_active", True):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Tài khoản đã bị khóa",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                role = (db_user.get("role") or "").lower()
                if role:
                    from services.system_settings_manager import SystemSettingsManager
                    sys_settings = SystemSettingsManager.get_settings()
                    if sys_settings.maintenance_mode and role != "admin":
                        raise HTTPException(
                            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail={
                                "code": "MAINTENANCE_MODE",
                                "message": sys_settings.maintenance_message
                                or "Hệ thống đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.",
                            },
                        )
                    return {
                        "user_id": db_user["user_id"],
                        "username": db_user.get("username") or "user",
                        "role": role,
                        "email": db_user.get("email"),
                        "full_name": db_user.get("full_name") or db_user.get("username") or "Người dùng",
                    }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )


def verify_room_access(room_id: int, current_user: Dict[str, Any]) -> Dict[str, Any]:
    """Kiểm tra quyền sở hữu phòng (Admin, chủ phòng instructor_id, hoặc giám thị trong RoomProctors)."""
    from database.room_db import get_room_by_id
    from core.database import get_db_cursor

    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")

    user_role = (current_user.get("role") or "").lower()
    if user_role == "admin":
        return room

    uid = current_user.get("user_id")
    if room.get("instructor_id") == uid:
        return room

    with get_db_cursor(commit=False) as cursor:
        cursor.execute(
            "SELECT TOP 1 1 FROM RoomProctors WHERE room_id = ? AND instructor_id = ?",
            (room_id, uid),
        )
        if cursor.fetchone():
            return room

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền truy cập tài nguyên của phòng thi này",
    )


def verify_instructor_student_access(student_id: int, current_user: Dict[str, Any]) -> None:
    """Cho phép Admin hoặc Giảng viên quản lý lớp/phòng thi có sinh viên này tham gia."""
    user_role = (current_user.get("role") or "").lower()
    if user_role == "admin":
        return

    uid = current_user.get("user_id")
    from core.database import get_db_cursor
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(
            """
            SELECT TOP 1 1
            FROM Classes c
            JOIN Enrollments e ON c.class_id = e.class_id
            WHERE c.instructor_id = ? AND e.student_id = ?
            UNION ALL
            SELECT TOP 1 1
            FROM Rooms r
            JOIN ExamSessions s ON r.room_id = s.room_id
            WHERE (r.instructor_id = ? OR EXISTS (
                SELECT 1 FROM RoomProctors rp WHERE rp.room_id = r.room_id AND rp.instructor_id = ?
            )) AND s.student_id = ?
            """,
            (uid, student_id, uid, uid, student_id),
        )
        if cursor.fetchone():
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn chỉ có thể mở khóa phiên cho sinh viên thuộc lớp hoặc phòng thi do mình quản lý",
    )


def require_roles(allowed_roles: List[str]) -> Callable:
    """Dependency decorator kiểm tra quyền hạn (Role-Based Access Control)"""
    normalized_allowed = [r.lower() for r in allowed_roles]
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = (current_user.get("role") or "").lower()
        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tài khoản không đủ quyền hạn. Yêu cầu một trong các vai trò: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker


# Shortcuts cho các vai trò thông dụng
admin_required = require_roles(["admin"])
instructor_required = require_roles(["instructor"])
instructor_or_admin_required = require_roles(["instructor", "admin"])
student_required = require_roles(["student"])
