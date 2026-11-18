import pytest
import os
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token, create_refresh_token

client = TestClient(app)

def test_health_check_endpoint():
    with patch("core.database.ping_database", return_value={"status": "up", "latency_ms": 1.0}), \
         patch("redis.asyncio.Redis.ping", return_value=True):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "degraded", "unhealthy")
        assert "version" in data
        assert "app" in data



def test_protected_endpoints_require_authentication():
    # Kiểm tra các endpoint quản trị và tài nguyên không cho phép truy cập vô danh (Anonymous)
    endpoints = [
        "/api/v1/admin/system/overview",
        "/api/v1/admin/logs",
        "/api/v1/rooms",
        "/api/v1/sessions/1",
        "/api/v1/submissions/1",
        "/api/v1/violations/session/1"
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code in (401, 403, 404), f"Endpoint {ep} không được bảo vệ xác thực!"

def test_livekit_webhook_relay():
    # Kiểm tra endpoint Webhook LiveKit SFU tiếp nhận và xử lý gói tin an toàn
    payload = {
        "event": "participant_joined",
        "room": {"name": "room_test_123"},
        "participant": {"identity": "user_99"}
    }
    with patch("api.livekit._get_redis_client") as mock_redis_getter:
        mock_redis = MagicMock()
        mock_redis_getter.return_value = mock_redis
        response = client.post("/api/v1/livekit/webhook", json=payload)
        assert response.status_code == 200
        assert response.json().get("status") == "received"

def test_refresh_token_endpoint(monkeypatch):
    # 1. Thử gửi refresh token không hợp lệ
    bad_res = client.post("/api/v1/auth/refresh", json={"refresh_token": "invalid.jwt.token"})
    assert bad_res.status_code == 401
    
    # 2. Thử gửi access token thay vì refresh token (phải bị từ chối)
    access_token = create_access_token({"user_id": 10, "role": "student"})
    wrong_type_res = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert wrong_type_res.status_code == 401
    assert "refresh" in wrong_type_res.json()["detail"].lower()

    # 3. Giả lập người dùng hợp lệ trong CSDL để kiểm tra cấp mới token
    monkeypatch.setattr(
        "api.auth.get_user_by_id",
        lambda uid: {
            "user_id": 10,
            "username": "student_test",
            "role": "student",
            "email": "student@oculide.vn",
            "full_name": "Nguyen Van A",
            "is_active": True
        }
    )
    valid_refresh = create_refresh_token({"user_id": 10, "role": "student"})
    good_res = client.post("/api/v1/auth/refresh", json={"refresh_token": valid_refresh})
    assert good_res.status_code == 200
    data = good_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def test_uploads_static_directory_mounted():
    # Kiểm tra thư mục tĩnh uploads/snapshots đã được tạo và sẵn sàng phục vụ
    current_dir = os.path.dirname(os.path.abspath(__file__))
    uploads_snapshots_dir = os.path.join(current_dir, "..", "uploads", "snapshots")
    assert os.path.exists(uploads_snapshots_dir)

def test_admin_update_user_endpoint(monkeypatch):
    # Kiểm tra endpoint PUT /api/v1/admin/users/{user_id} cập nhật thành công vào CSDL
    admin_token = create_access_token({"user_id": 1, "role": "admin"})
    
    mock_user = {
        "user_id": 99,
        "username": "sinhvien99",
        "email": "sv99@dtu.edu.vn",
        "full_name": "Sinh Vien Cu",
        "role": "student",
        "student_id": "SV99",
        "user_code": "SV99",
        "is_active": True,
        "must_change_password": False,
        "department": "Khoa CNTT",
        "lop_sinh_hoat": "K28-KTPM1",
        "homeroom_class": "K28-KTPM1",
        "academic_rank": None,
        "phone_number": None,
        "avatar_url": None,
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
        "last_login": None,
        "last_login_ip": None
    }
    
    updated_storage = dict(mock_user)
    
    def mock_get_user(uid):
        if uid == 99:
            return updated_storage
        return None

    def mock_update_profile(user_id, **kwargs):
        for k, v in kwargs.items():
            if v is not None:
                updated_storage[k] = v

    monkeypatch.setattr("api.admin.get_user_by_id", mock_get_user)
    monkeypatch.setattr("api.admin.update_user_profile", mock_update_profile)
    monkeypatch.setattr("api.admin.get_user_by_email", lambda e: None)
    
    payload = {
        "full_name": "Sinh Vien Moi",
        "email": "sv.moi@dtu.edu.vn",
        "role": "student",
        "student_id": "SV202699",
        "department": "Khoa CNTT Moi",
        "lop_sinh_hoat": "SE1801",
        "is_active": True
    }
    
    res = client.put(
        "/api/v1/admin/users/99",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload
    )
    
    assert res.status_code == 200, f"Update failed: {res.text}"
    data = res.json()
    assert data["user_id"] == 99
    assert updated_storage["full_name"] == "Sinh Vien Moi"
    assert updated_storage["student_id"] == "SV202699"
    assert updated_storage["lop_sinh_hoat"] == "SE1801"

def test_admin_system_health_and_storage_endpoints():
    admin_token = create_access_token({"user_id": 1, "role": "admin"})
    
    # 1. Test /api/v1/admin/system/health
    res_health = client.get(
        "/api/v1/admin/system/health",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_health.status_code == 200
    data_health = res_health.json()
    assert "overall_status" in data_health
    assert "services" in data_health
    assert len(data_health["services"]) >= 5

    # 2. Test /api/v1/admin/system/storage
    res_storage = client.get(
        "/api/v1/admin/system/storage",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_storage.status_code == 200
    data_storage = res_storage.json()
    assert "submissions_count" in data_storage
    assert "violations_count" in data_storage
    assert "logs_count" in data_storage
    assert "users_count" in data_storage

def test_system_logs_api_and_audit_trail(monkeypatch):
    admin_token = create_access_token({"user_id": 1, "role": "admin"})

    # Giả lập CSDL trong bộ nhớ để test API contract an toàn cả khi chạy trên CI
    logs_storage = []

    def mock_get_system_logs(skip=0, limit=50, **kwargs):
        return (logs_storage[skip:skip+limit], len(logs_storage))

    def mock_create_system_log(log_level, module, message, user_id=None, extra_data=None, ip_address=None):
        record = {
            "log_id": len(logs_storage) + 1,
            "log_level": log_level,
            "module": module,
            "message": message,
            "user_id": user_id,
            "ip_address": ip_address,
            "extra_data": extra_data,
            "created_at": "2026-11-17 15:00:00"
        }
        logs_storage.append(record)
        return record

    monkeypatch.setattr("api.system_logs.get_system_logs", mock_get_system_logs)
    monkeypatch.setattr("api.system_logs.create_system_log", mock_create_system_log)

    # 1. Test list logs
    res_list = client.get(
        "/api/v1/system-logs?limit=5",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert "total" in data_list
    assert "items" in data_list

    # 2. Test create log via POST
    log_payload = {
        "log_level": "info",
        "module": "ADMIN_TEST_LOG",
        "message": "Kiểm thử tạo nhật ký kiểm toán hệ thống qua API",
        "ip_address": "10.0.0.1",
        "extra_data": {"action": "TEST", "value": 123}
    }
    res_create = client.post(
        "/api/v1/system-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=log_payload
    )
    assert res_create.status_code == 201
    created_data = res_create.json()
    assert created_data["module"] == "ADMIN_TEST_LOG"
    assert created_data["ip_address"] == "10.0.0.1"
    assert created_data["extra_data"] == {"action": "TEST", "value": 123}


def test_no_auto_email_generation_batch_import(monkeypatch):
    """Kiểm thử: Hệ thống tuyệt đối không tự sinh email khi batch import nếu thiếu email"""
    from core.permissions import admin_required
    mock_admin_user = {"user_id": 1, "username": "admin", "role": "admin"}
    app.dependency_overrides[admin_required] = lambda: mock_admin_user
    admin_token = create_access_token({"user_id": 1, "role": "admin"})

    payload = {
        "role": "student",
        "users": [
            {
                "full_name": "Nguyen Van A",
                "student_id": "29211200111",
                "email": "",  # Trống email - Không được tự sinh email
            },
            {
                "full_name": "Tran Thi B",
                "student_id": "29211200222",
                "email": "invalid_email_no_at",  # Sai định dạng email
            }
        ]
    }

    try:
        res = client.post(
            "/api/v1/admin/users/batch-import",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=payload
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_imported"] == 0
        assert data["failed_count"] == 2
        assert any("không thể tự sinh email" in err for err in data["errors"])
    finally:
        app.dependency_overrides.pop(admin_required, None)


def test_enroll_student_no_auto_email(monkeypatch):
    """Kiểm thử: Ghi danh sinh viên mới chưa có tài khoản phải báo lỗi nếu thiếu email"""
    import pytest
    from database.classes_db import enroll_student_to_class

    class DummyCursor:
        def execute(self, *args, **kwargs):
            pass
        def fetchone(self):
            return None
        def close(self):
            pass

    class DummyConn:
        def cursor(self):
            return DummyCursor()
        def commit(self):
            pass
        def rollback(self):
            pass
        def close(self):
            pass

    monkeypatch.setattr("database.classes_db.get_db_connection", lambda: DummyConn())
    monkeypatch.setattr("database.classes_db._resolve_class_id", lambda c, cid: 1)
    monkeypatch.setattr("database.classes_db._resolve_user_id", lambda c, uid: None)

    with pytest.raises(ValueError, match="Hệ thống không thể tự sinh email"):
        enroll_student_to_class(
            class_id="CS101",
            student_user_id="SV2026888",
            student_name="Nguyen Van Moi",
            email=""  # Thiếu email
        )



