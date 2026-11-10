from typing import Optional, List, Dict, Any
from core.database import get_db_cursor, row_to_dict, rows_to_dicts

def create_snapshot(
    session_id: int,
    student_id: int,
    image_url: str,
    face_detected: bool = False,
    face_count: int = 0,
    looking_at_screen: bool = True,
    confidence_score: Optional[float] = None
) -> Dict[str, Any]:
    """Lưu bản ghi ảnh chụp webcam định kỳ từ sinh viên vào bảng Snapshots"""
    sql = """
        INSERT INTO Snapshots (
            ma_phien, ma_sinh_vien, link_anh, 
            co_khuon_mat, so_luong_mat, nhin_man_hinh, diem_tin_cay
        )
        OUTPUT inserted.ma_snapshot AS snapshot_id, 
               inserted.ma_phien AS session_id, 
               inserted.ma_sinh_vien AS student_id,
               inserted.link_anh AS image_url, 
               inserted.co_khuon_mat AS face_detected, 
               inserted.so_luong_mat AS face_count,
               inserted.nhin_man_hinh AS looking_at_screen, 
               inserted.diem_tin_cay AS confidence_score, 
               inserted.thoi_gian_chup AS captured_at
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (
            session_id, student_id, image_url,
            1 if face_detected else 0, face_count,
            1 if looking_at_screen else 0, confidence_score or 1.000
        ))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            result["face_detected"] = bool(result["face_detected"])
            result["looking_at_screen"] = bool(result["looking_at_screen"])
            result["confidence_score"] = float(result["confidence_score"]) if result["confidence_score"] is not None else 1.0
            return result
        raise RuntimeError("Không thể lưu bản ghi snapshot")

def get_snapshots_by_session(session_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Lấy danh sách snapshot của một phiên thi, sắp xếp mới nhất trước"""
    sql = """
        SELECT TOP (?) 
            ma_snapshot AS snapshot_id, 
            ma_phien AS session_id, 
            ma_sinh_vien AS student_id, 
            link_anh AS image_url,
            co_khuon_mat AS face_detected, 
            so_luong_mat AS face_count, 
            nhin_man_hinh AS looking_at_screen, 
            diem_tin_cay AS confidence_score, 
            thoi_gian_chup AS captured_at
        FROM Snapshots
        WHERE ma_phien = ?
        ORDER BY thoi_gian_chup DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (limit, session_id))
        rows = cursor.fetchall()
        results = rows_to_dicts(cursor, rows)
        for r in results:
            r["face_detected"] = bool(r["face_detected"])
            r["looking_at_screen"] = bool(r["looking_at_screen"])
            r["confidence_score"] = float(r["confidence_score"]) if r["confidence_score"] is not None else 1.0
        return results

def get_latest_snapshot_by_student(session_id: int, student_id: int) -> Optional[Dict[str, Any]]:
    """Lấy ảnh snapshot gần nhất của sinh viên trong phiên thi"""
    sql = """
        SELECT TOP 1
            ma_snapshot AS snapshot_id, 
            ma_phien AS session_id, 
            ma_sinh_vien AS student_id, 
            link_anh AS image_url,
            co_khuon_mat AS face_detected, 
            so_luong_mat AS face_count, 
            nhin_man_hinh AS looking_at_screen, 
            diem_tin_cay AS confidence_score, 
            thoi_gian_chup AS captured_at
        FROM Snapshots
        WHERE ma_phien = ? AND ma_sinh_vien = ?
        ORDER BY thoi_gian_chup DESC
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (session_id, student_id))
        row = cursor.fetchone()
        res = row_to_dict(cursor, row)
        if res:
            res["face_detected"] = bool(res["face_detected"])
            res["looking_at_screen"] = bool(res["looking_at_screen"])
            res["confidence_score"] = float(res["confidence_score"]) if res["confidence_score"] is not None else 1.0
        return res

def cleanup_old_snapshots(days: int = 30) -> int:
    """Dọn dẹp các snapshot cũ hơn số ngày chỉ định để tiết kiệm dung lượng CSDL"""
    sql = """
        DELETE FROM Snapshots
        WHERE thoi_gian_chup < DATEADD(day, -?, GETDATE())
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (days,))
        return cursor.rowcount

def get_snapshot_by_id(snapshot_id: int) -> Optional[Dict[str, Any]]:
    """Lấy thông tin chi tiết một bản ghi snapshot theo snapshot_id"""
    sql = """
        SELECT ma_snapshot AS snapshot_id, 
               ma_phien AS session_id, 
               ma_sinh_vien AS student_id, 
               link_anh AS image_url,
               co_khuon_mat AS face_detected, 
               so_luong_mat AS face_count, 
               nhin_man_hinh AS looking_at_screen, 
               diem_tin_cay AS confidence_score, 
               thoi_gian_chup AS captured_at
        FROM Snapshots
        WHERE ma_snapshot = ?
    """
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(sql, (snapshot_id,))
        row = cursor.fetchone()
        res = row_to_dict(cursor, row)
        if res:
            res["face_detected"] = bool(res["face_detected"])
            res["looking_at_screen"] = bool(res["looking_at_screen"])
            res["confidence_score"] = float(res["confidence_score"]) if res["confidence_score"] is not None else 1.0
        return res
