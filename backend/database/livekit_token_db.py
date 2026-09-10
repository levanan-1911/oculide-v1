from typing import Optional, List, Dict, Any
from datetime import datetime
from core.database import get_db_cursor, row_to_dict, rows_to_dicts

def save_livekit_token(
    room_id: int,
    user_id: int,
    token: str,
    participant_identity: str,
    expires_at: datetime
) -> Dict[str, Any]:
    """Lưu token kết nối LiveKit SFU đã phát hành cho người dùng"""
    sql = """
        INSERT INTO LiveKitTokens (
            room_id, user_id, token, participant_identity, expires_at, is_revoked
        )
        OUTPUT inserted.token_id, inserted.room_id, inserted.user_id,
               inserted.token, inserted.participant_identity, inserted.expires_at,
               inserted.created_at, inserted.is_revoked
        VALUES (?, ?, ?, ?, ?, 0)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (room_id, user_id, token, participant_identity, expires_at))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            return result
        raise RuntimeError("Không thể lưu bản ghi token LiveKit")

def get_active_token(room_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Lấy token LiveKit còn hiệu lực và chưa bị thu hồi của người dùng trong phòng"""
    sql = """
        SELECT TOP 1
            token_id, room_id, user_id, token, participant_identity, expires_at, created_at, is_revoked
        FROM LiveKitTokens
        WHERE room_id = ? AND user_id = ? AND is_revoked = 0 AND expires_at > GETDATE()
        ORDER BY created_at DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id, user_id))
        row = cursor.fetchone()
        return row_to_dict(cursor, row)

def revoke_token(token_id: int) -> bool:
    """Thu hồi một token LiveKit cụ thể"""
    sql = "UPDATE LiveKitTokens SET is_revoked = 1 WHERE token_id = ?"
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (token_id,))
        return cursor.rowcount > 0

def revoke_user_tokens_in_room(room_id: int, user_id: int) -> int:
    """Thu hồi toàn bộ token LiveKit của sinh viên khi bị kick khỏi phòng thi"""
    sql = "UPDATE LiveKitTokens SET is_revoked = 1 WHERE room_id = ? AND user_id = ? AND is_revoked = 0"
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (room_id, user_id))
        return cursor.rowcount
