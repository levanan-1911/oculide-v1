import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_records_client_public_ip_and_audit_log():
    # Giả lập request đăng nhập với Header IP mạng ngoài (ví dụ Wi-Fi 171.225.185.45)
    test_ip = "171.225.185.45"
    mock_user = {
        "user_id": 1,
        "username": "admin",
        "email": "admin@school.edu.vn",
        "full_name": "Quản Trị Viên",
        "role": "admin",
        "is_active": True,
        "must_change_password": False,
        "password_hash": "mocked_hash",
        "last_login_ip": None
    }

    with patch("api.auth.get_user_by_username", return_value=mock_user), \
         patch("api.auth.verify_password", return_value=True), \
         patch("api.auth.update_last_login") as mock_update_ip:
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"X-Client-Public-IP": test_ip}
        )
        assert response.status_code == 200, f"Đăng nhập thất bại: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["last_login_ip"] == test_ip
        mock_update_ip.assert_called_once_with(1, client_ip=test_ip)

def test_my_ip_endpoint():
    test_ip = "118.69.123.45"
    res = client.get("/api/v1/auth/my-ip", headers={"X-Forwarded-For": f"{test_ip}, 10.0.0.1"})
    assert res.status_code == 200
    assert res.json()["ip"] == test_ip
