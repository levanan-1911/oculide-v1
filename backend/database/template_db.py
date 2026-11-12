from typing import Optional, List, Dict, Any, Union
import uuid
from core.config import get_db_connection


def _resolve_template_pk(cursor, identifier: Union[int, str]) -> Optional[int]:
    """Giải mã template_id (int) hoặc ma_de (str) thành ma_de_thi (int)"""
    try:
        val_int = int(identifier)
        cursor.execute("SELECT ma_de_thi FROM BoDeMau WHERE ma_de_thi = ?", (val_int,))
        row = cursor.fetchone()
        if row:
            return row[0]
    except (ValueError, TypeError):
        pass

    cursor.execute("SELECT ma_de_thi FROM BoDeMau WHERE ma_de = ?", (str(identifier),))
    row = cursor.fetchone()
    return row[0] if row else None


def _fetch_questions_and_testcases(cursor, question_ids: List[int], include_hidden_tests: bool = True) -> Dict[int, List[Dict]]:
    """Nạp toàn bộ test cases (BoKiemThu) cho danh sách câu hỏi (Zero N+1)"""
    if not question_ids:
        return {}
    placeholders = ",".join("?" for _ in question_ids)
    hidden_filter = "" if include_hidden_tests else "AND la_test_an = 0"
    cursor.execute(
        f"""
        SELECT ma_test_case,
               ma_cau_hoi,
               du_lieu_dau_vao,
               ket_qua_mong_doi,
               la_test_vi_du,
               la_test_an,
               diem_test
        FROM BoKiemThu
        WHERE ma_cau_hoi IN ({placeholders}) {hidden_filter}
        ORDER BY ma_test_case ASC
        """,
        tuple(question_ids),
    )
    tc_map: Dict[int, List[Dict]] = {qid: [] for qid in question_ids}
    for row in cursor.fetchall():
        qid = row[1]
        tc_map.setdefault(qid, []).append(
            {
                "id": f"TC-{row[0]}",
                "test_case_id": row[0],
                "input": row[2] or "",
                "inputData": row[2] or "",
                "expectedOutput": row[3] or "",
                "isSample": bool(row[4]),
                "isHidden": bool(row[5]),
                "points": float(row[6]) if row[6] is not None else 1.0,
            }
        )
    return tc_map


