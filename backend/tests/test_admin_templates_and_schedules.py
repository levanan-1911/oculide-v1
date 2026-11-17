import pytest
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token
from tests.conftest import is_db_available

pytestmark = pytest.mark.skipif(not is_db_available(), reason="Requires live SQL Server instance")

@pytest.fixture
def admin_client():
    client = TestClient(app)
    # Token cho Admin (user_id=1, role=admin)
    token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def instructor_client():
    client = TestClient(app)
    # Token cho Giảng viên thật trong CSDL (user_id=30, role=instructor, username=hbdieu)
    token = create_access_token({"user_id": 30, "role": "instructor", "username": "hbdieu"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

def test_admin_schedules_overview_and_list(admin_client):
    # 1. Test KPI overview
    res_ov = admin_client.get("/api/v1/admin/schedules/overview")
    assert res_ov.status_code == 200, res_ov.text
    data_ov = res_ov.json()
    assert "total_schedules" in data_ov
    assert "ongoing_count" in data_ov
    assert "scheduled_count" in data_ov
    assert "completed_count" in data_ov

    # 2. Test list schedules
    res_list = admin_client.get("/api/v1/admin/schedules")
    assert res_list.status_code == 200, res_list.text
    data_list = res_list.json()
    assert "schedules" in data_list
    assert data_list["total"] >= 1
    first_sch = data_list["schedules"][0]
    assert "id" in first_sch
    assert "title" in first_sch
    assert "status" in first_sch
    assert "proctoringPolicy" in first_sch

    # 3. Test schedule detail
    room_id = first_sch["room_id"]
    res_dt = admin_client.get(f"/api/v1/admin/schedules/{room_id}")
    assert res_dt.status_code == 200, res_dt.text
    data_dt = res_dt.json()
    assert "room_info" in data_dt
    assert "students" in data_dt

def test_admin_templates_crud_flow(admin_client, instructor_client):
    # 1. List templates via admin endpoint (Admin chỉ có quyền xem danh mục)
    res_list = admin_client.get("/api/v1/admin/templates")
    assert res_list.status_code == 200, res_list.text
    tpls = res_list.json()
    assert isinstance(tpls, list)
    assert len(tpls) >= 1

    # 2. Admin KHÔNG được phép tạo bộ đề (403 Forbidden)
    new_tpl_data = {
        "code": "TPL-TEST-CRUD-01",
        "title": "Bộ đề kiểm thử tự động Pytest",
        "type": "exam",
        "category": "Lập trình kiểm thử",
        "language": "Python",
        "duration_minutes": 60,
        "description": "Mô tả đề thi kiểm thử",
        "questions": [
            {
                "title": "Câu hỏi test case 1",
                "difficulty": "Dễ",
                "description": "Tính tổng hai số A và B",
                "programming_language": "Python",
                "max_points": 10.0,
                "test_cases": [
                    {"input_data": "1 2", "expected_output": "3", "is_hidden": False, "points": 5.0},
                    {"input_data": "10 20", "expected_output": "30", "is_hidden": True, "points": 5.0}
                ]
            }
        ]
    }
    res_admin_cr = admin_client.post("/api/v1/templates", json=new_tpl_data)
    assert res_admin_cr.status_code == 403, "Admin không được quyền tạo đề thi"

    # 3. Giảng viên tạo bộ đề (201 Created)
    res_cr = instructor_client.post("/api/v1/templates", json=new_tpl_data)
    assert res_cr.status_code == 201, res_cr.text
    created = res_cr.json()
    assert created["title"] == "Bộ đề kiểm thử tự động Pytest"
    tpl_code = created["template_code"]

    # 4. Giảng viên cập nhật bộ đề của mình (200 OK)
    res_up = instructor_client.put(
        f"/api/v1/templates/{tpl_code}",
        json={"title": "Bộ đề kiểm thử tự động Pytest (Đã sửa)"}
    )
    assert res_up.status_code == 200, res_up.text
    assert res_up.json()["title"] == "Bộ đề kiểm thử tự động Pytest (Đã sửa)"

    # 5. Giảng viên xóa bộ đề của mình (200 OK)
    res_del = instructor_client.delete(f"/api/v1/templates/{tpl_code}")
    assert res_del.status_code == 200, res_del.text

def test_admin_dashboard_overview(admin_client):
    # Test GET /api/v1/admin/dashboard/overview
    res = admin_client.get("/api/v1/admin/dashboard/overview")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "kpi" in data
    assert "active_classes" in data["kpi"]
    assert "upcoming_schedules" in data["kpi"]
    assert "ongoing_sessions" in data["kpi"]
    assert "action_needed" in data["kpi"]
    assert "activity_chart" in data
    assert len(data["activity_chart"]) == 7
    assert "risk_breakdown" in data
    assert "total_events" in data["risk_breakdown"]
    assert "pending_issues" in data
    assert "today_sessions" in data
