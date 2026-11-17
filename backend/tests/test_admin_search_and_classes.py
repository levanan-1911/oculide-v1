import pytest
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token
from tests.conftest import is_db_available

pytestmark = pytest.mark.skipif(not is_db_available(), reason="Requires live SQL Server instance")

@pytest.fixture
def admin_client():
    client = TestClient(app)
    token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def instructor_client():
    client = TestClient(app)
    token = create_access_token({"user_id": 30, "role": "instructor", "username": "hbdieu"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def student_client():
    client = TestClient(app)
    token = create_access_token({"user_id": 3, "role": "student", "username": "student"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

def test_admin_global_search(admin_client, instructor_client, student_client):
    # 1. Admin search succeeds
    res = admin_client.get("/api/v1/admin/search?q=a")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "total" in data
    assert "results" in data
    assert isinstance(data["results"], list)
    assert data["total"] == len(data["results"])

    # If results are returned, verify schema
    for item in data["results"]:
        assert "category" in item
        assert "type" in item
        assert item["type"] in ("user", "class", "schedule")
        assert "title" in item
        assert "subtitle" in item
        assert "link" in item
        assert item["link"].startswith("/admin/")

    # 2. Non-admin users are blocked (403 Forbidden)
    res_inst = instructor_client.get("/api/v1/admin/search?q=a")
    assert res_inst.status_code == 403

    res_stu = student_client.get("/api/v1/admin/search?q=a")
    assert res_stu.status_code == 403

def test_reassign_class_instructor(admin_client):
    # 1. Create a temporary class
    unique_code = "TEST-REASSIGN-01"
    create_payload = {
        "class_code": unique_code,
        "class_name": "Lớp Thử Nghiệm Phân Công GV",
        "course_code": "TEST-101",
        "section_code": "SEC-A",
        "semester": "HK1 2026–2027",
        "instructor_id": 30
    }
    res_create = admin_client.post("/api/v1/classes", json=create_payload)
    assert res_create.status_code == 201, res_create.text
    created_id = res_create.json()["class_id"]

    try:
        # 2. Reassign to another instructor (user_id: 31 - ThS. Phạm Vũ Long)
        res_update = admin_client.put(
            f"/api/v1/classes/{unique_code}",
            json={"instructor_id": 31}
        )
        assert res_update.status_code == 200, res_update.text
        updated_data = res_update.json()
        assert updated_data["instructor_id"] == 31
        assert "Phạm Vũ Long" in (updated_data.get("instructor_name") or "")

        # 3. Verify via GET /api/v1/classes/{id}
        res_get = admin_client.get(f"/api/v1/classes/{unique_code}")
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["instructor_id"] == 31
        assert "Phạm Vũ Long" in (get_data.get("instructor_name") or "")
    finally:
        # Cleanup
        admin_client.delete(f"/api/v1/classes/{unique_code}")

def test_semesters_list_api(admin_client):
    res = admin_client.get("/api/v1/classes/semesters/list")
    assert res.status_code == 200, res.text
    semesters = res.json()
    assert isinstance(semesters, list)
    assert len(semesters) > 0
    for s in semesters:
        assert "ma_hoc_ky" in s
        assert "ten_hoc_ky" in s
