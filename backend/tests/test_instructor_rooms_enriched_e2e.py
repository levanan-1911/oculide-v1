"""
Test E2E: Enriched Rooms endpoint for Instructor Dashboard and Schedules
Verifies that GET /api/v1/rooms returns class_code, class_name, total_students,
attended_students, and pending_violations.
"""
import sys
import os
from datetime import datetime, timedelta

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from schemas.room import RoomResponse


def test_room_response_enriched_schema():
    """Unit test cho pytest trên CI: xác nhận RoomResponse hỗ trợ đầy đủ các trường làm giàu."""
    now = datetime.now()
    room = RoomResponse(
        room_id=101,
        room_code="ROOM-CI-01",
        room_name="Kiểm tra giữa kỳ",
        room_type="exam",
        instructor_id=12,
        start_time=now,
        end_time=now + timedelta(hours=1),
        duration_minutes=60,
        max_attempts=3,
        is_active=True,
        passcode="123456",
        class_code="CMU-CS213",
        class_name="Nhập môn C++",
        total_students=45,
        attended_students=42,
        pending_violations=2,
        created_at=now,
        updated_at=now,
    )
    assert room.class_code == "CMU-CS213"
    assert room.class_name == "Nhập môn C++"
    assert room.total_students == 45
    assert room.attended_students == 42
    assert room.pending_violations == 2


def run_enriched_rooms_e2e():
    from core.config import get_db_connection
    from database.room_db import create_room, get_rooms_by_instructor, get_room_by_id
    from database.session_db import create_session
    from database.violation_db import create_violation

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Tìm hoặc lấy một lớp học và giảng viên có sẵn
    cursor.execute("SELECT TOP 1 ma_lop, ma_lop_hoc, ten_lop, ma_giang_vien FROM LopHoc ORDER BY ma_lop ASC")
    class_row = cursor.fetchone()
    assert class_row is not None, "Cần có ít nhất 1 lớp học trong CSDL"
    class_id, class_code, class_name, instructor_id = class_row[0], class_row[1], class_row[2], class_row[3]
    print(f"✅ 1. Dùng lớp học mẫu: id={class_id}, code='{class_code}', instructor_id={instructor_id}")

    # Đếm số sinh viên trong lớp
    cursor.execute("SELECT COUNT(*) FROM SinhVienLopHoc WHERE ma_lop = ?", (class_id,))
    expected_total_sv = cursor.fetchone()[0]
    cursor.close()
    conn.close()

    # 2. Tạo một phòng thi mới gắn với lớp học này
    test_room_code = f"E2E-ENR-{datetime.now().strftime('%H%M%S')}"
    now = datetime.now()
    created_room = create_room(
        room_code=test_room_code,
        room_name="Phòng thi thử nghiệm Enriched Data",
        room_type="exam",
        instructor_id=instructor_id,
        description="Mô tả test",
        start_time=now,
        end_time=now + timedelta(hours=2),
        duration_minutes=90,
        max_attempts=3,
        passcode="998877",
        class_id=class_id,
        proctoring_config='{"aiFaceDetection": true}',
        status="dang_dien_ra"
    )
    assert created_room is not None
    room_id = created_room["room_id"]
    print(f"✅ 2. Đã tạo phòng thi: id={room_id}, code='{test_room_code}'")

    # 3. Lấy thông tin phòng qua get_room_by_id
    r_id_data = get_room_by_id(room_id)
    assert r_id_data is not None
    assert r_id_data["class_code"] == class_code
    assert r_id_data["total_students"] == expected_total_sv
    assert r_id_data["attended_students"] == 0
    assert r_id_data["pending_violations"] == 0
    print(f"✅ 3. get_room_by_id trả về đầy đủ: class_code='{r_id_data['class_code']}', total_students={r_id_data['total_students']}")

    # 4. Tạo 1 phiên làm bài (PhienLamBai) và 1 vi phạm (ViPhamGiamSat)
    session = create_session(
        room_id=room_id,
        student_id=1,
        ip_address="127.0.0.1",
        user_agent="Mozilla/5.0 Test",
        browser_fingerprint="test-fp"
    )
    session_id = session["session_id"]
    violation = create_violation(
        session_id=session_id,
        student_id=1,
        violation_type="tab_switch",
        severity="medium",
        description="Rời màn hình làm bài"
    )
    print(f"✅ 4. Đã tạo session={session_id} và violation={violation['violation_id']}")

    # 5. Gọi get_rooms_by_instructor và kiểm tra các số liệu cập nhật
    instructor_rooms = get_rooms_by_instructor(instructor_id)
    matching_room = next((r for r in instructor_rooms if r["room_id"] == room_id), None)
    assert matching_room is not None, "Phòng thi phải xuất hiện trong danh sách của giảng viên"
    assert matching_room["class_code"] == class_code
    assert matching_room["total_students"] == expected_total_sv
    assert matching_room["attended_students"] >= 1
    assert matching_room["pending_violations"] >= 1
    print(f"✅ 5. get_rooms_by_instructor phản ánh đúng: attended_students={matching_room['attended_students']}, pending_violations={matching_room['pending_violations']}")

    print("\n🎉 TẤT CẢ 5 BƯỚC TEST ENRICHED ROOMS ĐỀU PASS THÀNH CÔNG!")


if __name__ == "__main__":
    run_enriched_rooms_e2e()
