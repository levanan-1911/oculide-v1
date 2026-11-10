from core.config import get_db_connection
from core.security import get_password_hash, verify_password
from datetime import datetime
from typing import Optional, Dict, List, Tuple

# Dữ liệu tài khoản mẫu phát triển (sử dụng khi SQL Server chưa được khởi động)
DEV_MOCK_USERS = [
    {
        "user_id": 1,
        "username": "admin",
        "email": "admin@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Quản Trị Viên Hệ Thống",
        "role": "admin",
        "student_id": "ADM001",
        "user_code": "ADM001",
        "department": "Phòng CNTT & Đào Tạo",
        "academic_rank": None,
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": "127.0.0.1",
        "lop_sinh_hoat": None
    },
    {
        "user_id": 2,
        "username": "instructor",
        "email": "instructor@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Giảng Viên Hướng Dẫn",
        "role": "instructor",
        "student_id": "MSGV001",
        "user_code": "MSGV001",
        "department": "Khoa Công Nghệ Thông Tin",
        "academic_rank": "Thạc sĩ",
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": None,
        "lop_sinh_hoat": None
    },
    {
        "user_id": 3,
        "username": "student",
        "email": "student@school.edu.vn",
        "password_hash": "$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6",
        "full_name": "Sinh Viên Nguyễn Văn A",
        "role": "student",
        "student_id": "SV2026001",
        "user_code": "SV2026001",
        "department": "Khoa Công Nghệ Thông Tin",
        "lop_sinh_hoat": "K28-KTPM1",
        "academic_rank": None,
        "phone_number": None,
        "avatar_url": None,
        "is_active": True,
        "must_change_password": False,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "last_login": None,
        "last_login_ip": None
    }
]

def _parse_user_row(cursor, row) -> Optional[Dict]:
    if not row:
        return None
    columns = [column[0] for column in cursor.description]
    res = dict(zip(columns, row))
    if "is_active" in res:
        res["is_active"] = bool(res["is_active"])
    if "must_change_password" in res:
        res["must_change_password"] = bool(res["must_change_password"])
    return res

USER_SELECT_SQL = """
    SELECT u.ma_nguoi_dung AS user_id, 
           u.ten_dang_nhap AS username, 
           u.mat_khau_hash AS password_hash, 
           u.email, 
           u.ho_va_ten AS full_name, 
           v.ten_vai_tro AS role, 
           u.ma_dinh_danh AS student_id, 
           u.ma_dinh_danh AS user_code,
           u.khoa_bo_mon AS department,
           u.lop_sinh_hoat,
           u.lop_sinh_hoat AS homeroom_class,
           u.hoc_vi AS academic_rank,
           u.so_dien_thoai AS phone_number,
           u.anh_dai_dien AS avatar_url,
           u.dang_hoat_dong AS is_active, 
           u.yeu_cau_doi_mat_khau AS must_change_password,
           u.ngay_tao AS created_at, 
           u.ngay_cap_nhat AS updated_at, 
           u.dang_nhap_cuoi AS last_login,
           (
               SELECT TOP 1 dia_chi_ip 
               FROM NhatKyHeThong 
               WHERE ma_nguoi_dung = u.ma_nguoi_dung 
                 AND hanh_dong = 'USER_LOGIN'
                 AND dia_chi_ip IS NOT NULL 
                 AND dia_chi_ip != '' 
               ORDER BY thoi_gian DESC
           ) AS last_login_ip
    FROM NguoiDung u
    JOIN VaiTro v ON u.ma_vai_tro = v.ma_vai_tro
"""

