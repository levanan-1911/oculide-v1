from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict
from database.room_db import get_current_vn_time

def get_submission_by_id(submission_id: int, include_hidden_details: bool = True) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.submission_id, 
                   s.room_id, 
                   p.room_code,
                   p.room_name,
                   s.student_id, 
                   u.full_name AS student_name,
                   u.identifier_code AS student_code,
                   s.question_id, 
                   q.title AS question_title,
                   s.attempt_number,
                   s.code_content, 
                   s.programming_language AS language, 
                   s.submitted_at, 
                   s.grading_status AS status,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) AS total_points,
                   q.max_points
            FROM Submissions s
            JOIN Questions q ON s.question_id = q.question_id
            LEFT JOIN Rooms p ON s.room_id = p.room_id
            LEFT JOIN Users u ON s.student_id = u.user_id
            WHERE s.submission_id = ?
        """, (submission_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            sub = dict(zip(columns, row))
            sub["total_points"] = float(sub["total_points"]) if sub["total_points"] is not None else 0.0
            sub["max_points"] = float(sub["max_points"]) if sub["max_points"] is not None else 10.0
            sub["grading_results"] = get_grading_results(submission_id, include_hidden_details=include_hidden_details)
            if sub.get("max_points") and sub["max_points"] > 0:
                sub["score_percentage"] = round((sub["total_points"] / sub["max_points"]) * 100, 2)
            else:
                sub["score_percentage"] = 0.0
            return sub
        return None
    finally:
        cursor.close()
        conn.close()

def get_submissions_by_student(student_id: int, room_id: Optional[int] = None) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = ["s.student_id = ?"]
        params = [student_id]
        if room_id:
            where.append("s.room_id = ?")
            params.append(room_id)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT s.submission_id, 
                   s.room_id, 
                   p.room_code,
                   p.room_name,
                   lh.class_id,
                   lh.class_code,
                   lh.class_name,
                   lh.course_code AS course_name,
                   s.student_id, 
                   s.question_id, 
                   q.title AS question_title,
                   s.attempt_number,
                   s.code_content, 
                   s.programming_language AS language, 
                   s.submitted_at, 
                   s.grading_status AS status,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) AS total_points,
                   q.max_points
            FROM Submissions s
            JOIN Questions q ON s.question_id = q.question_id
            LEFT JOIN Rooms p ON s.room_id = p.room_id
            LEFT JOIN Classes lh ON p.class_id = lh.class_id
            {where_sql}
            ORDER BY s.submitted_at DESC
        """, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            item = dict(zip(columns, row))
            item["total_points"] = float(item["total_points"]) if item["total_points"] is not None else 0.0
            item["max_points"] = float(item["max_points"]) if item["max_points"] is not None else 10.0
            if item.get("max_points") and item["max_points"] > 0:
                item["score_percentage"] = round((item["total_points"] / item["max_points"]) * 100, 2)
            results.append(item)
        return results
    finally:
        cursor.close()
        conn.close()

