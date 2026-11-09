from core.config import get_db_connection
from typing import Optional, List, Dict, Any, Union

def _resolve_class_id(cursor, class_id_or_code: Any) -> Optional[int]:
    """Phân giải ID số nguyên hoặc mã lớp học phần (VD: 'CS316-A') thành ma_lop (int)"""
    if class_id_or_code is None:
        return None
    val_str = str(class_id_or_code).strip()
    if val_str.isdigit():
        return int(val_str)
    cursor.execute("SELECT ma_lop FROM LopHoc WHERE ma_lop_hoc = ?", (val_str,))
    r = cursor.fetchone()
    if r:
        return r[0]
    return None

def _resolve_user_id(cursor, student_id_or_ident: Any) -> Optional[int]:
    """Phân giải ID người dùng (int), MSSV (ma_dinh_danh), hoặc tên đăng nhập thành ma_nguoi_dung (int)"""
    if student_id_or_ident is None:
        return None
    val_str = str(student_id_or_ident).strip()
    if not val_str:
        return None

    # Ưu tiên khớp chính xác theo mã định danh (MSSV) hoặc tên đăng nhập
    cursor.execute("""
        SELECT TOP 1 ma_nguoi_dung FROM NguoiDung 
        WHERE ma_dinh_danh = ? OR ten_dang_nhap = ?
    """, (val_str, val_str))
    r = cursor.fetchone()
    if r:
        return r[0]

    # Nếu chuỗi là số, kiểm tra theo khóa chính ma_nguoi_dung
    if val_str.isdigit():
        uid = int(val_str)
        cursor.execute("SELECT ma_nguoi_dung FROM NguoiDung WHERE ma_nguoi_dung = ?", (uid,))
        r = cursor.fetchone()
        if r:
            return r[0]

    return None

def create_class(
    class_code: str,
    class_name: str,
    instructor_id: int,
    course_code: Optional[str] = None,
    section_code: Optional[str] = None,
    semester: Optional[str] = None,
    description: Optional[str] = None
) -> Dict:
    """Giảng viên tạo một lớp học phần mới trong bảng LopHoc"""
    # Tự động suy luận mã môn và mã phân lớp nếu người dùng không truyền riêng
    if not section_code and not course_code and class_code:
        parts = class_code.strip().split()
        if len(parts) >= 2:
            section_code = parts[-1]
            course_code = ' '.join(parts[:-1])

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO LopHoc (ma_lop_hoc, ten_lop, ma_mon_hoc, ma_phan_lop, hoc_ky, ma_giang_vien, mo_ta)
            OUTPUT inserted.ma_lop, inserted.ma_lop_hoc, inserted.ten_lop, inserted.ma_mon_hoc,
                   inserted.ma_phan_lop, inserted.hoc_ky, inserted.ma_giang_vien, inserted.mo_ta,
                   inserted.ngay_tao, inserted.ngay_cap_nhat
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (class_code, class_name, course_code, section_code, semester, instructor_id, description))
        row = cursor.fetchone()
        conn.commit()
        if row:
            created = {
                "class_id": row[0],
                "class_code": row[1],
                "class_name": row[2],
                "course_code": row[3],
                "section_code": row[4],
                "semester": row[5],
                "instructor_id": row[6],
                "description": row[7],
                "created_at": row[8],
                "updated_at": row[9]
            }
            cursor.execute("SELECT ho_va_ten FROM NguoiDung WHERE ma_nguoi_dung = ?", (instructor_id,))
            inst_row = cursor.fetchone()
            created["instructor_name"] = inst_row[0] if inst_row else "Giảng viên"
            created["student_count"] = 0
            return created
        raise Exception("Không thể tạo lớp học")
    finally:
        cursor.close()
        conn.close()

