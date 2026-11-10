from core.config import get_db_connection
from typing import Optional, List, Dict

def upsert_code_draft(
    session_id: int,
    question_id: int,
    student_id: int,
    draft_code: str,
    language: str
) -> Dict:
    """Tự động lưu nháp mã nguồn (Upsert vào bảng BanNhapCode)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            MERGE BanNhapCode AS target
            USING (SELECT ? AS session_id, ? AS question_id, ? AS student_id, ? AS draft_code, ? AS language) AS source
            ON (target.ma_phien = source.session_id AND target.ma_cau_hoi = source.question_id)
            WHEN MATCHED THEN
                UPDATE SET ma_nguon_nhap = source.draft_code, ngon_ngu_lap_trinh = source.language, lan_luu_cuoi = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (ma_phien, ma_cau_hoi, ma_sinh_vien, ma_nguon_nhap, ngon_ngu_lap_trinh, lan_luu_cuoi)
                VALUES (source.session_id, source.question_id, source.student_id, source.draft_code, source.language, GETDATE())
            OUTPUT inserted.ma_ban_nhap, inserted.ma_phien, inserted.ma_cau_hoi, inserted.ma_sinh_vien,
                   inserted.ma_nguon_nhap, inserted.ngon_ngu_lap_trinh, inserted.lan_luu_cuoi;
        """, (session_id, question_id, student_id, draft_code, language))
        row = cursor.fetchone()
        conn.commit()
        if row:
            return {
                "draft_id": row[0],
                "session_id": row[1],
                "question_id": row[2],
                "student_id": row[3],
                "draft_code": row[4],
                "language": row[5],
                "last_saved_at": row[6]
            }
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
            SELECT ma_ban_nhap AS draft_id, 
                   ma_phien AS session_id, 
                   ma_cau_hoi AS question_id, 
                   ma_sinh_vien AS student_id, 
                   ma_nguon_nhap AS draft_code, 
                   ngon_ngu_lap_trinh AS language, 
                   lan_luu_cuoi AS last_saved_at
            FROM BanNhapCode
            WHERE ma_phien = ? AND ma_cau_hoi = ?
        """, (session_id, question_id))
        row = cursor.fetchone()
        if row:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, row))
        return None
    finally:
        cursor.close()
        conn.close()

def get_code_drafts_by_session(session_id: int) -> List[Dict]:
    """Lấy toàn bộ các bản nháp code trong phiên thi"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT ma_ban_nhap AS draft_id, 
                   ma_phien AS session_id, 
                   ma_cau_hoi AS question_id, 
                   ma_sinh_vien AS student_id, 
                   ma_nguon_nhap AS draft_code, 
                   ngon_ngu_lap_trinh AS language, 
                   lan_luu_cuoi AS last_saved_at
            FROM BanNhapCode
            WHERE ma_phien = ?
            ORDER BY ma_cau_hoi ASC
        """, (session_id,))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def delete_code_draft(session_id: int, question_id: int) -> bool:
    """Xóa bản nháp sau khi đã nộp bài thành công"""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM BanNhapCode
            WHERE ma_phien = ? AND ma_cau_hoi = ?
        """, (session_id, question_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        cursor.close()
        conn.close()
