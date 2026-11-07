import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from services.email_service import EmailService
from fastapi.testclient import TestClient
from main import app

def test_email_service_mock():
    with patch.object(EmailService, "_is_smtp_configured", return_value=False):
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

from unittest.mock import patch

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

if __name__ == "__main__":
    test_email_service_mock()
    test_api_forgot_password_with_background_task()
    print("=== ALL EMAIL SERVICE TESTS PASSED SUCCESSFULLY! ===")
