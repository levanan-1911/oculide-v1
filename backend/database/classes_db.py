from core.config import get_db_connection
from typing import Optional, List, Dict, Any, Union

def _resolve_class_id(cursor, class_id_or_code: Any) -> Optional[int]:
    """Phân giải ID số nguyên hoặc mã lớp học phần (VD: 'CS316-A') thành class_id (int)"""
    if class_id_or_code is None:
        return None
    val_str = str(class_id_or_code).strip()
    if val_str.isdigit():
        return int(val_str)
    cursor.execute("SELECT class_id FROM Classes WHERE class_code = ?", (val_str,))
    r = cursor.fetchone()
    if r:
        return r[0]
    # Khớp bổ sung với khoảng trắng được chuẩn hóa (ví dụ 'CS 202  D' -> 'CS 202 D')
    normalized = " ".join(val_str.split())
    if normalized != val_str:
        cursor.execute("SELECT class_id FROM Classes WHERE class_code = ?", (normalized,))
        r = cursor.fetchone()
        if r:
            return r[0]
    return None

def _resolve_user_id(cursor, student_id_or_ident: Any) -> Optional[int]:
    """Phân giải ID người dùng (int), MSSV (identifier_code), hoặc username thành user_id (int)"""
    if student_id_or_ident is None:
        return None
    val_str = str(student_id_or_ident).strip()
    if not val_str:
        return None

    # Ưu tiên khớp chính xác theo mã định danh (MSSV) hoặc username
    cursor.execute("""
        SELECT TOP 1 user_id FROM Users 
        WHERE identifier_code = ? OR username = ?
    """, (val_str, val_str))
    r = cursor.fetchone()
    if r:
        return r[0]

    # Nếu chuỗi là số, kiểm tra theo khóa chính user_id
    if val_str.isdigit():
        uid = int(val_str)
        cursor.execute("SELECT user_id FROM Users WHERE user_id = ?", (uid,))
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
    """Giảng viên tạo một lớp học phần mới trong bảng Classes"""
    # Chuẩn hóa khoảng trắng và viết hoa mã lớp
    class_code = " ".join(class_code.strip().split()).upper()
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
            INSERT INTO Classes (class_code, class_name, course_code, section_code, semester_name, instructor_id, description)
            OUTPUT inserted.class_id, inserted.class_code, inserted.class_name, inserted.course_code,
                   inserted.section_code, inserted.semester_name, inserted.instructor_id, inserted.description,
                   inserted.created_at, inserted.updated_at
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
            cursor.execute("SELECT full_name FROM Users WHERE user_id = ?", (instructor_id,))
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
            SELECT c.class_id, 
                   c.class_code, 
                   c.class_name, 
                   c.course_code,
                   c.section_code,
                   c.semester_name AS semester,
                   c.instructor_id,
                   c.description, 
                   c.status,
                   c.created_at, 
                   c.updated_at, 
                   COALESCE(u.full_name, N'Chưa phân công') AS instructor_name,
                   (SELECT COUNT(1) FROM ClassEnrollments svl WHERE svl.class_id = c.class_id) AS student_count
            FROM Classes c
            LEFT JOIN Users u ON c.instructor_id = u.user_id
            WHERE c.class_id = ?
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
                SELECT c.class_id, 
                       c.class_code, 
                       c.class_name, 
                       c.course_code,
                       c.section_code,
                       c.semester_name AS semester,
                       c.instructor_id,
                       c.description, 
                       c.status,
                       c.created_at, 
                       c.updated_at, 
                       COALESCE(u.full_name, N'Chưa phân công') AS instructor_name,
                       (SELECT COUNT(1) FROM ClassEnrollments svl WHERE svl.class_id = c.class_id) AS student_count
                FROM Classes c
                LEFT JOIN Users u ON c.instructor_id = u.user_id
                WHERE c.instructor_id = ?
                ORDER BY c.created_at DESC
            """, (instructor_id,))
        else:
            cursor.execute("""
                SELECT c.class_id, 
                       c.class_code, 
                       c.class_name, 
                       c.course_code,
                       c.section_code,
                       c.semester_name AS semester,
                       c.instructor_id,
                       c.description, 
                       c.status,
                       c.created_at, 
                       c.updated_at, 
                       COALESCE(u.full_name, N'Chưa phân công') AS instructor_name,
                       (SELECT COUNT(1) FROM ClassEnrollments svl WHERE svl.class_id = c.class_id) AS student_count
                FROM Classes c
                LEFT JOIN Users u ON c.instructor_id = u.user_id
                ORDER BY c.created_at DESC
            """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def update_class(
    class_id: Any,
    class_code: Optional[str] = None,
    class_name: Optional[str] = None,
    course_code: Optional[str] = None,
    section_code: Optional[str] = None,
    semester: Optional[str] = None,
    description: Optional[str] = None,
    instructor_id: Optional[int] = None,
    status: Optional[str] = None
) -> Optional[Dict]:
    """Cập nhật thông tin lớp học phần (hỗ trợ cả int ID hoặc chuỗi mã lớp như 'CS101')"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_id = _resolve_class_id(cursor, class_id)
        if not real_id:
            return None
        db_status = None
        if status:
            s_clean = status.strip().lower()
            if s_clean in ('da_dong', 'closed', 'da_ket_thuc', 'đã kết thúc', 'khoa'):
                db_status = 'closed'
            elif s_clean in ('dang_mo', 'open', 'active', 'hoat_dong', 'hoạt động', 'chưa mở', 'chua_mo'):
                db_status = 'open'
            else:
                db_status = 'open'

        cursor.execute("""
            UPDATE Classes
            SET class_code = COALESCE(?, class_code),
                class_name = COALESCE(?, class_name),
                course_code = COALESCE(?, course_code),
                section_code = COALESCE(?, section_code),
                semester_name = COALESCE(?, semester_name),
                description = COALESCE(?, description),
                instructor_id = COALESCE(?, instructor_id),
                status = COALESCE(?, status),
                updated_at = GETDATE()
            WHERE class_id = ?
        """, (class_code, class_name, course_code, section_code, semester, description, instructor_id, db_status, real_id))
        conn.commit()
        return get_class_by_id(real_id)
    finally:
        cursor.close()
        conn.close()

