from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict, Any
from database.room_db import get_current_vn_time

# Trọng số rủi ro chuẩn cho Risk Engine
SEVERITY_RISK_WEIGHTS: Dict[str, int] = {
    "low": 0,
    "medium": 2,
    "warning": 2,
    "high": 4,
    "critical": 6,
}
LOCK_RISK_THRESHOLD = 10


def compute_risk_score_from_items(items: List[Dict[str, Any]]) -> int:
    """Tính tổng điểm rủi ro có trọng số từ danh sách vi phạm (bỏ qua vi phạm đã bị bác bỏ)."""
    total = 0
    for item in items:
        if item.get("review_status") == "rejected":
            continue
        sev = str(item.get("severity") or "warning").lower()
        total += SEVERITY_RISK_WEIGHTS.get(sev, 2)
    return total


def get_session_risk_score(session_id: int) -> Dict[str, Any]:
    """Truy vấn tổng điểm rủi ro có trọng số của một phiên thi từ CSDL."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN LOWER(severity) = 'critical' THEN 6
                    WHEN LOWER(severity) = 'high' THEN 4
                    WHEN LOWER(severity) IN ('medium', 'warning') THEN 2
                    ELSE 0
                END
            ), 0)
            FROM Violations
            WHERE session_id = ?
              AND (review_status IS NULL OR review_status != 'rejected')
        """, (session_id,))
        row = cursor.fetchone()
        score = int(row[0]) if row and row[0] is not None else 0
        return {
            "session_id": session_id,
            "risk_score": score,
            "threshold": LOCK_RISK_THRESHOLD,
            "is_lock_triggered": score >= LOCK_RISK_THRESHOLD,
        }
    finally:
        cursor.close()
        conn.close()


def get_ai_precision_metrics(room_id: Optional[int] = None) -> Dict[str, Any]:
    """Thống kê vòng phản hồi (Precision) từ kết quả giám thị xác nhận/bác bỏ cảnh báo AI."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_sql = "WHERE room_id = ?" if room_id is not None else ""
        params = (room_id,) if room_id is not None else ()
        cursor.execute(f"""
            SELECT violation_type,
                   SUM(CASE WHEN review_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_cnt,
                   SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) AS rejected_cnt,
                   SUM(CASE WHEN review_status IS NULL OR review_status = 'pending' THEN 1 ELSE 0 END) AS pending_cnt
            FROM Violations
            {where_sql}
            GROUP BY violation_type
        """, params)
        rows = cursor.fetchall()
        by_type = []
        total_confirmed = 0
        total_rejected = 0
        total_pending = 0
        for row in rows:
            conf = int(row[1] or 0)
            rej = int(row[2] or 0)
            pend = int(row[3] or 0)
            reviewed = conf + rej
            total_confirmed += conf
            total_rejected += rej
            total_pending += pend
            by_type.append({
                "violation_type": row[0],
                "confirmed": conf,
                "rejected": rej,
                "pending": pend,
                "precision_pct": round((conf / reviewed) * 100, 1) if reviewed > 0 else None,
            })
        total_reviewed = total_confirmed + total_rejected
        return {
            "room_id": room_id,
            "total_confirmed": total_confirmed,
            "total_rejected": total_rejected,
            "total_pending": total_pending,
            "overall_precision_pct": round((total_confirmed / total_reviewed) * 100, 1) if total_reviewed > 0 else None,
            "by_type": by_type,
        }
    finally:
        cursor.close()
        conn.close()

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
        # Lấy room_id từ session
        cursor.execute("SELECT room_id FROM ExamSessions WHERE session_id = ?", (session_id,))
        sess_row = cursor.fetchone()
        room_id = sess_row[0] if sess_row else 1

        now_vn = get_current_vn_time()
        cursor.execute("""
            INSERT INTO Violations (
                session_id, room_id, student_id, violation_type, 
                severity, description, evidence_url, detected_at
            )
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type, 
                   inserted.severity, inserted.description, inserted.evidence_url, inserted.detected_at, 
                   inserted.is_reviewed, inserted.review_status, inserted.reviewed_by, inserted.reviewed_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (session_id, room_id, student_id, violation_type, severity, description, snapshot_url, now_vn))
        row = cursor.fetchone()

        # Risk Engine: Tính tổng điểm rủi ro có trọng số (medium/warning=2, high=4, critical=6; bỏ qua low & rejected)
        cursor.execute("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN LOWER(severity) = 'critical' THEN 6
                    WHEN LOWER(severity) = 'high' THEN 4
                    WHEN LOWER(severity) IN ('medium', 'warning') THEN 2
                    ELSE 0
                END
            ), 0)
            FROM Violations
            WHERE session_id = ?
              AND (review_status IS NULL OR review_status != 'rejected')
        """, (session_id,))
        risk_row = cursor.fetchone()
        risk_score = int(risk_row[0]) if risk_row and risk_row[0] is not None else 0
        if risk_score >= LOCK_RISK_THRESHOLD:
            # Khóa phiên thi ở mức CSDL khi điểm rủi ro đạt ngưỡng >= 10
            cursor.execute(
                "UPDATE ExamSessions SET status = 'locked' WHERE session_id = ? AND status NOT IN ('completed', 'da_nop', 'submitted')",
                (session_id,)
            )

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
            SELECT violation_id, 
                   session_id, 
                   student_id, 
                   violation_type, 
                   severity,
                   description, 
                   evidence_url AS snapshot_url, 
                   detected_at, 
                   is_reviewed, 
                   review_status, 
                   reviewed_by, 
                   reviewed_at
            FROM Violations 
            WHERE session_id = ?
            ORDER BY detected_at DESC
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

def get_violations_by_student(student_id: int, room_id: Optional[int] = None, class_id: Optional[int] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["v.student_id = ?"]
        params = [student_id]
        if room_id:
            where.append("(v.room_id = ? OR s.room_id = ?)")
            params.extend([room_id, room_id])
        if class_id:
            where.append("p.class_id = ?")
            params.append(class_id)

        where_sql = " AND ".join(where)
        cursor.execute(f"""
            SELECT v.violation_id, 
                   v.session_id, 
                   v.student_id, 
                   COALESCE(v.room_id, s.room_id) AS room_id,
                   p.room_code,
                   p.room_name,
                   p.class_id,
                   c.class_code,
                   c.class_name,
                   v.violation_type, 
                   v.severity,
                   v.description, 
                   v.evidence_url AS snapshot_url, 
                   v.detected_at, 
                   v.is_reviewed, 
                   v.review_status, 
                   v.reviewed_by, 
                   v.reviewed_at
            FROM Violations v
            LEFT JOIN ExamSessions s ON v.session_id = s.session_id
            LEFT JOIN Rooms p ON COALESCE(v.room_id, s.room_id) = p.room_id
            LEFT JOIN Classes c ON p.class_id = c.class_id
            WHERE {where_sql}
            ORDER BY v.detected_at DESC
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

