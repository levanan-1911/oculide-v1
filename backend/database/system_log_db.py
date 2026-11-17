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
    """Ghi nhận nhật ký kiểm toán hệ thống vào bảng SystemAuditLogs"""
    extra_json = json.dumps(extra_data, ensure_ascii=False) if extra_data is not None else None
    sql = """
        INSERT INTO SystemAuditLogs (log_level, action, message, user_id, ip_address, details)
        OUTPUT inserted.log_id, 
               inserted.log_level, 
               inserted.action AS module,
               inserted.message, 
               inserted.user_id, 
               inserted.ip_address,
               inserted.details AS extra_data, 
               inserted.created_at
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
        where_clauses.append("LOWER(n.log_level) = ?")
        params.append(log_level.lower().strip())
    if module and module.strip() and module.lower() != 'all':
        where_clauses.append("n.action = ?")
        params.append(module.strip())
    if user_id:
        where_clauses.append("n.user_id = ?")
        params.append(user_id)
    if role and role.strip() and role.lower() != 'all':
        clean_role = role.lower().strip()
        if clean_role == 'system':
            where_clauses.append("(n.user_id IS NULL OR LOWER(vt.role_name) = 'system')")
        else:
            where_clauses.append("LOWER(vt.role_name) = ?")
            params.append(clean_role)
    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append(
            "(n.message LIKE ? OR n.action LIKE ? OR n.ip_address LIKE ? OR u.full_name LIKE ? OR u.username LIKE ?)"
        )
        params.extend([term, term, term, term, term])
        
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    
    count_sql = f"""
        SELECT COUNT(*)
        FROM SystemAuditLogs n
        LEFT JOIN Users u ON n.user_id = u.user_id
        LEFT JOIN Roles vt ON u.role_id = vt.role_id
        {where_sql}
    """
    query_sql = f"""
        SELECT n.log_id, 
               n.log_level, 
               n.action AS module, 
               n.message, 
               n.user_id, 
               n.ip_address,
               COALESCE(u.full_name, N'Hệ thống') AS actor_name,
               u.username,
               COALESCE(vt.role_name, 'system') AS actor_role,
               n.details AS extra_data, 
               n.created_at
        FROM SystemAuditLogs n
        LEFT JOIN Users u ON n.user_id = u.user_id
        LEFT JOIN Roles vt ON u.role_id = vt.role_id
        {where_sql}
        ORDER BY n.created_at DESC
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
