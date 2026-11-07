from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_room_by_id(room_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_phong AS room_id, 
                   ma_phong_code AS room_code, 
                   tieu_de AS room_name, 
                   loai_phong AS room_type, 
                   nguoi_tao AS instructor_id, 
                   mo_ta AS description,
                   gio_bat_dau AS start_time, 
                   gio_ket_thuc AS end_time, 
                   thoi_luong_phut AS duration_minutes, 
                   so_lan_nop_toi_da AS max_attempts,
                   dang_hoat_dong AS is_active, 
                   mat_ma_phong AS passcode, 
                   ma_dinh_danh_livekit AS livekit_room_name, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM Phong 
            WHERE ma_phong = ?
        """, (room_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            res = dict(zip(columns, row))
            res["is_active"] = bool(res["is_active"])
            return res
        return None
    finally:
        cursor.close()
        conn.close()

def get_room_by_code(room_code: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_phong AS room_id, 
                   ma_phong_code AS room_code, 
                   tieu_de AS room_name, 
                   loai_phong AS room_type, 
                   nguoi_tao AS instructor_id, 
                   mo_ta AS description,
                   gio_bat_dau AS start_time, 
                   gio_ket_thuc AS end_time, 
                   thoi_luong_phut AS duration_minutes, 
                   so_lan_nop_toi_da AS max_attempts,
                   dang_hoat_dong AS is_active, 
                   mat_ma_phong AS passcode, 
                   ma_dinh_danh_livekit AS livekit_room_name, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM Phong 
            WHERE ma_phong_code = ?
        """, (room_code,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            res = dict(zip(columns, row))
            res["is_active"] = bool(res["is_active"])
            return res
        return None
    finally:
        cursor.close()
        conn.close()

def get_rooms_by_instructor(instructor_id: int, skip: int = 0, limit: int = 100, room_type: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["nguoi_tao = ?"]
        params = [instructor_id]
        if room_type:
            where.append("loai_phong = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT ma_phong AS room_id, 
                   ma_phong_code AS room_code, 
                   tieu_de AS room_name, 
                   loai_phong AS room_type, 
                   nguoi_tao AS instructor_id, 
                   mo_ta AS description,
                   gio_bat_dau AS start_time, 
                   gio_ket_thuc AS end_time, 
                   thoi_luong_phut AS duration_minutes, 
                   so_lan_nop_toi_da AS max_attempts,
                   dang_hoat_dong AS is_active, 
                   mat_ma_phong AS passcode, 
                   ma_dinh_danh_livekit AS livekit_room_name, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM Phong 
            {where_sql}
            ORDER BY ngay_tao DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_active"] = bool(r["is_active"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def get_all_rooms(skip: int = 0, limit: int = 100, room_type: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_sql = "WHERE loai_phong = ?" if room_type else ""
        params = [room_type] if room_type else []
        cursor.execute(f"""
            SELECT ma_phong AS room_id, 
                   ma_phong_code AS room_code, 
                   tieu_de AS room_name, 
                   loai_phong AS room_type, 
                   nguoi_tao AS instructor_id, 
                   mo_ta AS description,
                   gio_bat_dau AS start_time, 
                   gio_ket_thuc AS end_time, 
                   thoi_luong_phut AS duration_minutes, 
                   so_lan_nop_toi_da AS max_attempts,
                   dang_hoat_dong AS is_active, 
                   mat_ma_phong AS passcode, 
                   ma_dinh_danh_livekit AS livekit_room_name, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM Phong 
            {where_sql}
            ORDER BY ngay_tao DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_active"] = bool(r["is_active"])
            results.append(r)
        return results
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
            INSERT INTO Phong (
                ma_phong_code, tieu_de, loai_phong, nguoi_tao, mo_ta,
                gio_bat_dau, gio_ket_thuc, thoi_luong_phut, so_lan_nop_toi_da,
                mat_ma_phong, ma_dinh_danh_livekit
            )
            OUTPUT inserted.ma_phong, inserted.ma_phong_code, inserted.tieu_de, inserted.loai_phong,
                   inserted.nguoi_tao, inserted.mo_ta, inserted.gio_bat_dau, inserted.gio_ket_thuc,
                   inserted.thoi_luong_phut, inserted.so_lan_nop_toi_da, inserted.dang_hoat_dong, inserted.mat_ma_phong,
                   inserted.ma_dinh_danh_livekit, inserted.ngay_tao, inserted.ngay_cap_nhat
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            room_code, room_name, room_type, instructor_id, description,
            start_time, end_time, duration_minutes, max_attempts,
            passcode, livekit_room_name
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "room_id": row[0],
                "room_code": row[1],
                "room_name": row[2],
                "room_type": row[3],
                "instructor_id": row[4],
                "description": row[5],
                "start_time": row[6],
                "end_time": row[7],
                "duration_minutes": row[8],
                "max_attempts": row[9],
                "is_active": bool(row[10]),
                "passcode": row[11],
                "livekit_room_name": row[12],
                "created_at": row[13],
                "updated_at": row[14]
            }
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
        mapping = {
            "room_name": "tieu_de",
            "room_type": "loai_phong",
            "description": "mo_ta",
            "start_time": "gio_bat_dau",
            "end_time": "gio_ket_thuc",
            "duration_minutes": "thoi_luong_phut",
            "max_attempts": "so_lan_nop_toi_da",
            "is_active": "dang_hoat_dong",
            "passcode": "mat_ma_phong",
            "livekit_room_name": "ma_dinh_danh_livekit"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
                params.append(1 if key == "is_active" and value else (0 if key == "is_active" else value))
        if not fields:
            return get_room_by_id(room_id)
        params.append(room_id)
        cursor.execute(f"UPDATE Phong SET {', '.join(fields)}, ngay_cap_nhat = GETDATE() WHERE ma_phong = ?", tuple(params))
        conn.commit()
        return get_room_by_id(room_id)
    finally:
        cursor.close()
        conn.close()

def delete_room(room_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Phong WHERE ma_phong = ?", (room_id,))
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
                s.ma_phien AS session_id,
                s.ma_sinh_vien AS student_id,
                u.ho_va_ten AS student_name,
                u.ten_dang_nhap AS username,
                u.ma_dinh_danh AS student_code,
                s.trang_thai AS status,
                s.thoi_gian_bat_dau AS started_at,
                COALESCE(DATEDIFF(MINUTE, s.thoi_gian_bat_dau, GETDATE()), 0) AS duration_minutes,
                COALESCE(v_stat.violation_count, 0) AS violation_count,
                COALESCE(v_stat.pending_violation_count, 0) AS pending_violation_count,
                COALESCE(v_stat.confirmed_violation_count, 0) AS confirmed_violation_count,
                v_stat.last_snapshot_url
            FROM PhienLamBai s
            JOIN NguoiDung u ON s.ma_sinh_vien = u.ma_nguoi_dung
            LEFT JOIN (
                SELECT 
                    ma_phien,
                    COUNT(CASE WHEN trang_thai_duyet != 'rejected' THEN 1 END) AS violation_count,
                    COUNT(CASE WHEN trang_thai_duyet = 'pending' THEN 1 END) AS pending_violation_count,
                    COUNT(CASE WHEN trang_thai_duyet = 'confirmed' THEN 1 END) AS confirmed_violation_count,
                    MAX(link_anh_bang_chung) AS last_snapshot_url
                FROM ViPhamGiamSat
                GROUP BY ma_phien
            ) v_stat ON s.ma_phien = v_stat.ma_phien
            WHERE s.ma_phong = ?
            ORDER BY s.thoi_gian_bat_dau DESC
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
                (SELECT COUNT(*) FROM Phong WHERE dang_hoat_dong = 1) AS active_rooms_count,
                (SELECT COUNT(*) FROM NguoiDung) AS total_users_count,
                (SELECT COUNT(*) FROM PhienLamBai WHERE trang_thai IN ('active', 'dang_lam')) AS active_sessions_count,
                (SELECT COUNT(*) FROM BaiNop WHERE CAST(thoi_gian_nop AS DATE) = CAST(GETDATE() AS DATE)) AS today_submissions_count,
                (SELECT COUNT(*) FROM ViPhamGiamSat WHERE CAST(thoi_gian_phat_hien AS DATE) = CAST(GETDATE() AS DATE)) AS today_violations_count
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
