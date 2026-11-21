from typing import Optional, List, Dict, Any, Union
import uuid
from core.config import get_db_connection


def _resolve_template_pk(cursor, identifier: Union[int, str]) -> Optional[int]:
    """Giải mã template_id (int) hoặc template_code (str) thành template_id (int)"""
    try:
        val_int = int(identifier)
        cursor.execute("SELECT template_id FROM ExamTemplates WHERE template_id = ?", (val_int,))
        row = cursor.fetchone()
        if row:
            return row[0]
    except (ValueError, TypeError):
        pass

    cursor.execute("SELECT template_id FROM ExamTemplates WHERE template_code = ?", (str(identifier),))
    row = cursor.fetchone()
    return row[0] if row else None


def _fetch_questions_and_testcases(cursor, question_ids: List[int], include_hidden_tests: bool = True) -> Dict[int, List[Dict]]:
    """Nạp toàn bộ test cases (TestCases) cho danh sách câu hỏi (Zero N+1)"""
    if not question_ids:
        return {}
    placeholders = ",".join("?" for _ in question_ids)
    hidden_filter = "" if include_hidden_tests else "AND is_hidden = 0"
    cursor.execute(
        f"""
        SELECT test_case_id,
               question_id,
               input_data,
               expected_output,
               is_sample,
               is_hidden,
               points
        FROM TestCases
        WHERE question_id IN ({placeholders}) {hidden_filter}
        ORDER BY test_case_id ASC
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
            SELECT b.template_id,
                   b.template_code,
                   b.title,
                   b.template_type,
                   b.duration_minutes,
                   b.total_points,
                   b.created_by,
                   b.created_at,
                   u.full_name AS lecturer_name
            FROM ExamTemplates b
            LEFT JOIN Users u ON b.created_by = u.user_id
            WHERE b.template_id = ?
            """,
            (pk,),
        )
        row = cursor.fetchone()
        if not row:
            return None

        cursor.execute(
            """
            SELECT ch.question_id,
                   ch.problem_code,
                   ch.title,
                   ch.content,
                   ch.difficulty,
                   ch.allowed_languages,
                   ch.time_limit_ms,
                   ch.memory_limit_mb,
                   COALESCE(ct.points, ch.max_points) AS diem_cau,
                   ct.question_order
            FROM TemplateQuestions ct
            JOIN Questions ch ON ct.question_id = ch.question_id
            WHERE ct.template_id = ?
            ORDER BY ct.question_order ASC, ch.question_id ASC
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
            "type": row[3] if row[3] in ("lab", "exam", "final_exam", "midterm") else (row[3] or "lab"),
            "room_type": row[3] if row[3] in ("lab", "exam", "final_exam", "midterm") else (row[3] or "lab"),
            "category": "Thi Kết Thúc Học Phần" if row[3] in ("final", "final_exam") else ("Kiểm tra Giữa kỳ" if row[3] in ("midterm", "midterm_exam", "exam") else "Thực hành Lab"),
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
            conditions.append("created_by = ?")
            params.append(instructor_id)
        if room_type:
            rt = room_type.lower()
            if rt in ("lab", "practice"):
                conditions.append("template_type IN ('lab', 'practice')")
            elif rt in ("midterm", "midterm_exam"):
                conditions.append("template_type IN ('midterm', 'midterm_exam')")
            elif rt in ("final", "final_exam"):
                conditions.append("template_type IN ('final', 'final_exam', 'exam')")
            else:
                conditions.append("template_type = ?")
                params.append(room_type)

        where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        cursor.execute(
            f"SELECT template_id FROM ExamTemplates {where_sql} ORDER BY created_at DESC, template_id DESC",
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


def list_template_usage(
    instructor_id: Optional[int] = None,
    final_only: bool = False,
) -> List[Dict[str, Any]]:
    """Lấy các lớp đang gắn với bộ đề qua phòng thi/lab trong CSDL."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        conditions = ["r.class_id IS NOT NULL", "r.template_id IS NOT NULL"]
        params: List[Any] = []
        if instructor_id is not None:
            conditions.extend(["t.created_by = ?", "c.instructor_id = ?"])
            params.extend([instructor_id, instructor_id])
        if final_only:
            conditions.append("t.template_type IN ('final_exam', 'final', 'exam')")

        cursor.execute(
            f"""
            SELECT r.template_id, t.template_code, r.class_id, c.class_code, c.class_name,
                   CASE
                       WHEN MAX(CASE WHEN r.room_type IN ('lab', 'practice') THEN 1 ELSE 0 END) = 1
                       THEN 'lab'
                       ELSE 'exam'
                   END AS activity_type
            FROM Rooms r
            INNER JOIN ExamTemplates t ON t.template_id = r.template_id
            INNER JOIN Classes c ON c.class_id = r.class_id
            WHERE {' AND '.join(conditions)}
            GROUP BY r.template_id, t.template_code, r.class_id, c.class_code, c.class_name
            ORDER BY r.template_id, c.class_code
            """,
            tuple(params),
        )
        return [
            {
                "template_id": row[0],
                "template_code": row[1],
                "class_id": row[2],
                "class_code": row[3],
                "class_name": row[4],
                "activity_type": row[5],
            }
            for row in cursor.fetchall()
        ]
    finally:
        cursor.close()
        conn.close()


def _insert_questions_for_template(
    cursor,
    template_pk: int,
    instructor_id: int,
    default_language: str,
    questions: List[Dict[str, Any]],
) -> float:
    """Chèn danh sách câu hỏi và test cases gắn với ExamTemplates, trả về tổng điểm"""
    total_points = 0.0
    for idx, q in enumerate(questions, start=1):
        tcs = q.get("test_cases") or []
        q_points = float(q.get("max_points") or (sum(float(tc.get("points") or 1.0) for tc in tcs) if tcs else 10.0))
        total_points += q_points

        q_code = f"CH-{template_pk}-{idx}-{uuid.uuid4().hex[:4].upper()}"
        q_lang = q.get("programming_language") or default_language or "C++ / Python"
        cursor.execute(
            """
            INSERT INTO Questions (
                problem_code, room_id, question_order, title, content,
                question_type, difficulty, time_limit_ms, memory_limit_mb,
                allowed_languages, max_points, author_id, is_active,
                created_at, updated_at
            )
            OUTPUT INSERTED.question_id
            VALUES (?, NULL, ?, ?, ?, 'coding', ?, 2000, 256, ?, ?, ?, 1, GETDATE(), GETDATE())
            """,
            (
                q_code,
                idx,
                q.get("title") or f"Câu {idx}",
                q.get("description") or "",
                q.get("difficulty") or "medium",
                q_lang,
                q_points,
                instructor_id,
            ),
        )
        question_id = cursor.fetchone()[0]

        cursor.execute(
            """
            INSERT INTO TemplateQuestions (template_id, question_id, question_order, points)
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
            is_hidden = 1 if (tc.get("is_hidden") or tc.get("isHidden")) else 0
            is_sample = 0 if is_hidden else 1
            tc_pts = float(tc.get("points") if tc.get("points") is not None else 1.0)
            in_val = tc.get("input_data") if tc.get("input_data") is not None else (tc.get("input") if tc.get("input") is not None else tc.get("inputData") or "")
            out_val = tc.get("expected_output") if tc.get("expected_output") is not None else (tc.get("expectedOutput") or "")
            cursor.execute(
                """
                INSERT INTO TestCases (
                    question_id, input_data, expected_output,
                    is_sample, is_hidden, points, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, GETDATE())
                """,
                (
                    question_id,
                    str(in_val),
                    str(out_val),
                    is_sample,
                    is_hidden,
                    tc_pts,
                ),
            )

    return total_points if total_points > 0 else 10.0


def _normalize_template_type(template_type: Optional[str]) -> str:
    normalized = (template_type or "lab").strip().lower()
    aliases = {
        "cuoi_ky": "final_exam",
        "final": "final_exam",
        "midterm": "midterm_exam",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in ("lab", "exam", "final_exam", "midterm_exam", "practice", "homework"):
        raise ValueError(f"Unsupported template type: {template_type}")
    return normalized


def create_template_full(instructor_id: int, data: Dict[str, Any]) -> Dict:
    """Tạo mới Bộ đề mẫu kèm Câu hỏi và Test cases"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        tpl_type = _normalize_template_type(data.get("type"))
        prefix = {
            "final_exam": "FINAL",
            "midterm_exam": "MIDTERM",
            "exam": "EXAM",
        }.get(tpl_type, "LAB")
        tpl_code = (data.get("code") or f"TPL-{prefix}-{uuid.uuid4().hex[:6].upper()}").strip().upper()

        cursor.execute("SELECT template_id FROM ExamTemplates WHERE template_code = ?", (tpl_code,))
        if cursor.fetchone():
            tpl_code = f"{tpl_code}-{uuid.uuid4().hex[:3].upper()}"

        cursor.execute(
            """
            INSERT INTO ExamTemplates (
                template_code, title, template_type, duration_minutes, total_points, created_by, created_at
            )
            OUTPUT INSERTED.template_id
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
        cursor.execute("UPDATE ExamTemplates SET total_points = ? WHERE template_id = ?", (total_points, template_pk))
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
            updates.append("title = ?")
            params.append(data["title"])
        if data.get("type") is not None:
            updates.append("template_type = ?")
            params.append(_normalize_template_type(data["type"]))
        if data.get("duration_minutes") is not None:
            updates.append("duration_minutes = ?")
            params.append(int(data["duration_minutes"]))

        if updates:
            params.append(template_pk)
            cursor.execute(f"UPDATE ExamTemplates SET {', '.join(updates)} WHERE template_id = ?", tuple(params))

        if data.get("questions") is not None:
            # Xóa liên kết câu hỏi cũ không có bài nộp
            cursor.execute("SELECT question_id FROM TemplateQuestions WHERE template_id = ?", (template_pk,))
            old_qids = [r[0] for r in cursor.fetchall()]
            cursor.execute("DELETE FROM TemplateQuestions WHERE template_id = ?", (template_pk,))
            for old_qid in old_qids:
                cursor.execute("SELECT COUNT(1) FROM Submissions WHERE question_id = ?", (old_qid,))
                if cursor.fetchone()[0] == 0:
                    cursor.execute("DELETE FROM TestCases WHERE question_id = ?", (old_qid,))
                    cursor.execute("DELETE FROM Questions WHERE question_id = ? AND room_id IS NULL", (old_qid,))

            total_points = _insert_questions_for_template(
                cursor,
                template_pk=template_pk,
                instructor_id=instructor_id,
                default_language=data.get("language") or "C++ / Python",
                questions=data["questions"],
            )
            cursor.execute("UPDATE ExamTemplates SET total_points = ? WHERE template_id = ?", (total_points, template_pk))

        conn.commit()
    finally:
        cursor.close()
        conn.close()

    return get_template_detail(template_pk, include_hidden_tests=True)


def delete_template_full(identifier: Union[int, str]) -> bool:
    """Xóa Bộ đề mẫu an toàn (gỡ tham chiếu Rooms.template_id trước khi xóa)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        template_pk = _resolve_template_pk(cursor, identifier)
        if not template_pk:
            return False

        cursor.execute("UPDATE Rooms SET template_id = NULL WHERE template_id = ?", (template_pk,))
        cursor.execute("SELECT question_id FROM TemplateQuestions WHERE template_id = ?", (template_pk,))
        old_qids = [r[0] for r in cursor.fetchall()]
        cursor.execute("DELETE FROM TemplateQuestions WHERE template_id = ?", (template_pk,))
        for old_qid in old_qids:
            cursor.execute("SELECT COUNT(1) FROM Submissions WHERE question_id = ?", (old_qid,))
            if cursor.fetchone()[0] == 0:
                cursor.execute("DELETE FROM TestCases WHERE question_id = ?", (old_qid,))
                cursor.execute("DELETE FROM Questions WHERE question_id = ? AND room_id IS NULL", (old_qid,))
        cursor.execute("DELETE FROM ExamTemplates WHERE template_id = ?", (template_pk,))
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
        cursor.execute("SELECT room_id FROM Questions WHERE question_id = ?", (question_id,))
        row = cursor.fetchone()
        if not row:
            return False
        if row[0] == room_id:
            return True
        if template_id:
            cursor.execute(
                "SELECT 1 FROM TemplateQuestions WHERE template_id = ? AND question_id = ?",
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
    - Ưu tiên câu hỏi gắn trực tiếp room_id = room_id.
    - Nếu không có, lấy từ ExamTemplates (Rooms.template_id -> TemplateQuestions).
    - Tự động ẩn test case bí mật (is_hidden = 1) nếu include_hidden_tests=False (dành cho Sinh viên).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT p.room_id, p.room_code, p.room_name, p.room_type, p.duration_minutes,
                   p.template_id, bd.title AS template_title
            FROM Rooms p
            LEFT JOIN ExamTemplates bd ON p.template_id = bd.template_id
            WHERE p.room_id = ?
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
            SELECT question_id, problem_code, title, content, difficulty,
                   allowed_languages, time_limit_ms, memory_limit_mb,
                   max_points, question_order
            FROM Questions
            WHERE room_id = ? AND is_active = 1
            ORDER BY question_order ASC, question_id ASC
            """,
            (room_id,),
        )
        q_rows = cursor.fetchall()

        # 2. Nếu phòng chưa có câu hỏi riêng -> nạp từ ExamTemplates
        if not q_rows and template_id:
            cursor.execute(
                """
                SELECT ch.question_id, ch.problem_code, ch.title, ch.content, ch.difficulty,
                       ch.allowed_languages, ch.time_limit_ms, ch.memory_limit_mb,
                       COALESCE(ct.points, ch.max_points) AS diem_cau, ct.question_order
                FROM TemplateQuestions ct
                JOIN Questions ch ON ct.question_id = ch.question_id
                WHERE ct.template_id = ? AND ch.is_active = 1
                ORDER BY ct.question_order ASC, ch.question_id ASC
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
                    "difficulty": qr[4] or "medium",
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
