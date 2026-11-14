import pytest
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token
from services.system_settings_manager import SystemSettingsManager
from services.backup_service import BackupService

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_system_settings_fixture():
    # Luôn đưa cài đặt về mặc định trước và sau mỗi test
    SystemSettingsManager.reset_settings(updated_by="test_setup")
    yield
    SystemSettingsManager.reset_settings(updated_by="test_teardown")

def test_public_config_endpoint():
    res = client.get("/api/v1/system/public-config")
    assert res.status_code == 200
    data = res.json()
    assert "maintenance_mode" in data
    assert "maintenance_message" in data
    assert "allowed_email_domain" in data

def test_admin_settings_flow():
    admin_token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})

    # 1. Lấy cài đặt hiện tại
    res_get = client.get(
        "/api/v1/admin/system/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_get.status_code == 200
    current = res_get.json()
    assert current["max_code_file_size_mb"] >= 1
    assert current["maintenance_mode"] is False

    # 2. Cập nhật cài đặt
    updated_payload = dict(current)
    updated_payload["max_code_file_size_mb"] = 5
    updated_payload["max_livekit_bitrate_kbps"] = 450
    updated_payload["maintenance_mode"] = True
    updated_payload["maintenance_message"] = "Hệ thống đang bảo trì máy chủ test."

    res_put = client.put(
        "/api/v1/admin/system/settings",
        json=updated_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_put.status_code == 200
    data_put = res_put.json()
    assert data_put["max_code_file_size_mb"] == 5
    assert data_put["max_livekit_bitrate_kbps"] == 450
    assert data_put["maintenance_mode"] is True

    # 3. Kiểm tra endpoint công khai phản ánh ngay lập tức
    res_pub = client.get("/api/v1/system/public-config")
    assert res_pub.status_code == 200
    assert res_pub.json()["maintenance_mode"] is True
    assert res_pub.json()["maintenance_message"] == "Hệ thống đang bảo trì máy chủ test."

    # 4. Khôi phục mặc định
    res_reset = client.post(
        "/api/v1/admin/system/settings/reset",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_reset.status_code == 200
    assert res_reset.json()["maintenance_mode"] is False
    assert res_reset.json()["max_code_file_size_mb"] == 2

def test_database_backup_flow():
    admin_token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})

    # 1. Tạo bản sao lưu thực tế
    res_create = client.post(
        "/api/v1/admin/system/backups",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_create.status_code == 201
    bk = res_create.json()["backup"]
    filename = bk["filename"]
    assert filename.endswith(".bak")
    assert bk["size_mb"] > 0
    assert bk["checksum"].startswith("sha256:")

    # 2. Danh sách bản sao lưu trên đĩa
    res_list = client.get(
        "/api/v1/admin/system/backups",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_list.status_code == 200
    backups = res_list.json()["backups"]
    assert any(b["filename"] == filename for b in backups)

    # 3. Tải về bản sao lưu thực tế
    res_down = client.get(
        f"/api/v1/admin/system/backups/{filename}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_down.status_code == 200
    assert len(res_down.content) > 0

    # 4. Xóa bản sao lưu thực tế
    res_del = client.delete(
        f"/api/v1/admin/system/backups/{filename}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_del.status_code == 200

    # 5. Kiểm tra xóa thành công
    res_down_after = client.get(
        f"/api/v1/admin/system/backups/{filename}/download",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_down_after.status_code == 404

def test_admin_system_health_and_storage_full():
    admin_token = create_access_token({"user_id": 1, "role": "admin", "username": "admin"})

    # Health check
    res_health = client.get(
        "/api/v1/admin/system/health",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_health.status_code == 200
    h_data = res_health.json()
    assert "host_metrics" in h_data
    assert h_data["host_metrics"]["ram_total_mb"] > 0
    assert h_data["host_metrics"]["disk_total_gb"] > 0
    assert "services" in h_data
    assert len(h_data["services"]) >= 5

    # Storage check
    res_storage = client.get(
        "/api/v1/admin/system/storage",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_storage.status_code == 200
    s_data = res_storage.json()
    assert "counts" in s_data
    assert "disk" in s_data
    assert s_data["disk"]["total_gb"] > 0

