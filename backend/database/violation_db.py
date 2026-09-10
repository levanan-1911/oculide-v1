from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def create_violation(
    session_id: int,
    student_id: int,
    violation_type: str,
    severity: str = "warning",
    description: Optional[str] = None,
    snapshot_url: Optional[str] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Violations (session_id, student_id, violation_type, severity, description, snapshot_url)
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type, 
                   inserted.severity, inserted.description, inserted.snapshot_url, inserted.detected_at, 
                   inserted.is_reviewed, inserted.reviewed_by, inserted.reviewed_at
            VALUES (?, ?, ?, ?, ?, ?)
        """, (session_id, student_id, violation_type, severity, description, snapshot_url))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể ghi nhận vi phạm")
    finally:
        cursor.close()
        conn.close()

def get_violations_by_session(session_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT violation_id, session_id, student_id, violation_type, severity,
                   description, snapshot_url, detected_at, is_reviewed, reviewed_by, reviewed_at
            FROM Violations 
            WHERE session_id = ?
            ORDER BY detected_at DESC
        """, (session_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_violations_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if room_id:
            cursor.execute("""
                SELECT v.violation_id, v.session_id, v.student_id, v.violation_type, v.severity,
                       v.description, v.snapshot_url, v.detected_at, v.is_reviewed, v.reviewed_by, v.reviewed_at
                FROM Violations v
                JOIN Sessions s ON v.session_id = s.session_id
                WHERE v.student_id = ? AND s.room_id = ?
                ORDER BY v.detected_at DESC
            """, (student_id, room_id))
        else:
            cursor.execute("""
                SELECT violation_id, session_id, student_id, violation_type, severity,
                       description, snapshot_url, detected_at, is_reviewed, reviewed_by, reviewed_at
                FROM Violations 
                WHERE student_id = ?
                ORDER BY detected_at DESC
            """, (student_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_violation_review(violation_id: int, reviewed_by: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Violations 
            SET is_reviewed = 1, reviewed_by = ?, reviewed_at = GETDATE()
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type,
                   inserted.severity, inserted.description, inserted.snapshot_url, inserted.detected_at,
                   inserted.is_reviewed, inserted.reviewed_by, inserted.reviewed_at
            WHERE violation_id = ?
        """, (reviewed_by, violation_id))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_student_violation_stats(room_id: int, student_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("EXEC sp_GetStudentViolationStats @room_id = ?, @student_id = ?", (room_id, student_id))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
