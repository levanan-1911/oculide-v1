"""
Test Student Phase 1: Enriched Student Rooms & Public Room Preview
Verifies RoomResponse / PublicRoomResponse schemas in pytest (CI-safe),
and verifies get_rooms_for_student + api.rooms handlers when run directly.
"""
import os
import sys
from datetime import datetime, timedelta

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from schemas.room import RoomResponse, PublicRoomResponse


def test_student_room_and_public_preview_schemas():
    """Unit test cho pytest trên CI: xác nhận RoomResponse và PublicRoomResponse hỗ trợ các trường mới cho Sinh viên."""
    now = datetime.now()
    room = RoomResponse(
        room_id=15,
        room_code="EXAM-CPP-01",
        room_name="Kiểm tra thực hành C++ Giữa kỳ",
        room_type="exam",
        instructor_id=2,
        instructor_name="ThS. Nguyễn Văn An",
        start_time=now,
        end_time=now + timedelta(hours=1),
        duration_minutes=90,
        max_attempts=5,
        is_active=True,
        passcode="123456",
        class_code="SE1804",
        class_name="Kỹ thuật lập trình C++",
        course_name="PRF192",
        status="dang_dien_ra",
        student_session_status="dang_lam",
        student_submissions_count=2,
        created_at=now,
        updated_at=now,
    )
    assert room.instructor_name == "ThS. Nguyễn Văn An"
    assert room.course_name == "PRF192"
    assert room.student_session_status == "dang_lam"
    assert room.student_submissions_count == 2

    pub = PublicRoomResponse(
        room_id=15,
        room_code="EXAM-CPP-01",
        room_name="Kiểm tra thực hành C++ Giữa kỳ",
        room_type="exam",
        start_time=now,
        end_time=now + timedelta(hours=1),
        duration_minutes=90,
        requires_passcode=True,
        instructor_name="ThS. Nguyễn Văn An",
        class_code="SE1804",
        class_name="Kỹ thuật lập trình C++",
        course_name="PRF192",
        status="dang_dien_ra",
        is_active=True,
    )
    assert pub.requires_passcode is True
    assert pub.instructor_name == "ThS. Nguyễn Văn An"
    assert pub.course_name == "PRF192"


def run_student_phase1_rooms_e2e():
    """Chạy kiểm thử trực tiếp với SQL Server LocalDB."""
    from core.config import get_db_connection
    from database.room_db import get_rooms_for_student

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE vai_tro = 'student' ORDER BY ma_nguoi_dung ASC")
    row = cursor.fetchone()
    student_id = row[0] if row else 1
    cursor.close()
    conn.close()

    rooms = get_rooms_for_student(student_id=student_id, skip=0, limit=50)
    assert isinstance(rooms, list)
    print(f"✅ E2E get_rooms_for_student(student_id={student_id}) trả về {len(rooms)} phòng.")
    if rooms:
        sample = rooms[0]
        assert "instructor_name" in sample
        assert "student_session_status" in sample
        assert "student_submissions_count" in sample
        print(
            f"✅ Phòng mẫu: code={sample['room_code']}, gv={sample.get('instructor_name')}, "
            f"session_status={sample.get('student_session_status')}, subs={sample.get('student_submissions_count')}"
        )


if __name__ == "__main__":
    run_student_phase1_rooms_e2e()
