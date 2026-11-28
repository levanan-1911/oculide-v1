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


@pytest.fixture(autouse=True)
def _ci_mock_user_lookup(monkeypatch):
    """Khi chạy CI không có SQL Server, giả lập get_user_by_id cho các test RBAC/API dùng token mẫu."""
    if is_db_available():
        return

    _TEST_USERS = {
        1: {"user_id": 1, "username": "admin", "role": "admin", "email": "admin@oculide.local", "full_name": "Admin Test", "is_active": True},
        2: {"user_id": 2, "username": "instructor", "role": "instructor", "email": "instructor@oculide.local", "full_name": "Instructor Test", "is_active": True},
        3: {"user_id": 3, "username": "student", "role": "student", "email": "student@oculide.local", "full_name": "Student Test", "is_active": True},
        999: {"user_id": 999, "username": "attacker_test", "role": "student", "email": "attacker@oculide.local", "full_name": "Attacker Test", "is_active": True},
    }
    import database.user_db as user_db
    monkeypatch.setattr(user_db, "get_user_by_id", lambda uid: _TEST_USERS.get(int(uid)) if uid is not None else None)
    monkeypatch.setattr(user_db, "get_user_lockout_state", lambda uid: {"failed_login_attempts": 0, "locked_until": None})
    monkeypatch.setattr(user_db, "reset_user_lockout", lambda uid: True)
    try:
        res = ping_database(timeout_seconds=0.5)
        _db_status_cache = (res.get("status") == "up")
    except Exception:
        _db_status_cache = False
    return _db_status_cache


@pytest.fixture(autouse=True)
def _ci_mock_user_lookup(monkeypatch):
    """Khi chạy CI không có SQL Server, giả lập get_user_by_id cho các test RBAC/API dùng token mẫu."""
    if is_db_available():
        return

    _TEST_USERS = {
        1: {"user_id": 1, "username": "admin", "role": "admin", "email": "admin@oculide.local", "full_name": "Admin Test", "is_active": True},
        2: {"user_id": 2, "username": "instructor", "role": "instructor", "email": "instructor@oculide.local", "full_name": "Instructor Test", "is_active": True},
        3: {"user_id": 3, "username": "student", "role": "student", "email": "student@oculide.local", "full_name": "Student Test", "is_active": True},
        999: {"user_id": 999, "username": "attacker_test", "role": "student", "email": "attacker@oculide.local", "full_name": "Attacker Test", "is_active": True},
    }
    import database.user_db as user_db
    monkeypatch.setattr(user_db, "get_user_by_id", lambda uid: _TEST_USERS.get(int(uid)) if uid is not None else None)
    monkeypatch.setattr(user_db, "get_user_lockout_state", lambda uid: {"failed_login_attempts": 0, "locked_until": None})
    monkeypatch.setattr(user_db, "reset_user_lockout", lambda uid: True)
