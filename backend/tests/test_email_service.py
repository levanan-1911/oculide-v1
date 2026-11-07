import os
import sys

sys.path.insert(0, os.path.abspath("backend"))

from services.email_service import EmailService
from fastapi.testclient import TestClient
from main import app

def test_email_service_mock():
    print("--- 1. Testing EmailService in Dev Mock mode ---")
    res1 = EmailService.send_account_credentials_email(
        to_email="student01@school.edu.vn",
        username="sv001",
        raw_password="InitialPassword123!",
        full_name="Nguyễn Văn A",
        role="student",
        ma_dinh_danh="20110001"
    )
    print("send_account_credentials_email result:", res1)
    assert res1 is True

    res2 = EmailService.send_password_reset_email(
        to_email="instructor01@school.edu.vn",
        reset_token="mock-secure-token-12345",
        full_name="TS. Trần Văn B"
    )
    print("send_password_reset_email result:", res2)
    assert res2 is True

def test_api_forgot_password_with_background_task():
    print("--- 2. Testing API /api/v1/auth/forgot-password ---")
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "student@school.edu.vn"}
    )
    print("API status:", response.status_code)
    print("API response:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert data["token"] is not None
    assert "/reset-password?token=" in data["reset_link"]

if __name__ == "__main__":
    test_email_service_mock()
    test_api_forgot_password_with_background_task()
    print("=== ALL EMAIL SERVICE TESTS PASSED SUCCESSFULLY! ===")
