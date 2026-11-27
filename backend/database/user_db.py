from core.config import get_db_connection
from core.security import get_password_hash, verify_password
from datetime import datetime
from typing import Optional, Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)
_lockout_schema_ready = False


def ensure_lockout_columns() -> None:
    global _lockout_schema_ready
    if _lockout_schema_ready:
        return
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "IF COL_LENGTH('Users', 'failed_login_attempts') IS NULL "
                "ALTER TABLE Users ADD failed_login_attempts INT DEFAULT 0 NOT NULL;"
            )
            cursor.execute(
                "IF COL_LENGTH('Users', 'locked_until') IS NULL "
                "ALTER TABLE Users ADD locked_until DATETIME2 NULL;"
            )
            conn.commit()
            _lockout_schema_ready = True
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.warning(f"Không thể kiểm tra/bổ sung cột lockout trên Users: {e}")


def get_user_lockout_state(user_id: int) -> Dict:
    ensure_lockout_columns()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT COALESCE(failed_login_attempts, 0), locked_until FROM Users WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return {"failed_login_attempts": 0, "locked_until": None}
        return {"failed_login_attempts": int(row[0] or 0), "locked_until": row[1]}
    finally:
        cursor.close()
        conn.close()


def record_failed_login_attempt(user_id: int) -> Dict:
    ensure_lockout_columns()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT COALESCE(failed_login_attempts, 0) FROM Users WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()
        prev_attempts = int(row[0] or 0) if row else 0
        new_attempts = prev_attempts + 1
        lock_minutes = 0
        if new_attempts >= 5 and new_attempts % 5 == 0:
            lock_minutes = 15 if new_attempts >= 10 else 5

        if lock_minutes > 0:
            cursor.execute(
                """
                UPDATE Users
                SET failed_login_attempts = ?,
                    locked_until = DATEADD(MINUTE, ?, GETDATE()),
                    updated_at = GETDATE()
                OUTPUT inserted.locked_until
                WHERE user_id = ?
                """,
                (new_attempts, lock_minutes, user_id),
            )
            out_row = cursor.fetchone()
            locked_until = out_row[0] if out_row else None
        else:
            cursor.execute(
                """
                UPDATE Users
                SET failed_login_attempts = ?,
                    locked_until = NULL,
                    updated_at = GETDATE()
                WHERE user_id = ?
                """,
                (new_attempts, user_id),
            )
            locked_until = None
        conn.commit()
        return {
            "failed_login_attempts": new_attempts,
            "locked_until": locked_until,
            "lock_minutes": lock_minutes,
        }
    finally:
        cursor.close()
        conn.close()


def reset_user_lockout(user_id: int) -> bool:
    ensure_lockout_columns()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            UPDATE Users
            SET failed_login_attempts = 0,
                locked_until = NULL,
                updated_at = GETDATE()
            WHERE user_id = ?
            """,
            (user_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def _parse_user_row(cursor, row) -> Optional[Dict]:
    if not row:
        return None
    columns = [column[0] for column in cursor.description]
    res = dict(zip(columns, row))
    if "is_active" in res:
        res["is_active"] = bool(res["is_active"])
    if "must_change_password" in res:
        res["must_change_password"] = bool(res["must_change_password"])
    return res

USER_SELECT_SQL = """
    SELECT u.user_id, 
           u.username, 
           u.password_hash, 
           u.email, 
           u.full_name, 
           v.role_name AS role, 
           u.identifier_code AS student_id, 
           u.identifier_code AS user_code,
           u.department,
           u.homeroom_class AS lop_sinh_hoat,
           u.homeroom_class,
           u.academic_degree AS academic_rank,
           u.phone_number,
           u.avatar_url,
           u.is_active, 
           u.must_change_password,
           u.created_at, 
           u.updated_at, 
           u.last_login,
           (
               SELECT TOP 1 ip_address 
               FROM SystemAuditLogs 
               WHERE user_id = u.user_id 
                 AND (action = 'USER_LOGIN' OR action = 'AUTH_LOGIN' OR action = N'Đăng nhập' OR action = N'Đăng nhập từ IP lạ')
                 AND ip_address IS NOT NULL 
                 AND ip_address != '' 
               ORDER BY created_at DESC
           ) AS last_login_ip
    FROM Users u
    JOIN Roles v ON u.role_id = v.role_id
