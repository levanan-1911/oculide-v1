from typing import List, Dict, Any, Optional
from core.database import get_db_cursor, rows_to_dicts

def get_student_exam_results(room_id: int, student_id: int) -> List[Dict[str, Any]]:
    """Gọi Stored Procedure sp_GetStudentExamResults lấy kết quả thi chi tiết theo câu hỏi"""
    sql = "EXEC sp_GetStudentExamResults @room_id = ?, @student_id = ?"
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id, student_id))
        rows = cursor.fetchall()
        return rows_to_dicts(cursor, rows)

def get_online_students_in_room(room_id: int) -> List[Dict[str, Any]]:
    """Gọi Stored Procedure sp_GetOnlineStudents lấy danh sách sinh viên đang online và số vi phạm"""
    sql = "EXEC sp_GetOnlineStudents @room_id = ?"
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id,))
        rows = cursor.fetchall()
        return rows_to_dicts(cursor, rows)

def get_room_scoreboard(room_id: int) -> List[Dict[str, Any]]:
    """
    Tính toán bảng điểm thời gian thực (Scoreboard) của toàn bộ sinh viên trong phòng:
    Tổng điểm đạt được, số câu đã giải, số lần nộp bài, thời gian nộp bài cuối cùng.
    """
    sql = """
        SELECT 
            u.user_id as student_id,
            u.username,
            u.full_name as student_name,
            u.student_id as student_code,
            COALESCE(sub_summary.total_score, 0) as total_score,
            COALESCE(sub_summary.solved_questions, 0) as solved_questions,
            COALESCE(sub_summary.submission_count, 0) as total_submissions,
            sub_summary.last_submission_time
        FROM Users u
        JOIN Enrollments e ON u.user_id = e.student_id
        LEFT JOIN (
            SELECT 
                s.student_id,
                SUM(gr_points.points_earned) as total_score,
                COUNT(DISTINCT CASE WHEN gr_points.points_earned > 0 THEN s.question_id END) as solved_questions,
                COUNT(s.submission_id) as submission_count,
                MAX(s.submitted_at) as last_submission_time
            FROM Submissions s
            CROSS APPLY (
                SELECT COALESCE(SUM(tc.points), 0) as points_earned
                FROM GradingResults gr
                JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
            ) gr_points
            WHERE s.room_id = ?
            GROUP BY s.student_id
        ) sub_summary ON u.user_id = sub_summary.student_id
        WHERE e.room_id = ?
        ORDER BY total_score DESC, last_submission_time ASC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id, room_id))
        rows = cursor.fetchall()
        scoreboard = rows_to_dicts(cursor, rows)
        
        # Gán thứ hạng (Rank)
        for rank, item in enumerate(scoreboard, start=1):
            item["rank"] = rank
        return scoreboard
