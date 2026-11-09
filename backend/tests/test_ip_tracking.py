import pytest
from fastapi.testclient import TestClient
from main import app
from database.user_db import get_user_by_username
from core.config import get_db_connection

client = TestClient(app)

def test_login_records_client_public_ip_and_audit_log():
    # Giả lập request đăng nhập với Header IP mạng ngoài (ví dụ Wi-Fi 171.225.185.45)
    test_ip = "171.225.185.45"
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "password123"},
        headers={"X-Client-Public-IP": test_ip}
    )
    
    # Nếu password123 không đúng trong DB thì kiểm tra user instructor hoặc admin123
    if response.status_code == 401:
        response = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            headers={"X-Client-Public-IP": test_ip}
        )

    assert response.status_code == 200, f"Đăng nhập thất bại: {response.text}"
    data = response.json()
    assert "access_token" in data
    assert data["user"]["last_login_ip"] == test_ip

    # Kiểm tra CSDL: IP được bóc tách từ bảng NhatKyHeThong chứ không lưu trong NguoiDung
    user = get_user_by_username("admin")
    assert user is not None
    assert user.get("last_login_ip") == test_ip

    # Đảm bảo bảng NguoiDung không còn chứa cột dia_chi_ip_cuoi
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT COUNT(*) FROM sys.columns 
            WHERE object_id = OBJECT_ID('NguoiDung') AND name = 'dia_chi_ip_cuoi'
        """)
        assert cursor.fetchone()[0] == 0, "Cột dia_chi_ip_cuoi không được tồn tại ở bảng NguoiDung!"
        cursor.execute("""
            SELECT TOP 1 dia_chi_ip, hanh_dong 
            FROM NhatKyHeThong 
            WHERE ma_nguoi_dung = ? 
            ORDER BY thoi_gian DESC
        """, (user["user_id"],))
        row = cursor.fetchone()
        assert row is not None
        assert row[0] == test_ip
        assert row[1] == "USER_LOGIN"
    finally:
        cursor.close()
        conn.close()

def test_my_ip_endpoint():
    test_ip = "118.69.123.45"
    res = client.get("/api/v1/auth/my-ip", headers={"X-Forwarded-For": f"{test_ip}, 10.0.0.1"})
    assert res.status_code == 200
    assert res.json()["ip"] == test_ip
