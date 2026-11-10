from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_submission_by_id(submission_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT s.ma_bai_nop AS submission_id, 
                   s.ma_phong AS room_id, 
                   s.ma_sinh_vien AS student_id, 
                   s.ma_cau_hoi AS question_id, 
                   s.lan_nop AS attempt_number,
                   s.ma_nguon_nop AS code_content, 
                   s.ngon_ngu AS language, 
                   s.thoi_gian_nop AS submitted_at, 
                   s.trang_thai_cham AS status,
                   COALESCE((
                       SELECT SUM(tc.diem_test)
                       FROM KetQuaChamDiem gr
                       JOIN BoKiemThu tc ON gr.ma_test_case = tc.ma_test_case
                       WHERE gr.ma_bai_nop = s.ma_bai_nop AND gr.la_chinh_xac = 1
                   ), 0) AS total_points,
                   q.diem_toi_da AS max_points
            FROM BaiNop s
            JOIN CauHoi q ON s.ma_cau_hoi = q.ma_cau_hoi
            WHERE s.ma_bai_nop = ?
        """, (submission_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            sub = dict(zip(columns, row))
            sub["total_points"] = float(sub["total_points"]) if sub["total_points"] is not None else 0.0
            sub["max_points"] = float(sub["max_points"]) if sub["max_points"] is not None else 10.0
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
        where = ["s.ma_sinh_vien = ?"]
        params = [student_id]
        if room_id:
            where.append("s.ma_phong = ?")
            params.append(room_id)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT s.ma_bai_nop AS submission_id, 
                   s.ma_phong AS room_id, 
                   s.ma_sinh_vien AS student_id, 
                   s.ma_cau_hoi AS question_id, 
                   s.lan_nop AS attempt_number,
                   s.ma_nguon_nop AS code_content, 
                   s.ngon_ngu AS language, 
                   s.thoi_gian_nop AS submitted_at, 
                   s.trang_thai_cham AS status,
                   COALESCE((
                       SELECT SUM(tc.diem_test)
                       FROM KetQuaChamDiem gr
                       JOIN BoKiemThu tc ON gr.ma_test_case = tc.ma_test_case
                       WHERE gr.ma_bai_nop = s.ma_bai_nop AND gr.la_chinh_xac = 1
                   ), 0) AS total_points,
                   q.diem_toi_da AS max_points
            FROM BaiNop s
            JOIN CauHoi q ON s.ma_cau_hoi = q.ma_cau_hoi
            {where_sql}
            ORDER BY s.thoi_gian_nop DESC
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
            SELECT s.ma_bai_nop AS submission_id, 
                   s.ma_phong AS room_id, 
                   s.ma_sinh_vien AS student_id, 
                   s.ma_cau_hoi AS question_id, 
                   s.lan_nop AS attempt_number,
                   s.ma_nguon_nop AS code_content, 
                   s.ngon_ngu AS language, 
                   s.thoi_gian_nop AS submitted_at, 
                   s.trang_thai_cham AS status,
                   u.ho_va_ten AS student_name, 
                   u.ma_dinh_danh AS student_code,
                   COALESCE((
                       SELECT SUM(tc.diem_test)
                       FROM KetQuaChamDiem gr
                       JOIN BoKiemThu tc ON gr.ma_test_case = tc.ma_test_case
                       WHERE gr.ma_bai_nop = s.ma_bai_nop AND gr.la_chinh_xac = 1
                   ), 0) AS total_points
            FROM BaiNop s
            JOIN NguoiDung u ON s.ma_sinh_vien = u.ma_nguoi_dung
            WHERE s.ma_cau_hoi = ?
            ORDER BY s.thoi_gian_nop DESC
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
        cursor.execute("""
            INSERT INTO BaiNop (ma_phong, ma_sinh_vien, ma_cau_hoi, lan_nop, ma_nguon_nop, ngon_ngu, trang_thai_cham)
            OUTPUT inserted.ma_bai_nop, inserted.ma_phong, inserted.ma_sinh_vien, inserted.ma_cau_hoi,
                   inserted.lan_nop, inserted.ma_nguon_nop, inserted.ngon_ngu, inserted.thoi_gian_nop, inserted.trang_thai_cham
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (room_id, student_id, question_id, attempt_number, code_content, language, status))
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
        cursor.execute("UPDATE BaiNop SET trang_thai_cham = ? WHERE ma_bai_nop = ?", (status, submission_id))
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
            SELECT ma_ket_qua AS result_id, 
                   ma_bai_nop AS submission_id, 
                   ma_test_case AS test_case_id, 
                   la_chinh_xac AS is_passed,
                   ket_qua_thuc_te AS actual_output, 
                   thoi_gian_chay_ms AS execution_time_ms, 
                   bo_nho_su_dung_mb AS memory_used_mb,
                   thong_bao_loi AS error_message, 
                   thoi_gian_cham AS graded_at
            FROM KetQuaChamDiem
            WHERE ma_bai_nop = ?
            ORDER BY ma_ket_qua ASC
        """, (submission_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_passed"] = bool(r["is_passed"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def save_grading_results(submission_id: int, results: List[Dict], final_status: str = "completed") -> bool:
    """
    Lưu toàn bộ kết quả chấm từng test case vào KetQuaChamDiem và cập nhật trạng thái
    BaiNop nguyên khối (Atomic Transaction).
    """
    from core.database import get_db_cursor
    with get_db_cursor(commit=True) as cursor:
        for r in results:
            cursor.execute("""
                INSERT INTO KetQuaChamDiem (
                    ma_bai_nop, ma_test_case, la_chinh_xac,
                    ket_qua_thuc_te, thoi_gian_chay_ms, bo_nho_su_dung_mb, thong_bao_loi, diem_dat_duoc
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
        cursor.execute("UPDATE BaiNop SET trang_thai_cham = ? WHERE ma_bai_nop = ?", (final_status, submission_id))
        return True

def get_stuck_submissions(older_than_seconds: int = 120) -> List[Dict]:
    """
    Truy vấn các bài nộp đang ở trạng thái 'grading' nhưng đã quá thời gian quy định
    (do worker bị crash đột ngột hoặc mất kết nối).
    """
    from core.database import get_db_cursor, rows_to_dicts
    sql = """
        SELECT ma_bai_nop AS submission_id, 
               ma_phong AS room_id, 
               ma_sinh_vien AS student_id, 
               ma_cau_hoi AS question_id, 
               lan_nop AS attempt_number,
               ma_nguon_nop AS code_content, 
               ngon_ngu AS language, 
               thoi_gian_nop AS submitted_at, 
               trang_thai_cham AS status
        FROM BaiNop
        WHERE trang_thai_cham = 'grading' AND DATEDIFF(second, thoi_gian_nop, GETDATE()) > ?
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
        cursor.execute("UPDATE BaiNop SET trang_thai_cham = 'failed' WHERE ma_bai_nop = ?", (submission_id,))
        cursor.execute("SELECT COUNT(*) FROM KetQuaChamDiem WHERE ma_bai_nop = ?", (submission_id,))
        count = cursor.fetchone()[0]
        if count == 0:
            cursor.execute("""
                SELECT TOP 1 tc.ma_test_case 
                FROM BoKiemThu tc
                JOIN BaiNop s ON tc.ma_cau_hoi = s.ma_cau_hoi
                WHERE s.ma_bai_nop = ?
            """, (submission_id,))
            tc_row = cursor.fetchone()
            if tc_row:
                cursor.execute("""
                    INSERT INTO KetQuaChamDiem (ma_bai_nop, ma_test_case, la_chinh_xac, thong_bao_loi)
                    VALUES (?, ?, 0, ?)
                """, (submission_id, tc_row[0], error_message))
        return True

def get_grading_result_by_id(result_id: int) -> Optional[Dict]:
    """Lấy chi tiết một kết quả chấm bài theo result_id"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_ket_qua AS result_id, 
                   ma_bai_nop AS submission_id, 
                   ma_test_case AS test_case_id, 
                   la_chinh_xac AS is_passed,
                   ket_qua_thuc_te AS actual_output, 
                   thoi_gian_chay_ms AS execution_time_ms, 
                   bo_nho_su_dung_mb AS memory_used_mb,
                   thong_bao_loi AS error_message, 
                   thoi_gian_cham AS graded_at
            FROM KetQuaChamDiem
            WHERE ma_ket_qua = ?
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
