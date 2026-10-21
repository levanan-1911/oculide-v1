from core.config import get_db_connection
from typing import Optional, List, Dict

def create_support_request(
    room_id: int,
    student_id: int,
    session_id: Optional[int],
    issue_type: str,
    message: str
) -> Dict:
    """Sinh viên tạo yêu cầu hỗ trợ kỹ thuật trong phòng thi/lab"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO SupportRequests (room_id, student_id, session_id, issue_type, message, status)
            OUTPUT inserted.request_id, inserted.room_id, inserted.student_id, inserted.session_id,
                   inserted.issue_type, inserted.message, inserted.status, inserted.resolved_by,
                   inserted.created_at, inserted.resolved_at
            VALUES (?, ?, ?, ?, ?, 'open')
        """, (room_id, student_id, session_id, issue_type, message))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể tạo yêu cầu hỗ trợ")
    finally:
        cursor.close()
        conn.close()

def get_support_requests_by_room(room_id: int, status_filter: Optional[str] = None) -> List[Dict]:
    """Giám thị lấy danh sách yêu cầu hỗ trợ trong phòng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT sr.request_id, sr.room_id, sr.student_id, sr.session_id,
                   sr.issue_type, sr.message, sr.status, sr.resolved_by,
                   sr.created_at, sr.resolved_at,
                   u.full_name as student_name, u.student_id as student_code
            FROM SupportRequests sr
            JOIN Users u ON sr.student_id = u.user_id
            WHERE sr.room_id = ?
        """
        params = [room_id]
        if status_filter:
            query += " AND sr.status = ?"
            params.append(status_filter)
        query += " ORDER BY sr.created_at DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_support_request_status(
    request_id: int,
    new_status: str,
    resolved_by: int
) -> Optional[Dict]:
    """Giám thị cập nhật tiến độ xử lý yêu cầu cứu hộ"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE SupportRequests
            SET status = ?, resolved_by = ?, 
                resolved_at = CASE WHEN ? IN ('resolved', 'rejected') THEN GETDATE() ELSE NULL END
            OUTPUT inserted.request_id, inserted.room_id, inserted.student_id, inserted.session_id,
                   inserted.issue_type, inserted.message, inserted.status, inserted.resolved_by,
                   inserted.created_at, inserted.resolved_at
            WHERE request_id = ?
        """, (new_status, resolved_by, new_status, request_id))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()
