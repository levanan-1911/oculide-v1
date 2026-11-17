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
            u.user_id AS student_id,
            u.username,
            u.full_name AS student_name,
            u.identifier_code AS student_code,
            COALESCE(sub_summary.total_score, 0) AS total_score,
            COALESCE(sub_summary.solved_questions, 0) AS solved_questions,
            COALESCE(sub_summary.submission_count, 0) AS total_submissions,
            sub_summary.last_submission_time
        FROM Users u
        JOIN (
            SELECT svl.student_id
            FROM ClassEnrollments svl
            JOIN Rooms pt ON pt.class_id = svl.class_id
            WHERE pt.room_id = ?
            UNION
            SELECT student_id FROM ExamSessions WHERE room_id = ?
        ) enr ON u.user_id = enr.student_id
        LEFT JOIN (
            SELECT
                best_per_q.student_id,
                SUM(best_per_q.best_points) AS total_score,
                COUNT(DISTINCT CASE WHEN best_per_q.best_points > 0 THEN best_per_q.question_id END) AS solved_questions,
                SUM(best_per_q.attempt_count) AS submission_count,
                MAX(best_per_q.last_time) AS last_submission_time
            FROM (
                SELECT
                    s.student_id,
                    s.question_id,
                    MAX(gr_points.points_earned) AS best_points,
                    COUNT(s.submission_id) AS attempt_count,
                    MAX(s.submitted_at) AS last_time
                FROM Submissions s
                CROSS APPLY (
                    SELECT COALESCE(SUM(tc.points), 0) AS points_earned
                    FROM GradingResults gr
                    JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
                    WHERE gr.submission_id = s.submission_id AND gr.is_passed = 1
                ) gr_points
                WHERE s.room_id = ?
                GROUP BY s.student_id, s.question_id
            ) best_per_q
            GROUP BY best_per_q.student_id
        ) sub_summary ON u.user_id = sub_summary.student_id
        ORDER BY total_score DESC, last_submission_time ASC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT COALESCE(
                (
                    SELECT SUM(COALESCE(ctd.points, q.max_points))
                    FROM Rooms p
                    JOIN TemplateQuestions ctd ON p.template_id = ctd.template_id
                    JOIN Questions q ON ctd.question_id = q.question_id
                    WHERE p.room_id = ?
                ),
                (
                    SELECT SUM(max_points)
                    FROM Questions
                    WHERE room_id = ? AND is_active = 1
                ),
                0
            )
        """, (room_id, room_id))
        max_pts_row = cursor.fetchone()
        max_room_points = float(max_pts_row[0]) if max_pts_row and max_pts_row[0] is not None else 0.0

        cursor.execute(sql, (room_id, room_id, room_id))
        rows = cursor.fetchall()
        scoreboard = rows_to_dicts(cursor, rows)
        
        # Gán thứ hạng (Rank) và điểm quy đổi thang 10
        for rank, item in enumerate(scoreboard, start=1):
            item["rank"] = rank
            raw_score = float(item["total_score"]) if item["total_score"] is not None else 0.0
            item["total_score"] = raw_score
            item["max_room_points"] = max_room_points
            item["score_scale_10"] = (
                round((raw_score / max_room_points) * 10.0, 1)
                if max_room_points > 0
                else raw_score
            )
        return scoreboard
