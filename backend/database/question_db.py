from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_question_by_id(question_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT question_id, room_id, question_order, question_title, question_description,
                   question_type, programming_language, max_points, time_limit_minutes,
                   memory_limit_mb, is_active, created_at, updated_at
            FROM Questions WHERE question_id = ?
        """, (question_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            q = dict(zip(columns, row))
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
            SELECT question_id, room_id, question_order, question_title, question_description,
                   question_type, programming_language, max_points, time_limit_minutes,
                   memory_limit_mb, is_active, created_at, updated_at
            FROM Questions 
            WHERE room_id = ? AND is_active = 1
            ORDER BY question_order ASC
        """, (room_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        questions = [dict(zip(columns, row)) for row in rows]
        
        if not questions:
            return []
            
        # Tối ưu hóa: Lấy toàn bộ test cases của tất cả câu hỏi trong 1 query duy nhất
        q_ids = [q["question_id"] for q in questions]
        placeholders = ",".join("?" for _ in q_ids)
        hidden_filter = "" if include_hidden_tests else "AND is_hidden = 0"
        
        tc_sql = f"""
            SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
            FROM TestCases
            WHERE question_id IN ({placeholders}) {hidden_filter}
            ORDER BY test_case_id ASC
        """
        cursor.execute(tc_sql, tuple(q_ids))
        tc_rows = cursor.fetchall()
        tc_columns = [column[0] for column in cursor.description]
        all_test_cases = [dict(zip(tc_columns, r)) for r in tc_rows]
        
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
            INSERT INTO Questions (
                room_id, question_order, question_title, question_description,
                question_type, programming_language, max_points,
                time_limit_minutes, memory_limit_mb
            )
            OUTPUT inserted.question_id, inserted.room_id, inserted.question_order,
                   inserted.question_title, inserted.question_description, inserted.question_type,
                   inserted.programming_language, inserted.max_points, inserted.time_limit_minutes,
                   inserted.memory_limit_mb, inserted.is_active, inserted.created_at, inserted.updated_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            room_id, question_order, question_title, question_description,
            question_type, programming_language, max_points,
            time_limit_minutes, memory_limit_mb
        ))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            q = dict(zip(columns, row))
            q["test_cases"] = []
            return q
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
        for key, value in kwargs.items():
            if value is not None and key in (
                "question_order", "question_title", "question_description",
                "question_type", "programming_language", "max_points",
                "time_limit_minutes", "memory_limit_mb", "is_active"
            ):
                fields.append(f"{key} = ?")
                params.append(value)
        if not fields:
            return get_question_by_id(question_id)
        params.append(question_id)
        cursor.execute(f"UPDATE Questions SET {', '.join(fields)}, updated_at = GETDATE() WHERE question_id = ?", tuple(params))
        conn.commit()
        return get_question_by_id(question_id)
    finally:
        cursor.close()
        conn.close()

def delete_question(question_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM Questions WHERE question_id = ?", (question_id,))
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
        where_sql = "WHERE question_id = ?" if include_hidden else "WHERE question_id = ? AND is_hidden = 0"
        cursor.execute(f"""
            SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
            FROM TestCases {where_sql}
            ORDER BY test_case_id ASC
        """, (question_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def create_test_case(question_id: int, input_data: str, expected_output: str, is_hidden: bool = False, points: float = 0.0) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO TestCases (question_id, input_data, expected_output, is_hidden, points)
            OUTPUT inserted.test_case_id, inserted.question_id, inserted.input_data, 
                   inserted.expected_output, inserted.is_hidden, inserted.points, inserted.created_at
            VALUES (?, ?, ?, ?, ?)
        """, (question_id, input_data, expected_output, 1 if is_hidden else 0, points))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể tạo test case")
    finally:
        cursor.close()
        conn.close()

def delete_test_case(test_case_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM TestCases WHERE test_case_id = ?", (test_case_id,))
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
            SELECT test_case_id, question_id, input_data, expected_output, is_hidden, points, created_at
            FROM TestCases WHERE test_case_id = ?
        """, (test_case_id,))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
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
        for key, value in kwargs.items():
            if value is not None and key in ("input_data", "expected_output", "is_hidden", "points"):
                fields.append(f"{key} = ?")
                params.append(1 if key == "is_hidden" and value else (0 if key == "is_hidden" else value))
        if not fields:
            return get_test_case_by_id(test_case_id)
        params.append(test_case_id)
        cursor.execute(f"UPDATE TestCases SET {', '.join(fields)} WHERE test_case_id = ?", tuple(params))
        conn.commit()
        return get_test_case_by_id(test_case_id)
    finally:
        cursor.close()
        conn.close()