def get_class_by_id(class_id: Any) -> Optional[Dict]:
    """Lấy thông tin chi tiết một lớp học phần (hỗ trợ cả int ID hoặc chuỗi mã lớp như 'CS316-A')"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_id = _resolve_class_id(cursor, class_id)
        if not real_id:
            return None
        cursor.execute("""
            SELECT c.ma_lop AS class_id, 
                   c.ma_lop_hoc AS class_code, 
                   c.ten_lop AS class_name, 
                   c.ma_mon_hoc AS course_code,
                   c.ma_phan_lop AS section_code,
                   c.hoc_ky AS semester,
                   c.ma_giang_vien AS instructor_id,
                   c.mo_ta AS description, 
                   c.ngay_tao AS created_at, 
                   c.ngay_cap_nhat AS updated_at, 
                   u.ho_va_ten AS instructor_name,
                   (SELECT COUNT(1) FROM SinhVienLopHoc svl WHERE svl.ma_lop = c.ma_lop) AS student_count
            FROM LopHoc c
            JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
            WHERE c.ma_lop = ?
        """, (real_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_classes_by_instructor(instructor_id: Optional[int] = None) -> List[Dict]:
    """Lấy danh sách các lớp học (nếu admin thì có thể xem toàn bộ)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if instructor_id:
            cursor.execute("""
                SELECT c.ma_lop AS class_id, 
                       c.ma_lop_hoc AS class_code, 
                       c.ten_lop AS class_name, 
                       c.ma_mon_hoc AS course_code,
                       c.ma_phan_lop AS section_code,
                       c.hoc_ky AS semester,
                       c.ma_giang_vien AS instructor_id,
                       c.mo_ta AS description, 
                       c.ngay_tao AS created_at, 
                       c.ngay_cap_nhat AS updated_at, 
                       u.ho_va_ten AS instructor_name,
                       (SELECT COUNT(1) FROM SinhVienLopHoc svl WHERE svl.ma_lop = c.ma_lop) AS student_count
                FROM LopHoc c
                JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
                WHERE c.ma_giang_vien = ?
                ORDER BY c.ngay_tao DESC
            """, (instructor_id,))
        else:
            cursor.execute("""
                SELECT c.ma_lop AS class_id, 
                       c.ma_lop_hoc AS class_code, 
                       c.ten_lop AS class_name, 
                       c.ma_mon_hoc AS course_code,
                       c.ma_phan_lop AS section_code,
                       c.hoc_ky AS semester,
                       c.ma_giang_vien AS instructor_id,
                       c.mo_ta AS description, 
                       c.ngay_tao AS created_at, 
                       c.ngay_cap_nhat AS updated_at, 
                       u.ho_va_ten AS instructor_name,
                       (SELECT COUNT(1) FROM SinhVienLopHoc svl WHERE svl.ma_lop = c.ma_lop) AS student_count
                FROM LopHoc c
                JOIN NguoiDung u ON c.ma_giang_vien = u.ma_nguoi_dung
                ORDER BY c.ngay_tao DESC
            """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_class(
    class_id: int,
    class_code: Optional[str] = None,
    class_name: Optional[str] = None,
    course_code: Optional[str] = None,
    section_code: Optional[str] = None,
    semester: Optional[str] = None,
    description: Optional[str] = None
) -> Optional[Dict]:
    """Cập nhật thông tin lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE LopHoc
            SET ma_lop_hoc = COALESCE(?, ma_lop_hoc),
                ten_lop = COALESCE(?, ten_lop),
                ma_mon_hoc = COALESCE(?, ma_mon_hoc),
                ma_phan_lop = COALESCE(?, ma_phan_lop),
                hoc_ky = COALESCE(?, hoc_ky),
                mo_ta = COALESCE(?, mo_ta),
                ngay_cap_nhat = GETDATE()
            WHERE ma_lop = ?
        """, (class_code, class_name, course_code, section_code, semester, description, class_id))
        conn.commit()
        return get_class_by_id(class_id)
    finally:
        cursor.close()
        conn.close()

def get_all_semesters() -> List[Dict]:
    """Lấy danh sách các học kỳ từ bảng HocKy trong CSDL SQL Server"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_hoc_ky, ten_hoc_ky, nam_hoc, ky_thu, 
                   ngay_bat_dau, ngay_ket_thuc, la_hoc_ky_hien_tai, trang_thai
            FROM HocKy
            ORDER BY ngay_bat_dau DESC
        """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for r in rows:
            item = dict(zip(columns, r))
            item["la_hoc_ky_hien_tai"] = bool(item["la_hoc_ky_hien_tai"])
            results.append(item)
        return results
    except Exception as e:
        print("Lỗi khi lấy danh sách học kỳ:", e)
        return []
    finally:
        cursor.close()
        conn.close()