"""

def get_user_by_username(username: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.username = ?", (username,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi tìm user theo username '{username}': {e}")
    return None

def get_user_by_email(email: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.email = ?", (email,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi tìm user theo email '{email}': {e}")
    return None

def get_user_by_student_id(student_id: str) -> Optional[Dict]:
    if not student_id or not str(student_id).strip():
        return None
    clean_id = str(student_id).strip()
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.identifier_code = ?", (clean_id,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi tìm user theo mã định danh '{clean_id}': {e}")
    return None

def get_user_by_id(user_id: int) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.user_id = ?", (user_id,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi tìm user theo ID {user_id}: {e}")
    return None

def create_user(
    username: str, 
    password: str, 
    email: str, 
    full_name: str, 
    role: str, 
    student_id: Optional[str] = None,
    is_active: bool = True,
    must_change_password: bool = False,
    department: Optional[str] = None,
    lop_sinh_hoat: Optional[str] = None,
    academic_rank: Optional[str] = None,
    phone_number: Optional[str] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        password_hash = get_password_hash(password)
        cursor.execute("SELECT role_id FROM Roles WHERE role_name = ?", (role,))
        role_row = cursor.fetchone()
        role_id = role_row[0] if role_row else 3

        cursor.execute("""
            INSERT INTO Users (
                username, password_hash, email, full_name, 
                role_id, identifier_code, is_active, must_change_password,
                department, homeroom_class, academic_degree, phone_number
            )
            OUTPUT inserted.user_id, inserted.username, inserted.email, 
                   inserted.full_name, inserted.identifier_code, inserted.is_active, 
                   inserted.must_change_password, inserted.department, inserted.homeroom_class,
                   inserted.academic_degree, inserted.phone_number, inserted.created_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            username, password_hash, email, full_name, role_id, student_id,
            1 if is_active else 0, 1 if must_change_password else 0,
            department, lop_sinh_hoat, academic_rank, phone_number
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "user_id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "role": role,
                "student_id": row[4],
                "user_code": row[4],
                "is_active": bool(row[5]),
                "must_change_password": bool(row[6]),
                "department": row[7],
                "lop_sinh_hoat": row[8],
                "homeroom_class": row[8],
                "academic_rank": row[9],
                "phone_number": row[10],
                "avatar_url": None,
                "created_at": row[11],
                "updated_at": row[11],
                "last_login": None,
                "last_login_ip": None
            }
        raise Exception("Không thể tạo người dùng mới")
    finally:
        cursor.close()
        conn.close()

def update_last_login(user_id: int, client_ip: Optional[str] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            # 1. Cập nhật thời điểm đăng nhập gần nhất vào Users
            cursor.execute("""
                UPDATE Users 
                SET last_login = GETDATE() 
                WHERE user_id = ?
            """, (user_id,))
            conn.commit()
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi cập nhật last_login cho user_id {user_id}: {e}")

def update_user_profile(
    user_id: int, 
    full_name: Optional[str] = None, 
    email: Optional[str] = None, 
    student_id: Optional[str] = None,
    department: Optional[str] = None,
    lop_sinh_hoat: Optional[str] = None,
    academic_rank: Optional[str] = None,
    phone_number: Optional[str] = None,
    avatar_url: Optional[str] = None,
    username: Optional[str] = None
) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            updates = []
            params = []
            if full_name is not None:
                updates.append("full_name = ?")
                params.append(full_name)
            if email is not None:
                updates.append("email = ?")
                params.append(email)
            if username is not None:
                updates.append("username = ?")
                params.append(username)
            if student_id is not None:
                updates.append("identifier_code = ?")
                params.append(student_id if student_id != "" else None)
            if department is not None:
                updates.append("department = ?")
                params.append(department if department != "" else None)
            if lop_sinh_hoat is not None:
                updates.append("homeroom_class = ?")
                params.append(lop_sinh_hoat if lop_sinh_hoat != "" else None)
            if academic_rank is not None:
                updates.append("academic_degree = ?")
                params.append(academic_rank if academic_rank != "" else None)
            if phone_number is not None:
                updates.append("phone_number = ?")
                params.append(phone_number if phone_number != "" else None)
            if avatar_url is not None:
                updates.append("avatar_url = ?")
                params.append(avatar_url if avatar_url != "" else None)
            if not updates:
                return get_user_by_id(user_id)
            params.append(user_id)
            cursor.execute(f"UPDATE Users SET {', '.join(updates)}, updated_at = GETDATE() WHERE user_id = ?", tuple(params))
            conn.commit()
            return get_user_by_id(user_id)
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"Lỗi database khi cập nhật profile cho user_id {user_id}: {e}")
        return None
        return None

