import asyncio

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from api import classes as classes_api
from core.security import create_access_token
from database.template_db import _normalize_template_type
from main import app
from schemas.classes import ClassUpdateRequest


def test_admin_cannot_review_violations_or_create_templates():
    client = TestClient(app)
    token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})
    client.headers = {"Authorization": f"Bearer {token}"}

    review_response = client.patch(
        "/api/v1/violations/1/review",
        json={"review_status": "confirmed"},
    )
    template_response = client.post(
        "/api/v1/templates",
        json={"title": "Bộ đề mới", "type": "exam"},
    )

    assert review_response.status_code == 403
    assert template_response.status_code == 403


def test_class_update_forwards_schedule_metadata(monkeypatch):
    class_record = {"class_code": "CS101", "instructor_id": 7, "class_name": "Lập trình"}
    captured = {}

    monkeypatch.setattr(classes_api, "get_class_by_id", lambda _: class_record)
    monkeypatch.setattr(
        classes_api,
        "update_class",
        lambda class_id, **kwargs: captured.update(kwargs) or class_record,
    )
    monkeypatch.setattr(classes_api, "create_system_log", lambda **_: None)

    payload = ClassUpdateRequest(
        start_date="2026-09-01",
        end_date="2027-01-15",
        total_sessions=16,
        credit_hours=4,
    )
    asyncio.run(
        classes_api.edit_class(
            "CS101",
            payload,
            {"role": "instructor", "user_id": 7},
        )
    )

    assert captured["start_date"] == "2026-09-01"
    assert captured["end_date"] == "2027-01-15"
    assert captured["total_sessions"] == 16
    assert captured["credit_hours"] == 4


def test_template_types_are_normalized_to_database_values():
    assert _normalize_template_type("midterm") == "midterm_exam"
    assert _normalize_template_type("final") == "final_exam"


def test_class_update_rejects_out_of_range_schedule_metadata():
    with pytest.raises(ValidationError):
        ClassUpdateRequest(total_sessions=0)

    with pytest.raises(ValidationError):
        ClassUpdateRequest(credit_hours=21)

