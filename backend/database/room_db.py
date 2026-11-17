from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict, Any

def _resolve_template_id(cursor, template_id: Optional[Any]) -> Optional[int]:
    """Chuyển đổi template_id (int hoặc code như 'TPL-LAB-01' hoặc 'DE_LAB_01') sang template_id INT trong ExamTemplates"""
    if not template_id or str(template_id).lower() in ("none", "null", "undefined", "0"):
        return None
    try:
        val_int = int(template_id)
        cursor.execute("SELECT template_id FROM ExamTemplates WHERE template_id = ?", (val_int,))
        row = cursor.fetchone()
        if row:
            return row[0]
    except (ValueError, TypeError):
        pass

    cursor.execute("SELECT template_id FROM ExamTemplates WHERE template_code = ?", (str(template_id).strip(),))
    row = cursor.fetchone()
    if row:
        return row[0]
    return None

def get_room_by_id(room_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.room_id, 
                   p.room_code, 
                   p.room_name, 
                   p.room_type, 
                   p.creator_id AS instructor_id, 
                   p.description,
                   p.start_time, 
                   p.end_time, 
                   p.duration_minutes, 
                   p.max_attempts,
                   p.is_active, 
                   p.passcode, 
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   gv.full_name AS instructor_name,
                   p.template_id,
                   p.proctoring_config,
                   p.status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ClassEnrollments svl 
                       WHERE svl.class_id = p.class_id
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.student_id) 
                       FROM ExamSessions pl 
                       WHERE pl.room_id = p.room_id 
                         AND pl.status IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM Violations vp 
                       WHERE vp.room_id = p.room_id 
                         AND (vp.review_status = 'pending' OR vp.review_status IS NULL)
                   ), 0) AS pending_violations,
                   p.created_at, 
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN Users gv ON p.creator_id = gv.user_id
            WHERE p.room_id = ?
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
            SELECT p.room_id, 
                   p.room_code, 
                   p.room_name, 
                   p.room_type, 
                   p.creator_id AS instructor_id, 
                   p.description,
                   p.start_time, 
                   p.end_time, 
                   p.duration_minutes, 
                   p.max_attempts,
                   p.is_active, 
                   p.passcode, 
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   gv.full_name AS instructor_name,
                   p.template_id,
                   p.proctoring_config,
                   p.status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ClassEnrollments svl 
                       WHERE svl.class_id = p.class_id
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.student_id) 
                       FROM ExamSessions pl 
                       WHERE pl.room_id = p.room_id 
                         AND pl.status IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM Violations vp 
                       WHERE vp.room_id = p.room_id 
                         AND (vp.review_status = 'pending' OR vp.review_status IS NULL)
                   ), 0) AS pending_violations,
                   p.created_at, 
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN Users gv ON p.creator_id = gv.user_id
            WHERE p.room_code = ?
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
        where = ["p.creator_id = ?"]
        params = [instructor_id]
        if room_type:
            where.append("p.room_type = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT p.room_id, 
                   p.room_code, 
                   p.room_name, 
                   p.room_type, 
                   p.creator_id AS instructor_id, 
                   p.description,
                   p.start_time, 
                   p.end_time, 
                   p.duration_minutes, 
                   p.max_attempts,
                   p.is_active, 
                   p.passcode, 
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   gv.full_name AS instructor_name,
                   p.template_id,
                   p.proctoring_config,
                   p.status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ClassEnrollments svl 
                       WHERE svl.class_id = p.class_id
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.student_id) 
                       FROM ExamSessions pl 
                       WHERE pl.room_id = p.room_id 
                         AND pl.status IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM Violations vp 
                       WHERE vp.room_id = p.room_id 
                         AND (vp.review_status = 'pending' OR vp.review_status IS NULL)
                   ), 0) AS pending_violations,
                   p.created_at, 
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN Users gv ON p.creator_id = gv.user_id
            {where_sql}
            ORDER BY p.created_at DESC
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
        where_sql = "WHERE p.room_type = ?" if room_type else ""
        params = [room_type] if room_type else []
        cursor.execute(f"""
            SELECT p.room_id, 
                   p.room_code, 
                   p.room_name, 
                   p.room_type, 
                   p.creator_id AS instructor_id, 
                   p.description,
                   p.start_time, 
                   p.end_time, 
                   p.duration_minutes, 
                   p.max_attempts,
                   p.is_active, 
                   p.passcode, 
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   gv.full_name AS instructor_name,
                   p.template_id,
                   p.proctoring_config,
                   p.status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ClassEnrollments svl 
                       WHERE svl.class_id = p.class_id
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.student_id) 
                       FROM ExamSessions pl 
                       WHERE pl.room_id = p.room_id 
                         AND pl.status IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM Violations vp 
                       WHERE vp.room_id = p.room_id 
                         AND (vp.review_status = 'pending' OR vp.review_status IS NULL)
                   ), 0) AS pending_violations,
                   p.created_at, 
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN Users gv ON p.creator_id = gv.user_id
            {where_sql}
            ORDER BY p.created_at DESC
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
                p.class_id IS NULL
                OR EXISTS (SELECT 1 FROM ClassEnrollments svl WHERE svl.class_id = p.class_id AND svl.student_id = ?)
                OR EXISTS (SELECT 1 FROM ExamSessions pl WHERE pl.room_id = p.room_id AND pl.student_id = ?)
                OR EXISTS (SELECT 1 FROM Submissions bn WHERE bn.room_id = p.room_id AND bn.student_id = ?)
                OR NOT EXISTS (SELECT 1 FROM ClassEnrollments svl_any WHERE svl_any.student_id = ?)
            )"""
        ]
        params: List[Any] = [student_id, student_id, student_id, student_id, student_id, student_id]
        if room_type:
            where_clauses.append("p.room_type = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where_clauses)}"

        cursor.execute(f"""
            SELECT p.room_id, 
                   p.room_code, 
                   p.room_name, 
                   p.room_type, 
                   p.creator_id AS instructor_id, 
                   p.description,
                   p.start_time, 
                   p.end_time, 
                   p.duration_minutes, 
                   p.max_attempts,
                   p.is_active, 
                   p.passcode, 
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   gv.full_name AS instructor_name,
                   p.template_id,
                   p.proctoring_config,
                   p.status,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM ClassEnrollments svl 
                       WHERE svl.class_id = p.class_id
                   ), 0) AS total_students,
                   COALESCE((
                       SELECT COUNT(DISTINCT pl.student_id) 
                       FROM ExamSessions pl 
                       WHERE pl.room_id = p.room_id 
                         AND pl.status IN ('dang_lam', 'active', 'da_nop', 'completed')
                   ), 0) AS attended_students,
                   COALESCE((
                       SELECT COUNT(*) 
                       FROM Violations vp 
                       WHERE vp.room_id = p.room_id 
                         AND (vp.review_status = 'pending' OR vp.review_status IS NULL)
                   ), 0) AS pending_violations,
                   (
                       SELECT TOP 1 pl_sv.status
                       FROM ExamSessions pl_sv
                       WHERE pl_sv.room_id = p.room_id AND pl_sv.student_id = ?
                       ORDER BY pl_sv.session_id DESC
                   ) AS student_session_status,
                   COALESCE((
                       SELECT COUNT(*)
                       FROM Submissions bn_sv
                       WHERE bn_sv.room_id = p.room_id AND bn_sv.student_id = ?
                    ), 0) AS student_submissions_count,
                   p.created_at, 
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN Users gv ON p.creator_id = gv.user_id
            {where_sql}
            ORDER BY p.start_time DESC, p.created_at DESC
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
    status: str = 'scheduled'
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        from database.classes_db import _resolve_class_id
        real_class_id = _resolve_class_id(cursor, class_id) if class_id else None
        real_template_id = _resolve_template_id(cursor, template_id) if template_id else None

        cursor.execute("""
            INSERT INTO Rooms (
                room_code, room_name, room_type, creator_id, description,
                start_time, end_time, duration_minutes, max_attempts,
                passcode, livekit_room_name, class_id, template_id, proctoring_config, status
            )
            OUTPUT inserted.room_id
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
            "room_name": "room_name",
            "room_type": "room_type",
            "description": "description",
            "start_time": "start_time",
            "end_time": "end_time",
            "duration_minutes": "duration_minutes",
            "max_attempts": "max_attempts",
            "is_active": "is_active",
            "passcode": "passcode",
            "livekit_room_name": "livekit_room_name",
            "class_id": "class_id",
            "template_id": "template_id",
            "proctoring_config": "proctoring_config",
            "status": "status"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
                params.append(1 if key == "is_active" and value else (0 if key == "is_active" else value))
        if not fields:
            return get_room_by_id(room_id)
        params.append(room_id)
        cursor.execute(f"UPDATE Rooms SET {', '.join(fields)}, updated_at = GETDATE() WHERE room_id = ?", tuple(params))
        conn.commit()
        return get_room_by_id(room_id)
    finally:
        cursor.close()
        conn.close()

def get_exam_templates(instructor_id: Optional[int] = None, room_type: Optional[str] = None) -> List[Dict]:
    """Lấy danh sách các bộ đề mẫu có trong CSDL (ExamTemplates)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = []
        params = []
        if instructor_id:
            where.append("(created_by = ? OR created_by IS NULL)")
            params.append(instructor_id)
        if room_type:
            where.append("template_type = ?")
            params.append(room_type)
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        cursor.execute(f"""
            SELECT b.template_id AS id,
                   b.template_code AS code,
                   b.title,
                   b.template_type AS type,
                   b.duration_minutes,
                   b.total_points,
                   b.created_by AS creator_id,
                   b.created_at,
                   (SELECT COUNT(1) FROM TemplateQuestions ch WHERE ch.template_id = b.template_id) AS question_count
            FROM ExamTemplates b
            {where_sql}
            ORDER BY b.created_at DESC
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
    - Danh sách sinh viên thực tế thuộc lớp học kèm trạng thái vào phòng (waiting/absent) từ ExamSessions.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.room_id,
                   p.room_code,
                   p.room_name,
                   p.room_type,
                   p.creator_id AS instructor_id,
                   p.description,
                   p.start_time,
                   p.end_time,
                   p.duration_minutes,
                   p.max_attempts,
                   p.is_active,
                   p.passcode,
                   p.livekit_room_name,
                   p.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   p.template_id,
                   bd.title AS template_title,
                   bd.template_code AS template_code,
                   p.proctoring_config,
                   p.status,
                   p.created_at,
                   p.updated_at
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            LEFT JOIN ExamTemplates bd ON p.template_id = bd.template_id
            WHERE p.room_code = ? OR CAST(p.room_id AS NVARCHAR(50)) = ?
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
                SELECT COALESCE(u.identifier_code, CAST(u.user_id AS NVARCHAR(50))) AS student_id,
                       u.user_id,
                       u.full_name AS student_name,
                       u.email AS student_email,
                       CASE 
                           WHEN pl.status IN ('active', 'dang_lam') THEN 'waiting'
                           WHEN pl.status IN ('completed', 'da_nop', 'submitted') THEN 'completed'
                           ELSE 'absent'
                       END AS status,
                       CONVERT(NVARCHAR(30), pl.start_time, 126) AS joined_at,
                       pl.user_agent AS device,
                       COALESCE(kt.camera_status, 0) AS camera_ready
                FROM ClassEnrollments svl
                JOIN Users u ON svl.student_id = u.user_id
                LEFT JOIN ExamSessions pl ON pl.room_id = ? AND pl.student_id = u.user_id
                LEFT JOIN (
                    SELECT session_id, student_id, MAX(CAST(camera_status AS INT)) AS camera_status
                    FROM DeviceChecks
                    GROUP BY session_id, student_id
                ) kt ON kt.session_id = pl.session_id AND kt.student_id = u.user_id
                WHERE svl.class_id = ?
                ORDER BY u.full_name ASC
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
                SELECT COALESCE(u.identifier_code, CAST(u.user_id AS NVARCHAR(50))) AS student_id,
                       u.user_id,
                       u.full_name AS student_name,
                       u.email AS student_email,
                       CASE 
                           WHEN pl.status IN ('active', 'dang_lam') THEN 'waiting'
                           WHEN pl.status IN ('completed', 'da_nop', 'submitted') THEN 'completed'
                           ELSE 'absent'
                       END AS status,
                       CONVERT(NVARCHAR(30), pl.start_time, 126) AS joined_at,
                       pl.user_agent AS device,
                       COALESCE(kt.camera_status, 0) AS camera_ready
                FROM ExamSessions pl
                JOIN Users u ON pl.student_id = u.user_id
                LEFT JOIN (
                    SELECT session_id, student_id, MAX(CAST(camera_status AS INT)) AS camera_status
                    FROM DeviceChecks
                    GROUP BY session_id, student_id
                ) kt ON kt.session_id = pl.session_id AND kt.student_id = u.user_id
                WHERE pl.room_id = ?
                ORDER BY u.full_name ASC
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
    """Kiểm tra xem giảng viên hiện có phòng nào khác đang ở trạng thái 'dang_dien_ra' hoặc 'in_progress' không"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT p.room_id,
                   p.room_code,
                   p.room_name,
                   lh.class_name,
                   CONVERT(NVARCHAR(30), p.start_time, 126) AS start_time,
                   CONVERT(NVARCHAR(30), p.end_time, 126) AS end_time,
                   p.status
            FROM Rooms p
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            WHERE p.creator_id = ? AND p.room_id != ? AND p.status IN ('dang_dien_ra', 'in_progress')
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
    """Cập nhật trạng thái phòng (scheduled, in_progress, completed, cancelled)"""
    status_map = {
        "waiting": "scheduled",
        "in_progress": "in_progress",
        "ended": "completed",
        "closed": "completed",
        "cancelled": "cancelled",
        "chua_mo": "scheduled",
        "dang_dien_ra": "in_progress",
        "da_dong": "completed",
        "da_huy": "cancelled",
        "scheduled": "scheduled",
        "completed": "completed"
    }
    db_status = status_map.get(status.lower(), status)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if db_status in ("in_progress", "dang_dien_ra") and force_close_conflicts and instructor_id:
            cursor.execute("""
                UPDATE Rooms 
                SET status = 'completed', updated_at = GETDATE()
                WHERE creator_id = ? AND status IN ('in_progress', 'dang_dien_ra') AND room_id != ?
            """, (instructor_id, room_id))

        cursor.execute("""
            UPDATE Rooms 
            SET status = ?, updated_at = GETDATE()
            WHERE room_id = ?
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
            cursor.execute("SELECT user_id FROM Users WHERE user_id = ?", (val_int,))
            row = cursor.fetchone()
            if row:
                user_id = row[0]
        except (ValueError, TypeError):
            pass

        if not user_id:
            cursor.execute("SELECT user_id FROM Users WHERE identifier_code = ? OR username = ?", (str(student_id), str(student_id)))
            row = cursor.fetchone()
            if row:
                user_id = row[0]

        if not user_id:
            return False

        if status == "waiting":
            cursor.execute("SELECT session_id FROM ExamSessions WHERE room_id = ? AND student_id = ?", (room_id, user_id))
            p_row = cursor.fetchone()
            if not p_row:
                cursor.execute("""
                    INSERT INTO ExamSessions (room_id, student_id, status, start_time)
                    VALUES (?, ?, 'active', GETDATE())
                """, (room_id, user_id))
            else:
                cursor.execute("""
                    UPDATE ExamSessions SET status = 'active', start_time = GETDATE()
                    WHERE session_id = ?
                """, (p_row[0],))
            conn.commit()
            return True
        else:
            cursor.execute("DELETE FROM ExamSessions WHERE room_id = ? AND student_id = ?", (room_id, user_id))
            conn.commit()
            return True
    finally:
        cursor.close()
        conn.close()

def delete_room(room_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Violations WHERE room_id = ?", (room_id,))
        cursor.execute("DELETE FROM DeviceChecks WHERE session_id IN (SELECT session_id FROM ExamSessions WHERE room_id = ?)", (room_id,))
        cursor.execute("DELETE FROM Snapshots WHERE session_id IN (SELECT session_id FROM ExamSessions WHERE room_id = ?)", (room_id,))
        cursor.execute("DELETE FROM CodeDrafts WHERE session_id IN (SELECT session_id FROM ExamSessions WHERE room_id = ?)", (room_id,))
        cursor.execute("DELETE FROM SupportRequests WHERE session_id IN (SELECT session_id FROM ExamSessions WHERE room_id = ?)", (room_id,))
        cursor.execute("DELETE FROM Submissions WHERE room_id = ?", (room_id,))
        cursor.execute("DELETE FROM ExamSessions WHERE room_id = ?", (room_id,))
        cursor.execute("DELETE FROM Questions WHERE room_id = ?", (room_id,))
        cursor.execute("DELETE FROM RoomProctors WHERE room_id = ?", (room_id,))
        cursor.execute("DELETE FROM Rooms WHERE room_id = ?", (room_id,))
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
                s.session_id,
                s.student_id,
                u.full_name AS student_name,
                u.username,
                u.identifier_code AS student_code,
                s.status,
                s.start_time AS started_at,
                COALESCE(DATEDIFF(MINUTE, s.start_time, GETDATE()), 0) AS duration_minutes,
                COALESCE(v_stat.violation_count, 0) AS violation_count,
                COALESCE(v_stat.pending_violation_count, 0) AS pending_violation_count,
                COALESCE(v_stat.confirmed_violation_count, 0) AS confirmed_violation_count,
                v_stat.last_snapshot_url
            FROM ExamSessions s
            JOIN Users u ON s.student_id = u.user_id
            LEFT JOIN (
                SELECT 
                    session_id,
                    COUNT(CASE WHEN review_status != 'rejected' THEN 1 END) AS violation_count,
                    COUNT(CASE WHEN review_status = 'pending' THEN 1 END) AS pending_violation_count,
                    COUNT(CASE WHEN review_status = 'confirmed' THEN 1 END) AS confirmed_violation_count,
                    MAX(evidence_url) AS last_snapshot_url
                FROM Violations
                GROUP BY session_id
            ) v_stat ON s.session_id = v_stat.session_id
            WHERE s.room_id = ?
            ORDER BY s.start_time DESC
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
                (SELECT COUNT(*) FROM Rooms WHERE is_active = 1) AS active_rooms_count,
                (SELECT COUNT(*) FROM Users) AS total_users_count,
                (SELECT COUNT(*) FROM ExamSessions WHERE status IN ('active', 'dang_lam')) AS active_sessions_count,
                (SELECT COUNT(*) FROM Submissions WHERE CAST(submitted_at AS DATE) = CAST(GETDATE() AS DATE)) AS today_submissions_count,
                (SELECT COUNT(*) FROM Violations WHERE CAST(detected_at AS DATE) = CAST(GETDATE() AS DATE)) AS today_violations_count
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
            "SELECT 1 FROM ClassEnrollments WHERE class_id = ? AND student_id = ?",
            (class_id, student_id),
        )
        return cursor.fetchone() is not None
    finally:
        cursor.close()
        conn.close()

def get_class_metadata(class_id: int) -> Optional[Dict]:
    """Lấy thông tin mã lớp, tên lớp, mã môn học từ Classes"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT class_code, class_name, course_code AS course_name FROM Classes WHERE class_id = ?",
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
    """Tạo hoặc kích hoạt lại phiên làm bài (ExamSessions) ở trạng thái active khi sinh viên join phòng"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT TOP 1 session_id, status FROM ExamSessions WHERE room_id = ? AND student_id = ? ORDER BY session_id DESC",
            (room_id, student_id),
        )
        row = cursor.fetchone()
        ua_trimmed = (user_agent or "")[:250] or None
        if row:
            session_id = row[0]
            if row[1] not in ("completed", "da_nop", "submitted"):
                cursor.execute(
                    """
                    UPDATE ExamSessions
                    SET status = 'active',
                        ip_address = COALESCE(?, ip_address),
                        user_agent = COALESCE(?, user_agent)
                    WHERE session_id = ?
                    """,
                    (ip_address, ua_trimmed, session_id),
                )
                conn.commit()
            return session_id

        cursor.execute(
            """
            INSERT INTO ExamSessions (room_id, student_id, ip_address, user_agent, status, start_time)
            OUTPUT INSERTED.session_id
            VALUES (?, ?, ?, ?, 'active', GETDATE())
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
    """Lưu trạng thái kiểm tra Camera/Mic của sinh viên vào bảng DeviceChecks"""
    session_id = upsert_student_lobby_session(room_id, student_id, user_agent=browser_info)
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        du_dieu_kien = 1 if (camera_ready and mic_ready) else 0
        cam_bit = 1 if camera_ready else 0
        mic_bit = 1 if mic_ready else 0

        cursor.execute(
            "SELECT TOP 1 check_id FROM DeviceChecks WHERE session_id = ? AND student_id = ?",
            (session_id, student_id),
        )
        existing = cursor.fetchone()
        if existing:
            cursor.execute(
                """
                UPDATE DeviceChecks
                SET camera_status = ?,
                    mic_status = ?,
                    network_latency_ms = ?,
                    os_info = COALESCE(?, os_info),
                    browser_info = COALESCE(?, browser_info),
                    is_passed = ?,
                    checked_at = GETDATE()
                WHERE check_id = ?
                """,
                (cam_bit, mic_bit, network_latency_ms, os_info, browser_info, du_dieu_kien, existing[0]),
            )
        else:
            cursor.execute(
                """
                INSERT INTO DeviceChecks (
                    session_id, student_id, camera_status, mic_status,
                    network_latency_ms, os_info, browser_info,
                    is_passed, checked_at
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
