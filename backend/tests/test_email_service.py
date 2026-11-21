import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.abspath("backend"))

from services.email_service import EmailService
from services.system_settings_manager import SystemSettingsManager, is_email_domain_allowed
from schemas.system_management import SystemSettingsModel
from fastapi.testclient import TestClient
from main import app

def test_is_email_domain_allowed():
    # 1. Khi admin chưa cấu hình domain (rỗng hoặc None) -> cho phép mọi email hợp lệ
    assert is_email_domain_allowed("user@gmail.com", "") is True
    assert is_email_domain_allowed("user@school.edu.vn", None) is True
    assert is_email_domain_allowed("user@anydomain.com", "   ") is True
    assert is_email_domain_allowed("invalid-email", "") is False

    # 2. Khi admin cấu hình 1 domain cụ thể
    assert is_email_domain_allowed("user@dtu.edu.vn", "@dtu.edu.vn") is True
    assert is_email_domain_allowed("user@dtu.edu.vn", "dtu.edu.vn") is True
    assert is_email_domain_allowed("user@gmail.com", "@dtu.edu.vn") is False

    # 3. Khi admin cấu hình nhiều domain cách nhau bởi dấu phẩy, chấm phẩy
    multi_domain = "@dtu.edu.vn, @school.edu.vn; @ptit.edu.vn"
    assert is_email_domain_allowed("sv@dtu.edu.vn", multi_domain) is True
    assert is_email_domain_allowed("sv@school.edu.vn", multi_domain) is True
    assert is_email_domain_allowed("sv@ptit.edu.vn", multi_domain) is True
    assert is_email_domain_allowed("sv@gmail.com", multi_domain) is False

def test_email_service_mock():
    mock_settings = SystemSettingsModel(allowed_email_domain="@school.edu.vn")
    with patch.object(SystemSettingsManager, "get_settings", return_value=mock_settings), \
         patch.object(EmailService, "_is_smtp_configured", return_value=False):
        res1 = EmailService.send_account_credentials_email(
            to_email="student01@school.edu.vn",
            username="sv001",
            raw_password="InitialPassword123!",
            full_name="Nguyễn Văn A",
            role="student",
            ma_dinh_danh="20110001"
        )
        assert res1 is True

        res2 = EmailService.send_password_reset_email(
            to_email="instructor01@school.edu.vn",
            reset_token="mock-secure-token-12345",
            full_name="TS. Trần Văn B"
        )
        assert res2 is True

def test_api_forgot_password_with_background_task():
    client = TestClient(app)
    mock_user = {
        "user_id": 10,
        "username": "student_test",
        "email": "student@school.edu.vn",
        "full_name": "Nguyen Van A"
    }
    with patch("api.auth.get_user_by_email", return_value=mock_user), \
         patch("api.auth.create_password_reset_token", return_value=True), \
         patch("services.email_service.EmailService.send_password_reset_email", return_value=True):
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "student@school.edu.vn"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "student@school.edu.vn" in data["message"]

def test_api_register_with_email_notification():
    client = TestClient(app)
    mock_new_user = {
        "user_id": 11,
        "username": "new_student",
        "email": "new_student@school.edu.vn",
        "full_name": "New Student",
        "role": "student",
        "student_id": "SV999",
        "user_code": "SV999",
        "is_active": True,
        "must_change_password": False,
        "created_at": "2026-11-08T00:00:00",
        "updated_at": "2026-11-08T00:00:00"
    }
    mock_settings = SystemSettingsModel(allowed_email_domain="@school.edu.vn")
    with patch("services.system_settings_manager.SystemSettingsManager.get_settings", return_value=mock_settings), \
         patch("api.auth.get_user_by_username", return_value=None), \
         patch("api.auth.get_user_by_email", return_value=None), \
         patch("api.auth.create_user", return_value=mock_new_user), \
         patch("services.email_service.EmailService.send_account_credentials_email", return_value=True) as mock_send_email:
        response = client.post(
            "/api/v1/auth/register",
            json={
                "username": "new_student",
                "email": "new_student@school.edu.vn",
                "password": "SecurePassword123!",
                "full_name": "New Student",
                "role": "student",
                "student_id": "SV999"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "new_student"
        assert data["email"] == "new_student@school.edu.vn"
        mock_send_email.assert_called_once()

from core.permissions import admin_required

def test_api_batch_import_with_email_notification():
    client = TestClient(app)
    mock_admin_user = {"user_id": 1, "username": "admin", "role": "admin"}
    app.dependency_overrides[admin_required] = lambda: mock_admin_user
    mock_settings = SystemSettingsModel(allowed_email_domain="@school.edu.vn")
    try:
        with patch("services.system_settings_manager.SystemSettingsManager.get_settings", return_value=mock_settings), \
             patch("api.admin.get_user_by_username", return_value=None), \
             patch("api.admin.get_user_by_email", return_value=None), \
             patch("api.admin.create_user", return_value={"user_id": 99}), \
             patch("services.email_service.EmailService.send_account_credentials_email", return_value=True) as mock_send_email:
            response = client.post(
                "/api/v1/admin/users/batch-import",
                json={
                    "role": "student",
                    "users": [
                        {
                            "username": "sv101",
                            "email": "sv101@school.edu.vn",
                            "full_name": "Sinh Vien 101",
                            "student_id": "SV101"
                        },
                        {
                            "username": "sv102",
                            "email": "sv102@school.edu.vn",
                            "full_name": "Sinh Vien 102",
                            "student_id": "SV102"
                        }
                    ]
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["total_imported"] == 2
            assert data["failed_count"] == 0
            assert mock_send_email.call_count == 2
    finally:
        app.dependency_overrides.pop(admin_required, None)

if __name__ == "__main__":
    test_email_service_mock()
    test_api_forgot_password_with_background_task()
    print("=== ALL EMAIL SERVICE TESTS PASSED SUCCESSFULLY! ===")
