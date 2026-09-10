from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_room_by_id(room_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, room_type, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM Rooms WHERE room_id = ?
        """, (room_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_room_by_code(room_code: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT room_id, room_code, room_name, room_type, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM Rooms WHERE room_code = ?
        """, (room_code,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_rooms_by_instructor(instructor_id: int, skip: int = 0, limit: int = 100, room_type: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["instructor_id = ?"]
        params = [instructor_id]
        if room_type:
            where.append("room_type = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT room_id, room_code, room_name, room_type, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM Rooms {where_sql}
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_all_rooms(skip: int = 0, limit: int = 100, room_type: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_sql = "WHERE room_type = ?" if room_type else ""
        params = [room_type] if room_type else []
        cursor.execute(f"""
            SELECT room_id, room_code, room_name, room_type, instructor_id, description,
                   start_time, end_time, duration_minutes, max_attempts,
                   is_active, passcode, livekit_room_name, created_at, updated_at
            FROM Rooms {where_sql}
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_room(
    room_code: str,
    room_name: str,
    room_type: str,
    instructor_id: int,
    description: Optional[str],
    start_time: datetime,
    end_time: datetime,
    duration_minutes: int,
    max_attempts: int,
    passcode: Optional[str] = None,
    livekit_room_name: Optional[str] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO Rooms (
                room_code, room_name, room_type, instructor_id, description,
                start_time, end_time, duration_minutes, max_attempts,
                passcode, livekit_room_name
            )
            OUTPUT inserted.room_id, inserted.room_code, inserted.room_name, inserted.room_type,
                   inserted.instructor_id, inserted.description, inserted.start_time, inserted.end_time,
                   inserted.duration_minutes, inserted.max_attempts, inserted.is_active, inserted.passcode,
                   inserted.livekit_room_name, inserted.created_at, inserted.updated_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            room_code, room_name, room_type, instructor_id, description,
            start_time, end_time, duration_minutes, max_attempts,
            passcode, livekit_room_name
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể tạo phòng mới")
    finally:
        cursor.close()
        conn.close()

def update_room(room_id: int, **kwargs) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        fields = []
        params = []
        for key, value in kwargs.items():
            if value is not None and key in (
                "room_name", "room_type", "description", "start_time", "end_time",
                "duration_minutes", "max_attempts", "is_active", "passcode", "livekit_room_name"
            ):
                fields.append(f"{key} = ?")
                params.append(value)
        if not fields:
            return get_room_by_id(room_id)
        params.append(room_id)
        cursor.execute(f"UPDATE Rooms SET {', '.join(fields)}, updated_at = GETDATE() WHERE room_id = ?", tuple(params))
        conn.commit()
        return get_room_by_id(room_id)
    finally:
        cursor.close()
        conn.close()

def delete_room(room_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Rooms WHERE room_id = ?", (room_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_room_dashboard_data(room_id: int) -> List[Dict]:
    """
    Truy vấn dữ liệu Panoptic Grid View tổng hợp trong 1 query duy nhất:
    Bao gồm thông tin phiên làm bài, họ tên thực của sinh viên, thời lượng và tổng số vi phạm.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT 
                s.session_id,
                s.student_id,
                u.full_name as student_name,
                u.username,
                u.student_id as student_code,
                s.status,
                s.started_at,
                COALESCE(DATEDIFF(MINUTE, s.started_at, GETDATE()), 0) as duration_minutes,
                COALESCE(v_stat.violation_count, 0) as violation_count,
                v_stat.last_snapshot_url
            FROM Sessions s
            JOIN Users u ON s.student_id = u.user_id
            LEFT JOIN (
                SELECT 
                    session_id,
                    COUNT(violation_id) as violation_count,
                    MAX(snapshot_url) as last_snapshot_url
                FROM Violations
                GROUP BY session_id
            ) v_stat ON s.session_id = v_stat.session_id
            WHERE s.room_id = ?
            ORDER BY s.started_at DESC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_system_overview_stats() -> Dict:
    """Lấy số liệu thống kê tổng quan hệ thống phục vụ Admin Dashboard"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM Rooms WHERE is_active = 1) as active_rooms_count,
                (SELECT COUNT(*) FROM Users) as total_users_count,
                (SELECT COUNT(*) FROM Sessions WHERE status = 'active') as active_sessions_count,
                (SELECT COUNT(*) FROM Submissions WHERE CAST(submitted_at AS DATE) = CAST(GETDATE() AS DATE)) as today_submissions_count,
                (SELECT COUNT(*) FROM Violations WHERE CAST(detected_at AS DATE) = CAST(GETDATE() AS DATE)) as today_violations_count
        """)
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return {
            "active_rooms_count": 0,
            "total_users_count": 0,
            "active_sessions_count": 0,
            "today_submissions_count": 0,
            "today_violations_count": 0
        }
    finally:
        cursor.close()
        conn.close()