def delete_class(class_id: Any) -> bool:
    """Xóa một lớp học phần (hỗ trợ cả int ID hoặc mã lớp)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_id = _resolve_class_id(cursor, class_id)
        if not real_id:
            return False
        cursor.execute("DELETE FROM SinhVienLopHoc WHERE ma_lop = ?", (real_id,))
        cursor.execute("DELETE FROM LopHoc WHERE ma_lop = ?", (real_id,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()



def search_students(
    query: str,
    class_id: Optional[Any] = None,
    class_code: Optional[str] = None,
    limit: int = 15
) -> List[Dict]:
    """
    Tìm kiếm nhanh danh sách sinh viên đang hoạt động trong hệ thống
    Hỗ trợ tìm theo MSSV (ma_dinh_danh), Họ và tên, Email, Tên đăng nhập.
    Nếu có class_id hoặc class_code, tự động đánh dấu sinh viên đã ghi danh (is_enrolled) trong lớp đó.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        target_class_id = _resolve_class_id(cursor, class_id)
        if not target_class_id and class_code:
            target_class_id = _resolve_class_id(cursor, class_code)

        s = f"%{query.strip()}%"
        exact = query.strip().upper()

        if target_class_id:
            sql = f"""
                SELECT TOP (?)
                    u.ma_nguoi_dung AS user_id,
                    u.ten_dang_nhap AS username,
                    u.email AS email,
                    u.ho_va_ten AS full_name,
                    u.ma_dinh_danh AS student_id,
                    u.lop_sinh_hoat AS lop_sinh_hoat,
                    u.khoa_bo_mon AS department,
                    u.so_dien_thoai AS phone_number,
                    u.dang_hoat_dong AS is_active,
                    CASE WHEN svl.ma_dong IS NOT NULL THEN 1 ELSE 0 END AS is_enrolled
                FROM NguoiDung u
                JOIN VaiTro v ON u.ma_vai_tro = v.ma_vai_tro
                LEFT JOIN SinhVienLopHoc svl ON svl.ma_sinh_vien = u.ma_nguoi_dung AND svl.ma_lop = ?
                WHERE v.ten_vai_tro = 'student'
                  AND u.dang_hoat_dong = 1
                  AND (
                      u.ma_dinh_danh LIKE ? 
                      OR u.ho_va_ten LIKE ? 
                      OR u.email LIKE ? 
                      OR u.ten_dang_nhap LIKE ?
                  )
                ORDER BY 
                    CASE 
                        WHEN UPPER(u.ma_dinh_danh) = ? THEN 0
                        WHEN UPPER(u.ma_dinh_danh) LIKE ? THEN 1
                        ELSE 2 
                    END,
                    u.ho_va_ten ASC
            """
            cursor.execute(sql, (limit, target_class_id, s, s, s, s, exact, f"{exact}%"))
        else:
            sql = f"""
                SELECT TOP (?)
                    u.ma_nguoi_dung AS user_id,
                    u.ten_dang_nhap AS username,
                    u.email AS email,
                    u.ho_va_ten AS full_name,
                    u.ma_dinh_danh AS student_id,
                    u.lop_sinh_hoat AS lop_sinh_hoat,
                    u.khoa_bo_mon AS department,
                    u.so_dien_thoai AS phone_number,
                    u.dang_hoat_dong AS is_active,
                    0 AS is_enrolled
                FROM NguoiDung u
                JOIN VaiTro v ON u.ma_vai_tro = v.ma_vai_tro
                WHERE v.ten_vai_tro = 'student'
                  AND u.dang_hoat_dong = 1
                  AND (
                      u.ma_dinh_danh LIKE ? 
                      OR u.ho_va_ten LIKE ? 
                      OR u.email LIKE ? 
                      OR u.ten_dang_nhap LIKE ?
                  )
                ORDER BY 
                    CASE 
                        WHEN UPPER(u.ma_dinh_danh) = ? THEN 0
                        WHEN UPPER(u.ma_dinh_danh) LIKE ? THEN 1
                        ELSE 2 
                    END,
                    u.ho_va_ten ASC
            """
            cursor.execute(sql, (limit, s, s, s, s, exact, f"{exact}%"))

        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for r in rows:
            item = dict(zip(columns, r))
            item["is_active"] = bool(item["is_active"])
            item["is_enrolled"] = bool(item["is_enrolled"])
            results.append(item)
        return results
    finally:
        cursor.close()
        conn.close()