def get_submissions_by_question(question_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.submission_id, 
                   s.room_id, 
                   s.student_id, 
                   s.question_id, 
                   s.attempt_number,
                   s.code_content, 
                   s.programming_language AS language, 
                   s.submitted_at, 
                   s.grading_status AS status,
                   u.full_name AS student_name, 
                   u.identifier_code AS student_code,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) AS total_points
            FROM Submissions s
            JOIN Users u ON s.student_id = u.user_id
            WHERE s.question_id = ?
            ORDER BY s.submitted_at DESC
        """, (question_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            item = dict(zip(columns, row))
            item["total_points"] = float(item["total_points"]) if item["total_points"] is not None else 0.0
            results.append(item)
        return results
    finally:
        cursor.close()
        conn.close()

def create_submission(
    room_id: int,
    student_id: int,
    question_id: int,
    code_content: str,
    language: str,
    attempt_number: int = 1,
    status: str = "pending"
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT COALESCE(MAX(attempt_number), 0)
            FROM Submissions
            WHERE room_id = ? AND student_id = ? AND question_id = ?
            """,
            (room_id, student_id, question_id),
        )
        max_attempt = cursor.fetchone()[0] or 0
        next_attempt = max(attempt_number, max_attempt + 1)

        now_vn = get_current_vn_time()
        cursor.execute("""
            INSERT INTO Submissions (
                room_id, student_id, question_id, attempt_number, 
                code_content, programming_language, grading_status, submitted_at
            )
            OUTPUT inserted.submission_id, inserted.room_id, inserted.student_id, inserted.question_id,
                   inserted.attempt_number, inserted.code_content, inserted.programming_language, inserted.submitted_at, inserted.grading_status
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, question_id, next_attempt, code_content, language, status, now_vn))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "submission_id": row[0],
                "room_id": row[1],
                "student_id": row[2],
                "question_id": row[3],
                "attempt_number": row[4],
                "code_content": row[5],
                "language": row[6],
                "submitted_at": row[7],
                "status": row[8],
                "total_points": 0.0,
                "grading_results": []
            }
        raise Exception("Không thể tạo bản ghi bài nộp")
    finally:
        cursor.close()
        conn.close()

def update_submission_status(submission_id: int, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Submissions SET grading_status = ? WHERE submission_id = ?", (status, submission_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_submissions_by_room(room_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.submission_id,
                   s.room_id,
                   p.room_code,
                   p.room_name,
                   s.student_id,
                   u.full_name AS student_name,
                   u.identifier_code AS student_code,
                   s.question_id,
                   q.title AS question_title,
                   s.attempt_number,
                   s.code_content,
                   s.programming_language AS language,
                   s.submitted_at,
                   s.grading_status AS status,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) AS total_points,
                   q.max_points
            FROM Submissions s
            JOIN Questions q ON s.question_id = q.question_id
            JOIN Users u ON s.student_id = u.user_id
            LEFT JOIN Rooms p ON s.room_id = p.room_id
            WHERE s.room_id = ?
            ORDER BY s.submitted_at DESC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            item = dict(zip(columns, row))
            item["total_points"] = float(item["total_points"]) if item["total_points"] is not None else 0.0
            item["max_points"] = float(item["max_points"]) if item["max_points"] is not None else 10.0
            if item["max_points"] > 0:
                item["score_percentage"] = round((item["total_points"] / item["max_points"]) * 100, 2)
            results.append(item)
        return results
    finally:
        cursor.close()
        conn.close()


def get_grading_results(submission_id: int, include_hidden_details: bool = True) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT gr.result_id, 
                   gr.submission_id, 
                   gr.test_case_id, 
                   gr.is_passed,
                   COALESCE(tc.is_hidden, 0) AS is_hidden,
                   tc.input_data,
                   tc.expected_output,
                   gr.actual_output, 
                   gr.execution_time_ms, 
                   gr.memory_used_mb, 
                   gr.error_message, 
                   gr.graded_at
            FROM GradingResults gr
            LEFT JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
            WHERE gr.submission_id = ?
            ORDER BY gr.result_id ASC
        """, (submission_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_passed"] = bool(r["is_passed"])
            r["is_hidden"] = bool(r.get("is_hidden"))
            if not include_hidden_details and r["is_hidden"]:
                r["input_data"] = "[Test case ẩn]"
                r["expected_output"] = "[Test case ẩn]"
                r["actual_output"] = "[Test case ẩn]"
                r["error_message"] = None
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def save_grading_results(submission_id: int, results: List[Dict], final_status: str = "completed") -> bool:
    """
    Lưu toàn bộ kết quả chấm từng test case vào GradingResults và cập nhật trạng thái
    Submissions nguyên khối (Atomic Transaction).
    """
    from core.database import get_db_cursor
    with get_db_cursor(commit=True) as cursor:
        for r in results:
            cursor.execute("""
                INSERT INTO GradingResults (
                    submission_id, test_case_id, is_passed,
                    actual_output, execution_time_ms, memory_used_mb, error_message, score_awarded
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                submission_id,
                r["test_case_id"],
                1 if r.get("is_passed") else 0,
                r.get("actual_output"),
                r.get("execution_time_ms") or 0,
                r.get("memory_used_mb") or 0,
                r.get("error_message"),
                r.get("points_earned") or (10.0 if r.get("is_passed") else 0.0)
            ))
        cursor.execute("UPDATE Submissions SET grading_status = ? WHERE submission_id = ?", (final_status, submission_id))
        return True

def get_stuck_submissions(older_than_seconds: int = 120) -> List[Dict]:
    """
    Truy vấn các bài nộp đang ở trạng thái 'grading' nhưng đã quá thời gian quy định
    (do worker bị crash đột ngột hoặc mất kết nối).
    """
    from core.database import get_db_cursor, rows_to_dicts
    sql = """
        SELECT submission_id, 
               room_id, 
               student_id, 
               question_id, 
               attempt_number, 
               code_content, 
               programming_language AS language, 
               submitted_at, 
               grading_status AS status
        FROM Submissions
        WHERE grading_status = 'grading' AND DATEDIFF(second, submitted_at, GETDATE()) > ?
    """
    with get_db_cursor() as cursor:
        cursor.execute(sql, (older_than_seconds,))
        rows = cursor.fetchall()
        return rows_to_dicts(cursor, rows)

def mark_submission_failed(submission_id: int, error_message: str = "Hệ thống tự phục hồi: Quá thời gian chấm bài do sự cố worker") -> bool:
    """
    Cập nhật trạng thái bài nộp thành 'failed' và lưu bản ghi giải thích lý do
    để giao diện sinh viên không bị treo vô hạn.
    """
    from core.database import get_db_cursor
    with get_db_cursor(commit=True) as cursor:
        cursor.execute("UPDATE Submissions SET grading_status = 'failed' WHERE submission_id = ?", (submission_id,))
        cursor.execute("SELECT COUNT(*) FROM GradingResults WHERE submission_id = ?", (submission_id,))
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute("""
                SELECT TOP 1 tc.test_case_id 
                FROM TestCases tc
                JOIN Submissions s ON tc.question_id = s.question_id
                WHERE s.submission_id = ?
            """, (submission_id,))
            tc_row = cursor.fetchone()
            if tc_row:
                cursor.execute("""
                    INSERT INTO GradingResults (submission_id, test_case_id, is_passed, error_message)
                    VALUES (?, ?, 0, ?)
                """, (submission_id, tc_row[0], error_message))
        return True

def get_grading_result_by_id(result_id: int) -> Optional[Dict]:
    """Lấy chi tiết một kết quả chấm bài theo result_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT result_id, 
                   submission_id, 
                   test_case_id, 
                   is_passed, 
                   actual_output, 
                   execution_time_ms, 
                   memory_used_mb, 
                   error_message, 
                   graded_at
            FROM GradingResults
            WHERE result_id = ?
        """, (result_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            res = dict(zip(columns, row))
            res["is_passed"] = bool(res["is_passed"])
            return res
        return None
    finally:
        cursor.close()
        conn.close()
