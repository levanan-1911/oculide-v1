from core.config import get_db_connection
from core.security import get_password_hash, verify_password
from datetime import datetime
from typing import Optional, Dict, List, Tuple

# Dữ liệu tài khoản mẫu phát triển (sử dụng khi SQL Server chưa được khởi động)
DEV_MOCK_USERS = [
    {
        "user_id": 1,
        "username": "admin",
        "email": "admin@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Quản Trị Viên Hệ Thống",
        "role": "admin",
        "student_id": "ADM001",
        "user_code": "ADM001",
        "department": "Phòng CNTT & Đào Tạo",
        "academic_rank": None,
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": "127.0.0.1",
        "lop_sinh_hoat": None,
        "homeroom_class": None
    },
    {
        "user_id": 2,
        "username": "instructor",
        "email": "instructor@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Giảng Viên Hướng Dẫn",
        "role": "instructor",
        "student_id": "MSGV001",
        "user_code": "MSGV001",
        "department": "Khoa Công Nghệ Thông Tin",
        "academic_rank": "Thạc sĩ",
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": None,
        "lop_sinh_hoat": None,
        "homeroom_class": None
    },
    {
        "user_id": 3,
        "username": "student",
        "email": "student@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Sinh Viên Nguyễn Văn A",
        "role": "student",
        "student_id": "SV2026001",
        "user_code": "SV2026001",
        "department": "Kỹ Thuật Phần Mềm",
        "academic_rank": None,
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": None,
        "lop_sinh_hoat": "SE1801",
        "homeroom_class": "SE1801"
    },
    {
        "user_id": 4,
        "username": "pvlong",
        "email": "pvlong@dtu.edu.vn",
        "password_hash": "$2b$12$t/59jV7LxFjvjku/dRjkzO/NuiUXgNxE4rJnC8oboFt3wN1AxZcti",
        "full_name": "Phạm Vũ Long",
        "role": "instructor",
        "student_id": "MSGV_PVL01",
        "user_code": "MSGV_PVL01",
        "department": "Khoa CNTT - Đại học Duy Tân",
        "academic_rank": "Thạc sĩ",
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": None,
        "lop_sinh_hoat": None,
        "homeroom_class": None
    }
]

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
                 AND action = 'USER_LOGIN'
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
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["username"].lower() == username.lower():
                return u
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
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["email"].lower() == email.lower():
                return u
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
    except Exception:
        for u in DEV_MOCK_USERS:
            if (u.get("student_id") or "").strip().lower() == clean_id.lower():
                return u
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
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                return u
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
            
            # 2. Ghi nhận lịch sử và địa chỉ IP đăng nhập vào bảng nhật ký SystemAuditLogs
            try:
                cursor.execute("""
                    INSERT INTO SystemAuditLogs (user_id, log_level, action, message, ip_address)
                    VALUES (?, 'info', 'USER_LOGIN', N'Đăng nhập hệ thống thành công', ?)
                """, (user_id, client_ip or '127.0.0.1'))
            except Exception as log_err:
                print(f"Warning: Failed to insert login audit log: {log_err}")

            conn.commit()
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                u["last_login"] = datetime.now()
                if client_ip:
                    u["last_login_ip"] = client_ip
                break

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
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                if full_name is not None: u["full_name"] = full_name
                if email is not None: u["email"] = email
                if student_id is not None:
                    u["student_id"] = student_id
                    u["user_code"] = student_id
                if department is not None: u["department"] = department
                if lop_sinh_hoat is not None:
                    u["lop_sinh_hoat"] = lop_sinh_hoat
                    u["homeroom_class"] = lop_sinh_hoat
                return u
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
        conn.commit()
        return cursor.rowcount > 0
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