def enroll_student_to_class(
    class_id: Any,
    student_user_id: Any,
    added_by: Optional[int] = None,
    status: str = 'dang_hoc'
) -> Dict:
    """Ghi danh một sinh viên vào lớp học phần (SinhVienLopHoc)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            raise ValueError(f"Không tìm thấy lớp học với mã hoặc ID '{class_id}'.")

        real_student_id = _resolve_user_id(cursor, student_user_id)
        if not real_student_id:
            raise ValueError(f"Không tìm thấy sinh viên với mã định danh hoặc ID '{student_user_id}'.")

        # Kiểm tra đã có chưa
        cursor.execute("""
            SELECT ma_dong, trang_thai FROM SinhVienLopHoc 
            WHERE ma_lop = ? AND ma_sinh_vien = ?
        """, (real_class_id, real_student_id))
        existing = cursor.fetchone()
        if existing:
            return {"ma_dong": existing[0], "status": existing[1], "already_enrolled": True}

        cursor.execute("""
            INSERT INTO SinhVienLopHoc (ma_lop, ma_sinh_vien, nguoi_them, trang_thai, ngay_tham_gia)
            OUTPUT inserted.ma_dong, inserted.ma_lop, inserted.ma_sinh_vien, inserted.trang_thai, inserted.ngay_tham_gia
            VALUES (?, ?, ?, ?, GETDATE())
        """, (real_class_id, real_student_id, added_by, status))
        row = cursor.fetchone()
        conn.commit()
        return {
            "ma_dong": row[0],
            "class_id": row[1],
            "student_id": row[2],
            "status": row[3],
            "enrolled_at": row[4],
            "already_enrolled": False
        }
    finally:
        cursor.close()
        conn.close()

def enroll_students_batch(
    class_id: Any,
    student_identifiers: List[Any],
    added_by: Optional[int] = None,
    status: str = 'dang_hoc'
) -> int:
    """Ghi danh hàng loạt sinh viên vào lớp học phần (SinhVienLopHoc)"""
    if not student_identifiers:
        return 0
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            raise ValueError(f"Không tìm thấy lớp học với mã hoặc ID '{class_id}'.")

        enrolled_count = 0
        for sid in student_identifiers:
            real_student_id = _resolve_user_id(cursor, sid)
            if not real_student_id:
                continue
            cursor.execute("""
                SELECT 1 FROM SinhVienLopHoc WHERE ma_lop = ? AND ma_sinh_vien = ?
            """, (real_class_id, real_student_id))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO SinhVienLopHoc (ma_lop, ma_sinh_vien, nguoi_them, trang_thai, ngay_tham_gia)
                    VALUES (?, ?, ?, ?, GETDATE())
                """, (real_class_id, real_student_id, added_by, status))
                enrolled_count += 1
        conn.commit()
        return enrolled_count
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

def remove_student_from_class(class_id: Any, student_user_id: Any) -> bool:
    """Xóa sinh viên khỏi lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            return False

        real_student_id = _resolve_user_id(cursor, student_user_id)
        if not real_student_id:
            return False

        cursor.execute("""
            DELETE FROM SinhVienLopHoc 
            WHERE ma_lop = ? AND ma_sinh_vien = ?
        """, (real_class_id, real_student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_class_enrolled_students(class_id: Any) -> List[Dict]:
    """Lấy danh sách sinh viên ghi danh trong lớp kèm thông tin cá nhân từ NguoiDung"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            return []

        cursor.execute("""
            SELECT 
                svl.ma_dong AS enrollment_id,
                svl.trang_thai AS status,
                svl.ngay_tham_gia AS enrolled_at,
                u.ma_nguoi_dung AS user_id,
                u.ten_dang_nhap AS username,
                u.ho_va_ten AS full_name,
                u.email AS email,
                u.ma_dinh_danh AS student_id,
                u.lop_sinh_hoat AS lop_sinh_hoat,
                u.khoa_bo_mon AS department,
                u.so_dien_thoai AS phone_number
            FROM SinhVienLopHoc svl
            JOIN NguoiDung u ON svl.ma_sinh_vien = u.ma_nguoi_dung
            WHERE svl.ma_lop = ?
            ORDER BY u.ho_va_ten ASC
        """, (real_class_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, r)) for r in rows]
    finally:
        cursor.close()
        conn.close()
