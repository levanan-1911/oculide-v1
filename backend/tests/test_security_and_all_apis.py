"""Bộ kiểm thử toàn diện Bảo mật (Auth/RBAC/IDOR/JWT/Input) và Hợp đồng toàn bộ 21 API Routers của Oculide-v1."""
from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from core.security import create_access_token, create_refresh_token
from main import app

client = TestClient(app)


def _auth_header(user_id: int, role: str, username: str) -> dict:
    token = create_access_token({"user_id": user_id, "role": role, "username": username})
    return {"Authorization": f"Bearer {token}"}


ADMIN_HDR = _auth_header(1, "admin", "admin_test")
INSTRUCTOR_HDR = _auth_header(2, "instructor", "inst_test")
STUDENT_HDR = _auth_header(3, "student", "stud_test")
ATTACKER_HDR = _auth_header(999, "student", "attacker_test")


def test_all_api_routers_registered_and_openapi_valid():
    """Kiểm tra toàn bộ 21 module API + Health + OpenAPI schema đều được nạp hợp lệ."""
    res = client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema and len(schema["paths"]) >= 140

    registered_paths = {r.path for r in app.routes if isinstance(r, APIRoute)}
    expected_prefixes = [
        "/health",
        "/health/liveness",
        "/health/readiness",
        "/api/v1/system/public-config",
        "/api/v1/auth/",
        "/api/v1/admin/",
        "/api/v1/rooms",
        "/api/v1/questions",
        "/api/v1/submissions",
        "/api/v1/sessions",
        "/api/v1/violations",
        "/api/v1/chat",
        "/api/v1/livekit/",
        "/api/v1/drafts",
        "/api/v1/device-checks",
        "/api/v1/support",
        "/api/v1/classes",
        "/api/v1/snapshots",
        "/api/v1/test-cases",
        "/api/v1/enrollments",
        "/api/v1/grading-results/",
        "/api/v1/system-logs",
        "/api/v1/users",
        "/api/v1/templates",
        "/api/v1/notifications",
    ]
    for prefix in expected_prefixes:
        assert any(p.startswith(prefix) for p in registered_paths), f"Thiếu router cho prefix {prefix}"


def test_security_unauthenticated_blocked_across_all_modules():
    """Chặn truy cập ẩn danh (401) đồng loạt trên mọi phân hệ API được bảo vệ."""
    protected_requests = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/admin/users"),
        ("GET", "/api/v1/admin/evidence/violations"),
        ("GET", "/api/v1/admin/evidence/submissions"),
        ("GET", "/api/v1/admin/system/storage"),
        ("GET", "/api/v1/rooms"),
        ("GET", "/api/v1/questions/room/1"),
        ("GET", "/api/v1/submissions/my"),
        ("GET", "/api/v1/sessions/room/1"),
        ("GET", "/api/v1/violations/room/1"),
        ("GET", "/api/v1/chat/room/1"),
        ("POST", "/api/v1/livekit/rooms"),
        ("GET", "/api/v1/drafts/session/1"),
        ("GET", "/api/v1/device-checks/session/1"),
        ("GET", "/api/v1/support/my-requests"),
        ("GET", "/api/v1/classes"),
        ("GET", "/api/v1/snapshots/session/1"),
        ("GET", "/api/v1/test-cases/question/1"),
        ("GET", "/api/v1/enrollments/check?room_id=1"),
        ("GET", "/api/v1/grading-results/submission/1"),
        ("GET", "/api/v1/system-logs"),
        ("GET", "/api/v1/users/me"),
        ("GET", "/api/v1/templates"),
        ("GET", "/api/v1/notifications"),
    ]
    for method, path in protected_requests:
        resp = client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} trả về {resp.status_code} thay vì 401"


