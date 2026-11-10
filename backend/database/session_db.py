from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_session_by_id(session_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_phien AS session_id, 
                   ma_phong AS room_id, 
                   ma_sinh_vien AS student_id, 
                   thoi_gian_bat_dau AS started_at, 
                   COALESCE(thoi_gian_ket_thuc, thoi_gian_nop_bai) AS ended_at,
                   dia_chi_ip AS ip_address, 
                   thong_tin_trinh_duyet AS user_agent, 
                   ma_van_tay_trinh_duyet AS browser_fingerprint, 
                   trang_thai AS status
            FROM PhienLamBai 
            WHERE ma_phien = ?
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
        where_sql = "WHERE ma_phong = ? AND trang_thai IN ('active', 'dang_lam')" if active_only else "WHERE ma_phong = ?"
        cursor.execute(f"""
            SELECT ma_phien AS session_id, 
                   ma_phong AS room_id, 
                   ma_sinh_vien AS student_id, 
                   thoi_gian_bat_dau AS started_at, 
                   COALESCE(thoi_gian_ket_thuc, thoi_gian_nop_bai) AS ended_at,
                   dia_chi_ip AS ip_address, 
                   thong_tin_trinh_duyet AS user_agent, 
                   ma_van_tay_trinh_duyet AS browser_fingerprint, 
                   trang_thai AS status
            FROM PhienLamBai 
            {where_sql}
            ORDER BY thoi_gian_bat_dau DESC
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
        where = ["ma_sinh_vien = ?"]
        params = [student_id]
        if room_id:
            where.append("ma_phong = ?")
            params.append(room_id)
        if active_only:
            where.append("trang_thai IN ('active', 'dang_lam')")
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT ma_phien AS session_id, 
                   ma_phong AS room_id, 
                   ma_sinh_vien AS student_id, 
                   thoi_gian_bat_dau AS started_at, 
                   COALESCE(thoi_gian_ket_thuc, thoi_gian_nop_bai) AS ended_at,
                   dia_chi_ip AS ip_address, 
                   thong_tin_trinh_duyet AS user_agent, 
                   ma_van_tay_trinh_duyet AS browser_fingerprint, 
                   trang_thai AS status
            FROM PhienLamBai 
            {where_sql}
            ORDER BY thoi_gian_bat_dau DESC
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
    browser_fingerprint: Optional[str] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO PhienLamBai (ma_phong, ma_sinh_vien, dia_chi_ip, thong_tin_trinh_duyet, ma_van_tay_trinh_duyet, trang_thai)
            OUTPUT inserted.ma_phien, inserted.ma_phong, inserted.ma_sinh_vien, 
                   inserted.thoi_gian_bat_dau, inserted.thoi_gian_ket_thuc, inserted.dia_chi_ip, 
                   inserted.thong_tin_trinh_duyet, inserted.ma_van_tay_trinh_duyet, inserted.trang_thai
            VALUES (?, ?, ?, ?, ?, 'active')
        """, (room_id, student_id, ip_address, user_agent, browser_fingerprint))
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
        cursor.execute("UPDATE PhienLamBai SET trang_thai = ? WHERE ma_phien = ?", (status, session_id))
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
            UPDATE PhienLamBai 
            SET thoi_gian_ket_thuc = GETDATE(), 
                thoi_gian_nop_bai = GETDATE(), 
                trang_thai = 'completed' 
            WHERE ma_phien = ?
        """, (session_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