def get_template_detail(identifier: Union[int, str], include_hidden_tests: bool = True) -> Optional[Dict]:
    """Lấy chi tiết 1 bộ đề mẫu kèm toàn bộ câu hỏi và test cases"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pk = _resolve_template_pk(cursor, identifier)
        if not pk:
            return None

        cursor.execute(
            """
            SELECT b.ma_de_thi,
                   b.ma_de,
                   b.tieu_de,
                   b.loai_de,
                   b.tong_thoi_gian_phut,
                   b.tong_diem,
                   b.nguoi_tao,
                   b.ngay_tao,
                   u.ho_va_ten AS lecturer_name
            FROM BoDeMau b
            LEFT JOIN NguoiDung u ON b.nguoi_tao = u.ma_nguoi_dung
            WHERE b.ma_de_thi = ?
            """,
            (pk,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute(
            """
            SELECT ch.ma_cau_hoi,
                   ch.ma_bai_toan,
                   ch.tieu_de,
                   ch.noi_dung_de,
                   ch.do_kho,
                   ch.ngon_ngu_cho_phep,
                   ch.gioi_han_thoi_gian_ms,
                   ch.gioi_han_bo_nho_mb,
                   COALESCE(ct.so_diem, ch.diem_toi_da) AS diem_cau,
                   ct.thu_tu_cau
            FROM CauHoiTrongDe ct
            JOIN CauHoi ch ON ct.ma_cau_hoi = ch.ma_cau_hoi
            WHERE ct.ma_de_thi = ?
            ORDER BY ct.thu_tu_cau ASC, ch.ma_cau_hoi ASC
            """,
            (pk,),
        )
        q_rows = cursor.fetchall()
        q_ids = [r[0] for r in q_rows]
        tc_map = _fetch_questions_and_testcases(cursor, q_ids, include_hidden_tests=include_hidden_tests)

        questions = []
        langs_found = set()
        for qr in q_rows:
            qid = qr[0]
            lang = qr[5] or "C++ / Python"
            langs_found.add(lang)
            tcs = tc_map.get(qid, [])
            sample_tc = next((t for t in tcs if not t["isHidden"]), tcs[0] if tcs else None)
            questions.append(
                {
                    "id": qr[1] or f"Q-{qid}",
                    "question_id": qid,
                    "title": qr[2],
                    "description": qr[3] or "",
                    "difficulty": qr[4] or "Trung bình",
                    "programming_language": lang,
                    "time_limit_ms": qr[6] or 2000,
                    "memory_limit_mb": qr[7] or 256,
                    "max_points": float(qr[8]) if qr[8] is not None else 10.0,
                    "question_order": qr[9] or 1,
                    "sampleInput": sample_tc["inputData"] if sample_tc else "",
                    "sampleOutput": sample_tc["expectedOutput"] if sample_tc else "",
                    "testCases": tcs,
                    "testCasesCount": len(tcs),
                }
            )

        main_lang = next(iter(langs_found), "C++ / Python")
        return {
            "template_id": row[0],
            "id": row[1],
            "template_code": row[1],
            "title": row[2],
            "type": row[3] if row[3] in ("lab", "exam") else "lab",
            "room_type": row[3] if row[3] in ("lab", "exam") else "lab",
            "category": "Kiểm tra & Đánh giá" if row[3] == "exam" else "Thực hành Lab",
            "language": main_lang,
            "durationMinutes": row[4] or 60,
            "duration_minutes": row[4] or 60,
            "total_points": float(row[5]) if row[5] is not None else 10.0,
            "instructor_id": row[6],
            "lecturer": row[8] or "Giảng viên",
            "updatedAt": row[7].strftime("%d/%m/%Y") if row[7] else "",
            "questionCount": len(questions),
            "question_count": len(questions),
            "questions": questions,
        }
    finally:
        cursor.close()
        conn.close()


def list_templates_full(instructor_id: Optional[int] = None, room_type: Optional[str] = None) -> List[Dict]:
    """Lấy danh sách toàn bộ Bộ đề mẫu kèm chi tiết câu hỏi & test cases"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conditions = []
        params: List[Any] = []
        if instructor_id is not None:
            conditions.append("nguoi_tao = ?")
            params.append(instructor_id)
        if room_type in ("lab", "exam"):
            conditions.append("loai_de = ?")
            params.append(room_type)

        where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        cursor.execute(
            f"SELECT ma_de_thi FROM BoDeMau {where_sql} ORDER BY ngay_tao DESC, ma_de_thi DESC",
            tuple(params),
        )
        pks = [r[0] for r in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()

    results = []
    for pk in pks:
        detail = get_template_detail(pk, include_hidden_tests=True)
        if detail:
            results.append(detail)
    return results


def _insert_questions_for_template(
    cursor,
    template_pk: int,
    instructor_id: int,
    default_language: str,
    questions: List[Dict[str, Any]],
) -> float:
    """Chèn danh sách câu hỏi và test cases gắn với BoDeMau, trả về tổng điểm"""
    total_points = 0.0
    for idx, q in enumerate(questions, start=1):
        tcs = q.get("test_cases") or []
        q_points = float(q.get("max_points") or (sum(float(tc.get("points") or 1.0) for tc in tcs) if tcs else 10.0))
        total_points += q_points

        q_code = f"CH-{template_pk}-{idx}-{uuid.uuid4().hex[:4].upper()}"
        q_lang = q.get("programming_language") or default_language or "C++ / Python"
        cursor.execute(
            """
            INSERT INTO CauHoi (
                ma_bai_toan, ma_phong, thu_tu_cau, tieu_de, noi_dung_de,
                loai_cau_hoi, do_kho, gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb,
                ngon_ngu_cho_phep, diem_toi_da, nguoi_soan, dang_hoat_dong,
                ngay_tao, ngay_cap_nhat
            )
            OUTPUT INSERTED.ma_cau_hoi
            VALUES (?, NULL, ?, ?, ?, 'code', ?, 2000, 256, ?, ?, ?, 1, GETDATE(), GETDATE())
            """,
            (
                q_code,
                idx,
                q.get("title") or f"Câu {idx}",
                q.get("description") or "",
                q.get("difficulty") or "Trung bình",
                q_lang,
                q_points,
                instructor_id,
            ),
        )
        question_id = cursor.fetchone()[0]

        cursor.execute(
            """
            INSERT INTO CauHoiTrongDe (ma_de_thi, ma_cau_hoi, thu_tu_cau, so_diem)
            VALUES (?, ?, ?, ?)
            """,
            (template_pk, question_id, idx, q_points),
        )

        # Nếu có test_cases gửi lên thì lưu hết, nếu chưa có nhưng có sampleInput/Output thì tạo 1 test ví dụ
        if not tcs and (q.get("sample_input") or q.get("sample_output")):
            tcs = [
                {
                    "input_data": q.get("sample_input") or "",
                    "expected_output": q.get("sample_output") or "",
                    "is_hidden": False,
                    "points": q_points,
                }
            ]

        for tc in tcs:
            is_hidden = 1 if tc.get("is_hidden") else 0
            is_sample = 0 if is_hidden else 1
            tc_pts = float(tc.get("points") if tc.get("points") is not None else 1.0)
            cursor.execute(
                """
                INSERT INTO BoKiemThu (
                    ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi,
                    la_test_vi_du, la_test_an, diem_test, ngay_tao
                )
                VALUES (?, ?, ?, ?, ?, ?, GETDATE())
                """,
                (
                    question_id,
                    tc.get("input_data") or "",
                    tc.get("expected_output") or "",
                    is_sample,
                    is_hidden,
                    tc_pts,
                ),
            )

    return total_points if total_points > 0 else 10.0


def create_template_full(instructor_id: int, data: Dict[str, Any]) -> Dict:
    """Tạo mới Bộ đề mẫu kèm Câu hỏi và Test cases"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        tpl_type = "exam" if data.get("type") == "exam" else "lab"
        prefix = "EXAM" if tpl_type == "exam" else "LAB"
        tpl_code = (data.get("code") or f"TPL-{prefix}-{uuid.uuid4().hex[:6].upper()}").strip().upper()

        cursor.execute("SELECT ma_de_thi FROM BoDeMau WHERE ma_de = ?", (tpl_code,))
        if cursor.fetchone():
            tpl_code = f"{tpl_code}-{uuid.uuid4().hex[:3].upper()}"

        cursor.execute(
            """
            INSERT INTO BoDeMau (
                ma_de, tieu_de, loai_de, tong_thoi_gian_phut, tong_diem, nguoi_tao, ngay_tao
            )
            OUTPUT INSERTED.ma_de_thi
            VALUES (?, ?, ?, ?, 10.0, ?, GETDATE())
            """,
            (
                tpl_code,
                data.get("title") or "Bộ đề mới",
                tpl_type,
                int(data.get("duration_minutes") or 90),
                instructor_id,
            ),
        )
        template_pk = cursor.fetchone()[0]

        questions = data.get("questions") or []
        total_points = _insert_questions_for_template(
            cursor,
            template_pk=template_pk,
            instructor_id=instructor_id,
            default_language=data.get("language") or "C++ / Python",
            questions=questions,
        )
        cursor.execute("UPDATE BoDeMau SET tong_diem = ? WHERE ma_de_thi = ?", (total_points, template_pk))
        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return get_template_detail(template_pk, include_hidden_tests=True)  # type: ignore


def update_template_full(identifier: Union[int, str], instructor_id: int, data: Dict[str, Any]) -> Optional[Dict]:
    """Cập nhật Bộ đề mẫu và danh sách câu hỏi/test cases"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        template_pk = _resolve_template_pk(cursor, identifier)
        if not template_pk:
            return None

        updates = []
        params: List[Any] = []
        if data.get("title") is not None:
            updates.append("tieu_de = ?")
            params.append(data["title"])
        if data.get("type") in ("lab", "exam"):
            updates.append("loai_de = ?")
            params.append(data["type"])
        if data.get("duration_minutes") is not None:
            updates.append("tong_thoi_gian_phut = ?")
            params.append(int(data["duration_minutes"]))

        if updates:
            params.append(template_pk)
            cursor.execute(f"UPDATE BoDeMau SET {', '.join(updates)} WHERE ma_de_thi = ?", tuple(params))

        if data.get("questions") is not None:
            # Xóa liên kết câu hỏi cũ không có bài nộp
            cursor.execute("SELECT ma_cau_hoi FROM CauHoiTrongDe WHERE ma_de_thi = ?", (template_pk,))
            old_qids = [r[0] for r in cursor.fetchall()]
            cursor.execute("DELETE FROM CauHoiTrongDe WHERE ma_de_thi = ?", (template_pk,))
            for old_qid in old_qids:
                cursor.execute("SELECT COUNT(1) FROM BaiNop WHERE ma_cau_hoi = ?", (old_qid,))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("DELETE FROM BoKiemThu WHERE ma_cau_hoi = ?", (old_qid,))
                    cursor.execute("DELETE FROM CauHoi WHERE ma_cau_hoi = ? AND ma_phong IS NULL", (old_qid,))

            total_points = _insert_questions_for_template(
                cursor,
                template_pk=template_pk,
                instructor_id=instructor_id,
                default_language=data.get("language") or "C++ / Python",
                questions=data["questions"],
            )
            cursor.execute("UPDATE BoDeMau SET tong_diem = ? WHERE ma_de_thi = ?", (total_points, template_pk))

        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return get_template_detail(template_pk, include_hidden_tests=True)


def delete_template_full(identifier: Union[int, str]) -> bool:
    """Xóa Bộ đề mẫu an toàn (gỡ tham chiếu Phong.ma_de_mau trước khi xóa)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        template_pk = _resolve_template_pk(cursor, identifier)
        if not template_pk:
            return False

        cursor.execute("UPDATE Phong SET ma_de_mau = NULL WHERE ma_de_mau = ?", (template_pk,))
        cursor.execute("SELECT ma_cau_hoi FROM CauHoiTrongDe WHERE ma_de_thi = ?", (template_pk,))
        old_qids = [r[0] for r in cursor.fetchall()]
        cursor.execute("DELETE FROM CauHoiTrongDe WHERE ma_de_thi = ?", (template_pk,))
        for old_qid in old_qids:
            cursor.execute("SELECT COUNT(1) FROM BaiNop WHERE ma_cau_hoi = ?", (old_qid,))
            if cursor.fetchone()[0] == 0:
                cursor.execute("DELETE FROM BoKiemThu WHERE ma_cau_hoi = ?", (old_qid,))
                cursor.execute("DELETE FROM CauHoi WHERE ma_cau_hoi = ? AND ma_phong IS NULL", (old_qid,))
        cursor.execute("DELETE FROM BoDeMau WHERE ma_de_thi = ?", (template_pk,))
        conn.commit()
        return True
    finally:
        cursor.close()
        conn.close()


def is_question_valid_for_room(room_id: int, template_id: Optional[int], question_id: int) -> bool:
    """Kiểm tra câu hỏi có thuộc phòng thi (trực tiếp hoặc qua Bộ đề mẫu) hay không"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT ma_phong FROM CauHoi WHERE ma_cau_hoi = ?", (question_id,))
        row = cursor.fetchone()
        if not row:
            return False
        if row[0] == room_id:
            return True
        if template_id:
            cursor.execute(
                "SELECT 1 FROM CauHoiTrongDe WHERE ma_de_thi = ? AND ma_cau_hoi = ?",
                (template_id, question_id),
            )
            if cursor.fetchone():
                return True
        return False
    finally:
        cursor.close()
        conn.close()


