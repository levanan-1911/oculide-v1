import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token

client = TestClient(app)

# Helper function to create auth headers
def get_auth_headers(user_id: int, role: str):
    token = create_access_token({"user_id": user_id, "role": role})
    return {"Authorization": f"Bearer {token}"}

# ============================================================================
# 1. QUESTIONS API TESTS (Coding & Essay Only, No Multiple Choice)
# ============================================================================
def test_create_question_coding_allowed():
    headers = get_auth_headers(user_id=1, role="instructor")
    mock_room = {"room_id": 1, "instructor_id": 1, "is_active": True}
    mock_created_q = {
        "question_id": 101,
        "room_id": 1,
        "question_order": 1,
        "question_title": "Two Sum",
        "question_description": "Solve two sum problem",
        "question_type": "coding",
        "programming_language": "python",
        "max_points": 10.0,
        "time_limit_minutes": 30,
        "memory_limit_mb": 128,
        "is_active": True,
        "test_cases": []
    }
    with patch("api.questions.get_room_by_id", return_value=mock_room), \
         patch("api.questions.create_question", return_value=mock_created_q):
        payload = {
            "room_id": 1,
            "question_order": 1,
            "question_title": "Two Sum",
            "question_description": "Solve two sum problem",
            "question_type": "coding",
            "programming_language": "python",
            "max_points": 10.0
        }
        res = client.post("/api/v1/questions", json=payload, headers=headers)
        assert res.status_code == 201
        assert res.json()["question_type"] == "coding"

def test_create_question_multiple_choice_rejected():
    headers = get_auth_headers(user_id=1, role="instructor")
    payload = {
        "room_id": 1,
        "question_order": 1,
        "question_title": "MCQ Question",
        "question_description": "Choose A or B",
        "question_type": "multiple_choice"
    }
    res = client.post("/api/v1/questions", json=payload, headers=headers)
    assert res.status_code == 422  # Validation error from regex pattern

def test_update_question_multiple_choice_rejected():
    headers = get_auth_headers(user_id=1, role="instructor")
    payload = {
        "question_type": "multiple_choice"
    }
    res = client.put("/api/v1/questions/101", json=payload, headers=headers)
    assert res.status_code == 422

# ============================================================================
# 2. VIOLATIONS API TESTS (review_status: pending, confirmed, rejected)
# ============================================================================
def test_log_violation_returns_pending_status():
    headers = get_auth_headers(user_id=10, role="student")
    mock_session = {"session_id": 5, "room_id": 1, "student_id": 10, "started_at": "2026-10-30T00:00:00"}
    mock_room = {"room_id": 1, "room_type": "exam"}
    mock_violation = {
        "violation_id": 1,
        "session_id": 5,
        "student_id": 10,
        "violation_type": "tab_switch",
        "severity": "medium",
        "description": "Tab switched",
        "snapshot_url": None,
        "detected_at": "2026-10-30T00:01:00",
        "is_reviewed": False,
        "review_status": "pending",
        "reviewed_by": None,
        "reviewed_at": None
    }
    with patch("api.violations.get_session_by_id", return_value=mock_session), \
         patch("api.violations.get_room_by_id", return_value=mock_room), \
         patch("api.violations.create_violation", return_value=mock_violation):
        payload = {
            "session_id": 5,
            "violation_type": "tab_switch",
            "severity": "medium",
            "description": "Tab switched"
        }
        res = client.post("/api/v1/violations", json=payload, headers=headers)
        assert res.status_code == 201
        assert res.json()["review_status"] == "pending"

def test_review_violation_confirmed_and_rejected():
    headers = get_auth_headers(user_id=1, role="instructor")
    
    # 1. Review confirmed via JSON body
    mock_confirmed = {
        "violation_id": 1,
        "session_id": 5,
        "student_id": 10,
        "violation_type": "tab_switch",
        "severity": "medium",
        "description": "Tab switched",
        "snapshot_url": None,
        "detected_at": "2026-10-30T00:01:00",
        "is_reviewed": True,
        "review_status": "confirmed",
        "reviewed_by": 1,
        "reviewed_at": "2026-10-30T00:05:00"
    }
    with patch("api.violations.update_violation_review", return_value=mock_confirmed):
        res = client.patch("/api/v1/violations/1/review", json={"review_status": "confirmed"}, headers=headers)
        assert res.status_code == 200
        assert res.json()["review_status"] == "confirmed"

    # 2. Review rejected via Query Param
    mock_rejected = dict(mock_confirmed, review_status="rejected")
    with patch("api.violations.update_violation_review", return_value=mock_rejected):
        res = client.patch("/api/v1/violations/1/review?review_status=rejected", headers=headers)
        assert res.status_code == 200
        assert res.json()["review_status"] == "rejected"

    # 3. Invalid status rejected
    res_bad = client.patch("/api/v1/violations/1/review", json={"review_status": "invalid_status"}, headers=headers)
    assert res_bad.status_code == 422 or res_bad.status_code == 400