def test_security_rbac_matrix_across_roles():
    """Kiểm tra phân quyền 3 vai trò (Student / Instructor / Admin) trên các endpoint nhạy cảm."""
    # 1. Student & Instructor bị chặn (403) khỏi các endpoint Admin
    admin_only_endpoints = [
        ("GET", "/api/v1/admin/users"),
        ("GET", "/api/v1/admin/dashboard/overview"),
        ("GET", "/api/v1/admin/system/storage"),
        ("GET", "/api/v1/admin/evidence/violations"),
        ("GET", "/api/v1/admin/evidence/submissions"),
        ("GET", "/api/v1/admin/logs"),
        ("GET", "/api/v1/admin/schedules/overview"),
        ("GET", "/api/v1/users"),
        ("GET", "/api/v1/system-logs"),
    ]
    for method, path in admin_only_endpoints:
        assert client.request(method, path, headers=STUDENT_HDR).status_code == 403
        assert client.request(method, path, headers=INSTRUCTOR_HDR).status_code == 403

    # 2. Student bị chặn (403) khỏi các endpoint nghiệp vụ Giảng viên
    instructor_only_endpoints = [
        ("GET", "/api/v1/submissions/room/1", None),
        ("GET", "/api/v1/submissions/room/1/plagiarism", None),
        ("GET", "/api/v1/submissions/question/1", None),
        ("PATCH", "/api/v1/submissions/1/status", {"status": "completed"}),
        ("PATCH", "/api/v1/violations/1/review", {"review_status": "confirmed"}),
        ("GET", "/api/v1/violations/room/1/ai-metrics", None),
        ("GET", "/api/v1/violations/room/1/stats?student_id=1", None),
        ("POST", "/api/v1/sessions/room/1/unlock/3", None),
        ("POST", "/api/v1/enrollments", {"room_id": 1, "student_id": 3}),
        ("POST", "/api/v1/templates", {"code": "T1", "title": "T", "type": "exam", "language": "Python"}),
        ("POST", "/api/v1/livekit/tokens/revoke", {"room_id": 1, "student_id": 3}),
    ]
    for method, path, body in instructor_only_endpoints:
        kwargs = {"json": body} if body is not None else {}
        resp = client.request(method, path, headers=STUDENT_HDR, **kwargs)
        assert resp.status_code == 403, f"Student không bị chặn tại {method} {path}: {resp.status_code}"


def test_security_anti_idor_across_all_student_resources():
    """Chống IDOR (leo thang ngang) trên toàn bộ 9 tài nguyên thuộc sở hữu sinh viên."""
    victim_session = {
        "session_id": 77,
        "room_id": 1,
        "student_id": 123,
        "status": "active",
        "started_at": datetime.now(),
    }
    victim_submission = {
        "submission_id": 88,
        "room_id": 1,
        "student_id": 123,
        "question_id": 1,
        "attempt_number": 1,
        "code_content": "print(1)",
        "language": "python",
        "submitted_at": datetime.now(),
        "status": "completed",
    }
    victim_snapshot = {
        "snapshot_id": 99,
        "session_id": 77,
        "student_id": 123,
        "image_url": "/uploads/s.jpg",
        "face_detected": True,
        "face_count": 1,
        "looking_at_screen": True,
        "confidence_score": 0.95,
        "captured_at": datetime.now(),
    }

    assert client.get("/api/v1/users/123", headers=ATTACKER_HDR).status_code == 403
    assert client.put("/api/v1/users/123", json={"full_name": "Hack"}, headers=ATTACKER_HDR).status_code == 403
    assert client.get("/api/v1/submissions/student/123", headers=ATTACKER_HDR).status_code == 403
    assert client.get("/api/v1/sessions/student/123", headers=ATTACKER_HDR).status_code == 403
    assert client.get("/api/v1/violations/student/123", headers=ATTACKER_HDR).status_code == 403
    assert client.get("/api/v1/snapshots/session/77/student/123/latest", headers=ATTACKER_HDR).status_code == 403

    with patch("api.sessions.get_session_by_id", return_value=victim_session), \
         patch("api.drafts.get_session_by_id", return_value=victim_session), \
         patch("api.device_checks.get_session_by_id", return_value=victim_session), \
         patch("api.snapshots.get_session_by_id", return_value=victim_session), \
         patch("api.snapshots.get_snapshot_by_id", return_value=victim_snapshot), \
         patch("api.submissions.get_session_by_id", return_value=victim_session), \
         patch("api.submissions.get_submission_by_id", return_value=victim_submission), \
         patch("api.grading_results.get_submission_by_id", return_value=victim_submission), \
         patch("api.violations.get_session_by_id", return_value=victim_session):

        assert client.get("/api/v1/sessions/77", headers=ATTACKER_HDR).status_code == 403
        assert client.post("/api/v1/sessions/77/end", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/drafts/session/77", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/device-checks/session/77", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/snapshots/session/77", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/snapshots/99", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/submissions/88", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/submissions/88/results", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/grading-results/submission/88", headers=ATTACKER_HDR).status_code == 403
        assert client.get("/api/v1/violations/session/77/risk", headers=ATTACKER_HDR).status_code == 403
        assert client.post(
            "/api/v1/submissions/ide-telemetry",
            json={"session_id": 77, "prev_len": 0, "curr_len": 200, "elapsed_sec": 2.0, "keystroke_count": 2},
            headers=ATTACKER_HDR,
        ).status_code == 403


def test_security_jwt_and_input_validation():
    """Kiểm tra JWT hết hạn/sai loại token, chống path traversal backup và kiểm tra dữ liệu đầu vào."""
    # 1. Token hết hạn -> 401
    expired = create_access_token({"user_id": 1, "role": "admin"}, expires_delta=timedelta(seconds=-10))
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401

    # 2. Refresh token không thể dùng làm Access token -> 401
    refresh = create_refresh_token({"user_id": 1, "role": "admin"})
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh}"}).status_code == 401

    # 3. Chống Path Traversal khi tải tệp backup
    res_trav = client.get("/api/v1/admin/system/backups/..%5C..%5C.env/download", headers=ADMIN_HDR)
    assert res_trav.status_code in (400, 404)

    # 4. Từ chối đầu vào sai chuẩn Pydantic (422)
    assert client.post(
        "/api/v1/violations",
        json={"session_id": 1, "violation_type": "invalid_hack_type", "severity": "high"},
        headers=STUDENT_HDR,
    ).status_code == 422
    assert client.patch(
        "/api/v1/violations/1/review",
        json={"review_status": "hacked"},
        headers=INSTRUCTOR_HDR,
    ).status_code == 422


