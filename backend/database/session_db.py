from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_session_by_id(session_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT session_id, 
                   room_id, 
                   student_id, 
                   start_time AS started_at, 
                   COALESCE(end_time, submitted_at) AS ended_at,
                   ip_address, 
                   user_agent, 
                   browser_fingerprint, 
                   status
            FROM ExamSessions 
            WHERE session_id = ?
        """, (session_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_sessions_by_room(room_id: int, active_only: bool = False) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_sql = "WHERE room_id = ? AND status IN ('active', 'dang_lam')" if active_only else "WHERE room_id = ?"
        cursor.execute(f"""
            SELECT session_id, 
                   room_id, 
                   student_id, 
                   start_time AS started_at, 
                   COALESCE(end_time, submitted_at) AS ended_at,
                   ip_address, 
                   user_agent, 
                   browser_fingerprint, 
                   status
            FROM ExamSessions 
            {where_sql}
            ORDER BY start_time DESC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_sessions_by_student(student_id: int, room_id: Optional[int] = None, active_only: bool = False) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["student_id = ?"]
        params = [student_id]
        if room_id:
            where.append("room_id = ?")
            params.append(room_id)
        if active_only:
            where.append("status IN ('active', 'dang_lam')")
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT session_id, 
                   room_id, 
                   student_id, 
                   start_time AS started_at, 
                   COALESCE(end_time, submitted_at) AS ended_at,
                   ip_address, 
                   user_agent, 
                   browser_fingerprint, 
                   status
            FROM ExamSessions 
            {where_sql}
            ORDER BY start_time DESC
        """, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_session(
    room_id: int,
    student_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    browser_fingerprint: Optional[str] = None,
    status: str = "active"
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ExamSessions (room_id, student_id, ip_address, user_agent, browser_fingerprint, status)
            OUTPUT inserted.session_id, inserted.room_id, inserted.student_id, 
                   inserted.start_time, inserted.end_time, inserted.ip_address, 
                   inserted.user_agent, inserted.browser_fingerprint, inserted.status
            VALUES (?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, ip_address, user_agent, browser_fingerprint, status))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "session_id": row[0],
                "room_id": row[1],
                "student_id": row[2],
                "started_at": row[3],
                "ended_at": row[4],
                "ip_address": row[5],
                "user_agent": row[6],
                "browser_fingerprint": row[7],
                "status": row[8]
            }
        raise Exception("Không thể tạo phiên làm bài")
    finally:
        cursor.close()
        conn.close()

def update_session_status(session_id: int, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE ExamSessions SET status = ? WHERE session_id = ?", (status, session_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def end_session(session_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE ExamSessions 
            SET end_time = GETDATE(), 
                submitted_at = GETDATE(), 
                status = 'completed' 
            WHERE session_id = ?
        """, (session_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