def test_get_room_violations():
    headers = get_auth_headers(user_id=1, role="instructor")
    mock_room = {"room_id": 1, "instructor_id": 1}
    mock_violations = [
        {
            "violation_id": 1,
            "session_id": 5,
            "student_id": 10,
            "violation_type": "tab_switch",
            "severity": "medium",
            "detected_at": "2026-10-30T00:01:00",
            "is_reviewed": False,
            "review_status": "pending",
            "student_name": "Nguyen Van A",
            "student_code": "SE184801"
        }
    ]
    with patch("api.violations.get_room_by_id", return_value=mock_room), \
         patch("api.violations.get_violations_by_room", return_value=mock_violations):
        res = client.get("/api/v1/violations/room/1?review_status=pending", headers=headers)
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["student_code"] == "SE184801"

# ============================================================================
# 3. CODE DRAFTS API TESTS (Auto-Save, Load, Delete)
# ============================================================================
def test_save_and_get_code_drafts():
    headers = get_auth_headers(user_id=10, role="student")
    mock_session = {"session_id": 5, "student_id": 10, "status": "active"}
    mock_draft = {
        "draft_id": 1,
        "session_id": 5,
        "question_id": 101,
        "student_id": 10,
        "draft_code": "def solution(): return 42",
        "language": "python",
        "last_saved_at": "2026-10-30T00:02:00"
    }
    with patch("api.drafts.get_session_by_id", return_value=mock_session), \
         patch("api.drafts.upsert_code_draft", return_value=mock_draft), \
         patch("api.drafts.get_code_draft", return_value=mock_draft), \
         patch("api.drafts.get_code_drafts_by_session", return_value=[mock_draft]), \
         patch("api.drafts.delete_code_draft", return_value=True):
        
        # Save draft
        save_res = client.post("/api/v1/drafts", json={
            "session_id": 5,
            "question_id": 101,
            "draft_code": "def solution(): return 42",
            "language": "python"
        }, headers=headers)
        assert save_res.status_code == 200
        assert save_res.json()["draft_code"] == "def solution(): return 42"

        # Get specific draft
        get_res = client.get("/api/v1/drafts/session/5/question/101", headers=headers)
        assert get_res.status_code == 200
        assert get_res.json()["draft_id"] == 1

        # Get all drafts in session
        all_res = client.get("/api/v1/drafts/session/5", headers=headers)
        assert all_res.status_code == 200
        assert len(all_res.json()) == 1

        # Delete draft
        del_res = client.delete("/api/v1/drafts/session/5/question/101", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"

# ============================================================================
# 4. DEVICE CHECKS API TESTS
# ============================================================================
def test_submit_and_view_device_checks():
    headers_student = get_auth_headers(user_id=10, role="student")
    mock_session = {"session_id": 5, "student_id": 10}
    mock_device_check = {
        "check_id": 1,
        "session_id": 5,
        "student_id": 10,
        "camera_status": True,
        "mic_status": True,
        "network_latency_ms": 25,
        "os_info": "Windows 11",
        "browser_info": "Chrome 122",
        "is_passed": True,
        "checked_at": "2026-10-30T00:00:10"
    }
    with patch("api.device_checks.get_session_by_id", return_value=mock_session), \
         patch("api.device_checks.save_device_check", return_value=mock_device_check), \
         patch("api.device_checks.get_device_check_by_session", return_value=mock_device_check):
        
        # Student submits test result
        post_res = client.post("/api/v1/device-checks", json={
            "session_id": 5,
            "camera_status": True,
            "mic_status": True,
            "network_latency_ms": 25,
            "os_info": "Windows 11",
            "browser_info": "Chrome 122",
            "is_passed": True
        }, headers=headers_student)
        assert post_res.status_code == 200
        assert post_res.json()["is_passed"] is True

        # Student checks their own test result
        get_res = client.get("/api/v1/device-checks/session/5", headers=headers_student)
        assert get_res.status_code == 200
        assert get_res.json()["camera_status"] is True

    # Proctor views room device checks
    headers_instructor = get_auth_headers(user_id=1, role="instructor")
    mock_room = {"room_id": 1, "instructor_id": 1}
    mock_room_checks = [
        dict(mock_device_check, full_name="Nguyen Van A", student_code="SE184801")
    ]
    with patch("api.device_checks.get_room_by_id", return_value=mock_room), \
         patch("api.device_checks.get_device_checks_by_room", return_value=mock_room_checks):
        room_checks_res = client.get("/api/v1/device-checks/room/1", headers=headers_instructor)
        assert room_checks_res.status_code == 200
        assert len(room_checks_res.json()) == 1
        assert room_checks_res.json()[0]["full_name"] == "Nguyen Van A"

# ============================================================================
# 5. SUPPORT REQUESTS API TESTS
# ============================================================================
def test_submit_and_process_support_request():
    headers_student = get_auth_headers(user_id=10, role="student")
    mock_room = {"room_id": 1, "instructor_id": 1}
    mock_req = {
        "request_id": 1,
        "room_id": 1,
        "student_id": 10,
        "session_id": 5,
        "issue_type": "technical",
        "message": "Webcam bị giật hình",
        "status": "open",
        "resolved_by": None,
        "created_at": "2026-10-30T00:03:00",
        "resolved_at": None,
        "student_name": "Nguyen Van A",
        "student_code": "SE184801"
    }
    with patch("api.support.get_room_by_id", return_value=mock_room), \
         patch("api.support.create_support_request", return_value=dict(mock_req)), \
         patch("api.support.get_support_requests_by_student", return_value=[mock_req]), \
         patch("websocket.connection_manager.manager.broadcast_json"):
        
        # Student submits request
        create_res = client.post("/api/v1/support", json={
            "room_id": 1,
            "session_id": 5,
            "issue_type": "technical",
            "message": "Webcam bị giật hình"
        }, headers=headers_student)
        assert create_res.status_code == 201
        assert create_res.json()["status"] == "open"

        # Student checks their requests
        my_res = client.get("/api/v1/support/my-requests", headers=headers_student)
        assert my_res.status_code == 200
        assert len(my_res.json()) == 1

    # Instructor updates status
    headers_instructor = get_auth_headers(user_id=1, role="instructor")
    mock_updated = dict(mock_req, status="resolved", resolved_by=1, resolved_at="2026-10-30T00:06:00")
    with patch("api.support.get_support_request_by_id", return_value=mock_req), \
         patch("api.support.get_room_by_id", return_value=mock_room), \
         patch("api.support.update_support_request_status", return_value=mock_updated), \
         patch("websocket.connection_manager.manager.broadcast_json"):
        patch_res = client.patch("/api/v1/support/1/status", json={"status": "resolved"}, headers=headers_instructor)
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "resolved"

# ============================================================================
# 6. CLASSES API TESTS
# ============================================================================
def test_classes_crud():
    headers = get_auth_headers(user_id=1, role="instructor")
    mock_class = {
        "class_id": 1,
        "class_code": "CS101",
        "class_name": "Nhập môn Lập trình",
        "instructor_id": 1,
        "description": "Lớp học phần C++",
        "created_at": "2026-10-30T00:00:00",
        "updated_at": "2026-10-30T00:00:00",
        "instructor_name": "Thầy Nam"
    }
    with patch("api.classes.create_class", return_value=dict(mock_class)), \
         patch("api.classes.get_classes_by_instructor", return_value=[mock_class]), \
         patch("api.classes.get_class_by_id", return_value=mock_class), \
         patch("api.classes.update_class", return_value=dict(mock_class, class_name="Lập trình C++ nâng cao")), \
         patch("api.classes.delete_class", return_value=True):
        
        # 1. Create class
        c_res = client.post("/api/v1/classes", json={
            "class_code": "CS101",
            "class_name": "Nhập môn Lập trình",
            "description": "Lớp học phần C++"
        }, headers=headers)
        assert c_res.status_code == 201
        assert c_res.json()["class_code"] == "CS101"

        # 2. List classes
        l_res = client.get("/api/v1/classes", headers=headers)
        assert l_res.status_code == 200
        assert len(l_res.json()) == 1

        # 3. Get detail
        d_res = client.get("/api/v1/classes/1", headers=headers)
        assert d_res.status_code == 200
        assert d_res.json()["class_id"] == 1

        # 4. Edit class
        e_res = client.put("/api/v1/classes/1", json={
            "class_name": "Lập trình C++ nâng cao"
        }, headers=headers)
        assert e_res.status_code == 200
        assert e_res.json()["class_name"] == "Lập trình C++ nâng cao"

        # 5. Delete class
        del_res = client.delete("/api/v1/classes/1", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"
