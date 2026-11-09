import pytest
from core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_access_token
)

def test_password_hashing():
    raw_pwd = "SuperSecretPassword123!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_access_and_refresh_tokens():
    payload = {
        "user_id": 99,
        "username": "test_student",
        "role": "student"
    }
    
    # 1. Access Token
    access_token = create_access_token(payload)
    decoded_access = decode_access_token(access_token)
    assert decoded_access is not None
    assert decoded_access["user_id"] == 99
    assert decoded_access["role"] == "student"
    assert decoded_access["token_type"] == "access"
    
    # 2. Refresh Token
    refresh_token = create_refresh_token(payload)
    decoded_refresh = decode_access_token(refresh_token)
    assert decoded_refresh is not None
    assert decoded_refresh["user_id"] == 99
    assert decoded_refresh["token_type"] == "refresh"
    
def test_invalid_token_decoding():
    assert decode_access_token("invalid.token.here") is None

def test_rbac_authorization_matrix():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    admin_token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})
    instructor_token = create_access_token({"user_id": 2, "role": "instructor", "username": "instructor"})
    student_token = create_access_token({"user_id": 3, "role": "student", "username": "student"})

    # 1. Unauthenticated (Anonymous) -> 401 Unauthorized
    res_no_token = client.get("/api/v1/admin/users?limit=1")
    assert res_no_token.status_code == 401

    # 2. Student trying to access Admin APIs -> 403 Forbidden
    res_student_admin = client.get(
        "/api/v1/admin/users?limit=1",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res_student_admin.status_code == 403

    # 3. Instructor trying to access Admin APIs -> 403 Forbidden
    res_instructor_admin = client.get(
        "/api/v1/admin/users?limit=1",
        headers={"Authorization": f"Bearer {instructor_token}"}
    )
    assert res_instructor_admin.status_code == 403

    # 4. Admin accessing Admin APIs -> 200 OK
    res_admin = client.get(
        "/api/v1/admin/users?limit=1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin.status_code == 200

    # 5. Anti-IDOR: Student accessing another student's violations -> 403 Forbidden
    res_idor = client.get(
        "/api/v1/violations/student/999",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res_idor.status_code == 403
