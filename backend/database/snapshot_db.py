from typing import Optional, List, Dict, Any
from core.database import get_db_cursor, row_to_dict, rows_to_dicts

def create_snapshot(
    session_id: int,
    student_id: int,
    image_url: str,
    face_detected: bool = False,
    face_count: int = 0,
    looking_at_screen: bool = True,
    confidence_score: Optional[float] = None
) -> Dict[str, Any]:
    """Lưu bản ghi ảnh chụp webcam định kỳ từ sinh viên vào bảng Snapshots"""
    sql = """
        INSERT INTO Snapshots (
            session_id, student_id, image_url, 
            face_detected, face_count, looking_at_screen, confidence_score
        )
        OUTPUT inserted.snapshot_id, inserted.session_id, inserted.student_id,
               inserted.image_url, inserted.face_detected, inserted.face_count,
               inserted.looking_at_screen, inserted.confidence_score, inserted.captured_at
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (
            session_id, student_id, image_url,
            1 if face_detected else 0, face_count,
            1 if looking_at_screen else 0, confidence_score
        ))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            return result
        raise RuntimeError("Không thể lưu bản ghi snapshot")

def get_snapshots_by_session(session_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Lấy danh sách snapshot của một phiên thi, sắp xếp mới nhất trước"""
    sql = """
        SELECT TOP (?) 
            snapshot_id, session_id, student_id, image_url,
            face_detected, face_count, looking_at_screen, confidence_score, captured_at
        FROM Snapshots
        WHERE session_id = ?
        ORDER BY captured_at DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (limit, session_id))
        rows = cursor.fetchall()
        return rows_to_dicts(cursor, rows)

def get_latest_snapshot_by_student(session_id: int, student_id: int) -> Optional[Dict[str, Any]]:
    """Lấy ảnh snapshot gần nhất của sinh viên trong phiên thi"""
    sql = """
        SELECT TOP 1
            snapshot_id, session_id, student_id, image_url,
            face_detected, face_count, looking_at_screen, confidence_score, captured_at
        FROM Snapshots
        WHERE session_id = ? AND student_id = ?
        ORDER BY captured_at DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (session_id, student_id))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)

def cleanup_old_snapshots(days: int = 30) -> int:
    """Dọn dẹp các snapshot cũ hơn số ngày chỉ định để tiết kiệm dung lượng CSDL"""
    sql = """
        DELETE FROM Snapshots
        WHERE captured_at < DATEADD(day, -?, GETDATE())
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (days,))
        return cursor.rowcount
