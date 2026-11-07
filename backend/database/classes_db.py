from core.config import get_db_connection
from typing import Optional, List, Dict

def create_class(
    class_code: str,
    class_name: str,
    instructor_id: int,
    description: Optional[str] = None
) -> Dict:
    """Giảng viên tạo một lớp học phần mới trong bảng LopHoc"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO LopHoc (ma_lop_hoc, ten_lop, ma_giang_vien, mo_ta)
            OUTPUT inserted.ma_lop, inserted.ma_lop_hoc, inserted.ten_lop,
                   inserted.ma_giang_vien, inserted.mo_ta, inserted.ngay_tao, inserted.ngay_cap_nhat
            VALUES (?, ?, ?, ?)
        """, (class_code, class_name, instructor_id, description))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "class_id": row[0],
                "class_code": row[1],
                "class_name": row[2],
                "instructor_id": row[3],
                "description": row[4],
                "created_at": row[5],
                "updated_at": row[6]
            }
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
            SELECT c.ma_lop AS class_id, 
                   c.ma_lop_hoc AS class_code, 
                   c.ten_lop AS class_name, 
                   c.ma_giang_vien AS instructor_id,
                   c.mo_ta AS description, 
                   c.ngay_tao AS created_at, 
                   c.ngay_cap_nhat AS updated_at, 
                   u.ho_va_ten AS instructor_name
            FROM LopHoc c
            JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
            WHERE c.ma_lop = ?
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
                SELECT c.ma_lop AS class_id, 
                       c.ma_lop_hoc AS class_code, 
                       c.ten_lop AS class_name, 
                       c.ma_giang_vien AS instructor_id,
                       c.mo_ta AS description, 
                       c.ngay_tao AS created_at, 
                       c.ngay_cap_nhat AS updated_at, 
                       u.ho_va_ten AS instructor_name
                FROM LopHoc c
                JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
                WHERE c.ma_giang_vien = ?
                ORDER BY c.ngay_tao DESC
            """, (instructor_id,))
        else:
            cursor.execute("""
                SELECT c.ma_lop AS class_id, 
                       c.ma_lop_hoc AS class_code, 
                       c.ten_lop AS class_name, 
                       c.ma_giang_vien AS instructor_id,
                       c.mo_ta AS description, 
                       c.ngay_tao AS created_at, 
                       c.ngay_cap_nhat AS updated_at, 
                       u.ho_va_ten AS instructor_name
                FROM LopHoc c
                JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
                ORDER BY c.ngay_tao DESC
            """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_class(
    class_id: int,
    class_code: Optional[str] = None,
    class_name: Optional[str] = None,
    description: Optional[str] = None
) -> Optional[Dict]:
    """Cập nhật thông tin lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE LopHoc
            SET ma_lop_hoc = COALESCE(?, ma_lop_hoc),
                ten_lop = COALESCE(?, ten_lop),
                mo_ta = COALESCE(?, mo_ta),
                ngay_cap_nhat = GETDATE()
            WHERE ma_lop = ?
        """, (class_code, class_name, description, class_id))
        conn.commit()
        return get_class_by_id(class_id)
    finally:
        cursor.close()
        conn.close()

def delete_class(class_id: int) -> bool:
    """Xóa một lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM LopHoc WHERE ma_lop = ?", (class_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
