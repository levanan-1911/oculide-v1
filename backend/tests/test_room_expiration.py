import asyncio
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from api import rooms as rooms_api
from api.rooms import _is_room_expired
from database.room_db import _resolve_session_type
from schemas.room import RoomCreateRequest


def test_room_expires_after_end_time_even_when_still_active():
    room = {
        "is_active": True,
        "status": "in_progress",
        "end_time": datetime.now() - timedelta(seconds=1),
    }

    assert _is_room_expired(room)


def test_room_remains_available_before_end_time():
    room = {
        "is_active": True,
        "status": "scheduled",
        "end_time": datetime.now() + timedelta(minutes=5),
    }

    assert not _is_room_expired(room)


def test_room_creation_limits_code_and_passcode_to_eight_characters():
    room_data = {
        "room_code": "ABCDEFGH",
        "room_name": "Phòng kiểm thử",
        "room_type": "exam",
        "start_time": datetime.now(),
        "end_time": datetime.now() + timedelta(hours=1),
        "duration_minutes": 60,
        "passcode": "12345678",
    }
    RoomCreateRequest(**room_data)

    with pytest.raises(ValidationError):
        RoomCreateRequest(**{**room_data, "room_code": "ABCDEFGHI"})
    with pytest.raises(ValidationError):
        RoomCreateRequest(**{**room_data, "passcode": "123456789"})


@pytest.mark.parametrize("session_type", ["LAB", "MIDTERM", "FINAL"])
def test_room_creation_accepts_canonical_session_types(session_type):
    room_data = {
        "room_code": "ABCDEFGH",
        "room_name": "Phòng kiểm thử",
        "room_type": "lab" if session_type == "LAB" else "exam",
        "session_type": session_type,
        "start_time": datetime.now(),
        "end_time": datetime.now() + timedelta(hours=1),
        "duration_minutes": 60,
    }

    RoomCreateRequest(**room_data)


def test_room_creation_rejects_noncanonical_session_type():
    room_data = {
        "room_code": "ABCDEFGH",
        "room_name": "Phòng kiểm thử",
        "room_type": "exam",
        "session_type": "MIDTERN",
        "start_time": datetime.now(),
        "end_time": datetime.now() + timedelta(hours=1),
        "duration_minutes": 60,
    }

    with pytest.raises(ValidationError):
        RoomCreateRequest(**room_data)


class _TemplateTypeCursor:
    def __init__(self, template_type):
        self.template_type = template_type

    def execute(self, query, params):
        self.query = query
        self.params = params

    def fetchone(self):
        return (self.template_type,) if self.template_type else None


def test_room_session_type_is_inferred_for_legacy_room_creators():
    assert _resolve_session_type(None, None, "lab", "Lab", None) == "LAB"
    assert _resolve_session_type(
        _TemplateTypeCursor("final_exam"), None, "exam", "Exam", 1
    ) == "FINAL"
    assert _resolve_session_type(
        _TemplateTypeCursor("exam"), None, "exam", "Thi cuối kỳ", 1
    ) == "FINAL"
    assert _resolve_session_type(None, None, "exam", "Giữa kỳ", None) == "MIDTERM"


def test_instructor_can_create_midterm_room(monkeypatch):
    created_room = {}
    monkeypatch.setattr(rooms_api, "get_room_by_code", lambda _: None)
    monkeypatch.setattr(rooms_api.livekit_service, "create_room", lambda _: None)

    def fake_create_room(**kwargs):
        created_room.update(kwargs)
        return {"room_id": 1, "room_code": kwargs["room_code"], "session_type": kwargs["session_type"]}

    monkeypatch.setattr(rooms_api, "create_room", fake_create_room)
    room_data = RoomCreateRequest(
        room_code="MID12345",
        room_name="Thi giữa kỳ",
        room_type="exam",
        session_type="MIDTERM",
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(hours=1),
        duration_minutes=60,
    )

    result = asyncio.run(
        rooms_api.create_new_room(room_data, {"user_id": 1, "role": "instructor"})
    )

    assert result["session_type"] == "MIDTERM"
    assert created_room["session_type"] == "MIDTERM"


def test_instructor_cannot_create_final_room():
    room_data = RoomCreateRequest(
        room_code="FIN12345",
        room_name="Thi cuối kỳ",
        room_type="exam",
        session_type="FINAL",
        start_time=datetime.now(),
        end_time=datetime.now() + timedelta(hours=1),
        duration_minutes=60,
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            rooms_api.create_new_room(room_data, {"user_id": 1, "role": "instructor"})
        )

    assert error.value.status_code == 403
