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
