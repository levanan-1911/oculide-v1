from core.config import get_db_connection
from typing import Optional, List, Dict

def save_device_check(
    session_id: int,
    student_id: int,
    camera_status: bool,
    mic_status: bool,
    network_latency_ms: Optional[int],
    os_info: Optional[str],
    browser_info: Optional[str],
    is_passed: bool
) -> Dict:
    """Lưu kết quả kiểm tra thiết bị của thí sinh trước khi thi vào bảng DeviceChecks"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT check_id FROM DeviceChecks WHERE session_id = ?", (session_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE DeviceChecks
                SET camera_status = ?, mic_status = ?, network_latency_ms = ?,
                    os_info = ?, browser_info = ?, is_passed = ?, checked_at = GETDATE()
                OUTPUT inserted.check_id, inserted.session_id, inserted.student_id,
                       inserted.camera_status, inserted.mic_status, inserted.network_latency_ms,
                       inserted.os_info, inserted.browser_info, inserted.is_passed, inserted.checked_at
                WHERE session_id = ?
            """, (
                1 if camera_status else 0,
                1 if mic_status else 0,
                network_latency_ms or 0,
                os_info,
                browser_info,
                1 if is_passed else 0,
                session_id
            ))
        else:
            cursor.execute("""
                INSERT INTO DeviceChecks (session_id, student_id, camera_status, mic_status,
                                          network_latency_ms, os_info, browser_info, is_passed)
                OUTPUT inserted.check_id, inserted.session_id, inserted.student_id,
                       inserted.camera_status, inserted.mic_status, inserted.network_latency_ms,
                       inserted.os_info, inserted.browser_info, inserted.is_passed, inserted.checked_at
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_id,
                student_id,
                1 if camera_status else 0,
                1 if mic_status else 0,
                network_latency_ms or 0,
                os_info,
                browser_info,
                1 if is_passed else 0
            ))
            
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "check_id": row[0],
                "session_id": row[1],
                "student_id": row[2],
                "camera_status": bool(row[3]),
                "mic_status": bool(row[4]),
                "network_latency_ms": row[5],
                "os_info": row[6],
                "browser_info": row[7],
                "is_passed": bool(row[8]),
                "checked_at": row[9]
            }
        raise Exception("Không thể lưu kết quả kiểm tra thiết bị")
    finally:
        cursor.close()
        conn.close()

def get_device_check_by_session(session_id: int) -> Optional[Dict]:
    """Lấy kết quả kiểm tra thiết bị của một phiên làm bài"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT check_id, 
                   session_id, 
                   student_id, 
                   camera_status, 
                   mic_status,
                   network_latency_ms, 
                   os_info, 
                   browser_info, 
                   is_passed, 
                   checked_at
            FROM DeviceChecks
            WHERE session_id = ?
        """, (session_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            res = dict(zip(columns, row))
            res["camera_status"] = bool(res["camera_status"])
            res["mic_status"] = bool(res["mic_status"])
            res["is_passed"] = bool(res["is_passed"])
            return res
        return None
    finally:
        cursor.close()
        conn.close()

def get_device_checks_by_room(room_id: int) -> List[Dict]:
    """Giám thị xem danh sách trạng thái thiết bị của toàn bộ thí sinh trong phòng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT dc.check_id, 
                   dc.session_id, 
                   dc.student_id, 
                   dc.camera_status, 
                   dc.mic_status,
                   dc.network_latency_ms, 
                   dc.os_info, 
                   dc.browser_info, 
                   dc.is_passed, 
                   dc.checked_at,
                   u.full_name AS student_name, 
                   u.identifier_code AS student_code
            FROM DeviceChecks dc
            JOIN ExamSessions s ON dc.session_id = s.session_id
            JOIN Users u ON dc.student_id = u.user_id
            WHERE s.room_id = ?
            ORDER BY dc.checked_at DESC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            res = dict(zip(columns, row))
            res["camera_status"] = bool(res["camera_status"])
            res["mic_status"] = bool(res["mic_status"])
            res["is_passed"] = bool(res["is_passed"])
            results.append(res)
        return results
    finally:
        cursor.close()
        conn.close()
