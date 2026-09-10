from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_submission_by_id(submission_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.submission_id, s.room_id, s.student_id, s.question_id, s.attempt_number,
                   s.code_content, s.language, s.submitted_at, s.status,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) as total_points,
                   q.max_points
            FROM Submissions s
            JOIN Questions q ON s.question_id = q.question_id
            WHERE s.submission_id = ?
        """, (submission_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            sub = dict(zip(columns, row))
            sub["grading_results"] = get_grading_results(submission_id)
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
            SELECT s.submission_id, s.room_id, s.student_id, s.question_id, s.attempt_number,
                   s.code_content, s.language, s.submitted_at, s.status,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) as total_points,
                   q.max_points
            FROM Submissions s
            JOIN Questions q ON s.question_id = q.question_id
            {where_sql}
            ORDER BY s.submitted_at DESC
        """, tuple(params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            item = dict(zip(columns, row))
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
            SELECT s.submission_id, s.room_id, s.student_id, s.question_id, s.attempt_number,
                   s.code_content, s.language, s.submitted_at, s.status,
                   u.full_name as student_name, u.student_id as student_code,
                   COALESCE((
                       SELECT SUM(tc.points)
                       FROM GradingResults gr
                       JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                       WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                   ), 0) as total_points
            FROM Submissions s
            JOIN Users u ON s.student_id = u.user_id
            WHERE s.question_id = ?
            ORDER BY s.submitted_at DESC
        """, (question_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
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
        cursor.execute("""
            INSERT INTO Submissions (room_id, student_id, question_id, attempt_number, code_content, language, status)
            OUTPUT inserted.submission_id, inserted.room_id, inserted.student_id, inserted.question_id,
                   inserted.attempt_number, inserted.code_content, inserted.language, inserted.submitted_at, inserted.status
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, question_id, attempt_number, code_content, language, status))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            sub = dict(zip(columns, row))
            sub["total_points"] = 0.0
            sub["grading_results"] = []
            return sub
        raise Exception("Không thể tạo bản ghi bài nộp")
    finally:
        cursor.close()
        conn.close()

def update_submission_status(submission_id: int, status: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE Submissions SET status = ? WHERE submission_id = ?", (status, submission_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_grading_results(submission_id: int) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT result_id, submission_id, test_case_id, is_passed,
                   actual_output, execution_time_ms, memory_used_mb,
                   error_message, graded_at
            FROM GradingResults
            WHERE submission_id = ?
            ORDER BY result_id ASC
        """, (submission_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
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
                    actual_output, execution_time_ms, memory_used_mb, error_message
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                submission_id,
                r["test_case_id"],
                1 if r.get("is_passed") else 0,
                r.get("actual_output"),
                r.get("execution_time_ms"),
                r.get("memory_used_mb"),
                r.get("error_message")
            ))
        cursor.execute("UPDATE Submissions SET status = ? WHERE submission_id = ?", (final_status, submission_id))
        return True