def test_all_api_modules_functional_contracts():
    """Kiểm thử hợp đồng chức năng trên tất cả 21 API module + Health với mock DB."""
    now = datetime.now()
    sample_user = {
        "user_id": 3,
        "username": "stud_test",
        "email": "stud@dtu.edu.vn",
        "full_name": "Sinh Vien A",
        "role": "student",
        "student_code": "2921001",
        "is_active": True,
        "created_at": now,
    }
    sample_room = {
        "room_id": 10,
        "room_code": "EXAM01",
        "room_name": "Thi Giua Ky",
        "instructor_id": 2,
        "is_active": True,
        "status": "dang_dien_ra",
        "room_type": "exam",
        "start_time": now,
        "end_time": now + timedelta(hours=1),
        "created_at": now,
    }
    sample_session = {
        "session_id": 77,
        "room_id": 10,
        "student_id": 3,
        "status": "locked",
        "started_at": now,
    }

    # Health & Public config
    from types import SimpleNamespace
    assert client.get("/health/liveness").status_code == 200
    with patch(
        "services.system_settings_manager.SystemSettingsManager.get_public_config",
        return_value=SimpleNamespace(model_dump=lambda: {"app_name": "Oculide"}),
    ):
        assert client.get("/api/v1/system/public-config").status_code == 200

    # Auth & Users
    with patch("api.auth.get_user_by_id", return_value=sample_user), \
         patch("api.users.get_user_by_id", return_value=sample_user):
        assert client.get("/api/v1/auth/me", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/auth/my-ip").status_code == 200
        assert client.get("/api/v1/users/me", headers=STUDENT_HDR).status_code == 200

    # Admin (overview, system health, storage, logs, backups)
    with patch("api.admin.get_all_users_paginated", return_value=([], 0)), \
         patch("api.admin.BackupService.get_storage_statistics", return_value={
             "submissions_count": 10, "violations_count": 2, "logs_count": 5, "users_count": 20,
             "counts": {"submissions": 10, "violations": 2},
             "disk": {"total_gb": 100.0, "used_gb": 40.0, "free_gb": 60.0, "used_percent": 40.0},
         }), \
         patch("api.admin.get_system_logs", return_value=([], 0)):
        assert client.get("/api/v1/admin/users", headers=ADMIN_HDR).status_code == 200
        assert client.get("/api/v1/admin/system/storage", headers=ADMIN_HDR).status_code == 200
        assert client.get("/api/v1/admin/logs", headers=ADMIN_HDR).status_code == 200

    # Classes & Templates & Questions & TestCases & Enrollments
    with patch("api.classes.get_classes_by_instructor", return_value=[]), \
         patch("api.classes.calculate_semester_by_date", return_value="HK1 2026-2027"), \
         patch("api.templates.list_templates_full", return_value=[]), \
         patch("api.questions.get_room_by_id", return_value=sample_room), \
         patch("api.questions.get_questions_by_room", return_value=[]), \
         patch("api.test_cases.get_question_by_id", return_value={"question_id": 1, "room_id": 10}), \
         patch("api.test_cases.get_test_cases_by_question", return_value=[]), \
         patch("api.enrollments.is_student_enrolled", return_value=True):
        assert client.get("/api/v1/classes", headers=INSTRUCTOR_HDR).status_code == 200
        assert client.get("/api/v1/classes/semesters/current").status_code == 200
        assert client.get("/api/v1/templates", headers=INSTRUCTOR_HDR).status_code == 200
        assert client.get("/api/v1/questions/room/10", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/test-cases/question/1", headers=INSTRUCTOR_HDR).status_code == 200
        assert client.get("/api/v1/enrollments/check?room_id=10&student_id=3", headers=STUDENT_HDR).json() == {"enrolled": True}

    # Rooms (chặn 403 khi thí sinh đang bị khóa bài thi) & Sessions (giữ nguyên locked)
    with patch("api.rooms.get_room_by_id", return_value=sample_room), \
         patch("api.rooms.is_student_already_submitted", return_value=False), \
         patch("api.rooms.get_student_exam_session", return_value=sample_session), \
         patch("api.sessions.get_room_by_id", return_value=sample_room), \
         patch("api.sessions.get_sessions_by_student", return_value=[sample_session]):
        res_locked = client.get("/api/v1/rooms/10/exam-content", headers=STUDENT_HDR)
        assert res_locked.status_code == 403
        res_sess = client.post("/api/v1/sessions", json={"room_id": 10}, headers=STUDENT_HDR)
        assert res_sess.status_code == 201
        assert res_sess.json()["status"] == "locked"

    # Submissions, Plagiarism, GradingResults, Violations, Risk, AI Metrics, Drafts, DeviceChecks, Snapshots
    with patch("api.submissions.get_submissions_by_student", return_value=[]), \
         patch("api.submissions.get_submissions_by_room", return_value=[]), \
         patch("api.grading_results.get_submission_by_id", return_value={"submission_id": 1, "student_id": 3}), \
         patch("api.grading_results.get_grading_results", return_value=[]), \
         patch("api.violations.get_session_by_id", return_value=sample_session), \
         patch("api.violations.get_session_risk_score", return_value={"session_id": 77, "risk_score": 10, "threshold": 10, "is_lock_triggered": True}), \
         patch("api.violations.get_ai_precision_metrics", return_value={"room_id": 10, "total_confirmed": 4, "total_rejected": 1, "total_pending": 0, "overall_precision_pct": 80.0, "by_type": []}), \
         patch("api.drafts.get_session_by_id", return_value=sample_session), \
         patch("api.drafts.get_code_drafts_by_session", return_value=[]), \
         patch("api.device_checks.get_session_by_id", return_value=sample_session), \
         patch("api.device_checks.get_device_check_by_session", return_value={
             "check_id": 1, "session_id": 77, "student_id": 3, "camera_status": True,
             "mic_status": True, "network_status": "good", "os_info": "Win11",
             "browser_info": "Chrome", "is_passed": True, "checked_at": now,
         }), \
         patch("api.snapshots.get_session_by_id", return_value=sample_session), \
         patch("api.snapshots.get_snapshots_by_session", return_value=[]), \
         patch("database.room_db.get_room_by_id", return_value=sample_room):
        assert client.get("/api/v1/submissions/my", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/submissions/room/10/plagiarism", headers=INSTRUCTOR_HDR).status_code == 200
        assert client.get("/api/v1/grading-results/submission/1", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/violations/session/77/risk", headers=STUDENT_HDR).json()["is_lock_triggered"] is True
        assert client.get("/api/v1/violations/room/10/ai-metrics", headers=INSTRUCTOR_HDR).json()["overall_precision_pct"] == 80.0
        assert client.get("/api/v1/drafts/session/77", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/device-checks/session/77", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/snapshots/session/77", headers=STUDENT_HDR).status_code == 200

    # Chat, Support, Notifications, LiveKit, System Logs
    class _FakeCursor:
        def execute(self, *a, **k): pass
        def fetchall(self): return []
        def fetchone(self): return None
        def close(self): pass

    class _FakeConn:
        def cursor(self): return _FakeCursor()
        def close(self): pass

    with patch("api.chat.get_room_by_id", return_value=sample_room), \
         patch("api.chat.get_messages_by_room", return_value=[]), \
         patch("api.support.get_support_requests_by_student", return_value=[]), \
         patch("api.notifications.get_db_connection", return_value=_FakeConn()), \
         patch("api.system_logs.get_system_logs", return_value=([], 0)):
        assert client.get("/api/v1/chat/room/10", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/support/my-requests", headers=STUDENT_HDR).status_code == 200
        assert client.get("/api/v1/notifications", headers=STUDENT_HDR).status_code == 200
        assert client.post("/api/v1/livekit/rooms", json={"room_name": "room_10"}, headers=INSTRUCTOR_HDR).status_code == 201
        assert client.get("/api/v1/system-logs", headers=ADMIN_HDR).status_code == 200
