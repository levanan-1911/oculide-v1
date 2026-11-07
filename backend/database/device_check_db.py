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
    """Lưu kết quả kiểm tra thiết bị của thí sinh trước khi thi vào bảng KiemTraThietBi"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ma_kiem_tra FROM KiemTraThietBi WHERE ma_phien = ?", (session_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute("""
                UPDATE KiemTraThietBi
                SET trang_thai_camera = ?, trang_thai_micro = ?, do_tre_mang_ms = ?,
                    thong_tin_he_dieu_hanh = ?, thong_tin_trinh_duyet = ?, du_dieu_kien_thi = ?, thoi_gian_kiem_tra = GETDATE()
                OUTPUT inserted.ma_kiem_tra, inserted.ma_phien, inserted.ma_sinh_vien,
                       inserted.trang_thai_camera, inserted.trang_thai_micro, inserted.do_tre_mang_ms,
                       inserted.thong_tin_he_dieu_hanh, inserted.thong_tin_trinh_duyet, inserted.du_dieu_kien_thi, inserted.thoi_gian_kiem_tra
                WHERE ma_phien = ?
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
                INSERT INTO KiemTraThietBi (ma_phien, ma_sinh_vien, trang_thai_camera, trang_thai_micro,
                                          do_tre_mang_ms, thong_tin_he_dieu_hanh, thong_tin_trinh_duyet, du_dieu_kien_thi)
                OUTPUT inserted.ma_kiem_tra, inserted.ma_phien, inserted.ma_sinh_vien,
                       inserted.trang_thai_camera, inserted.trang_thai_micro, inserted.do_tre_mang_ms,
                       inserted.thong_tin_he_dieu_hanh, inserted.thong_tin_trinh_duyet, inserted.du_dieu_kien_thi, inserted.thoi_gian_kiem_tra
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
            SELECT ma_kiem_tra AS check_id, 
                   ma_phien AS session_id, 
                   ma_sinh_vien AS student_id, 
                   trang_thai_camera AS camera_status, 
                   trang_thai_micro AS mic_status,
                   do_tre_mang_ms AS network_latency_ms, 
                   thong_tin_he_dieu_hanh AS os_info, 
                   thong_tin_trinh_duyet AS browser_info, 
                   du_dieu_kien_thi AS is_passed, 
                   thoi_gian_kiem_tra AS checked_at
            FROM KiemTraThietBi
            WHERE ma_phien = ?
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
            SELECT dc.ma_kiem_tra AS check_id, 
                   dc.ma_phien AS session_id, 
                   dc.ma_sinh_vien AS student_id, 
                   dc.trang_thai_camera AS camera_status, 
                   dc.trang_thai_micro AS mic_status,
                   dc.do_tre_mang_ms AS network_latency_ms, 
                   dc.thong_tin_he_dieu_hanh AS os_info, 
                   dc.thong_tin_trinh_duyet AS browser_info, 
                   dc.du_dieu_kien_thi AS is_passed, 
                   dc.thoi_gian_kiem_tra AS checked_at,
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code
            FROM KiemTraThietBi dc
            JOIN PhienLamBai s ON dc.ma_phien = s.ma_phien
            JOIN NguoiDung u ON dc.ma_sinh_vien = u.ma_nguoi_dung
            WHERE s.ma_phong = ?
            ORDER BY dc.thoi_gian_kiem_tra DESC
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
