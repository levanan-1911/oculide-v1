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
    """Lưu token kết nối LiveKit SFU đã phát hành cho người dùng vào bảng TokenXacThuc"""
    sql = """
        INSERT INTO TokenXacThuc (
            ma_phong, ma_nguoi_dung, ma_token_hash, dinh_danh_nguoi_dung, ngay_het_han, loai_token, da_thu_hoi
        )
        OUTPUT inserted.ma_token AS token_id, 
               inserted.ma_phong AS room_id, 
               inserted.ma_nguoi_dung AS user_id,
               inserted.ma_token_hash AS token, 
               inserted.dinh_danh_nguoi_dung AS participant_identity, 
               inserted.ngay_het_han AS expires_at,
               inserted.ngay_tao AS created_at, 
               inserted.da_thu_hoi AS is_revoked
        VALUES (?, ?, ?, ?, ?, 'livekit', 0)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (room_id, user_id, token, participant_identity, expires_at))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            result["is_revoked"] = bool(result["is_revoked"])
            return result
        raise RuntimeError("Không thể lưu bản ghi token LiveKit")

def get_active_token(room_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    """Lấy token LiveKit còn hiệu lực và chưa bị thu hồi của người dùng trong phòng"""
    sql = """
        SELECT TOP 1
            ma_token AS token_id, 
            ma_phong AS room_id, 
            ma_nguoi_dung AS user_id, 
            ma_token_hash AS token, 
            dinh_danh_nguoi_dung AS participant_identity, 
            ngay_het_han AS expires_at, 
            ngay_tao AS created_at, 
            da_thu_hoi AS is_revoked
        FROM TokenXacThuc
        WHERE ma_phong = ? AND ma_nguoi_dung = ? AND loai_token = 'livekit' AND da_thu_hoi = 0 AND ngay_het_han > GETDATE()
        ORDER BY ngay_tao DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (room_id, user_id))
        row = cursor.fetchone()
        res = row_to_dict(cursor, row)
        if res:
            res["is_revoked"] = bool(res["is_revoked"])
        return res

def revoke_token(token_id: int) -> bool:
    """Thu hồi một token LiveKit cụ thể"""
    sql = "UPDATE TokenXacThuc SET da_thu_hoi = 1, ngay_thu_hoi = GETDATE() WHERE ma_token = ?"
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (token_id,))
        return cursor.rowcount > 0

def revoke_user_tokens_in_room(room_id: int, user_id: int) -> int:
    """Thu hồi toàn bộ token LiveKit của sinh viên khi bị kick khỏi phòng thi"""
    sql = "UPDATE TokenXacThuc SET da_thu_hoi = 1, ngay_thu_hoi = GETDATE() WHERE ma_phong = ? AND ma_nguoi_dung = ? AND loai_token = 'livekit' AND da_thu_hoi = 0"
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (room_id, user_id))
        return cursor.rowcount
