from core.config import get_db_connection
from typing import Optional, List, Dict

def create_support_request(
    room_id: int,
    student_id: int,
    session_id: Optional[int],
    issue_type: str,
    message: str
) -> Dict:
    """Sinh viên tạo yêu cầu hỗ trợ kỹ thuật trong bảng YeuCauTroGiup"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO YeuCauTroGiup (ma_phong, ma_sinh_vien, ma_phien, danh_muc_su_co, tin_nhan_sos, trang_thai)
            OUTPUT inserted.ma_yeu_cau, inserted.ma_phong, inserted.ma_sinh_vien, inserted.ma_phien,
                   inserted.danh_muc_su_co, inserted.tin_nhan_sos, inserted.trang_thai, inserted.nguoi_giai_quyet,
                   inserted.thoi_gian_gui, inserted.thoi_gian_giai_quyet
            VALUES (?, ?, ?, ?, ?, 'open')
        """, (room_id, student_id, session_id, issue_type, message))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "request_id": row[0],
                "room_id": row[1],
                "student_id": row[2],
                "session_id": row[3],
                "issue_type": row[4],
                "message": row[5],
                "status": row[6],
                "resolved_by": row[7],
                "created_at": row[8],
                "resolved_at": row[9]
            }
        raise Exception("Không thể tạo yêu cầu hỗ trợ")
    finally:
        cursor.close()
        conn.close()

def get_support_request_by_id(request_id: int) -> Optional[Dict]:
    """Lấy chi tiết một yêu cầu hỗ trợ kỹ thuật"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT sr.ma_yeu_cau AS request_id, 
                   sr.ma_phong AS room_id, 
                   sr.ma_sinh_vien AS student_id, 
                   sr.ma_phien AS session_id,
                   sr.danh_muc_su_co AS issue_type, 
                   sr.tin_nhan_sos AS message, 
                   sr.trang_thai AS status, 
                   sr.nguoi_giai_quyet AS resolved_by,
                   sr.thoi_gian_gui AS created_at, 
                   sr.thoi_gian_giai_quyet AS resolved_at,
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code
            FROM YeuCauTroGiup sr
            JOIN NguoiDung u ON sr.ma_sinh_vien = u.ma_nguoi_dung
            WHERE sr.ma_yeu_cau = ?
        """, (request_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_support_requests_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    """Sinh viên xem lại các yêu cầu hỗ trợ của mình"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT sr.ma_yeu_cau AS request_id, 
                   sr.ma_phong AS room_id, 
                   sr.ma_sinh_vien AS student_id, 
                   sr.ma_phien AS session_id,
                   sr.danh_muc_su_co AS issue_type, 
                   sr.tin_nhan_sos AS message, 
                   sr.trang_thai AS status, 
                   sr.nguoi_giai_quyet AS resolved_by,
                   sr.thoi_gian_gui AS created_at, 
                   sr.thoi_gian_giai_quyet AS resolved_at,
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code
            FROM YeuCauTroGiup sr
            JOIN NguoiDung u ON sr.ma_sinh_vien = u.ma_nguoi_dung
            WHERE sr.ma_sinh_vien = ?
        """
        params = [student_id]
        if room_id:
            query += " AND sr.ma_phong = ?"
            params.append(room_id)
        query += " ORDER BY sr.thoi_gian_gui DESC"
        
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_support_requests_by_room(room_id: int, status_filter: Optional[str] = None) -> List[Dict]:
    """Giám thị lấy danh sách yêu cầu hỗ trợ trong phòng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT sr.ma_yeu_cau AS request_id, 
                   sr.ma_phong AS room_id, 
                   sr.ma_sinh_vien AS student_id, 
                   sr.ma_phien AS session_id,
                   sr.danh_muc_su_co AS issue_type, 
                   sr.tin_nhan_sos AS message, 
                   sr.trang_thai AS status, 
                   sr.nguoi_giai_quyet AS resolved_by,
                   sr.thoi_gian_gui AS created_at, 
                   sr.thoi_gian_giai_quyet AS resolved_at,
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code
            FROM YeuCauTroGiup sr
            JOIN NguoiDung u ON sr.ma_sinh_vien = u.ma_nguoi_dung
            WHERE sr.ma_phong = ?
        """
        params = [room_id]
        if status_filter:
            query += " AND sr.trang_thai = ?"
            params.append(status_filter)
        query += " ORDER BY sr.thoi_gian_gui DESC"
        
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
            UPDATE YeuCauTroGiup
            SET trang_thai = ?, nguoi_giai_quyet = ?, 
                thoi_gian_giai_quyet = CASE WHEN ? IN ('resolved', 'rejected', 'da_xong') THEN GETDATE() ELSE NULL END
            OUTPUT inserted.ma_yeu_cau, inserted.ma_phong, inserted.ma_sinh_vien, inserted.ma_phien,
                   inserted.danh_muc_su_co, inserted.tin_nhan_sos, inserted.trang_thai, inserted.nguoi_giai_quyet,
                   inserted.thoi_gian_gui, inserted.thoi_gian_giai_quyet
            WHERE ma_yeu_cau = ?
        """, (new_status, resolved_by, new_status, request_id))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "request_id": row[0],
                "room_id": row[1],
                "student_id": row[2],
                "session_id": row[3],
                "issue_type": row[4],
                "message": row[5],
                "status": row[6],
                "resolved_by": row[7],
                "created_at": row[8],
                "resolved_at": row[9]
            }
        return None
    finally:
        cursor.close()
        conn.close()
