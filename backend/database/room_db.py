from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict, Any

def _resolve_template_id(cursor, template_id: Optional[Any]) -> Optional[int]:
    """Chuyển đổi template_id (int hoặc code như 'TPL-LAB-01' hoặc 'DE_LAB_01') sang ma_de_thi INT trong BoDeMau"""
    if not template_id or str(template_id).lower() in ("none", "null", "undefined", "0"):
        return None
    try:
        val_int = int(template_id)
        cursor.execute("SELECT ma_de_thi FROM BoDeMau WHERE ma_de_thi = ?", (val_int,))
        row = cursor.fetchone()
        if row:
            return row[0]
    except (ValueError, TypeError):
        pass

    cursor.execute("SELECT ma_de_thi FROM BoDeMau WHERE ma_de = ?", (str(template_id).strip(),))
    row = cursor.fetchone()
    if row:
        return row[0]
    return None

def get_room_by_id(room_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.ma_phong AS room_id, 
                   p.ma_phong_code AS room_code, 
                   p.tieu_de AS room_name, 
                   p.loai_phong AS room_type, 
                   p.nguoi_tao AS instructor_id, 
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time, 
                   p.gio_ket_thuc AS end_time, 
                   p.thoi_luong_phut AS duration_minutes, 
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active, 
                   p.mat_ma_phong AS passcode, 
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   gv.ho_va_ten AS instructor_name,
                   p.ma_de_mau AS template_id,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM SinhVienLopHoc svl 
                       WHERE svl.ma_lop = p.ma_lop
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.ma_sinh_vien) 
                       FROM PhienLamBai pl 
                       WHERE pl.ma_phong = p.ma_phong 
                         AND pl.trang_thai IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ViPhamGiamSat vp 
                       WHERE vp.ma_phong = p.ma_phong 
                         AND (vp.trang_thai_duyet = 'pending' OR vp.trang_thai_duyet IS NULL)
                   ), 0) AS pending_violations,
                   p.ngay_tao AS created_at, 
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN NguoiDung gv ON p.nguoi_tao = gv.ma_nguoi_dung
            WHERE p.ma_phong = ?
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
            SELECT p.ma_phong AS room_id, 
                   p.ma_phong_code AS room_code, 
                   p.tieu_de AS room_name, 
                   p.loai_phong AS room_type, 
                   p.nguoi_tao AS instructor_id, 
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time, 
                   p.gio_ket_thuc AS end_time, 
                   p.thoi_luong_phut AS duration_minutes, 
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active, 
                   p.mat_ma_phong AS passcode, 
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   gv.ho_va_ten AS instructor_name,
                   p.ma_de_mau AS template_id,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM SinhVienLopHoc svl 
                       WHERE svl.ma_lop = p.ma_lop
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.ma_sinh_vien) 
                       FROM PhienLamBai pl 
                       WHERE pl.ma_phong = p.ma_phong 
                         AND pl.trang_thai IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ViPhamGiamSat vp 
                       WHERE vp.ma_phong = p.ma_phong 
                         AND (vp.trang_thai_duyet = 'pending' OR vp.trang_thai_duyet IS NULL)
                   ), 0) AS pending_violations,
                   p.ngay_tao AS created_at, 
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN NguoiDung gv ON p.nguoi_tao = gv.ma_nguoi_dung
            WHERE p.ma_phong_code = ?
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
        where = ["p.nguoi_tao = ?"]
        params = [instructor_id]
        if room_type:
            where.append("p.loai_phong = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT p.ma_phong AS room_id, 
                   p.ma_phong_code AS room_code, 
                   p.tieu_de AS room_name, 
                   p.loai_phong AS room_type, 
                   p.nguoi_tao AS instructor_id, 
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time, 
                   p.gio_ket_thuc AS end_time, 
                   p.thoi_luong_phut AS duration_minutes, 
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active, 
                   p.mat_ma_phong AS passcode, 
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   gv.ho_va_ten AS instructor_name,
                   p.ma_de_mau AS template_id,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM SinhVienLopHoc svl 
                       WHERE svl.ma_lop = p.ma_lop
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.ma_sinh_vien) 
                       FROM PhienLamBai pl 
                       WHERE pl.ma_phong = p.ma_phong 
                         AND pl.trang_thai IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ViPhamGiamSat vp 
                       WHERE vp.ma_phong = p.ma_phong 
                         AND (vp.trang_thai_duyet = 'pending' OR vp.trang_thai_duyet IS NULL)
                   ), 0) AS pending_violations,
                   p.ngay_tao AS created_at, 
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN NguoiDung gv ON p.nguoi_tao = gv.ma_nguoi_dung
            {where_sql}
            ORDER BY p.ngay_tao DESC
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
        where_sql = "WHERE p.loai_phong = ?" if room_type else ""
        params = [room_type] if room_type else []
        cursor.execute(f"""
            SELECT p.ma_phong AS room_id, 
                   p.ma_phong_code AS room_code, 
                   p.tieu_de AS room_name, 
                   p.loai_phong AS room_type, 
                   p.nguoi_tao AS instructor_id, 
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time, 
                   p.gio_ket_thuc AS end_time, 
                   p.thoi_luong_phut AS duration_minutes, 
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active, 
                   p.mat_ma_phong AS passcode, 
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   gv.ho_va_ten AS instructor_name,
                   p.ma_de_mau AS template_id,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM SinhVienLopHoc svl 
                       WHERE svl.ma_lop = p.ma_lop
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.ma_sinh_vien) 
                       FROM PhienLamBai pl 
                       WHERE pl.ma_phong = p.ma_phong 
                         AND pl.trang_thai IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ViPhamGiamSat vp 
                       WHERE vp.ma_phong = p.ma_phong 
                         AND (vp.trang_thai_duyet = 'pending' OR vp.trang_thai_duyet IS NULL)
                   ), 0) AS pending_violations,
                   p.ngay_tao AS created_at, 
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN NguoiDung gv ON p.nguoi_tao = gv.ma_nguoi_dung
            {where_sql}
            ORDER BY p.ngay_tao DESC
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

def get_rooms_for_student(student_id: int, skip: int = 0, limit: int = 100, room_type: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_clauses = [
            """(
                p.ma_lop IS NULL
                OR EXISTS (SELECT 1 FROM SinhVienLopHoc svl WHERE svl.ma_lop = p.ma_lop AND svl.ma_sinh_vien = ?)
                OR EXISTS (SELECT 1 FROM PhienLamBai pl WHERE pl.ma_phong = p.ma_phong AND pl.ma_sinh_vien = ?)
                OR EXISTS (SELECT 1 FROM BaiNop bn WHERE bn.ma_phong = p.ma_phong AND bn.ma_sinh_vien = ?)
                OR NOT EXISTS (SELECT 1 FROM SinhVienLopHoc svl_any WHERE svl_any.ma_sinh_vien = ?)
            )"""
        ]
        params: List[Any] = [student_id, student_id, student_id, student_id, student_id, student_id]
        if room_type:
            where_clauses.append("p.loai_phong = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where_clauses)}"

        cursor.execute(f"""
            SELECT p.ma_phong AS room_id, 
                   p.ma_phong_code AS room_code, 
                   p.tieu_de AS room_name, 
                   p.loai_phong AS room_type, 
                   p.nguoi_tao AS instructor_id, 
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time, 
                   p.gio_ket_thuc AS end_time, 
                   p.thoi_luong_phut AS duration_minutes, 
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active, 
                   p.mat_ma_phong AS passcode, 
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   gv.ho_va_ten AS instructor_name,
                   p.ma_de_mau AS template_id,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM SinhVienLopHoc svl 
                       WHERE svl.ma_lop = p.ma_lop
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.ma_sinh_vien) 
                       FROM PhienLamBai pl 
                       WHERE pl.ma_phong = p.ma_phong 
                         AND pl.trang_thai IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ViPhamGiamSat vp 
                       WHERE vp.ma_phong = p.ma_phong 
                         AND (vp.trang_thai_duyet = 'pending' OR vp.trang_thai_duyet IS NULL)
                   ), 0) AS pending_violations,
                   (
                       SELECT TOP 1 pl_sv.trang_thai
                       FROM PhienLamBai pl_sv
                       WHERE pl_sv.ma_phong = p.ma_phong AND pl_sv.ma_sinh_vien = ?
                       ORDER BY pl_sv.ma_phien DESC
                   ) AS student_session_status,
                   COALESCE((
                       SELECT COUNT(*)
                       FROM BaiNop bn_sv
                       WHERE bn_sv.ma_phong = p.ma_phong AND bn_sv.ma_sinh_vien = ?
                   ), 0) AS student_submissions_count,
                   p.ngay_tao AS created_at, 
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN NguoiDung gv ON p.nguoi_tao = gv.ma_nguoi_dung
            {where_sql}
            ORDER BY p.gio_bat_dau DESC, p.ngay_tao DESC
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
    livekit_room_name: Optional[str] = None,
    class_id: Optional[Any] = None,
    template_id: Optional[Any] = None,
    proctoring_config: Optional[str] = None,
    status: str = 'chua_mo'
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        from database.classes_db import _resolve_class_id
        real_class_id = _resolve_class_id(cursor, class_id) if class_id else None
        real_template_id = _resolve_template_id(cursor, template_id) if template_id else None

        cursor.execute("""
            INSERT INTO Phong (
                ma_phong_code, tieu_de, loai_phong, nguoi_tao, mo_ta,
                gio_bat_dau, gio_ket_thuc, thoi_luong_phut, so_lan_nop_toi_da,
                mat_ma_phong, ma_dinh_danh_livekit, ma_lop, ma_de_mau, cau_hinh_giam_sat, trang_thai
            )
            OUTPUT inserted.ma_phong, inserted.ma_phong_code, inserted.tieu_de, inserted.loai_phong,
                   inserted.nguoi_tao, inserted.mo_ta, inserted.gio_bat_dau, inserted.gio_ket_thuc,
                   inserted.thoi_luong_phut, inserted.so_lan_nop_toi_da, inserted.dang_hoat_dong, inserted.mat_ma_phong,
                   inserted.ma_dinh_danh_livekit, inserted.ma_lop, inserted.ma_de_mau, inserted.cau_hinh_giam_sat, inserted.trang_thai,
                   inserted.ngay_tao, inserted.ngay_cap_nhat
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            room_code, room_name, room_type, instructor_id, description,
            start_time, end_time, duration_minutes, max_attempts,
            passcode, livekit_room_name, real_class_id, real_template_id, proctoring_config, status
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            created_room_id = row[0]
            return get_room_by_id(created_room_id)
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
            "livekit_room_name": "ma_dinh_danh_livekit",
            "class_id": "ma_lop",
            "template_id": "ma_de_mau",
            "proctoring_config": "cau_hinh_giam_sat",
            "status": "trang_thai"
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

def get_exam_templates(instructor_id: Optional[int] = None, room_type: Optional[str] = None) -> List[Dict]:
    """Lấy danh sách các bộ đề mẫu có trong CSDL (BoDeMau)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = []
        params = []
        if instructor_id:
            where.append("(nguoi_tao = ? OR nguoi_tao IS NULL)")
            params.append(instructor_id)
        if room_type:
            where.append("loai_de = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cursor.execute(f"""
            SELECT b.ma_de_thi AS id,
                   b.ma_de AS code,
                   b.tieu_de AS title,
                   b.loai_de AS type,
                   b.tong_thoi_gian_phut AS duration_minutes,
                   b.tong_diem AS total_points,
                   b.nguoi_tao AS creator_id,
                   b.ngay_tao AS created_at,
                   (SELECT COUNT(1) FROM CauHoiTrongDe ch WHERE ch.ma_de_thi = b.ma_de_thi) AS question_count
            FROM BoDeMau b
            {where_sql}
            ORDER BY b.ngay_tao DESC
        """, tuple(params))
        rows = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_room_lobby_details(room_identifier: str) -> Optional[Dict]:
    """
    Lấy thông tin chi tiết phòng chờ (Lobby) bao gồm:
    - Cấu hình phòng, mã PIN, thời gian, cài đặt giám sát AI.
    - Lớp học phần được gán (nếu có).
    - Bộ đề mẫu được gán (nếu có).
    - Danh sách sinh viên thực tế thuộc lớp học kèm trạng thái vào phòng (waiting/absent) từ PhienLamBai.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.ma_phong AS room_id,
                   p.ma_phong_code AS room_code,
                   p.tieu_de AS room_name,
                   p.loai_phong AS room_type,
                   p.nguoi_tao AS instructor_id,
                   p.mo_ta AS description,
                   p.gio_bat_dau AS start_time,
                   p.gio_ket_thuc AS end_time,
                   p.thoi_luong_phut AS duration_minutes,
                   p.so_lan_nop_toi_da AS max_attempts,
                   p.dang_hoat_dong AS is_active,
                   p.mat_ma_phong AS passcode,
                   p.ma_dinh_danh_livekit AS livekit_room_name,
                   p.ma_lop AS class_id,
                   lh.ma_lop_hoc AS class_code,
                   lh.ten_lop AS class_name,
                   lh.ma_mon_hoc AS course_name,
                   p.ma_de_mau AS template_id,
                   bd.tieu_de AS template_title,
                   bd.ma_de AS template_code,
                   p.cau_hinh_giam_sat AS proctoring_config,
                   p.trang_thai AS status,
                   p.ngay_tao AS created_at,
                   p.ngay_cap_nhat AS updated_at
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            LEFT JOIN BoDeMau bd ON p.ma_de_mau = bd.ma_de_thi
            WHERE p.ma_phong_code = ? OR CAST(p.ma_phong AS NVARCHAR(50)) = ?
        """, (room_identifier, room_identifier))
        row = cursor.fetchone()
        if not row:
            return None
        columns = [col[0] for col in cursor.description]
        room_data = dict(zip(columns, row))
        room_data["is_active"] = bool(room_data["is_active"])

        # Lấy danh sách sinh viên thực tế thuộc lớp
        attendees = []
        real_class_id = room_data.get("class_id")
        room_id = room_data["room_id"]

        if real_class_id:
            cursor.execute("""
                SELECT COALESCE(u.ma_dinh_danh, CAST(u.ma_nguoi_dung AS NVARCHAR(50))) AS student_id,
                       u.ma_nguoi_dung AS user_id,
                       u.ho_va_ten AS student_name,
                       u.email AS student_email,
                       CASE 
                           WHEN pl.trang_thai IN ('active', 'dang_lam') THEN 'waiting'
                           WHEN pl.trang_thai IN ('completed', 'da_nop') THEN 'completed'
                           ELSE 'absent'
                       END AS status,
                       CONVERT(NVARCHAR(30), pl.thoi_gian_bat_dau, 126) AS joined_at,
                       pl.thong_tin_trinh_duyet AS device,
                       COALESCE(kt.trang_thai_camera, 0) AS camera_ready
                FROM SinhVienLopHoc svl
                JOIN NguoiDung u ON svl.ma_sinh_vien = u.ma_nguoi_dung
                LEFT JOIN PhienLamBai pl ON pl.ma_phong = ? AND pl.ma_sinh_vien = u.ma_nguoi_dung
                LEFT JOIN (
                    SELECT ma_phien, ma_sinh_vien, MAX(CAST(trang_thai_camera AS INT)) AS trang_thai_camera
                    FROM KiemTraThietBi
                    GROUP BY ma_phien, ma_sinh_vien
                ) kt ON kt.ma_phien = pl.ma_phien AND kt.ma_sinh_vien = u.ma_nguoi_dung
                WHERE svl.ma_lop = ?
                ORDER BY u.ho_va_ten ASC
            """, (room_id, real_class_id))
            att_rows = cursor.fetchall()
            att_cols = [col[0] for col in cursor.description]
            for a_row in att_rows:
                a_dict = dict(zip(att_cols, a_row))
                a_dict["camera_ready"] = bool(a_dict.get("camera_ready", False))
                attendees.append(a_dict)
        else:
            # Nếu phòng không gắn mã lớp cụ thể, lấy những sinh viên đã từng tham gia
            cursor.execute("""
                SELECT COALESCE(u.ma_dinh_danh, CAST(u.ma_nguoi_dung AS NVARCHAR(50))) AS student_id,
                       u.ma_nguoi_dung AS user_id,
                       u.ho_va_ten AS student_name,
                       u.email AS student_email,
                       CASE 
                           WHEN pl.trang_thai IN ('active', 'dang_lam') THEN 'waiting'
                           WHEN pl.trang_thai IN ('completed', 'da_nop') THEN 'completed'
                           ELSE 'absent'
                       END AS status,
                       CONVERT(NVARCHAR(30), pl.thoi_gian_bat_dau, 126) AS joined_at,
                       pl.thong_tin_trinh_duyet AS device,
                       COALESCE(kt.trang_thai_camera, 0) AS camera_ready
                FROM PhienLamBai pl
                JOIN NguoiDung u ON pl.ma_sinh_vien = u.ma_nguoi_dung
                LEFT JOIN (
                    SELECT ma_phien, ma_sinh_vien, MAX(CAST(trang_thai_camera AS INT)) AS trang_thai_camera
                    FROM KiemTraThietBi
                    GROUP BY ma_phien, ma_sinh_vien
                ) kt ON kt.ma_phien = pl.ma_phien AND kt.ma_sinh_vien = u.ma_nguoi_dung
                WHERE pl.ma_phong = ?
                ORDER BY u.ho_va_ten ASC
            """, (room_id,))
            att_rows = cursor.fetchall()
            att_cols = [col[0] for col in cursor.description]
            for a_row in att_rows:
                a_dict = dict(zip(att_cols, a_row))
                a_dict["camera_ready"] = bool(a_dict.get("camera_ready", False))
                attendees.append(a_dict)

        room_data["attendees"] = attendees
        return room_data
    finally:
        cursor.close()
        conn.close()

def check_instructor_active_room(instructor_id: int, current_room_id: int) -> Optional[Dict]:
    """Kiểm tra xem giảng viên hiện có phòng nào khác đang ở trạng thái 'dang_dien_ra' không"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.ma_phong AS room_id,
                   p.ma_phong_code AS room_code,
                   p.tieu_de AS room_name,
                   lh.ten_lop AS class_name,
                   CONVERT(NVARCHAR(30), p.gio_bat_dau, 126) AS start_time,
                   CONVERT(NVARCHAR(30), p.gio_ket_thuc, 126) AS end_time,
                   p.trang_thai AS status
            FROM Phong p
            LEFT JOIN LopHoc lh ON p.ma_lop = lh.ma_lop
            WHERE p.nguoi_tao = ? AND p.ma_phong != ? AND p.trang_thai = 'dang_dien_ra'
        """, (instructor_id, current_room_id))
        row = cursor.fetchone()
        if row:
            columns = [col[0] for col in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def update_room_status(
    room_id: int,
    status: str,
    instructor_id: Optional[int] = None,
    force_close_conflicts: bool = False
) -> Dict:
    """Cập nhật trạng thái phòng (chua_mo, dang_dien_ra, da_dong, da_huy)"""
    status_map = {
        "waiting": "chua_mo",
        "in_progress": "dang_dien_ra",
        "ended": "da_dong",
        "closed": "da_dong",
        "cancelled": "da_huy",
        "chua_mo": "chua_mo",
        "dang_dien_ra": "dang_dien_ra",
        "da_dong": "da_dong",
        "da_huy": "da_huy"
    }
    db_status = status_map.get(status.lower(), status)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if db_status == "dang_dien_ra" and force_close_conflicts and instructor_id:
            cursor.execute("""
                UPDATE Phong 
                SET trang_thai = 'da_dong', ngay_cap_nhat = GETDATE()
                WHERE nguoi_tao = ? AND trang_thai = 'dang_dien_ra' AND ma_phong != ?
            """, (instructor_id, room_id))

        cursor.execute("""
            UPDATE Phong 
            SET trang_thai = ?, ngay_cap_nhat = GETDATE()
            WHERE ma_phong = ?
        """, (db_status, room_id))
        conn.commit()
        return get_room_by_id(room_id)
    finally:
        cursor.close()
        conn.close()

def toggle_manual_attendance(room_id: int, student_id: Any, status: str) -> bool:
    """Giảng viên điểm danh thủ công sinh viên trong phòng chờ (waiting hoặc absent)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        user_id = None
        try:
            val_int = int(student_id)
            cursor.execute("SELECT ma_nguoi_dung FROM NguoiDung WHERE ma_nguoi_dung = ?", (val_int,))
            row = cursor.fetchone()
            if row:
                user_id = row[0]
        except (ValueError, TypeError):
            pass

        if not user_id:
            cursor.execute("SELECT ma_nguoi_dung FROM NguoiDung WHERE ma_dinh_danh = ? OR ten_dang_nhap = ?", (str(student_id), str(student_id)))
            row = cursor.fetchone()
            if row:
                user_id = row[0]

        if not user_id:
            return False

        if status == "waiting":
            cursor.execute("SELECT ma_phien FROM PhienLamBai WHERE ma_phong = ? AND ma_sinh_vien = ?", (room_id, user_id))
            p_row = cursor.fetchone()
            if not p_row:
                cursor.execute("""
                    INSERT INTO PhienLamBai (ma_phong, ma_sinh_vien, trang_thai, thoi_gian_bat_dau)
                    VALUES (?, ?, 'dang_lam', GETDATE())
                """, (room_id, user_id))
            else:
                cursor.execute("""
                    UPDATE PhienLamBai SET trang_thai = 'dang_lam', thoi_gian_bat_dau = GETDATE()
                    WHERE ma_phien = ?
                """, (p_row[0],))
            conn.commit()
            return True
        else:
            cursor.execute("DELETE FROM PhienLamBai WHERE ma_phong = ? AND ma_sinh_vien = ?", (room_id, user_id))
            conn.commit()
            return True
    finally:
        cursor.close()
        conn.close()

def delete_room(room_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM ViPhamGiamSat WHERE ma_phong = ?", (room_id,))
        cursor.execute("DELETE FROM KiemTraThietBi WHERE ma_phien IN (SELECT ma_phien FROM PhienLamBai WHERE ma_phong = ?)", (room_id,))
        cursor.execute("DELETE FROM Snapshots WHERE ma_phien IN (SELECT ma_phien FROM PhienLamBai WHERE ma_phong = ?)", (room_id,))
        cursor.execute("DELETE FROM BanNhapCode WHERE ma_phien IN (SELECT ma_phien FROM PhienLamBai WHERE ma_phong = ?)", (room_id,))
        cursor.execute("DELETE FROM YeuCauTroGiup WHERE ma_phien IN (SELECT ma_phien FROM PhienLamBai WHERE ma_phong = ?)", (room_id,))
        cursor.execute("DELETE FROM BaiNop WHERE ma_phong = ?", (room_id,))
        cursor.execute("DELETE FROM PhienLamBai WHERE ma_phong = ?", (room_id,))
        cursor.execute("DELETE FROM CauHoi WHERE ma_phong = ?", (room_id,))
        cursor.execute("DELETE FROM CanBoPhuTrachPhong WHERE ma_phong = ?", (room_id,))
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


def is_student_in_class(class_id: int, student_id: int) -> bool:
    """Kiểm tra sinh viên có nằm trong danh sách lớp học phần hay không"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT 1 FROM SinhVienLopHoc WHERE ma_lop = ? AND ma_sinh_vien = ?",
            (class_id, student_id),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()


def get_class_metadata(class_id: int) -> Optional[Dict]:
    """Lấy thông tin mã lớp, tên lớp, mã môn học từ LopHoc"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT ma_lop_hoc AS class_code, ten_lop AS class_name, ma_mon_hoc AS course_name FROM LopHoc WHERE ma_lop = ?",
            (class_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
        conn.close()


def upsert_student_lobby_session(
    room_id: int,
    student_id: int,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> int:
    """Tạo hoặc kích hoạt lại phiên làm bài (PhienLamBai) ở trạng thái dang_lam khi sinh viên join phòng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT TOP 1 ma_phien, trang_thai FROM PhienLamBai WHERE ma_phong = ? AND ma_sinh_vien = ? ORDER BY ma_phien DESC",
            (room_id, student_id),
        )
        row = cursor.fetchone()
        ua_trimmed = (user_agent or "")[:250] or None
        if row:
            session_id = row[0]
            if row[1] not in ("completed", "da_nop"):
                cursor.execute(
                    """
                    UPDATE PhienLamBai
                    SET trang_thai = 'dang_lam',
                        dia_chi_ip = COALESCE(?, dia_chi_ip),
                        thong_tin_trinh_duyet = COALESCE(?, thong_tin_trinh_duyet)
                    WHERE ma_phien = ?
                    """,
                    (ip_address, ua_trimmed, session_id),
                )
                conn.commit()
            return session_id

        cursor.execute(
            """
            INSERT INTO PhienLamBai (ma_phong, ma_sinh_vien, dia_chi_ip, thong_tin_trinh_duyet, trang_thai, thoi_gian_bat_dau)
            OUTPUT INSERTED.ma_phien
            VALUES (?, ?, ?, ?, 'dang_lam', GETDATE())
            """,
            (room_id, student_id, ip_address, ua_trimmed),
        )
        new_id = cursor.fetchone()[0]
        conn.commit()
        return new_id
    finally:
        cursor.close()
        conn.close()


def save_student_device_check(
    room_id: int,
    student_id: int,
    camera_ready: bool,
    mic_ready: bool,
    network_latency_ms: int = 25,
    os_info: Optional[str] = None,
    browser_info: Optional[str] = None,
) -> Dict:
    """Lưu trạng thái kiểm tra Camera/Mic của sinh viên vào bảng KiemTraThietBi"""
    session_id = upsert_student_lobby_session(room_id, student_id, user_agent=browser_info)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        du_dieu_kien = 1 if (camera_ready and mic_ready) else 0
        cam_bit = 1 if camera_ready else 0
        mic_bit = 1 if mic_ready else 0

        cursor.execute(
            "SELECT TOP 1 ma_kiem_tra FROM KiemTraThietBi WHERE ma_phien = ? AND ma_sinh_vien = ?",
            (session_id, student_id),
        )
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                """
                UPDATE KiemTraThietBi
                SET trang_thai_camera = ?,
                    trang_thai_micro = ?,
                    do_tre_mang_ms = ?,
                    thong_tin_he_dieu_hanh = COALESCE(?, thong_tin_he_dieu_hanh),
                    thong_tin_trinh_duyet = COALESCE(?, thong_tin_trinh_duyet),
                    du_dieu_kien_thi = ?,
                    thoi_gian_kiem_tra = GETDATE()
                WHERE ma_kiem_tra = ?
                """,
                (cam_bit, mic_bit, network_latency_ms, os_info, browser_info, du_dieu_kien, existing[0]),
            )
        else:
            cursor.execute(
                """
                INSERT INTO KiemTraThietBi (
                    ma_phien, ma_sinh_vien, trang_thai_camera, trang_thai_micro,
                    do_tre_mang_ms, thong_tin_he_dieu_hanh, thong_tin_trinh_duyet,
                    du_dieu_kien_thi, thoi_gian_kiem_tra
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
                """,
                (session_id, student_id, cam_bit, mic_bit, network_latency_ms, os_info, browser_info, du_dieu_kien),
            )
        conn.commit()
        return {
            "success": True,
            "session_id": session_id,
            "camera_ready": camera_ready,
            "mic_ready": mic_ready,
            "eligible": bool(du_dieu_kien),
        }
    finally:
        cursor.close()
        conn.close()

