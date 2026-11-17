import os
import sys
from pathlib import Path
import pytest

# Đảm bảo backend directory nằm trong sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from core.database import ping_database

_db_status_cache = None

def is_db_available() -> bool:
    """
    Kiểm tra nhanh kết nối CSDL SQL Server có đang hoạt động hay không.
    Trả về False nếu đang chạy trên CI (GitHub Actions) không có dịch vụ SQL Server.
    """
    global _db_status_cache
    if _db_status_cache is not None:
        return _db_status_cache
    try:
        res = ping_database(timeout_seconds=0.5)
        _db_status_cache = (res.get("status") == "up")
    except Exception:
        _db_status_cache = False
    return _db_status_cache
