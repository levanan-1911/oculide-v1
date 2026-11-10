from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def is_student_enrolled(room_id: int, student_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT COUNT(*) FROM SinhVienLopHoc 
            WHERE ma_phong = ? AND ma_sinh_vien = ?
        """, (room_id, student_id))
        count = cursor.fetchone()[0]
        return count > 0
    finally:
        cursor.close()
        conn.close()

def enroll_student(room_id: int, student_id: int, enrolled_by: int) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO SinhVienLopHoc (ma_phong, ma_sinh_vien, nguoi_them)
            OUTPUT inserted.ma_dong, inserted.ma_phong, inserted.ma_sinh_vien, 
                   inserted.ngay_tham_gia, inserted.nguoi_them
            VALUES (?, ?, ?)
        """, (room_id, student_id, enrolled_by))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "enrollment_id": row[0],
                "room_id": row[1],
                "student_id": row[2],
                "enrolled_at": row[3],
                "enrolled_by": row[4]
            }
        raise Exception("Không thể ghi danh sinh viên")
    finally:
        cursor.close()
        conn.close()

def get_enrollments_by_room(room_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT e.ma_dong AS enrollment_id, 
                   e.ma_phong AS room_id, 
                   e.ma_sinh_vien AS student_id, 
                   e.ngay_tham_gia AS enrolled_at, 
                   e.nguoi_them AS enrolled_by,
                   u.ten_dang_nhap AS username, 
                   u.ho_va_ten AS full_name, 
                   u.ma_dinh_danh AS student_code, 
                   u.email
            FROM SinhVienLopHoc e
            JOIN NguoiDung u ON e.ma_sinh_vien = u.ma_nguoi_dung
            WHERE e.ma_phong = ?
            ORDER BY e.ngay_tham_gia DESC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def remove_enrollment(room_id: int, student_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM SinhVienLopHoc 
            WHERE ma_phong = ? AND ma_sinh_vien = ?
        """, (room_id, student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
