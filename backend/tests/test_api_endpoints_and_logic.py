import pytest
import os
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token, create_refresh_token

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code in (200, 503)
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
