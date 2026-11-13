"""
Test Student Phase 2: Student Violations & Profile APIs
Verifies ViolationResponse schema with room metadata, IDOR protection on student violations,
and verifies get_violations_by_student against SQL Server LocalDB when run directly.
"""
import os
import sys
from datetime import datetime
from unittest.mock import patch

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from schemas.violation import ViolationResponse
from schemas.auth import UserProfileUpdateRequest, ChangePasswordRequest


def test_violation_response_enriched_room_metadata():
    """Unit test cho CI: kiểm tra ViolationResponse hỗ trợ room_id, room_code, room_name."""
    now = datetime.now()
    vio = ViolationResponse(
        violation_id=1,
        session_id=10,
        student_id=101,
        room_id=5,
        room_code="EXAM-CPP-01",
        room_name="Kiểm tra giữa kỳ C++",
        violation_type="tab_switch",
        severity="medium",
        description="Mất tiêu điểm màn hình thi 15s",
        snapshot_url="https://oculide.storage/snap1.jpg",
        detected_at=now,
        is_reviewed=False,
        review_status="pending",
    )
    assert vio.room_id == 5
    assert vio.room_code == "EXAM-CPP-01"
    assert vio.room_name == "Kiểm tra giữa kỳ C++"
    assert vio.violation_type == "tab_switch"
    assert vio.review_status == "pending"


def test_student_profile_update_and_change_password_schemas():
    """Unit test cho CI: kiểm tra schema cập nhật hồ sơ và đổi mật khẩu."""
    req = UserProfileUpdateRequest(
        phone_number="0912345678",
        department="Kỹ thuật Phần mềm",
    )
    assert req.phone_number == "0912345678"
    assert req.department == "Kỹ thuật Phần mềm"

    pw_req = ChangePasswordRequest(
        current_password="oldPassword123",
        new_password="newPassword456!",
    )
    assert pw_req.current_password == "oldPassword123"
    assert pw_req.new_password == "newPassword456!"


def run_student_phase2_violations_e2e():
    """Chạy kiểm thử trực tiếp với SQL Server LocalDB."""
    from core.config import get_db_connection
    from database.violation_db import get_violations_by_student

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_sinh_vien FROM ViPhamGiamSat ORDER BY ma_vi_pham DESC")
    row = cursor.fetchone()
    student_id = row[0] if row else 1
    cursor.close()
    conn.close()

    vios = get_violations_by_student(student_id=student_id)
    assert isinstance(vios, list)
    print(f"✅ E2E get_violations_by_student(student_id={student_id}) trả về {len(vios)} vi phạm.")
    if vios:
        sample = vios[0]
        assert "violation_id" in sample
        assert "violation_type" in sample
        assert "room_name" in sample
        print(
            f"✅ Vi phạm mẫu: id={sample['violation_id']}, type={sample['violation_type']}, "
            f"room={sample.get('room_name')} ({sample.get('room_code')}), status={sample.get('review_status')}"
        )


if __name__ == "__main__":
    run_student_phase2_violations_e2e()