def change_user_password(user_id: int, new_password: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_hash = get_password_hash(new_password)
        cursor.execute("""
            UPDATE Users 
            SET password_hash = ?, 
                must_change_password = 0, 
                updated_at = GETDATE() 
            WHERE user_id = ?
        """, (new_hash, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_all_users_paginated(
    skip: int = 0, 
    limit: int = 20, 
    role: Optional[str] = None, 
    search: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Tuple[List[Dict], int]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_clauses = []
        params = []
        if role:
            where_clauses.append("v.role_name = ?")
            params.append(role)
        if is_active is not None:
            where_clauses.append("u.is_active = ?")
            params.append(1 if is_active else 0)
        if search:
            where_clauses.append("(u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.identifier_code LIKE ? OR u.homeroom_class LIKE ? OR u.department LIKE ?)")
            s = f"%{search}%"
            params.extend([s, s, s, s, s, s])
        
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM Users u
            JOIN Roles v ON u.role_id = v.role_id
            {where_sql}
        """, tuple(params))
        total = cursor.fetchone()[0]
        
        order_sql = "ORDER BY u.created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        cursor.execute(f"""
            {USER_SELECT_SQL}
            {where_sql} 
            {order_sql}
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        users = []
        for row in rows:
            u_dict = dict(zip(columns, row))
            u_dict["is_active"] = bool(u_dict["is_active"])
            u_dict["must_change_password"] = bool(u_dict.get("must_change_password", False))
            users.append(u_dict)
        return users, total
    finally:
        cursor.close()
        conn.close()

def update_user_status(user_id: int, is_active: bool) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Users SET is_active = ?, updated_at = GETDATE() WHERE user_id = ?", (1 if is_active else 0, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def update_user_role(user_id: int, role: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Users 
            SET role_id = (SELECT role_id FROM Roles WHERE role_name = ?),
                updated_at = GETDATE() 
            WHERE user_id = ?
        """, (role, user_id))
        updated = cursor.rowcount > 0
        if updated:
            cursor.execute("DELETE FROM AuthTokens WHERE user_id = ?", (user_id,))
        conn.commit()
        if updated:
            try:
                from services.session_manager import SessionManager
                SessionManager.clear_session(user_id)
            except Exception:
                pass
        return updated
    finally:
        cursor.close()
        conn.close()

def delete_user(user_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Xóa các liên kết phụ thuộc trước nếu có để tránh lỗi Foreign Key
        cursor.execute("DELETE FROM AuthTokens WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM ClassEnrollments WHERE student_id = ? OR enrolled_by = ?", (user_id, user_id))
        cursor.execute("DELETE FROM CodeDrafts WHERE student_id = ?", (user_id,))
        cursor.execute("DELETE FROM DeviceChecks WHERE student_id = ?", (user_id,))
        cursor.execute("DELETE FROM Snapshots WHERE student_id = ?", (user_id,))
        cursor.execute("DELETE FROM RoomMessages WHERE sender_id = ? OR receiver_id = ?", (user_id, user_id))
        cursor.execute("DELETE FROM SupportRequests WHERE student_id = ? OR resolved_by = ?", (user_id, user_id))
        cursor.execute("DELETE FROM RoomProctors WHERE instructor_id = ?", (user_id,))
        cursor.execute("DELETE FROM Users WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

# ─── PASSWORD RESET TOKEN FUNCTIONS (DÙNG CHO FORGOT/RESET PASSWORD) ──────────
def create_password_reset_token(user_id: int, token: str, expires_minutes: int = 15) -> bool:
    """Lưu token khôi phục mật khẩu vào bảng AuthTokens"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Vô hiệu hóa các token reset cũ chưa dùng của user này
        cursor.execute("""
            UPDATE AuthTokens 
            SET is_revoked = 1, revoked_at = GETDATE()
            WHERE user_id = ? AND token_type = 'reset_password' AND is_used = 0
        """, (user_id,))
        
        # Thêm token mới
        cursor.execute("""
            INSERT INTO AuthTokens (user_id, token_hash, token_type, expires_at, is_used, is_revoked)
            VALUES (?, ?, 'reset_password', DATEADD(minute, ?, GETDATE()), 0, 0)
        """, (user_id, token, expires_minutes))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

def verify_password_reset_token(token: str) -> Optional[int]:
    """Kiểm tra token reset có hợp lệ, chưa sử dụng và chưa hết hạn không. Trả về user_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT user_id 
            FROM AuthTokens 
            WHERE token_hash = ? 
              AND token_type = 'reset_password' 
              AND is_used = 0 
              AND is_revoked = 0 
              AND expires_at > GETDATE()
        """, (token,))
        row = cursor.fetchone()
        if row:
            return row[0]
        return None
    finally:
        cursor.close()
        conn.close()

def mark_password_reset_token_used(token: str) -> bool:
    """Đánh dấu token reset mật khẩu đã được sử dụng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE AuthTokens 
            SET is_used = 1, revoked_at = GETDATE()
            WHERE token_hash = ?
        """, (token,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
