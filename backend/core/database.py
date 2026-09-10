import urllib.parse
from contextlib import contextmanager
from typing import Optional, Dict, Any, List
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
import pyodbc

from core.config import settings

def _build_connection_string(server: str) -> str:
    """Xây dựng chuỗi kết nối ODBC an toàn cho SQL Server"""
    driver_name = settings.DATABASE_DRIVER.replace("+", " ")
    if settings.DATABASE_USERNAME and settings.DATABASE_PASSWORD:
        return (
            f"DRIVER={{{driver_name}}};"
            f"SERVER={server};"
            f"DATABASE={settings.DATABASE_NAME};"
            f"UID={settings.DATABASE_USERNAME};"
            f"PWD={settings.DATABASE_PASSWORD};"
            f"Encrypt={settings.DATABASE_ENCRYPT};"
            f"TrustServerCertificate={settings.DATABASE_TRUST_SERVER};"
        )
    else:
        return (
            f"DRIVER={{{driver_name}}};"
            f"SERVER={server};"
            f"DATABASE={settings.DATABASE_NAME};"
            f"Trusted_Connection=yes;"
            f"TrustServerCertificate=yes;"
        )

# Danh sách server để thử kết nối (fallback giữa container host và localhost)
def _find_working_server() -> str:
    servers_to_try = [settings.DATABASE_SERVER]
    if settings.DATABASE_SERVER not in ("localhost", "127.0.0.1"):
        servers_to_try.extend(["localhost,1433", "127.0.0.1,1433"])
    
    last_err = None
    for server in servers_to_try:
        try:
            conn_str = _build_connection_string(server)
            test_conn = pyodbc.connect(conn_str, timeout=3)
            test_conn.close()
            return server
        except Exception as e:
            last_err = e
            continue
    # Nếu không kết nối được ngay lúc khởi tạo (ví dụ DB container đang start), mặc định dùng server chính
    return settings.DATABASE_SERVER

_active_server = _find_working_server()
_odbc_conn_str = _build_connection_string(_active_server)
_sqlalchemy_url = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(_odbc_conn_str)}"

# Tạo Connection Pool tối ưu bằng SQLAlchemy QueuePool
engine = create_engine(
    _sqlalchemy_url,
    poolclass=QueuePool,
    pool_size=20,           # 20 kết nối thường trực
    max_overflow=30,        # Cho phép bung tối đa 30 kết nối khi cao điểm
    pool_timeout=30,        # Chờ tối đa 30s trước khi báo lỗi hết pool
    pool_recycle=1800,      # Tự động làm mới kết nối sau 30 phút (tránh stale connection)
    pool_pre_ping=True,     # Kiểm tra liveness trước khi giao kết nối
    fast_executemany=True   # Tăng tốc bulk insert
)

def get_db_connection():
    """
    Lấy kết nối từ Connection Pool.
    Khi gọi conn.close(), kết nối sẽ được hoàn trả lại pool thay vì ngắt socket TCP.
    """
    try:
        return engine.raw_connection()
    except Exception as e:
        # Fallback tạo kết nối trực tiếp nếu pool gặp sự cố
        conn_str = _build_connection_string(settings.DATABASE_SERVER)
        return pyodbc.connect(conn_str, timeout=settings.DATABASE_CONNECTION_TIMEOUT)

@contextmanager
def get_db_cursor(commit: bool = False):
    """
    Context Manager hỗ trợ quản lý giao dịch (Unit of Work).
    Tự động commit/rollback và luôn trả kết nối về pool trong khối finally.
    
    Cách dùng:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("INSERT INTO ...", (val,))
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        yield cursor
        if commit:
            conn.commit()
    except Exception:
        if commit:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()  # Trả về pool
        except Exception:
            pass

def rows_to_dicts(cursor, rows) -> List[Dict[str, Any]]:
    """Tiện ích chuyển đổi các dòng kết quả pyodbc thành danh sách dictionary"""
    if not rows or not cursor.description:
        return []
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in rows]

def row_to_dict(cursor, row) -> Optional[Dict[str, Any]]:
    """Tiện ích chuyển đổi 1 dòng kết quả pyodbc thành dictionary"""
    if not row or not cursor.description:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))
