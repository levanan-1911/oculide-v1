from core.config import get_db_connection
from datetime import datetime
from typing import Optional, List, Dict

def create_message(
    room_id: int,
    sender_id: int,
    recipient_id: Optional[int],
    message_content: str,
    message_type: str = "text"
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        is_private = 1 if recipient_id is not None else 0
        cursor.execute("""
            INSERT INTO TinNhanPhong (ma_phong, nguoi_gui, nguoi_nhan, noi_dung, loai_tin_nhan, la_tin_rieng)
            OUTPUT inserted.ma_tin_nhan, inserted.ma_phong, inserted.nguoi_gui, inserted.nguoi_nhan,
                   inserted.noi_dung, inserted.loai_tin_nhan, inserted.la_tin_rieng, inserted.thoi_gian_gui
            VALUES (?, ?, ?, ?, ?, ?)
        """, (room_id, sender_id, recipient_id, message_content, message_type, is_private))
        row = cursor.fetchone()
        conn.commit()
        
        if row:
            cursor.execute("SELECT ho_va_ten FROM NguoiDung WHERE ma_nguoi_dung = ?", (sender_id,))
            user_row = cursor.fetchone()
            return {
                "message_id": row[0],
                "room_id": row[1],
                "sender_id": row[2],
                "recipient_id": row[3],
                "message_content": row[4],
                "message_type": row[5],
                "is_private": bool(row[6]),
                "sent_at": row[7],
                "sender_name": user_row[0] if user_row else "Unknown"
            }
        raise Exception("Không thể lưu tin nhắn")
    finally:
        cursor.close()
        conn.close()

def get_messages_by_room(room_id: int, limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT message_id, room_id, sender_id, recipient_id, message_content, message_type, is_private, sent_at, sender_name
            FROM (
                SELECT TOP (?) m.ma_tin_nhan AS message_id, 
                               m.ma_phong AS room_id, 
                               m.nguoi_gui AS sender_id, 
                               m.nguoi_nhan AS recipient_id, 
                               m.noi_dung AS message_content, 
                               m.loai_tin_nhan AS message_type, 
                               m.la_tin_rieng AS is_private, 
                               m.thoi_gian_gui AS sent_at, 
                               u.ho_va_ten AS sender_name
                FROM TinNhanPhong m
                LEFT JOIN NguoiDung u ON m.nguoi_gui = u.ma_nguoi_dung
                WHERE m.ma_phong = ? AND m.la_tin_rieng = 0
                ORDER BY m.thoi_gian_gui DESC
            ) sub
            ORDER BY sent_at ASC
        """, (limit, room_id))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_private"] = bool(r["is_private"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()

def get_private_conversation(user_id_1: int, user_id_2: int, room_id: Optional[int] = None, limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = [
            "((m.nguoi_gui = ? AND m.nguoi_nhan = ?) OR (m.nguoi_gui = ? AND m.nguoi_nhan = ?))",
            "m.la_tin_rieng = 1"
        ]
        params = [user_id_1, user_id_2, user_id_2, user_id_1]
        if room_id:
            where.append("m.ma_phong = ?")
            params.append(room_id)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT message_id, room_id, sender_id, recipient_id, message_content, message_type, is_private, sent_at, sender_name
            FROM (
                SELECT TOP (?) m.ma_tin_nhan AS message_id, 
                               m.ma_phong AS room_id, 
                               m.nguoi_gui AS sender_id, 
                               m.nguoi_nhan AS recipient_id, 
                               m.noi_dung AS message_content,
                               m.loai_tin_nhan AS message_type, 
                               m.la_tin_rieng AS is_private, 
                               m.thoi_gian_gui AS sent_at, 
                               u.ho_va_ten AS sender_name
                FROM TinNhanPhong m
                LEFT JOIN NguoiDung u ON m.nguoi_gui = u.ma_nguoi_dung
                {where_sql}
                ORDER BY m.thoi_gian_gui DESC
            ) sub
            ORDER BY sent_at ASC
        """, tuple([limit] + params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        results = []
        for row in rows:
            r = dict(zip(columns, row))
            r["is_private"] = bool(r["is_private"])
            results.append(r)
        return results
    finally:
        cursor.close()
        conn.close()
