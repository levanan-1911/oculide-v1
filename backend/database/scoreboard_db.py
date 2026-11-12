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
            SELECT svl.ma_sinh_vien
            FROM SinhVienLopHoc svl
            JOIN Phong pt ON pt.ma_lop = svl.ma_lop
            WHERE pt.ma_phong = ?
            UNION
            SELECT ma_sinh_vien FROM PhienLamBai WHERE ma_phong = ?
        ) enr ON u.ma_nguoi_dung = enr.ma_sinh_vien
        LEFT JOIN (
            SELECT
                best_per_q.student_id,
                SUM(best_per_q.best_points) AS total_score,
                COUNT(DISTINCT CASE WHEN best_per_q.best_points > 0 THEN best_per_q.ma_cau_hoi END) AS solved_questions,
                SUM(best_per_q.attempt_count) AS submission_count,
                MAX(best_per_q.last_time) AS last_submission_time
            FROM (
                SELECT
                    s.ma_sinh_vien AS student_id,
                    s.ma_cau_hoi,
                    MAX(gr_points.points_earned) AS best_points,
                    COUNT(s.ma_bai_nop) AS attempt_count,
                    MAX(s.thoi_gian_nop) AS last_time
                FROM BaiNop s
                CROSS APPLY (
                    SELECT COALESCE(SUM(tc.diem_test), 0) AS points_earned
                    FROM KetQuaChamDiem gr
                    JOIN BoKiemThu tc ON gr.ma_test_case = tc.ma_test_case
                    WHERE gr.ma_bai_nop = s.ma_bai_nop AND gr.la_chinh_xac = 1
                ) gr_points
                WHERE s.ma_phong = ?
                GROUP BY s.ma_sinh_vien, s.ma_cau_hoi
            ) best_per_q
            GROUP BY best_per_q.student_id
        ) sub_summary ON u.ma_nguoi_dung = sub_summary.student_id
        ORDER BY total_score DESC, last_submission_time ASC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("""
            SELECT COALESCE(
                (
                    SELECT SUM(COALESCE(ctd.so_diem, q.diem_toi_da))
                    FROM Phong p
                    JOIN CauHoiTrongDe ctd ON p.ma_de_mau = ctd.ma_de_thi
                    JOIN CauHoi q ON ctd.ma_cau_hoi = q.ma_cau_hoi
                    WHERE p.ma_phong = ?
                ),
                (
                    SELECT SUM(diem_toi_da)
                    FROM CauHoi
                    WHERE ma_phong = ? AND dang_hoat_dong = 1
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
