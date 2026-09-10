from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def is_student_enrolled(room_id: int, student_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT COUNT(*) FROM Enrollments 
            WHERE room_id = ? AND student_id = ?
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
            INSERT INTO Enrollments (room_id, student_id, enrolled_by)
            OUTPUT inserted.enrollment_id, inserted.room_id, inserted.student_id, 
                   inserted.enrolled_at, inserted.enrolled_by
            VALUES (?, ?, ?)
        """, (room_id, student_id, enrolled_by))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể ghi danh sinh viên")
    finally:
        cursor.close()
        conn.close()

def get_enrollments_by_room(room_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT e.enrollment_id, e.room_id, e.student_id, e.enrolled_at, e.enrolled_by,
                   u.username, u.full_name, u.student_id as student_code, u.email
            FROM Enrollments e
            JOIN Users u ON e.student_id = u.user_id
            WHERE e.room_id = ?
            ORDER BY e.enrolled_at DESC
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
            DELETE FROM Enrollments 
            WHERE room_id = ? AND student_id = ?
        """, (room_id, student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
