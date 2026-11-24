from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict
from database.room_db import get_current_vn_time

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
        # Lấy room_id từ session
        cursor.execute("SELECT room_id FROM ExamSessions WHERE session_id = ?", (session_id,))
        sess_row = cursor.fetchone()
        room_id = sess_row[0] if sess_row else 1

        now_vn = get_current_vn_time()
        cursor.execute("""
            INSERT INTO Violations (
                session_id, room_id, student_id, violation_type, 
                severity, description, evidence_url, detected_at
            )
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type, 
                   inserted.severity, inserted.description, inserted.evidence_url, inserted.detected_at, 
                   inserted.is_reviewed, inserted.review_status, inserted.reviewed_by, inserted.reviewed_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, room_id, student_id, violation_type, severity, description, snapshot_url, now_vn))
        row = cursor.fetchone()

        # Đếm tổng số vi phạm trong phiên thi này
        cursor.execute("SELECT COUNT(*) FROM Violations WHERE session_id = ?", (session_id,))
        v_count_row = cursor.fetchone()
        total_v = v_count_row[0] if v_count_row else 0
        if total_v >= 3:
            # Khóa phiên thi ở mức CSDL nếu vượt quá 3 lần vi phạm
            cursor.execute(
                "UPDATE ExamSessions SET status = 'locked' WHERE session_id = ? AND status NOT IN ('completed', 'da_nop', 'submitted')",
                (session_id,)
            )

        conn.commit()
        if row:
            return {
                "violation_id": row[0],
                "session_id": row[1],
                "student_id": row[2],
                "violation_type": row[3],
                "severity": row[4],
                "description": row[5],
                "snapshot_url": row[6],
                "detected_at": row[7],
                "is_reviewed": bool(row[8]),
                "review_status": row[9],
                "reviewed_by": row[10],
                "reviewed_at": row[11]
            }
        raise Exception("Không thể ghi nhận vi phạm")
    finally:
        cursor.close()
        conn.close()

def get_violations_by_session(session_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT violation_id, 
                   session_id, 
                   student_id, 
                   violation_type, 
                   severity,
                   description, 
                   evidence_url AS snapshot_url, 
                   detected_at, 
                   is_reviewed, 
                   review_status, 
                   reviewed_by, 
                   reviewed_at
            FROM Violations 
            WHERE session_id = ?
            ORDER BY detected_at DESC
        """, (session_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_reviewed"] = bool(r["is_reviewed"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def get_violations_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if room_id:
            cursor.execute("""
                SELECT v.violation_id, 
                       v.session_id, 
                       v.student_id, 
                       COALESCE(v.room_id, s.room_id) AS room_id,
                       p.room_code,
                       p.room_name,
                       v.violation_type, 
                       v.severity,
                       v.description, 
                       v.evidence_url AS snapshot_url, 
                       v.detected_at, 
                       v.is_reviewed, 
                       v.review_status, 
                       v.reviewed_by, 
                       v.reviewed_at
                FROM Violations v
                LEFT JOIN ExamSessions s ON v.session_id = s.session_id
                LEFT JOIN Rooms p ON COALESCE(v.room_id, s.room_id) = p.room_id
                WHERE v.student_id = ? AND (v.room_id = ? OR s.room_id = ?)
                ORDER BY v.detected_at DESC
            """, (student_id, room_id, room_id))
        else:
            cursor.execute("""
                SELECT v.violation_id, 
                       v.session_id, 
                       v.student_id, 
                       COALESCE(v.room_id, s.room_id) AS room_id,
                       p.room_code,
                       p.room_name,
                       v.violation_type, 
                       v.severity,
                       v.description, 
                       v.evidence_url AS snapshot_url, 
                       v.detected_at, 
                       v.is_reviewed, 
                       v.review_status, 
                       v.reviewed_by, 
                       v.reviewed_at
                FROM Violations v
                LEFT JOIN ExamSessions s ON v.session_id = s.session_id
                LEFT JOIN Rooms p ON COALESCE(v.room_id, s.room_id) = p.room_id
                WHERE v.student_id = ?
                ORDER BY v.detected_at DESC
            """, (student_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_reviewed"] = bool(r["is_reviewed"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def get_violations_by_room(room_id: int, review_status: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["s.room_id = ?"]
        params = [room_id]
        if review_status:
            where.append("v.review_status = ?")
            params.append(review_status)
        where_sql = f"WHERE {' AND '.join(where)}"
        cursor.execute(f"""
            SELECT v.violation_id, 
                   v.session_id, 
                   v.student_id, 
                   v.violation_type, 
                   v.severity,
                   v.description, 
                   v.evidence_url AS snapshot_url, 
                   v.detected_at, 
                   v.is_reviewed, 
                   v.review_status, 
                   v.reviewed_by, 
                   v.reviewed_at, 
                   u.full_name AS student_name, 
                   u.identifier_code AS student_code
            FROM Violations v
            JOIN ExamSessions s ON v.session_id = s.session_id
            JOIN Users u ON v.student_id = u.user_id
            {where_sql}
            ORDER BY v.detected_at DESC
        """, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_reviewed"] = bool(r["is_reviewed"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def update_violation_review(violation_id: int, reviewed_by: int, review_status: str = "confirmed") -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE Violations 
            SET is_reviewed = 1, review_status = ?, reviewed_by = ?, reviewed_at = GETDATE()
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type,
                   inserted.severity, inserted.description, inserted.evidence_url, inserted.detected_at,
                   inserted.is_reviewed, inserted.review_status, inserted.reviewed_by, inserted.reviewed_at
            WHERE violation_id = ?
        """, (review_status, reviewed_by, violation_id))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "violation_id": row[0],
                "session_id": row[1],
                "student_id": row[2],
                "violation_type": row[3],
                "severity": row[4],
                "description": row[5],
                "snapshot_url": row[6],
                "detected_at": row[7],
                "is_reviewed": bool(row[8]),
                "review_status": row[9],
                "reviewed_by": row[10],
                "reviewed_at": row[11]
            }
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
