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
            u.ma_nguoi_dung AS student_id,
            u.ten_dang_nhap AS username,
            u.ho_va_ten AS student_name,
            u.ma_dinh_danh AS student_code,
            COALESCE(sub_summary.total_score, 0) AS total_score,
            COALESCE(sub_summary.solved_questions, 0) AS solved_questions,
            COALESCE(sub_summary.submission_count, 0) AS total_submissions,
            sub_summary.last_submission_time
        FROM NguoiDung u
        JOIN (
            SELECT ma_sinh_vien FROM SinhVienLopHoc WHERE ma_phong = ?
            UNION
            SELECT ma_sinh_vien FROM PhienLamBai WHERE ma_phong = ?
        ) enr ON u.ma_nguoi_dung = enr.ma_sinh_vien
        LEFT JOIN (
            SELECT 
                s.ma_sinh_vien AS student_id,
                SUM(gr_points.points_earned) AS total_score,
                COUNT(DISTINCT CASE WHEN gr_points.points_earned > 0 THEN s.ma_cau_hoi END) AS solved_questions,
                COUNT(s.ma_bai_nop) AS submission_count,
                MAX(s.thoi_gian_nop) AS last_submission_time
            FROM BaiNop s
            CROSS APPLY (
                SELECT COALESCE(SUM(tc.diem_test), 0) AS points_earned
                FROM KetQuaChamDiem gr
                JOIN BoKiemThu tc ON gr.ma_test_case = tc.ma_test_case
                WHERE gr.ma_bai_nop = s.ma_bai_nop AND gr.la_chinh_xac = 1
            ) gr_points
            WHERE s.ma_phong = ?
            GROUP BY s.ma_sinh_vien
        ) sub_summary ON u.ma_nguoi_dung = sub_summary.student_id
        ORDER BY total_score DESC, last_submission_time ASC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id, room_id, room_id))
        rows = cursor.fetchall()
        scoreboard = rows_to_dicts(cursor, rows)
        
        # Gán thứ hạng (Rank)
        for rank, item in enumerate(scoreboard, start=1):
            item["rank"] = rank
            item["total_score"] = float(item["total_score"]) if item["total_score"] is not None else 0.0
        return scoreboard
