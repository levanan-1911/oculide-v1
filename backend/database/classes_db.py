from core.config import get_db_connection
from typing import Optional, List, Dict

def create_class(
    class_code: str,
    class_name: str,
    instructor_id: int,
    description: Optional[str] = None
) -> Dict:
    """Giảng viên tạo một lớp học phần mới"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Classes (class_code, class_name, instructor_id, description)
            OUTPUT inserted.class_id, inserted.class_code, inserted.class_name,
                   inserted.instructor_id, inserted.description, inserted.created_at, inserted.updated_at
            VALUES (?, ?, ?, ?)
        """, (class_code, class_name, instructor_id, description))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể tạo lớp học")
    finally:
        cursor.close()
        conn.close()

def get_class_by_id(class_id: int) -> Optional[Dict]:
    """Lấy thông tin chi tiết một lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT c.class_id, c.class_code, c.class_name, c.instructor_id,
                   c.description, c.created_at, c.updated_at, u.full_name as instructor_name
            FROM Classes c
            JOIN Users u ON c.instructor_id = u.user_id
            WHERE c.class_id = ?
        """, (class_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_classes_by_instructor(instructor_id: Optional[int] = None) -> List[Dict]:
    """Lấy danh sách các lớp học (nếu admin thì có thể xem toàn bộ)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if instructor_id:
            cursor.execute("""
                SELECT c.class_id, c.class_code, c.class_name, c.instructor_id,
                       c.description, c.created_at, c.updated_at, u.full_name as instructor_name
                FROM Classes c
                JOIN Users u ON c.instructor_id = u.user_id
                WHERE c.instructor_id = ?
                ORDER BY c.created_at DESC
            """, (instructor_id,))
        else:
            cursor.execute("""
                SELECT c.class_id, c.class_code, c.class_name, c.instructor_id,
                       c.description, c.created_at, c.updated_at, u.full_name as instructor_name
                FROM Classes c
                JOIN Users u ON c.instructor_id = u.user_id
                ORDER BY c.created_at DESC
            """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_class(
    class_id: int,
    class_name: Optional[str] = None,
    description: Optional[str] = None
) -> Optional[Dict]:
    """Cập nhật thông tin lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Classes
            SET class_name = COALESCE(?, class_name),
                description = COALESCE(?, description),
                updated_at = GETDATE()
            OUTPUT inserted.class_id, inserted.class_code, inserted.class_name,
                   inserted.instructor_id, inserted.description, inserted.created_at, inserted.updated_at
            WHERE class_id = ?
        """, (class_name, description, class_id))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def delete_class(class_id: int) -> bool:
    """Xóa một lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Classes WHERE class_id = ?", (class_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
