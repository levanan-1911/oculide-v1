from core.config import get_db_connection
from core.security import get_password_hash, verify_password
from datetime import datetime
from typing import Optional, Dict, List

# Dữ liệu tài khoản mẫu phát triển (sử dụng khi SQL Server chưa được khởi động)
DEV_MOCK_USERS = [
    {
        "user_id": 1,
        "username": "admin",
        "email": "admin@school.edu.vn",
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # admin123
        "full_name": "Quản Trị Viên Hệ Thống",
        "role": "admin",
        "student_id": None,
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None
    },
    {
        "user_id": 2,
        "username": "instructor",
        "email": "instructor@school.edu.vn",
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # instructor123 / admin123
        "full_name": "Giảng Viên Hướng Dẫn",
        "role": "instructor",
        "student_id": None,
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None
    },
    {
        "user_id": 3,
        "username": "student",
        "email": "student@school.edu.vn",
        "password_hash": "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", # student123 / admin123
        "full_name": "Sinh Viên Nguyễn Văn A",
        "role": "student",
        "student_id": "SV2026001",
        "is_active": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None
    }
]

def get_user_by_username(username: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT user_id, username, password_hash, email, full_name, role, 
                       student_id, is_active, created_at, updated_at, last_login
                FROM Users WHERE username = ?
            """, (username,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                return dict(zip(columns, row))
        finally:
            cursor.close()
            conn.close()
    except Exception:
        # Fallback môi trường phát triển
        for u in DEV_MOCK_USERS:
            if u["username"].lower() == username.lower():
                return u
    return None

def get_user_by_email(email: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT user_id, username, password_hash, email, full_name, role, 
                       student_id, is_active, created_at, updated_at, last_login
                FROM Users WHERE email = ?
            """, (email,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                return dict(zip(columns, row))
        finally:
            cursor.close()
            conn.close()
    except Exception:
        # Fallback môi trường phát triển
        for u in DEV_MOCK_USERS:
            if u["email"].lower() == email.lower():
                return u
    return None

def get_user_by_id(user_id: int) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                SELECT user_id, username, password_hash, email, full_name, role, 
                       student_id, is_active, created_at, updated_at, last_login
                FROM Users WHERE user_id = ?
            """, (user_id,))
            row = cursor.fetchone()
            if row:
                columns = [column[0] for column in cursor.description]
                return dict(zip(columns, row))
        finally:
            cursor.close()
            conn.close()
    except Exception:
        # Fallback môi trường phát triển
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
    is_active: bool = True
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        password_hash = get_password_hash(password)
        cursor.execute("""
            INSERT INTO Users (username, password_hash, email, full_name, role, student_id, is_active)
            OUTPUT inserted.user_id, inserted.username, inserted.email, inserted.full_name, 
                   inserted.role, inserted.student_id, inserted.is_active, inserted.created_at
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (username, password_hash, email, full_name, role, student_id, 1 if is_active else 0))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể tạo người dùng mới")
    finally:
        cursor.close()
        conn.close()

def update_last_login(user_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("""
                UPDATE Users SET last_login = GETDATE() WHERE user_id = ?
            """, (user_id,))
            conn.commit()
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                u["last_login"] = datetime.now()
                break

def update_user_profile(user_id: int, full_name: Optional[str] = None, email: Optional[str] = None, student_id: Optional[str] = None) -> Optional[Dict]:
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
        if student_id is not None:
            updates.append("student_id = ?")
            params.append(student_id)
        if not updates:
            return get_user_by_id(user_id)
        params.append(user_id)
        cursor.execute(f"UPDATE Users SET {', '.join(updates)}, updated_at = GETDATE() WHERE user_id = ?", tuple(params))
        conn.commit()
        return get_user_by_id(user_id)
    finally:
        cursor.close()
        conn.close()

def change_user_password(user_id: int, new_password: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_hash = get_password_hash(new_password)
        cursor.execute("UPDATE Users SET password_hash = ?, updated_at = GETDATE() WHERE user_id = ?", (new_hash, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_all_users_paginated(skip: int = 0, limit: int = 20, role: Optional[str] = None, search: Optional[str] = None) -> (List[Dict], int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_clauses = []
        params = []
        if role:
            where_clauses.append("role = ?")
            params.append(role)
        if search:
            where_clauses.append("(username LIKE ? OR full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)")
            s = f"%{search}%"
            params.extend([s, s, s, s])
        
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        # Count total
        cursor.execute(f"SELECT COUNT(*) FROM Users {where_sql}", tuple(params))
        total = cursor.fetchone()[0]
        
        # Select items
        order_sql = "ORDER BY created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        cursor.execute(f"""
            SELECT user_id, username, email, full_name, role, student_id, is_active, created_at, last_login
            FROM Users {where_sql} {order_sql}
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows], total
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
        cursor.execute("UPDATE Users SET role = ?, updated_at = GETDATE() WHERE user_id = ?", (role, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def delete_user(user_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Users WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
