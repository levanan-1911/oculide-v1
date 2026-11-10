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

