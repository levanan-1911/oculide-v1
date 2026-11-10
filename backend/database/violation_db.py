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
        # Lấy ma_phong từ session
        cursor.execute("SELECT ma_phong FROM PhienLamBai WHERE ma_phien = ?", (session_id,))
        sess_row = cursor.fetchone()
        room_id = sess_row[0] if sess_row else 1

        cursor.execute("""
            INSERT INTO ViPhamGiamSat (
                ma_phien, ma_phong, ma_sinh_vien, loai_vi_pham, 
                muc_do_nghiem_trong, mo_ta, link_anh_bang_chung
            )
            OUTPUT inserted.ma_vi_pham, inserted.ma_phien, inserted.ma_sinh_vien, inserted.loai_vi_pham, 
                   inserted.muc_do_nghiem_trong, inserted.mo_ta, inserted.link_anh_bang_chung, inserted.thoi_gian_phat_hien, 
                   inserted.da_kiem_tra, inserted.trang_thai_duyet, inserted.nguoi_duyet, inserted.thoi_gian_duyet
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (session_id, room_id, student_id, violation_type, severity, description, snapshot_url))
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
        raise Exception("Không thể ghi nhận vi phạm")
    finally:
        cursor.close()
        conn.close()

def get_violations_by_session(session_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_vi_pham AS violation_id, 
                   ma_phien AS session_id, 
                   ma_sinh_vien AS student_id, 
                   loai_vi_pham AS violation_type, 
                   muc_do_nghiem_trong AS severity,
                   mo_ta AS description, 
                   link_anh_bang_chung AS snapshot_url, 
                   thoi_gian_phat_hien AS detected_at, 
                   da_kiem_tra AS is_reviewed, 
                   trang_thai_duyet AS review_status, 
                   nguoi_duyet AS reviewed_by, 
                   thoi_gian_duyet AS reviewed_at
            FROM ViPhamGiamSat 
            WHERE ma_phien = ?
            ORDER BY thoi_gian_phat_hien DESC
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
                SELECT v.ma_vi_pham AS violation_id, 
                       v.ma_phien AS session_id, 
                       v.ma_sinh_vien AS student_id, 
                       v.loai_vi_pham AS violation_type, 
                       v.muc_do_nghiem_trong AS severity,
                       v.mo_ta AS description, 
                       v.link_anh_bang_chung AS snapshot_url, 
                       v.thoi_gian_phat_hien AS detected_at, 
                       v.da_kiem_tra AS is_reviewed, 
                       v.trang_thai_duyet AS review_status, 
                       v.nguoi_duyet AS reviewed_by, 
                       v.thoi_gian_duyet AS reviewed_at
                FROM ViPhamGiamSat v
                JOIN PhienLamBai s ON v.ma_phien = s.ma_phien
                WHERE v.ma_sinh_vien = ? AND s.ma_phong = ?
                ORDER BY v.thoi_gian_phat_hien DESC
            """, (student_id, room_id))
        else:
            cursor.execute("""
                SELECT ma_vi_pham AS violation_id, 
                       ma_phien AS session_id, 
                       ma_sinh_vien AS student_id, 
                       loai_vi_pham AS violation_type, 
                       muc_do_nghiem_trong AS severity,
                       mo_ta AS description, 
                       link_anh_bang_chung AS snapshot_url, 
                       thoi_gian_phat_hien AS detected_at, 
                       da_kiem_tra AS is_reviewed, 
                       trang_thai_duyet AS review_status, 
                       nguoi_duyet AS reviewed_by, 
                       thoi_gian_duyet AS reviewed_at
                FROM ViPhamGiamSat 
                WHERE ma_sinh_vien = ?
                ORDER BY thoi_gian_phat_hien DESC
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
        where = ["s.ma_phong = ?"]
        params = [room_id]
        if review_status:
            where.append("v.trang_thai_duyet = ?")
            params.append(review_status)
        where_sql = f"WHERE {' AND '.join(where)}"
        cursor.execute(f"""
            SELECT v.ma_vi_pham AS violation_id, 
                   v.ma_phien AS session_id, 
                   v.ma_sinh_vien AS student_id, 
                   v.loai_vi_pham AS violation_type, 
                   v.muc_do_nghiem_trong AS severity,
                   v.mo_ta AS description, 
                   v.link_anh_bang_chung AS snapshot_url, 
                   v.thoi_gian_phat_hien AS detected_at, 
                   v.da_kiem_tra AS is_reviewed, 
                   v.trang_thai_duyet AS review_status,
                   v.nguoi_duyet AS reviewed_by, 
                   v.thoi_gian_duyet AS reviewed_at, 
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code
            FROM ViPhamGiamSat v
            JOIN PhienLamBai s ON v.ma_phien = s.ma_phien
            JOIN NguoiDung u ON v.ma_sinh_vien = u.ma_nguoi_dung
            {where_sql}
            ORDER BY v.thoi_gian_phat_hien DESC
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
            UPDATE ViPhamGiamSat 
            SET da_kiem_tra = 1, trang_thai_duyet = ?, nguoi_duyet = ?, thoi_gian_duyet = GETDATE()
            OUTPUT inserted.ma_vi_pham, inserted.ma_phien, inserted.ma_sinh_vien, inserted.loai_vi_pham,
                   inserted.muc_do_nghiem_trong, inserted.mo_ta, inserted.link_anh_bang_chung, inserted.thoi_gian_phat_hien,
                   inserted.da_kiem_tra, inserted.trang_thai_duyet, inserted.nguoi_duyet, inserted.thoi_gian_duyet
            WHERE ma_vi_pham = ?
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