def get_user_by_username(username: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.ten_dang_nhap = ?", (username,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["username"].lower() == username.lower():
                return u
    return None

def get_user_by_email(email: str) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.email = ?", (email,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["email"].lower() == email.lower():
                return u
    return None

def get_user_by_id(user_id: int) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(f"{USER_SELECT_SQL} WHERE u.ma_nguoi_dung = ?", (user_id,))
            row = cursor.fetchone()
            return _parse_user_row(cursor, row)
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                return u
    return None

def create_user(
    username: str, 
    password: str, 
    email: str, 
    full_name: str, 
    role: str, 
    student_id: Optional[str] = None,
    is_active: bool = True,
    must_change_password: bool = False,
    department: Optional[str] = None,
    lop_sinh_hoat: Optional[str] = None,
    academic_rank: Optional[str] = None,
    phone_number: Optional[str] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        password_hash = get_password_hash(password)
        cursor.execute("SELECT ma_vai_tro FROM VaiTro WHERE ten_vai_tro = ?", (role,))
        role_row = cursor.fetchone()
        role_id = role_row[0] if role_row else 3

        cursor.execute("""
            INSERT INTO NguoiDung (
                ten_dang_nhap, mat_khau_hash, email, ho_va_ten, 
                ma_vai_tro, ma_dinh_danh, dang_hoat_dong, yeu_cau_doi_mat_khau,
                khoa_bo_mon, lop_sinh_hoat, hoc_vi, so_dien_thoai
            )
            OUTPUT inserted.ma_nguoi_dung, inserted.ten_dang_nhap, inserted.email, 
                   inserted.ho_va_ten, inserted.ma_dinh_danh, inserted.dang_hoat_dong, 
                   inserted.yeu_cau_doi_mat_khau, inserted.khoa_bo_mon, inserted.lop_sinh_hoat,
                   inserted.hoc_vi, inserted.so_dien_thoai, inserted.ngay_tao
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            username, password_hash, email, full_name, role_id, student_id,
            1 if is_active else 0, 1 if must_change_password else 0,
            department, lop_sinh_hoat, academic_rank, phone_number
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "user_id": row[0],
                "username": row[1],
                "email": row[2],
                "full_name": row[3],
                "role": role,
                "student_id": row[4],
                "user_code": row[4],
                "is_active": bool(row[5]),
                "must_change_password": bool(row[6]),
                "department": row[7],
                "lop_sinh_hoat": row[8],
                "homeroom_class": row[8],
                "academic_rank": row[9],
                "phone_number": row[10],
                "avatar_url": None,
                "created_at": row[11],
                "updated_at": row[11],
                "last_login": None,
                "last_login_ip": None
            }
        raise Exception("Không thể tạo người dùng mới")
    finally:
        cursor.close()
        conn.close()

def update_last_login(user_id: int, client_ip: Optional[str] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            # 1. Cập nhật thời điểm đăng nhập gần nhất vào NguoiDung (không lưu IP ở bảng này)
            cursor.execute("""
                UPDATE NguoiDung 
                SET dang_nhap_cuoi = GETDATE() 
                WHERE ma_nguoi_dung = ?
            """, (user_id,))
            
            # 2. Ghi nhận lịch sử và địa chỉ IP đăng nhập vào bảng nhật ký NhatKyHeThong
            try:
                cursor.execute("""
                    INSERT INTO NhatKyHeThong (ma_nguoi_dung, muc_do, hanh_dong, thong_bao, dia_chi_ip)
                    VALUES (?, 'info', 'USER_LOGIN', N'Đăng nhập hệ thống thành công', ?)
                """, (user_id, client_ip or '127.0.0.1'))
            except Exception as log_err:
                print(f"Warning: Failed to insert login audit log: {log_err}")

            conn.commit()
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                u["last_login"] = datetime.now()
                if client_ip:
                    u["last_login_ip"] = client_ip
                break

def update_user_profile(
    user_id: int, 
    full_name: Optional[str] = None, 
    email: Optional[str] = None, 
    student_id: Optional[str] = None,
    department: Optional[str] = None,
    lop_sinh_hoat: Optional[str] = None,
    academic_rank: Optional[str] = None,
    phone_number: Optional[str] = None,
    avatar_url: Optional[str] = None,
    username: Optional[str] = None
) -> Optional[Dict]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            updates = []
            params = []
            if full_name is not None:
                updates.append("ho_va_ten = ?")
                params.append(full_name)
            if email is not None:
                updates.append("email = ?")
                params.append(email)
            if username is not None:
                updates.append("ten_dang_nhap = ?")
                params.append(username)
            if student_id is not None:
                updates.append("ma_dinh_danh = ?")
                params.append(student_id if student_id != "" else None)
            if department is not None:
                updates.append("khoa_bo_mon = ?")
                params.append(department if department != "" else None)
            if lop_sinh_hoat is not None:
                updates.append("lop_sinh_hoat = ?")
                params.append(lop_sinh_hoat if lop_sinh_hoat != "" else None)
            if academic_rank is not None:
                updates.append("hoc_vi = ?")
                params.append(academic_rank if academic_rank != "" else None)
            if phone_number is not None:
                updates.append("so_dien_thoai = ?")
                params.append(phone_number if phone_number != "" else None)
            if avatar_url is not None:
                updates.append("anh_dai_dien = ?")
                params.append(avatar_url if avatar_url != "" else None)
            if not updates:
                return get_user_by_id(user_id)
            params.append(user_id)
            cursor.execute(f"UPDATE NguoiDung SET {', '.join(updates)}, ngay_cap_nhat = GETDATE() WHERE ma_nguoi_dung = ?", tuple(params))
            conn.commit()
            return get_user_by_id(user_id)
        finally:
            cursor.close()
            conn.close()
    except Exception:
        for u in DEV_MOCK_USERS:
            if u["user_id"] == user_id:
                if full_name is not None: u["full_name"] = full_name
                if email is not None: u["email"] = email
                if student_id is not None:
                    u["student_id"] = student_id
                    u["user_code"] = student_id
                if department is not None: u["department"] = department
                if lop_sinh_hoat is not None:
                    u["lop_sinh_hoat"] = lop_sinh_hoat
                    u["homeroom_class"] = lop_sinh_hoat
                return u
        return None

def change_user_password(user_id: int, new_password: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_hash = get_password_hash(new_password)
        cursor.execute("""
            UPDATE NguoiDung 
            SET mat_khau_hash = ?, 
                yeu_cau_doi_mat_khau = 0, 
                ngay_cap_nhat = GETDATE() 
            WHERE ma_nguoi_dung = ?
        """, (new_hash, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_all_users_paginated(skip: int = 0, limit: int = 20, role: Optional[str] = None, search: Optional[str] = None) -> Tuple[List[Dict], int]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_clauses = []
        params = []
        if role:
            where_clauses.append("v.ten_vai_tro = ?")
            params.append(role)
        if search:
            where_clauses.append("(u.ten_dang_nhap LIKE ? OR u.ho_va_ten LIKE ? OR u.email LIKE ? OR u.ma_dinh_danh LIKE ? OR u.lop_sinh_hoat LIKE ? OR u.khoa_bo_mon LIKE ?)")
            s = f"%{search}%"
            params.extend([s, s, s, s, s, s])
        
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        
        cursor.execute(f"""
            SELECT COUNT(*) 
            FROM NguoiDung u
            JOIN VaiTro v ON u.ma_vai_tro = v.ma_vai_tro
            {where_sql}
        """, tuple(params))
        total = cursor.fetchone()[0]
        
        order_sql = "ORDER BY u.ngay_tao DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        cursor.execute(f"""
            {USER_SELECT_SQL}
            {where_sql} 
            {order_sql}
        """, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        users = []
        for row in rows:
            u_dict = dict(zip(columns, row))
            u_dict["is_active"] = bool(u_dict["is_active"])
            u_dict["must_change_password"] = bool(u_dict.get("must_change_password", False))
            users.append(u_dict)
        return users, total
    finally:
        cursor.close()
        conn.close()

def update_user_status(user_id: int, is_active: bool) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE NguoiDung SET dang_hoat_dong = ?, ngay_cap_nhat = GETDATE() WHERE ma_nguoi_dung = ?", (1 if is_active else 0, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def update_user_role(user_id: int, role: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE NguoiDung 
            SET ma_vai_tro = (SELECT ma_vai_tro FROM VaiTro WHERE ten_vai_tro = ?),
                ngay_cap_nhat = GETDATE() 
            WHERE ma_nguoi_dung = ?
        """, (role, user_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def delete_user(user_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Xóa các liên kết phụ thuộc trước nếu có để tránh lỗi Foreign Key
        cursor.execute("DELETE FROM TokenXacThuc WHERE ma_nguoi_dung = ?", (user_id,))
        cursor.execute("DELETE FROM SinhVienLopHoc WHERE ma_sinh_vien = ? OR nguoi_them = ?", (user_id, user_id))
        cursor.execute("DELETE FROM BanNhapCode WHERE ma_sinh_vien = ?", (user_id,))
        cursor.execute("DELETE FROM KiemTraThietBi WHERE ma_sinh_vien = ?", (user_id,))
        cursor.execute("DELETE FROM Snapshots WHERE ma_sinh_vien = ?", (user_id,))
        cursor.execute("DELETE FROM TinNhanPhong WHERE nguoi_gui = ? OR nguoi_nhan = ?", (user_id, user_id))
        cursor.execute("DELETE FROM YeuCauTroGiup WHERE ma_sinh_vien = ? OR nguoi_giai_quyet = ?", (user_id, user_id))
        cursor.execute("DELETE FROM CanBoPhuTrachPhong WHERE ma_giang_vien = ?", (user_id,))
        cursor.execute("DELETE FROM NguoiDung WHERE ma_nguoi_dung = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

# ─── PASSWORD RESET TOKEN FUNCTIONS (DÙNG CHO FORGOT/RESET PASSWORD) ──────────
def create_password_reset_token(user_id: int, token: str, expires_minutes: int = 15) -> bool:
    """Lưu token khôi phục mật khẩu vào bảng TokenXacThuc"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Vô hiệu hóa các token reset cũ chưa dùng của user này
        cursor.execute("""
            UPDATE TokenXacThuc 
            SET da_thu_hoi = 1, ngay_thu_hoi = GETDATE()
            WHERE ma_nguoi_dung = ? AND loai_token = 'reset_password' AND da_su_dung = 0
        """, (user_id,))
        
        # Thêm token mới
        cursor.execute("""
            INSERT INTO TokenXacThuc (ma_nguoi_dung, ma_token_hash, loai_token, ngay_het_han, da_su_dung, da_thu_hoi)
            VALUES (?, ?, 'reset_password', DATEADD(minute, ?, GETDATE()), 0, 0)
        """, (user_id, token, expires_minutes))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()

def verify_password_reset_token(token: str) -> Optional[int]:
    """Kiểm tra token reset có hợp lệ, chưa sử dụng và chưa hết hạn không. Trả về user_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_nguoi_dung 
            FROM TokenXacThuc 
            WHERE ma_token_hash = ? 
              AND loai_token = 'reset_password' 
              AND da_su_dung = 0 
              AND da_thu_hoi = 0 
              AND ngay_het_han > GETDATE()
        """, (token,))
        row = cursor.fetchone()
        if row:
            return row[0]
        return None
    finally:
        cursor.close()
        conn.close()

def mark_password_reset_token_used(token: str) -> bool:
    """Đánh dấu token reset mật khẩu đã được sử dụng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE TokenXacThuc 
            SET da_su_dung = 1, ngay_thu_hoi = GETDATE()
            WHERE ma_token_hash = ?
        """, (token,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