def get_all_semesters() -> List[Dict]:
    """Lấy danh sách các học kỳ từ bảng Semesters trong CSDL SQL Server"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT semester_code, semester_name, academic_year, term_number, 
                   start_date, end_date, is_current, status,
                   semester_code AS ma_hoc_ky, semester_name AS ten_hoc_ky,
                   academic_year AS nam_hoc, term_number AS ky_thu,
                   start_date AS ngay_bat_dau, end_date AS ngay_ket_thuc,
                   is_current AS la_hoc_ky_hien_tai, status AS trang_thai
            FROM Semesters
            ORDER BY start_date DESC
        """)
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for r in rows:
            item = dict(zip(columns, r))
            item["is_current"] = bool(item["is_current"])
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
        # Gỡ liên kết phòng thi trước để tránh vi phạm khóa ngoại FK_Rooms_Classes
        cursor.execute("UPDATE Rooms SET class_id = NULL WHERE class_id = ?", (real_id,))
        cursor.execute("DELETE FROM ClassEnrollments WHERE class_id = ?", (real_id,))
        cursor.execute("DELETE FROM Classes WHERE class_id = ?", (real_id,))
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
    Hỗ trợ tìm theo MSSV (identifier_code), Họ và tên, Email, Username.
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
                    u.user_id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.identifier_code AS student_id,
                    u.homeroom_class AS lop_sinh_hoat,
                    u.homeroom_class,
                    u.department,
                    u.phone_number,
                    u.is_active,
                    CASE WHEN svl.enrollment_id IS NOT NULL THEN 1 ELSE 0 END AS is_enrolled
                FROM Users u
                JOIN Roles v ON u.role_id = v.role_id
                LEFT JOIN ClassEnrollments svl ON svl.student_id = u.user_id AND svl.class_id = ?
                WHERE v.role_name = 'student'
                  AND u.is_active = 1
                  AND (
                      u.identifier_code LIKE ? 
                      OR u.full_name LIKE ? 
                      OR u.email LIKE ? 
                      OR u.username LIKE ?
                  )
                ORDER BY 
                    CASE 
                        WHEN UPPER(u.identifier_code) = ? THEN 0
                        WHEN UPPER(u.identifier_code) LIKE ? THEN 1
                        ELSE 2 
                    END,
                    u.full_name ASC
            """
            cursor.execute(sql, (limit, target_class_id, s, s, s, s, exact, f"{exact}%"))
        else:
            sql = f"""
                SELECT TOP (?)
                    u.user_id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.identifier_code AS student_id,
                    u.homeroom_class AS lop_sinh_hoat,
                    u.homeroom_class,
                    u.department,
                    u.phone_number,
                    u.is_active,
                    0 AS is_enrolled
                FROM Users u
                JOIN Roles v ON u.role_id = v.role_id
                WHERE v.role_name = 'student'
                  AND u.is_active = 1
                  AND (
                      u.identifier_code LIKE ? 
                      OR u.full_name LIKE ? 
                      OR u.email LIKE ? 
                      OR u.username LIKE ?
                  )
                ORDER BY 
                    CASE 
                        WHEN UPPER(u.identifier_code) = ? THEN 0
                        WHEN UPPER(u.identifier_code) LIKE ? THEN 1
                        ELSE 2 
                    END,
                    u.full_name ASC
            """
            cursor.execute(sql, (limit, s, s, s, s, exact, f"{exact}%"))

        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        seen_student_ids = set()
        for r in rows:
            item = dict(zip(columns, r))
            sid = (item.get("student_id") or "").strip().upper()
            if sid and sid in seen_student_ids:
                continue
            if sid:
                seen_student_ids.add(sid)
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
    student_name: Optional[str] = None,
    email: Optional[str] = None,
    added_by: Optional[int] = None,
    status: str = 'enrolled'
) -> Dict:
    """Ghi danh một sinh viên vào lớp học phần (ClassEnrollments)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            raise ValueError(f"Không tìm thấy lớp học với mã hoặc ID '{class_id}'.")

        real_student_id = _resolve_user_id(cursor, student_user_id)
        if not real_student_id:
            if student_name and student_name.strip():
                mssv = str(student_user_id).strip()
                student_email = email.strip() if email else f"{mssv.lower()}@dtu.edu.vn"
                from core.security import get_password_hash
                default_pwd_hash = get_password_hash(f"{mssv}@123")
                cursor.execute("""
                    INSERT INTO Users (username, password_hash, email, full_name, role_id, identifier_code, is_active)
                    OUTPUT inserted.user_id
                    VALUES (?, ?, ?, ?, 3, ?, 1)
                """, (mssv, default_pwd_hash, student_email, student_name.strip(), mssv))
                new_u = cursor.fetchone()
                if new_u:
                    real_student_id = new_u[0]
            if not real_student_id:
                raise ValueError(f"Không tìm thấy sinh viên với mã định danh hoặc ID '{student_user_id}'.")

        # Kiểm tra đã có chưa
        cursor.execute("""
            SELECT enrollment_id, status FROM ClassEnrollments 
            WHERE class_id = ? AND student_id = ?
        """, (real_class_id, real_student_id))
        existing = cursor.fetchone()
        if existing:
            return {"enrollment_id": existing[0], "ma_dong": existing[0], "status": existing[1], "already_enrolled": True}

        cursor.execute("""
            INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status, enrolled_at)
            OUTPUT inserted.enrollment_id, inserted.class_id, inserted.student_id, inserted.status, inserted.enrolled_at
            VALUES (?, ?, ?, ?, GETDATE())
        """, (real_class_id, real_student_id, added_by, status))
        row = cursor.fetchone()
        conn.commit()
        return {
            "enrollment_id": row[0],
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
    status: str = 'enrolled'
) -> int:
    """Ghi danh hàng loạt sinh viên vào lớp học phần (ClassEnrollments)"""
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
                SELECT 1 FROM ClassEnrollments WHERE class_id = ? AND student_id = ?
            """, (real_class_id, real_student_id))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status, enrolled_at)
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
            DELETE FROM ClassEnrollments 
            WHERE class_id = ? AND student_id = ?
        """, (real_class_id, real_student_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_class_enrolled_students(class_id: Any) -> List[Dict]:
    """Lấy danh sách sinh viên ghi danh trong lớp kèm thông tin cá nhân từ Users"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            return []

        cursor.execute("""
            SELECT 
                svl.enrollment_id,
                svl.enrollment_id AS ma_dong,
                svl.status,
                svl.enrolled_at,
                u.user_id,
                u.username,
                u.full_name,
                u.email,
                u.identifier_code AS student_id,
                u.homeroom_class AS lop_sinh_hoat,
                u.homeroom_class,
                u.department,
                u.phone_number
            FROM ClassEnrollments svl
            JOIN Users u ON svl.student_id = u.user_id
            WHERE svl.class_id = ?
            ORDER BY u.full_name ASC
        """, (real_class_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, r)) for r in rows]
    finally:
        cursor.close()
        conn.close()

def get_class_rooms(class_id: Any) -> Dict[str, List[Dict[str, Any]]]:
    """Lấy danh sách các phòng Lab và Bài kiểm tra/Thi của một lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        real_class_id = _resolve_class_id(cursor, class_id)
        if not real_class_id:
            return {"labs": [], "exams": []}

        cursor.execute("""
            SELECT 
                p.room_id,
                p.room_code,
                p.room_name AS title,
                p.room_type,
                p.start_time,
                p.end_time,
                p.duration_minutes,
                p.passcode,
                p.proctoring_config AS proctor_config,
                p.status,
                (SELECT COUNT(DISTINCT bn.student_id) FROM Submissions bn WHERE bn.room_id = p.room_id) AS submission_count,
                (SELECT COUNT(1) FROM Questions q WHERE q.room_id = p.room_id) AS question_count
            FROM Rooms p
            WHERE p.class_id = ?
            ORDER BY p.start_time ASC, p.created_at ASC
        """, (real_class_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]

        labs = []
        exams = []

        for r_raw in rows:
            r = dict(zip(columns, r_raw))
            r_type = (r.get("room_type") or "lab").lower()
            status_db = r.get("status") or "scheduled"

            # Xác định trạng thái thân thiện cho UI
            if r_type == "exam":
                ui_status = "Đang diễn ra" if status_db in ("in_progress", "dang_dien_ra") else ("Đã kết thúc" if status_db in ("completed", "da_dong") else "Sắp diễn ra")
                start_dt = r.get("start_time")
                end_dt = r.get("end_time")
                sched_str = ""
                if start_dt and end_dt:
                    sched_str = f"{start_dt.strftime('%H:%M')} - {end_dt.strftime('%H:%M, %d/%m/%Y')}"
                elif start_dt:
                    sched_str = start_dt.strftime('%H:%M, %d/%m/%Y')

                exams.append({
                    "id": r.get("room_code") or str(r.get("room_id")),
                    "title": r.get("title") or "Bài kiểm tra",
                    "type": "Kiểm tra quá trình",
                    "language": "C++",
                    "durationMinutes": r.get("duration_minutes") or 60,
                    "scheduledAt": sched_str,
                    "questionCount": r.get("question_count") or 0,
                    "isProctored": True,
                    "roomCode": r.get("room_code") or "",
                    "roomPassword": r.get("passcode") or "",
                    "status": ui_status,
                    "submissionCount": r.get("submission_count") or 0,
                })
            else:
                ui_status = "Đang mở" if status_db in ("in_progress", "dang_dien_ra") else ("Đã kết thúc" if status_db in ("completed", "da_dong") else "Chưa mở")
                start_dt = r.get("start_time")
                end_dt = r.get("end_time")

                labs.append({
                    "id": r.get("room_code") or str(r.get("room_id")),
                    "labNumber": len(labs) + 1,
                    "title": r.get("title") or f"Lab {len(labs) + 1}",
                    "language": "C++",
                    "questionCount": r.get("question_count") or 0,
                    "scheduleNote": f"Phòng {r.get('room_code')}",
                    "startTime": start_dt.strftime("%H:%M, %d/%m/%Y") if start_dt else "",
                    "endTime": end_dt.strftime("%H:%M, %d/%m/%Y") if end_dt else "",
                    "durationMinutes": r.get("duration_minutes") or 120,
                    "isProctored": bool(r.get("proctor_config")),
                    "roomCode": r.get("room_code") or "",
                    "roomPassword": r.get("passcode") or "",
                    "status": ui_status,
                    "submissionCount": r.get("submission_count") or 0,
                })

        return {"labs": labs, "exams": exams}
    finally:
        cursor.close()
        conn.close()