def get_exam_content_for_room(room_id: int, include_hidden_tests: bool = False) -> Dict[str, Any]:
    """
    Lấy đề thi thật cho Phòng thi (/student/exam-room):
    - Ưu tiên câu hỏi gắn trực tiếp ma_phong = room_id.
    - Nếu không có, lấy từ BoDeMau (Phong.ma_de_mau -> CauHoiTrongDe).
    - Tự động ẩn test case bí mật (la_test_an = 1) nếu include_hidden_tests=False (dành cho Sinh viên).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT p.ma_phong, p.ma_phong_code, p.tieu_de, p.loai_phong, p.thoi_luong_phut,
                   p.ma_de_mau, bd.tieu_de AS template_title
            FROM Phong p
            LEFT JOIN BoDeMau bd ON p.ma_de_mau = bd.ma_de_thi
            WHERE p.ma_phong = ?
            """,
            (room_id,),
        )
        room_row = cursor.fetchone()
        if not room_row:
            return {"questions": []}

        template_id = room_row[5]

        # 1. Kiểm tra câu hỏi riêng của phòng
        cursor.execute(
            """
            SELECT ma_cau_hoi, ma_bai_toan, tieu_de, noi_dung_de, do_kho,
                   ngon_ngu_cho_phep, gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb,
                   diem_toi_da, thu_tu_cau
            FROM CauHoi
            WHERE ma_phong = ? AND dang_hoat_dong = 1
            ORDER BY thu_tu_cau ASC, ma_cau_hoi ASC
            """,
            (room_id,),
        )
        q_rows = cursor.fetchall()

        # 2. Nếu phòng chưa có câu hỏi riêng -> nạp từ BoDeMau
        if not q_rows and template_id:
            cursor.execute(
                """
                SELECT ch.ma_cau_hoi, ch.ma_bai_toan, ch.tieu_de, ch.noi_dung_de, ch.do_kho,
                       ch.ngon_ngu_cho_phep, ch.gioi_han_thoi_gian_ms, ch.gioi_han_bo_nho_mb,
                       COALESCE(ct.so_diem, ch.diem_toi_da) AS diem_cau, ct.thu_tu_cau
                FROM CauHoiTrongDe ct
                JOIN CauHoi ch ON ct.ma_cau_hoi = ch.ma_cau_hoi
                WHERE ct.ma_de_thi = ? AND ch.dang_hoat_dong = 1
                ORDER BY ct.thu_tu_cau ASC, ch.ma_cau_hoi ASC
                """,
                (template_id,),
            )
            q_rows = cursor.fetchall()

        q_ids = [r[0] for r in q_rows]
        tc_map = _fetch_questions_and_testcases(cursor, q_ids, include_hidden_tests=include_hidden_tests)

        questions = []
        for idx, qr in enumerate(q_rows, start=1):
            qid = qr[0]
            public_tcs = tc_map.get(qid, [])
            questions.append(
                {
                    "id": f"P{idx}",
                    "question_id": qid,
                    "code": qr[1] or f"P{idx}",
                    "title": qr[2],
                    "description": qr[3] or "",
                    "difficulty": qr[4] or "Trung bình",
                    "programming_language": qr[5] or "C++ / Python",
                    "time_limit_ms": qr[6] or 2000,
                    "memory_limit_mb": qr[7] or 256,
                    "max_points": float(qr[8]) if qr[8] is not None else 10.0,
                    "test_cases": public_tcs,
                }
            )

        return {
            "room_id": room_row[0],
            "room_code": room_row[1],
            "room_name": room_row[2],
            "room_type": room_row[3],
            "duration_minutes": room_row[4] or 60,
            "template_id": template_id,
            "template_title": room_row[6],
            "questions": questions,
        }
    finally:
        cursor.close()
        conn.close()