def get_violations_by_room(room_id: int, review_status: Optional[str] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["s.room_id = ?"]
        params = [room_id]
        if review_status:
            where.append("v.review_status = ?")
            params.append(review_status)
        where_sql = f"WHERE {' AND '.join(where)}"
        cursor.execute(f"""
            SELECT v.violation_id, 
                   v.session_id, 
                   v.student_id, 
                   COALESCE(v.room_id, s.room_id) AS room_id,
                   p.room_code,
                   p.room_name,
                   p.class_id,
                   c.class_code,
                   c.class_name,
                   v.violation_type, 
                   v.severity,
                   v.description, 
                   v.evidence_url AS snapshot_url, 
                   v.detected_at, 
                   v.is_reviewed, 
                   v.review_status, 
                   v.reviewed_by, 
                   v.reviewed_at, 
                   u.full_name AS student_name, 
                   u.identifier_code AS student_code
            FROM Violations v
            JOIN ExamSessions s ON v.session_id = s.session_id
            LEFT JOIN Rooms p ON COALESCE(v.room_id, s.room_id) = p.room_id
            LEFT JOIN Classes c ON p.class_id = c.class_id
            JOIN Users u ON v.student_id = u.user_id
            {where_sql}
            ORDER BY v.detected_at DESC
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

def get_violations_by_class(class_id: int, review_status: Optional[str] = None) -> List[Dict]:
    """Lấy danh sách toàn bộ vi phạm của sinh viên thuộc một lớp học phần"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["p.class_id = ?"]
        params = [class_id]
        if review_status:
            where.append("v.review_status = ?")
            params.append(review_status)
        where_sql = f"WHERE {' AND '.join(where)}"
        cursor.execute(f"""
            SELECT v.violation_id, 
                   v.session_id, 
                   v.student_id, 
                   COALESCE(v.room_id, s.room_id) AS room_id,
                   p.room_code,
                   p.room_name,
                   p.class_id,
                   c.class_code,
                   c.class_name,
                   v.violation_type, 
                   v.severity,
                   v.description, 
                   v.evidence_url AS snapshot_url, 
                   v.detected_at, 
                   v.is_reviewed, 
                   v.review_status, 
                   v.reviewed_by, 
                   v.reviewed_at, 
                   u.full_name AS student_name, 
                   u.identifier_code AS student_code
            FROM Violations v
            JOIN ExamSessions s ON v.session_id = s.session_id
            JOIN Rooms p ON COALESCE(v.room_id, s.room_id) = p.room_id
            JOIN Classes c ON p.class_id = c.class_id
            JOIN Users u ON v.student_id = u.user_id
            {where_sql}
            ORDER BY v.detected_at DESC
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
        cursor.close()
        conn.close()

def update_violation_review(violation_id: int, reviewed_by: int, review_status: str = "confirmed") -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT is_reviewed, review_status FROM Violations WHERE violation_id = ?",
            (violation_id,),
        )
        existing = cursor.fetchone()
        if not existing:
            return None
        existing_reviewed = bool(existing[0])
        existing_status = str(existing[1] or "").lower()
        if existing_reviewed or existing_status in ("confirmed", "rejected"):
            raise ValueError("Cảnh báo này đã được thẩm định trước đó, không thể chỉnh sửa lại quyết định.")

        cursor.execute("""
            UPDATE Violations 
            SET is_reviewed = 1, review_status = ?, reviewed_by = ?, reviewed_at = GETDATE()
            OUTPUT inserted.violation_id, inserted.session_id, inserted.student_id, inserted.violation_type,
                   inserted.severity, inserted.description, inserted.evidence_url, inserted.detected_at,
                   inserted.is_reviewed, inserted.review_status, inserted.reviewed_by, inserted.reviewed_at
            WHERE violation_id = ?
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
