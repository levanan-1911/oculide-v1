from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_question_by_id(question_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_cau_hoi AS question_id, 
                   ma_phong AS room_id, 
                   thu_tu_cau AS question_order, 
                   tieu_de AS question_title, 
                   noi_dung_de AS question_description,
                   loai_cau_hoi AS question_type, 
                   ngon_ngu_cho_phep AS programming_language, 
                   diem_toi_da AS max_points, 
                   gioi_han_thoi_gian_ms AS time_limit_minutes,
                   gioi_han_bo_nho_mb AS memory_limit_mb, 
                   dang_hoat_dong AS is_active, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM CauHoi 
            WHERE ma_cau_hoi = ?
        """, (question_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            q = dict(zip(columns, row))
            q["is_active"] = bool(q["is_active"])
            q["test_cases"] = get_test_cases_by_question(question_id)
            return q
        return None
    finally:
        cursor.close()
        conn.close()

def get_questions_by_room(room_id: int, include_hidden_tests: bool = False) -> List[Dict]:
    """Lấy toàn bộ danh sách câu hỏi trong phòng kèm test cases mà không bị lỗi N+1 queries"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_cau_hoi AS question_id, 
                   ma_phong AS room_id, 
                   thu_tu_cau AS question_order, 
                   tieu_de AS question_title, 
                   noi_dung_de AS question_description,
                   loai_cau_hoi AS question_type, 
                   ngon_ngu_cho_phep AS programming_language, 
                   diem_toi_da AS max_points, 
                   gioi_han_thoi_gian_ms AS time_limit_minutes,
                   gioi_han_bo_nho_mb AS memory_limit_mb, 
                   dang_hoat_dong AS is_active, 
                   ngay_tao AS created_at, 
                   ngay_cap_nhat AS updated_at
            FROM CauHoi 
            WHERE ma_phong = ? AND dang_hoat_dong = 1
            ORDER BY thu_tu_cau ASC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        questions = []
        for row in rows:
            q_dict = dict(zip(columns, row))
            q_dict["is_active"] = bool(q_dict["is_active"])
            questions.append(q_dict)
        
        if not questions:
            return []
            
        # Tối ưu hóa: Lấy toàn bộ test cases của tất cả câu hỏi trong 1 query duy nhất
        q_ids = [q["question_id"] for q in questions]
        placeholders = ",".join("?" for _ in q_ids)
        hidden_filter = "" if include_hidden_tests else "AND la_test_an = 0"
        
        tc_sql = f"""
            SELECT ma_test_case AS test_case_id, 
                   ma_cau_hoi AS question_id, 
                   du_lieu_dau_vao AS input_data, 
                   ket_qua_mong_doi AS expected_output, 
                   la_test_an AS is_hidden, 
                   diem_test AS points, 
                   ngay_tao AS created_at
            FROM BoKiemThu
            WHERE ma_cau_hoi IN ({placeholders}) {hidden_filter}
            ORDER BY ma_test_case ASC
        """
        cursor.execute(tc_sql, tuple(q_ids))
        tc_rows = cursor.fetchall()
        tc_columns = [column[0] for column in cursor.description]
        all_test_cases = []
        for r in tc_rows:
            tc_dict = dict(zip(tc_columns, r))
            tc_dict["is_hidden"] = bool(tc_dict["is_hidden"])
            all_test_cases.append(tc_dict)
        
        # Gom nhóm test cases theo question_id trong bộ nhớ
        tc_map: Dict[int, List[Dict]] = {qid: [] for qid in q_ids}
        for tc in all_test_cases:
            tc_map[tc["question_id"]].append(tc)
            
        for q in questions:
            q["test_cases"] = tc_map.get(q["question_id"], [])
            
        return questions
    finally:
        cursor.close()
        conn.close()

def create_question(
    room_id: int,
    question_order: int,
    question_title: str,
    question_description: str,
    question_type: str,
    programming_language: Optional[str] = "python",
    max_points: float = 10.0,
    time_limit_minutes: Optional[int] = None,
    memory_limit_mb: Optional[int] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO CauHoi (
                ma_phong, thu_tu_cau, tieu_de, noi_dung_de,
                loai_cau_hoi, ngon_ngu_cho_phep, diem_toi_da,
                gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb
            )
            OUTPUT inserted.ma_cau_hoi, inserted.ma_phong, inserted.thu_tu_cau,
                   inserted.tieu_de, inserted.noi_dung_de, inserted.loai_cau_hoi,
                   inserted.ngon_ngu_cho_phep, inserted.diem_toi_da, inserted.gioi_han_thoi_gian_ms,
                   inserted.gioi_han_bo_nho_mb, inserted.dang_hoat_dong, inserted.ngay_tao, inserted.ngay_cap_nhat
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            room_id, question_order, question_title, question_description,
            question_type, programming_language, max_points,
            time_limit_minutes or 1000, memory_limit_mb or 256
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "question_id": row[0],
                "room_id": row[1],
                "question_order": row[2],
                "question_title": row[3],
                "question_description": row[4],
                "question_type": row[5],
                "programming_language": row[6],
                "max_points": float(row[7]),
                "time_limit_minutes": row[8],
                "memory_limit_mb": row[9],
                "is_active": bool(row[10]),
                "created_at": row[11],
                "updated_at": row[12],
                "test_cases": []
            }
        raise Exception("Không thể tạo câu hỏi mới")
    finally:
        cursor.close()
        conn.close()

def update_question(question_id: int, **kwargs) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        fields = []
        params = []
        mapping = {
            "question_order": "thu_tu_cau",
            "question_title": "tieu_de",
            "question_description": "noi_dung_de",
            "question_type": "loai_cau_hoi",
            "programming_language": "ngon_ngu_cho_phep",
            "max_points": "diem_toi_da",
            "time_limit_minutes": "gioi_han_thoi_gian_ms",
            "memory_limit_mb": "gioi_han_bo_nho_mb",
            "is_active": "dang_hoat_dong"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
                params.append(1 if key == "is_active" and value else (0 if key == "is_active" else value))
        if not fields:
            return get_question_by_id(question_id)
        params.append(question_id)
        cursor.execute(f"UPDATE CauHoi SET {', '.join(fields)}, ngay_cap_nhat = GETDATE() WHERE ma_cau_hoi = ?", tuple(params))
        conn.commit()
        return get_question_by_id(question_id)
    finally:
        cursor.close()
        conn.close()

def delete_question(question_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM CauHoi WHERE ma_cau_hoi = ?", (question_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

# ─── TEST CASES ─────────────────────────────────────────────────────────────
def get_test_cases_by_question(question_id: int, include_hidden: bool = True) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where_sql = "WHERE ma_cau_hoi = ?" if include_hidden else "WHERE ma_cau_hoi = ? AND la_test_an = 0"
        cursor.execute(f"""
            SELECT ma_test_case AS test_case_id, 
                   ma_cau_hoi AS question_id, 
                   du_lieu_dau_vao AS input_data, 
                   ket_qua_mong_doi AS expected_output, 
                   la_test_an AS is_hidden, 
                   diem_test AS points, 
                   ngay_tao AS created_at
            FROM BoKiemThu 
            {where_sql}
            ORDER BY ma_test_case ASC
        """, (question_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_hidden"] = bool(r["is_hidden"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def create_test_case(question_id: int, input_data: str, expected_output: str, is_hidden: bool = False, points: float = 0.0) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_an, diem_test)
            OUTPUT inserted.ma_test_case, inserted.ma_cau_hoi, inserted.du_lieu_dau_vao, 
                   inserted.ket_qua_mong_doi, inserted.la_test_an, inserted.diem_test, inserted.ngay_tao
            VALUES (?, ?, ?, ?, ?)
        """, (question_id, input_data, expected_output, 1 if is_hidden else 0, points))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "test_case_id": row[0],
                "question_id": row[1],
                "input_data": row[2],
                "expected_output": row[3],
                "is_hidden": bool(row[4]),
                "points": float(row[5]),
                "created_at": row[6]
            }
        raise Exception("Không thể tạo test case")
    finally:
        cursor.close()
        conn.close()

def delete_test_case(test_case_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM BoKiemThu WHERE ma_test_case = ?", (test_case_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()

def get_test_case_by_id(test_case_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_test_case AS test_case_id, 
                   ma_cau_hoi AS question_id, 
                   du_lieu_dau_vao AS input_data, 
                   ket_qua_mong_doi AS expected_output, 
                   la_test_an AS is_hidden, 
                   diem_test AS points, 
                   ngay_tao AS created_at
            FROM BoKiemThu 
            WHERE ma_test_case = ?
        """, (test_case_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            r = dict(zip(columns, row))
            r["is_hidden"] = bool(r["is_hidden"])
            return r
        return None
    finally:
        cursor.close()
        conn.close()

def update_test_case(test_case_id: int, **kwargs) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        fields = []
        params = []
        mapping = {
            "input_data": "du_lieu_dau_vao",
            "expected_output": "ket_qua_mong_doi",
            "is_hidden": "la_test_an",
            "points": "diem_test"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
                params.append(1 if key == "is_hidden" and value else (0 if key == "is_hidden" else value))
        if not fields:
            return get_test_case_by_id(test_case_id)
        params.append(test_case_id)
        cursor.execute(f"UPDATE BoKiemThu SET {', '.join(fields)} WHERE ma_test_case = ?", tuple(params))
        conn.commit()
        return get_test_case_by_id(test_case_id)
    finally:
        cursor.close()
        conn.close()
