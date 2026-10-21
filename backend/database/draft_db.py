from core.config import get_db_connection
from typing import Optional, Dict

def upsert_code_draft(
    session_id: int,
    question_id: int,
    student_id: int,
    draft_code: str,
    language: str
) -> Dict:
    """Tự động lưu nháp mã nguồn (Upsert: nếu đã có nháp thì update, chưa có thì insert)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            MERGE CodeDrafts AS target
            USING (SELECT ? AS session_id, ? AS question_id, ? AS student_id, ? AS draft_code, ? AS language) AS source
            ON (target.session_id = source.session_id AND target.question_id = source.question_id)
            WHEN MATCHED THEN
                UPDATE SET draft_code = source.draft_code, language = source.language, last_saved_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (session_id, question_id, student_id, draft_code, language, last_saved_at)
                VALUES (source.session_id, source.question_id, source.student_id, source.draft_code, source.language, GETDATE())
            OUTPUT inserted.draft_id, inserted.session_id, inserted.question_id, inserted.student_id,
                   inserted.draft_code, inserted.language, inserted.last_saved_at;
        """, (session_id, question_id, student_id, draft_code, language))
        row = cursor.fetchone()
        conn.commit()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        raise Exception("Không thể lưu bản nháp code")
    finally:
        cursor.close()
        conn.close()

def get_code_draft(session_id: int, question_id: int) -> Optional[Dict]:
    """Lấy bản nháp code gần nhất theo phiên và câu hỏi"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT draft_id, session_id, question_id, student_id, draft_code, language, last_saved_at
            FROM CodeDrafts
            WHERE session_id = ? AND question_id = ?
        """, (session_id, question_id))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def delete_code_draft(session_id: int, question_id: int) -> bool:
    """Xóa bản nháp sau khi đã nộp bài thành công"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM CodeDrafts
            WHERE session_id = ? AND question_id = ?
        """, (session_id, question_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
