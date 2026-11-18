from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def get_question_by_id(question_id: int) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT question_id, 
                   room_id, 
                   question_order, 
                   title AS question_title, 
                   content AS question_description,
                   question_type, 
                   allowed_languages AS programming_language, 
                   max_points, 
                   time_limit_ms AS time_limit_minutes,
                   memory_limit_mb, 
                   is_active, 
                   created_at, 
                   updated_at
            FROM Questions 
            WHERE question_id = ?
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
            SELECT question_id, 
                   room_id, 
                   question_order, 
                   title AS question_title, 
                   content AS question_description,
                   question_type, 
                   allowed_languages AS programming_language, 
                   max_points, 
                   time_limit_ms AS time_limit_minutes,
                   memory_limit_mb, 
                   is_active, 
                   created_at, 
                   updated_at
            FROM Questions 
            WHERE room_id = ? AND is_active = 1
            ORDER BY question_order ASC
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
        hidden_filter = "" if include_hidden_tests else "AND is_hidden = 0"
        
        tc_sql = f"""
            SELECT test_case_id, 
                   question_id, 
                   input_data, 
                   expected_output, 
                   is_hidden, 
                   points, 
                   created_at
            FROM TestCases
            WHERE question_id IN ({placeholders}) {hidden_filter}
            ORDER BY test_case_id ASC
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
            INSERT INTO Questions (
                room_id, question_order, title, content,
                question_type, allowed_languages, max_points,
                time_limit_ms, memory_limit_mb
            )
            OUTPUT inserted.question_id, inserted.room_id, inserted.question_order,
                   inserted.title, inserted.content, inserted.question_type,
                   inserted.allowed_languages, inserted.max_points, inserted.time_limit_ms,
                   inserted.memory_limit_mb, inserted.is_active, inserted.created_at, inserted.updated_at
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
            "question_order": "question_order",
            "question_title": "title",
            "question_description": "content",
            "question_type": "question_type",
            "programming_language": "allowed_languages",
            "max_points": "max_points",
            "time_limit_minutes": "time_limit_ms",
            "memory_limit_mb": "memory_limit_mb",
            "is_active": "is_active"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
                params.append(1 if key == "is_active" and value else (0 if key == "is_active" else value))
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
            SELECT test_case_id, 
                   question_id, 
                   input_data, 
                   expected_output, 
                   is_hidden, 
                   points, 
                   created_at
            FROM TestCases 
            {where_sql}
            ORDER BY test_case_id ASC
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
            INSERT INTO TestCases (question_id, input_data, expected_output, is_hidden, points)
            OUTPUT inserted.test_case_id, inserted.question_id, inserted.input_data, 
                   inserted.expected_output, inserted.is_hidden, inserted.points, inserted.created_at
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
            SELECT test_case_id, 
                   question_id, 
                   input_data, 
                   expected_output, 
                   is_hidden, 
                   points, 
                   created_at
            FROM TestCases 
            WHERE test_case_id = ?
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
            "input_data": "input_data",
            "expected_output": "expected_output",
            "is_hidden": "is_hidden",
            "points": "points"
        }
        for key, value in kwargs.items():
            if value is not None and key in mapping:
                db_col = mapping[key]
                fields.append(f"{db_col} = ?")
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
