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
            INSERT INTO Messages (room_id, sender_id, recipient_id, message_content, message_type, is_private)
            OUTPUT inserted.message_id, inserted.room_id, inserted.sender_id, inserted.recipient_id,
                   inserted.message_content, inserted.message_type, inserted.is_private, inserted.sent_at
            VALUES (?, ?, ?, ?, ?, ?)
        """, (room_id, sender_id, recipient_id, message_content, message_type, is_private))
        row = cursor.fetchone()
        conn.commit()
        
        if row:
            columns = [column[0] for column in cursor.description]
            msg = dict(zip(columns, row))
            cursor.execute("SELECT full_name FROM Users WHERE user_id = ?", (sender_id,))
            user_row = cursor.fetchone()
            msg["sender_name"] = user_row[0] if user_row else "Unknown"
            return msg
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
                SELECT TOP (?) m.message_id, m.room_id, m.sender_id, m.recipient_id, m.message_content, 
                               m.message_type, m.is_private, m.sent_at, u.full_name as sender_name
                FROM Messages m
                LEFT JOIN Users u ON m.sender_id = u.user_id
                WHERE m.room_id = ? AND m.is_private = 0
                ORDER BY m.sent_at DESC
            ) sub
            ORDER BY sent_at ASC
        """, (limit, room_id))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()

def get_private_conversation(user_id_1: int, user_id_2: int, room_id: Optional[int] = None, limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        where = [
            "((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?))",
            "m.is_private = 1"
        ]
        params = [user_id_1, user_id_2, user_id_2, user_id_1]
        if room_id:
            where.append("m.room_id = ?")
            params.append(room_id)
        where_sql = f"WHERE {' AND '.join(where)}"
        
        cursor.execute(f"""
            SELECT message_id, room_id, sender_id, recipient_id, message_content, message_type, is_private, sent_at, sender_name
            FROM (
                SELECT TOP (?) m.message_id, m.room_id, m.sender_id, m.recipient_id, m.message_content,
                               m.message_type, m.is_private, m.sent_at, u.full_name as sender_name
                FROM Messages m
                LEFT JOIN Users u ON m.sender_id = u.user_id
                {where_sql}
                ORDER BY m.sent_at DESC
            ) sub
            ORDER BY sent_at ASC
        """, tuple([limit] + params))
        rows = cursor.fetchall()
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()
        conn.close()
