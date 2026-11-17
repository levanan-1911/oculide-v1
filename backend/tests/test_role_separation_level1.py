import pytest
from fastapi.testclient import TestClient
from main import app
from core.security import create_access_token

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

def test_admin_blocked_from_academic_and_proctoring_actions(admin_client):
    """
    Xác nhận Admin bị chặn hoàn toàn (403 Forbidden) khi cố tình can thiệp
    vào các quyền hạn độc quyền của Giảng viên (Mức độ 1).
    """
    # 1. Admin KHÔNG được duyệt vi phạm gian lận thi cử
    res_review = admin_client.patch(
        "/api/v1/violations/1/review",
        json={"review_status": "confirmed"}
    )
    assert res_review.status_code == 403, f"Expected 403, got {res_review.status_code}: {res_review.text}"

    # 2. Admin KHÔNG được điểm danh sinh viên trong ca thi
    res_att = admin_client.post(
        "/api/v1/rooms/1/attendance",
        json={"student_id": 3, "status": "attended"}
    )
    assert res_att.status_code == 403, f"Expected 403, got {res_att.status_code}: {res_att.text}"

    # 3. Admin KHÔNG được trục xuất/cắt stream video của thí sinh
    res_revoke = admin_client.post(
        "/api/v1/livekit/tokens/revoke",
        json={"room_id": 1, "student_id": 3}
    )
    assert res_revoke.status_code == 403, f"Expected 403, got {res_revoke.status_code}: {res_revoke.text}"

    # 4. Admin KHÔNG được tạo/sửa bộ đề thi
    res_tpl = admin_client.post(
        "/api/v1/templates",
        json={
            "code": "TPL-BLOCKED-01",
            "title": "Đề thi Admin không thể tạo",
            "type": "exam",
            "language": "Python"
        }
    )
    assert res_tpl.status_code == 403, f"Expected 403, got {res_tpl.status_code}: {res_tpl.text}"

    # 5. Admin KHÔNG được tạo câu hỏi bài thi
    res_q = admin_client.post(
        "/api/v1/questions",
        json={
            "room_id": 1,
            "question_order": 1,
            "question_title": "Câu hỏi test",
            "question_description": "Mô tả",
            "programming_language": "Python",
            "max_points": 10.0
        }
    )
    assert res_q.status_code == 403, f"Expected 403, got {res_q.status_code}: {res_q.text}"

    # 6. Admin KHÔNG được tạo test case
    res_tc = admin_client.post(
        "/api/v1/test-cases",
        json={
            "question_id": 1,
            "input_data": "1 2",
            "expected_output": "3",
            "is_hidden": False,
            "points": 5.0
        }
    )
    assert res_tc.status_code == 403, f"Expected 403, got {res_tc.status_code}: {res_tc.text}"
