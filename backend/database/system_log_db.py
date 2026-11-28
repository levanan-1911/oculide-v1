from datetime import datetime, timedelta
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import json
import logging
import queue
import threading

from core.database import get_db_cursor, row_to_dict, rows_to_dicts

LOGS_DIR = Path(__file__).resolve().parent.parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

_cron_logger = logging.getLogger("oculide_cron")
if not _cron_logger.handlers:
    _cron_logger.setLevel(logging.INFO)
    _handler = RotatingFileHandler(
        LOGS_DIR / "system_cron.log",
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    _handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    _cron_logger.addHandler(_handler)

_SCHEMA_READY = False
_SCHEMA_LOCK = threading.Lock()
_LOG_QUEUE: "queue.Queue[Dict[str, Any]]" = queue.Queue()
_WORKER_STARTED = False


def ensure_audit_log_schema() -> None:
    """Bổ sung các cột chuẩn hóa, composite index và bảng ExamProctoringLogs (idempotent)."""
    global _SCHEMA_READY
    if _SCHEMA_READY:
        return
    with _SCHEMA_LOCK:
        if _SCHEMA_READY:
            return
        ddl_statements = [
            "IF COL_LENGTH('SystemAuditLogs', 'event_code') IS NULL ALTER TABLE SystemAuditLogs ADD event_code NVARCHAR(80) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'action_label') IS NULL ALTER TABLE SystemAuditLogs ADD action_label NVARCHAR(255) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'category') IS NULL ALTER TABLE SystemAuditLogs ADD category NVARCHAR(32) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'severity') IS NULL ALTER TABLE SystemAuditLogs ADD severity NVARCHAR(16) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'status') IS NULL ALTER TABLE SystemAuditLogs ADD status NVARCHAR(16) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'actor_json') IS NULL ALTER TABLE SystemAuditLogs ADD actor_json NVARCHAR(MAX) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'target_json') IS NULL ALTER TABLE SystemAuditLogs ADD target_json NVARCHAR(MAX) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'user_agent') IS NULL ALTER TABLE SystemAuditLogs ADD user_agent NVARCHAR(512) NULL;",
            "IF COL_LENGTH('SystemAuditLogs', 'updated_at') IS NULL ALTER TABLE SystemAuditLogs ADD updated_at DATETIME2 NULL;",
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SystemAuditLogs_Created_Cat_Sev' AND object_id = OBJECT_ID('SystemAuditLogs'))
            CREATE INDEX IX_SystemAuditLogs_Created_Cat_Sev ON SystemAuditLogs (created_at DESC, category, severity);
            """,
            """
            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SystemAuditLogs_User_Created' AND object_id = OBJECT_ID('SystemAuditLogs'))
            CREATE INDEX IX_SystemAuditLogs_User_Created ON SystemAuditLogs (user_id, created_at DESC);
            """,
            """
            IF OBJECT_ID('ExamProctoringLogs', 'U') IS NULL
            CREATE TABLE ExamProctoringLogs (
                proctoring_log_id INT IDENTITY(1,1) PRIMARY KEY,
                room_id INT NULL,
                student_id INT NULL,
                event_code NVARCHAR(80) NOT NULL,
                severity NVARCHAR(16) NOT NULL DEFAULT 'WARN',
                details NVARCHAR(MAX) NULL,
                created_at DATETIME2 NOT NULL DEFAULT GETDATE()
            );
            """,
        ]
        try:
            with get_db_cursor(commit=True) as cursor:
                for stmt in ddl_statements:
                    cursor.execute(stmt)
            _SCHEMA_READY = True
        except Exception as e:
            logging.getLogger("system_log_db").warning(f"Không thể nâng cấp schema SystemAuditLogs: {e}")


def _infer_event_fields(
    log_level: str,
    module: str,
    message: str,
    extra_data: Optional[Dict[str, Any]] = None,
) -> Tuple[str, str, str, str, str]:
    mod_l = (module or "").lower()
    msg_l = (message or "").lower()
    lvl_l = (log_level or "info").lower()
    meta = extra_data if isinstance(extra_data, dict) else {}

    # Severity
    if lvl_l in ("critical", "error"):
        severity = "CRITICAL"
    elif lvl_l in ("warn", "warning", "security"):
        severity = "WARN"
    else:
        severity = "INFO"

    # Status
    status_val = meta.get("status")
    if not status_val:
        if "thất bại" in msg_l or "failed" in msg_l or "lỗi" in msg_l or "sai" in msg_l or severity == "CRITICAL":
            status_val = "FAILED"
        else:
            status_val = "SUCCESS"
    status_val = str(status_val).upper()

    # Category & EventCode & ActionLabel
    event_code = meta.get("eventCode")
    action_label = meta.get("actionLabel")
    category = meta.get("category")

    if not category:
        if "auth" in mod_l or "đăng nhập" in mod_l or "phiên" in mod_l or "mật khẩu" in mod_l:
            category = "AUTH"
        elif "thi" in mod_l or "phòng" in mod_l or "đề" in mod_l or "lớp" in mod_l or "exam" in mod_l:
            category = "EXAM"
        elif "người dùng" in mod_l or "tài khoản" in mod_l or "user" in mod_l:
            category = "USER"
        else:
            category = "SYSTEM"

    if not event_code:
        if "auth_login" in mod_l or "đăng nhập" in msg_l:
            event_code = "AUTH_LOGIN_FAILED" if status_val == "FAILED" else "AUTH_LOGIN_SUCCESS"
        elif "mở khóa phiên" in msg_l or "unlock" in mod_l:
            event_code = "SESSION_UNLOCKED"
        elif "mật khẩu" in mod_l or "password" in mod_l:
            event_code = "PASSWORD_CHANGED"
        elif "cấu hình" in mod_l or "settings" in mod_l:
            event_code = "CONFIG_UPDATED"
        elif "bảo trì" in mod_l or "maintenance" in mod_l:
            event_code = "MAINTENANCE_UPDATED"
        elif "sao lưu" in mod_l or "backup" in mod_l:
            event_code = "DATABASE_BACKUP"
        elif category == "USER":
            event_code = "USER_UPDATED"
        elif category == "EXAM":
            event_code = "EXAM_UPDATED"
        else:
            event_code = (module or "SYSTEM_EVENT").strip().upper().replace(" ", "_")[:60]

    if not action_label:
        label_map = {
            "AUTH_LOGIN_SUCCESS": "Đăng nhập thành công",
            "AUTH_LOGIN_FAILED": "Đăng nhập thất bại",
            "SESSION_UNLOCKED": "Mở khóa phiên làm việc",
            "PASSWORD_CHANGED": "Thay đổi mật khẩu",
            "CONFIG_UPDATED": "Cập nhật cấu hình hệ thống",
            "MAINTENANCE_UPDATED": "Cập nhật chế độ bảo trì",
            "DATABASE_BACKUP": "Sao lưu cơ sở dữ liệu",
        }
        action_label = label_map.get(event_code, module or "Sự kiện hệ thống")

    return event_code, action_label, category, severity, status_val


def _build_actor_snapshot(user_id: Optional[int]) -> Dict[str, Any]:
    if not user_id:
        return {"userId": None, "fullName": "Hệ thống", "code": "SYSTEM", "role": "SYSTEM"}
    try:
        from database.user_db import get_user_by_id
        u = get_user_by_id(int(user_id))
        if u:
            role_raw = (u.get("role") or "student").upper()
            role_norm = "LECTURER" if role_raw == "INSTRUCTOR" else role_raw
            return {
                "userId": u.get("user_id"),
                "fullName": u.get("full_name") or u.get("username") or f"User #{user_id}",
                "code": u.get("student_id") or u.get("username") or str(user_id),
                "role": role_norm,
            }
    except Exception:
        pass
    return {"userId": user_id, "fullName": f"User #{user_id}", "code": str(user_id), "role": "USER"}


def _is_routine_cron_success(module: str, severity: str, status_val: str) -> bool:
    mod_l = (module or "").lower()
    is_cron = any(k in mod_l for k in ("bảo trì tự động", "sao lưu tự động", "dọn dẹp"))
    return is_cron and status_val == "SUCCESS" and severity == "INFO"


def create_system_log(
    log_level: str,
    module: str,
    message: str,
    user_id: Optional[int] = None,
    extra_data: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    target: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Ghi nhận nhật ký kiểm toán chuẩn hóa vào SystemAuditLogs (có gộp trùng 2 phút & tách cron log)."""
    ensure_audit_log_schema()

    meta: Dict[str, Any] = dict(extra_data) if isinstance(extra_data, dict) else ({"raw": extra_data} if extra_data is not None else {})
    event_code, action_label, category, severity, status_val = _infer_event_fields(
        log_level, module, message, meta
    )

    # Tách log cronjob thành công ra file xoay vòng để giữ bảng Admin sạch sẽ
    if _is_routine_cron_success(module, severity, status_val):
        _cron_logger.info(f"[{event_code}] {message}")
        return {
            "log_id": 0,
            "log_level": log_level.lower(),
            "module": module,
            "message": message,
            "event_code": event_code,
            "action_label": action_label,
            "category": category,
            "severity": severity,
            "status": status_val,
        }

    from core.request_context import get_request_ip, get_request_user_agent
    if not ip_address:
        ip_address = get_request_ip()
    if not user_agent:
        user_agent = get_request_user_agent()

    actor_obj = meta.pop("actor", None) or _build_actor_snapshot(user_id)
    target_obj = target or meta.pop("target", None)
    ua_str = (user_agent or meta.pop("userAgent", "") or "")[:512]
    meta.setdefault("attemptCount", 1)

    actor_json = json.dumps(actor_obj, ensure_ascii=False)
    target_json = json.dumps(target_obj, ensure_ascii=False) if target_obj is not None else None

    # Deduplication (gộp sự kiện lặp lại trong vòng 2 phút theo actor/IP + event_code)
    two_mins_ago = datetime.now() - timedelta(minutes=2)
    with get_db_cursor(commit=True) as cursor:
        if user_id is not None:
            cursor.execute(
                """
                SELECT TOP 1 log_id, details
                FROM SystemAuditLogs
                WHERE event_code = ? AND user_id = ? AND created_at >= ?
                ORDER BY created_at DESC
                """,
                (event_code, user_id, two_mins_ago),
            )
        elif ip_address:
            cursor.execute(
                """
                SELECT TOP 1 log_id, details
                FROM SystemAuditLogs
                WHERE event_code = ? AND ip_address = ? AND created_at >= ?
                ORDER BY created_at DESC
                """,
                (event_code, ip_address, two_mins_ago),
            )
        else:
            cursor.execute("SELECT TOP 0 log_id, details FROM SystemAuditLogs")

        existing = cursor.fetchone()
        if existing and event_code in ("AUTH_LOGIN_FAILED", "MAINTENANCE_UPDATED", "CONFIG_UPDATED"):
            existing_id, existing_details = existing
            prev_meta: Dict[str, Any] = {}
            if existing_details and isinstance(existing_details, str):
                try:
                    parsed = json.loads(existing_details)
                    if isinstance(parsed, dict):
                        prev_meta = parsed
                except Exception:
                    pass
            prev_count = int(prev_meta.get("attemptCount") or 1)
            meta["attemptCount"] = prev_count + 1
            merged_json = json.dumps(meta, ensure_ascii=False)
            cursor.execute(
                """
                UPDATE SystemAuditLogs
                SET details = ?, message = ?, updated_at = GETDATE()
                OUTPUT inserted.log_id, inserted.log_level, inserted.action AS module,
                       inserted.message, inserted.user_id, inserted.ip_address,
                       inserted.details AS extra_data, inserted.created_at,
                       inserted.event_code, inserted.action_label, inserted.category,
                       inserted.severity, inserted.status, inserted.actor_json,
                       inserted.target_json, inserted.user_agent, inserted.updated_at
                WHERE log_id = ?
                """,
                (merged_json, message, existing_id),
            )
            row = cursor.fetchone()
            return row_to_dict(cursor, row) or {}

        extra_json = json.dumps(meta, ensure_ascii=False)
        sql = """
            INSERT INTO SystemAuditLogs (
                log_level, action, message, user_id, ip_address, details,
                event_code, action_label, category, severity, status,
                actor_json, target_json, user_agent, updated_at
            )
            OUTPUT inserted.log_id, inserted.log_level, inserted.action AS module,
                   inserted.message, inserted.user_id, inserted.ip_address,
                   inserted.details AS extra_data, inserted.created_at,
                   inserted.event_code, inserted.action_label, inserted.category,
                   inserted.severity, inserted.status, inserted.actor_json,
                   inserted.target_json, inserted.user_agent, inserted.updated_at
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())
        """
        cursor.execute(
            sql,
            (
                log_level.lower(),
                module,
                message,
                user_id,
                ip_address,
                extra_json,
                event_code,
                action_label,
                category,
                severity,
                status_val,
                actor_json,
                target_json,
                ua_str,
            ),
        )
        row = cursor.fetchone()
        result = row_to_dict(cursor, row)
        if result and result.get("extra_data") and isinstance(result["extra_data"], str):
            try:
                result["extra_data"] = json.loads(result["extra_data"])
            except Exception:
                pass
        return result or {}


def _log_worker_loop() -> None:
    while True:
        item = _LOG_QUEUE.get()
        try:
            create_system_log(**item)
        except Exception as e:
            logging.getLogger("system_log_db").warning(f"Async audit log error: {e}")
        finally:
            _LOG_QUEUE.task_done()


def queue_system_log(**kwargs: Any) -> None:
    """Đẩy tác vụ ghi log vào hàng đợi bất đồng bộ (Non-blocking)."""
    global _WORKER_STARTED
    if not _WORKER_STARTED:
        _WORKER_STARTED = True
        t = threading.Thread(target=_log_worker_loop, daemon=True, name="audit-log-worker")
        t.start()
    _LOG_QUEUE.put(kwargs)


def cleanup_old_audit_logs(info_days: int = 90, warn_critical_days: int = 365) -> int:
    """Dọn dẹp tự động: xóa INFO > 90 ngày, giữ WARN & CRITICAL tối thiểu 1 năm."""
    ensure_audit_log_schema()
    info_cutoff = datetime.now() - timedelta(days=info_days)
    critical_cutoff = datetime.now() - timedelta(days=warn_critical_days)
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            """
            DELETE FROM SystemAuditLogs
            WHERE (COALESCE(severity, UPPER(log_level)) = 'INFO' AND created_at < ?)
               OR (COALESCE(severity, UPPER(log_level)) IN ('WARN', 'WARNING', 'CRITICAL', 'ERROR') AND created_at < ?)
            """,
            (info_cutoff, critical_cutoff),
        )
        return cursor.rowcount or 0


def get_system_logs(
    skip: int = 0,
    limit: int = 50,
    log_level: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    module: Optional[str] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], int]:
    """Truy vấn nhật ký chuẩn hóa với phân trang & bộ lọc đa chiều."""
    ensure_audit_log_schema()
    where_clauses = []
    params: List[Any] = []

    sev_param = (severity or log_level or "").strip().upper()
    if sev_param and sev_param != "ALL":
        if sev_param in ("WARN", "WARNING"):
            where_clauses.append("(UPPER(COALESCE(n.severity, n.log_level)) IN ('WARN', 'WARNING'))")
        elif sev_param in ("CRITICAL", "ERROR"):
            where_clauses.append("(UPPER(COALESCE(n.severity, n.log_level)) IN ('CRITICAL', 'ERROR'))")
        else:
            where_clauses.append("UPPER(COALESCE(n.severity, n.log_level)) = ?")
            params.append(sev_param)

    if category and category.strip() and category.upper() != "ALL":
        where_clauses.append("UPPER(COALESCE(n.category, 'SYSTEM')) = ?")
        params.append(category.strip().upper())

    if status_filter and status_filter.strip() and status_filter.upper() != "ALL":
        where_clauses.append("UPPER(COALESCE(n.status, 'SUCCESS')) = ?")
        params.append(status_filter.strip().upper())

    if module and module.strip() and module.lower() != "all":
        where_clauses.append("n.action = ?")
        params.append(module.strip())

    if user_id:
        where_clauses.append("n.user_id = ?")
        params.append(user_id)

    if role and role.strip() and role.lower() != "all":
        clean_role = role.lower().strip()
        if clean_role == "system":
            where_clauses.append("(n.user_id IS NULL OR LOWER(vt.role_name) = 'system')")
        else:
            where_clauses.append("LOWER(vt.role_name) = ?")
            params.append(clean_role)

    if start_date:
        where_clauses.append("n.created_at >= ?")
        params.append(start_date)
    if end_date:
        where_clauses.append("n.created_at <= ?")
        params.append(end_date)

    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append(
            "(n.message LIKE ? OR n.action LIKE ? OR n.event_code LIKE ? OR n.action_label LIKE ? OR n.ip_address LIKE ? OR u.full_name LIKE ? OR u.username LIKE ? OR u.identifier_code LIKE ?)"
        )
        params.extend([term, term, term, term, term, term, term, term])

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
               COALESCE(u.full_name, u.username, N'Hệ thống') AS actor_name,
               u.username,
               u.identifier_code AS actor_code,
               COALESCE(vt.role_name, 'system') AS actor_role,
               n.details AS extra_data,
               n.event_code,
               n.action_label,
               n.category,
               n.severity,
               n.status,
               n.actor_json,
               n.target_json,
               n.user_agent,
               n.updated_at,
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
            for json_col in ("extra_data", "actor_json", "target_json"):
                val = log.get(json_col)
                if val and isinstance(val, str):
                    try:
                        log[json_col] = json.loads(val)
                    except Exception:
                        pass
            if not log.get("event_code"):
                ec, al, cat, sev, st = _infer_event_fields(
                    log.get("log_level") or "info",
                    log.get("module") or "",
                    log.get("message") or "",
                    log.get("extra_data") if isinstance(log.get("extra_data"), dict) else None,
                )
                log["event_code"] = ec
                log["action_label"] = al
                log["category"] = cat
                log["severity"] = sev
                log["status"] = st

        return logs, total
