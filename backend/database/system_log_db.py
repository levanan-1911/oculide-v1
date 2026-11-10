from typing import Optional, List, Dict, Any, Tuple
import json
from core.database import get_db_cursor, row_to_dict, rows_to_dicts

def create_system_log(
    log_level: str,
    module: str,
    message: str,
    user_id: Optional[int] = None,
    extra_data: Optional[Any] = None
) -> Dict[str, Any]:
    """Ghi nhận nhật ký kiểm toán hệ thống vào bảng NhatKyHeThong"""
    extra_json = json.dumps(extra_data, ensure_ascii=False) if extra_data is not None else None
    sql = """
        INSERT INTO NhatKyHeThong (muc_do, hanh_dong, thong_bao, ma_nguoi_dung, du_lieu_chi_tiet)
        OUTPUT inserted.ma_nhat_ky AS log_id, 
               inserted.muc_do AS log_level, 
               inserted.hanh_dong AS module,
               inserted.thong_bao AS message, 
               inserted.ma_nguoi_dung AS user_id, 
               inserted.du_lieu_chi_tiet AS extra_data, 
               inserted.thoi_gian AS created_at
        VALUES (?, ?, ?, ?, ?)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (log_level.lower(), module, message, user_id, extra_json))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            return result
        raise RuntimeError("Không thể ghi nhận nhật ký hệ thống")

def get_system_logs(
    skip: int = 0,
    limit: int = 50,
    log_level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """Lấy danh sách nhật ký hệ thống có phân trang và bộ lọc"""
    where_clauses = []
    params: List[Any] = []
    
    if log_level:
        where_clauses.append("muc_do = ?")
        params.append(log_level.lower())
    if module:
        where_clauses.append("hanh_dong = ?")
        params.append(module)
    if user_id:
        where_clauses.append("ma_nguoi_dung = ?")
        params.append(user_id)
        
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    
    count_sql = f"SELECT COUNT(*) FROM NhatKyHeThong {where_sql}"
    query_sql = f"""
        SELECT ma_nhat_ky AS log_id, 
               muc_do AS log_level, 
               hanh_dong AS module, 
               thong_bao AS message, 
               ma_nguoi_dung AS user_id, 
               du_lieu_chi_tiet AS extra_data, 
               thoi_gian AS created_at
        FROM NhatKyHeThong
        {where_sql}
        ORDER BY thoi_gian DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(count_sql, tuple(params))
        total = cursor.fetchone()[0]
        
        cursor.execute(query_sql, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        logs = rows_to_dicts(cursor, rows)
        
        return logs, total
