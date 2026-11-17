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
    token = create_access_token({"user_id": 2, "role": "instructor", "username": "nam.nv"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

@pytest.fixture
def student_client():
    client = TestClient(app)
    token = create_access_token({"user_id": 3, "role": "student", "username": "sinhvien01"})
    client.headers = {"Authorization": f"Bearer {token}"}
    return client

def test_notifications_api(admin_client, instructor_client, student_client):
    # 1. Admin notifications
    res_admin = admin_client.get("/api/v1/notifications")
    assert res_admin.status_code == 200, res_admin.text
    data_admin = res_admin.json()
    assert isinstance(data_admin, list)
    # Validate fields if any notification is present
    for n in data_admin:
        assert "id" in n
        assert "title" in n
        assert "desc" in n
        assert "time" in n
        assert "type" in n
        assert "read" in n
        assert "link" in n

    # 2. Mark read
    test_id = "test-notif-1"
    res_read = admin_client.patch(f"/api/v1/notifications/{test_id}/read")
    assert res_read.status_code == 200
    assert res_read.json()["status"] == "success"

    # 3. Mark read-all
    res_read_all = admin_client.patch("/api/v1/notifications/read-all")
    assert res_read_all.status_code == 200
    assert res_read_all.json()["status"] == "success"

    # 4. Clear
    res_del = admin_client.delete("/api/v1/notifications")
    assert res_del.status_code == 200
    assert res_del.json()["status"] == "success"

    # 5. Instructor & Student notifications
    res_ins = instructor_client.get("/api/v1/notifications")
    assert res_ins.status_code == 200
    assert isinstance(res_ins.json(), list)

    res_stu = student_client.get("/api/v1/notifications")
    assert res_stu.status_code == 200
    assert isinstance(res_stu.json(), list)

def test_classes_crud_and_string_code(admin_client):
    # 1. List classes to find an existing class code
    res_list = admin_client.get("/api/v1/classes")
    assert res_list.status_code == 200, res_list.text
    classes = res_list.json()
    assert len(classes) > 0, "Cần có ít nhất 1 lớp học"
    sample_class = classes[0]
    class_code = sample_class["class_code"]

    # 2. Get class by string class_code
    res_get = admin_client.get(f"/api/v1/classes/{class_code}")
    assert res_get.status_code == 200, res_get.text
    cls_data = res_get.json()
    assert cls_data["class_code"] == class_code
    assert "status" in cls_data

    # 3. Update class by string class_code
    original_desc = cls_data.get("description") or ""
    updated_desc = f"Mô tả cập nhật tự động kiểm thử {cls_data['class_id']}"
    res_put = admin_client.put(
        f"/api/v1/classes/{class_code}",
        json={
            "class_name": cls_data["class_name"],
            "description": updated_desc,
            "status": "Hoạt động"
        }
    )
    assert res_put.status_code == 200, res_put.text
    updated_data = res_put.json()
    assert updated_data["description"] == updated_desc
    assert updated_data["status"] == "dang_mo"

    # Revert description back
    admin_client.put(
        f"/api/v1/classes/{class_code}",
        json={"description": original_desc}
    )
