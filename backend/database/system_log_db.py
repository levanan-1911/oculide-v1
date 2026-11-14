from typing import Optional, List, Dict, Any, Tuple
import json
from core.database import get_db_cursor, row_to_dict, rows_to_dicts

def create_system_log(
    log_level: str,
    module: str,
    message: str,
    user_id: Optional[int] = None,
    extra_data: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> Dict[str, Any]:
    """Ghi nhận nhật ký kiểm toán hệ thống vào bảng NhatKyHeThong"""
    extra_json = json.dumps(extra_data, ensure_ascii=False) if extra_data is not None else None
    sql = """
        INSERT INTO NhatKyHeThong (muc_do, hanh_dong, thong_bao, ma_nguoi_dung, dia_chi_ip, du_lieu_chi_tiet)
        OUTPUT inserted.ma_nhat_ky AS log_id, 
               inserted.muc_do AS log_level, 
               inserted.hanh_dong AS module,
               inserted.thong_bao AS message, 
               inserted.ma_nguoi_dung AS user_id, 
               inserted.dia_chi_ip AS ip_address,
               inserted.du_lieu_chi_tiet AS extra_data, 
               inserted.thoi_gian AS created_at
        VALUES (?, ?, ?, ?, ?, ?)
    """
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(sql, (log_level.lower(), module, message, user_id, ip_address, extra_json))
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result:
            if result.get("extra_data") and isinstance(result["extra_data"], str):
                try:
                    result["extra_data"] = json.loads(result["extra_data"])
                except Exception:
                    pass
            return result
        raise RuntimeError("Không thể ghi nhận nhật ký hệ thống")

def get_system_logs(
    skip: int = 0,
    limit: int = 50,
    log_level: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], int]:
    """Lấy danh sách nhật ký hệ thống có phân trang và bộ lọc"""
    where_clauses = []
    params: List[Any] = []
    
    if log_level and log_level.strip() and log_level.lower() != 'all':
        where_clauses.append("LOWER(n.muc_do) = ?")
        params.append(log_level.lower().strip())
    if module and module.strip() and module.lower() != 'all':
        where_clauses.append("n.hanh_dong = ?")
        params.append(module.strip())
    if user_id:
        where_clauses.append("n.ma_nguoi_dung = ?")
        params.append(user_id)
    if role and role.strip() and role.lower() != 'all':
        clean_role = role.lower().strip()
        if clean_role == 'system':
            where_clauses.append("(n.ma_nguoi_dung IS NULL OR LOWER(vt.ten_vai_tro) = 'system')")
        else:
            where_clauses.append("LOWER(vt.ten_vai_tro) = ?")
            params.append(clean_role)
    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append(
            "(n.thong_bao LIKE ? OR n.hanh_dong LIKE ? OR n.dia_chi_ip LIKE ? OR u.ho_va_ten LIKE ? OR u.ten_dang_nhap LIKE ?)"
        )
        params.extend([term, term, term, term, term])
        
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    
    count_sql = f"""
        SELECT COUNT(*)
        FROM NhatKyHeThong n
        LEFT JOIN NguoiDung u ON n.ma_nguoi_dung = u.ma_nguoi_dung
        LEFT JOIN VaiTro vt ON u.ma_vai_tro = vt.ma_vai_tro
        {where_sql}
    """
    query_sql = f"""
        SELECT n.ma_nhat_ky AS log_id, 
               n.muc_do AS log_level, 
               n.hanh_dong AS module, 
               n.thong_bao AS message, 
               n.ma_nguoi_dung AS user_id, 
               n.dia_chi_ip AS ip_address,
               COALESCE(u.ho_va_ten, N'Hệ thống') AS actor_name,
               u.ten_dang_nhap AS username,
               COALESCE(vt.ten_vai_tro, 'system') AS actor_role,
               n.du_lieu_chi_tiet AS extra_data, 
               n.thoi_gian AS created_at
        FROM NhatKyHeThong n
        LEFT JOIN NguoiDung u ON n.ma_nguoi_dung = u.ma_nguoi_dung
        LEFT JOIN VaiTro vt ON u.ma_vai_tro = vt.ma_vai_tro
        {where_sql}
        ORDER BY n.thoi_gian DESC
        OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    """
    
    with get_db_cursor(commit=False) as cursor:
        cursor.execute(count_sql, tuple(params))
        total = cursor.fetchone()[0]
        
        cursor.execute(query_sql, tuple(params + [skip, limit]))
        rows = cursor.fetchall()
        logs = rows_to_dicts(cursor, rows)
        for log in logs:
            if log.get("extra_data") and isinstance(log["extra_data"], str):
                try:
                    log["extra_data"] = json.loads(log["extra_data"])
                except Exception:
                    pass
        
        return logs, total
