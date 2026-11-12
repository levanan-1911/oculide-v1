import asyncio
import os
import sys
from datetime import datetime, timedelta
from starlette.requests import Request

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.config import get_db_connection
from schemas.room import RoomCreateRequest
from schemas.session import SessionCreateRequest
from schemas.violation import ViolationCreateRequest, AIViolationHookRequest, ViolationReviewRequest
from api.rooms import create_new_room, remove_room
from api.sessions import start_session, list_room_sessions, unlock_student_exam
from api.violations import (
    log_violation,
    ingest_ai_violation_event,
    get_room_violations,
    review_violation,
)


def make_dummy_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/sessions",
        "headers": [(b"user-agent", b"Mozilla/5.0 OculideTestBrowser")],
        "client": ("127.0.0.1", 50001),
    }
    return Request(scope)


async def run_proctoring_violations_e2e():
    print("=" * 70)
    print("🚀 E2E TEST: VIOLATIONS SYNC, ATTENDANCE SESSIONS, AI HOOK & UNLOCK")
    print("=" * 70)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_giang_vien FROM LopHoc WHERE ma_lop = 5")
    inst_row = cursor.fetchone()
    instructor_id = inst_row[0] if inst_row else 1

    cursor.execute("""
        SELECT TOP 1 u.ma_nguoi_dung
        FROM SinhVienLopHoc svl
        JOIN NguoiDung u ON svl.ma_sinh_vien = u.ma_nguoi_dung
        WHERE svl.ma_lop = 5
    """)
    stu_row = cursor.fetchone()
    assert stu_row is not None, "Cần có ít nhất 1 sinh viên trong lớp 5"
    student_id = stu_row[0]
    conn.close()

    instructor_user = {"user_id": instructor_id, "role": "instructor"}
    student_user = {"user_id": student_id, "role": "student"}

    room_code = "E2E-PROCTOR-01"
    created_room_id = None

    try:
        now = datetime.utcnow()
        room = await create_new_room(
            RoomCreateRequest(
                room_code=room_code,
                room_name="Phòng thi E2E Giám sát Vi phạm",
                room_type="exam",
                duration_minutes=45,
                class_id=5,
                start_time=now - timedelta(minutes=5),
                end_time=now + timedelta(minutes=60),
            ),
            current_user=instructor_user,
        )
        created_room_id = room["room_id"]
        print(f"✅ 1. Tạo phòng thi '{room_code}' (room_id={created_room_id})")

        # 2. Student starts session (PhienLamBai)
        sess = await start_session(
            SessionCreateRequest(room_id=created_room_id),
            request=make_dummy_request(),
            current_user=student_user,
        )
        session_id = sess["session_id"]
        print(f"✅ 2. Sinh viên mở phiên làm bài PhienLamBai (session_id={session_id})")

        # 3. Student browser logs tab_switch violation
        v1 = await log_violation(
            ViolationCreateRequest(
                session_id=session_id,
                violation_type="tab_switch",
                severity="medium",
                description="Sinh viên chuyển tab làm bài",
            ),
            current_user=student_user,
        )
        assert v1["violation_id"] > 0
        assert v1["violation_type"] == "tab_switch"
        print(f"✅ 3. Ghi nhận vi phạm trình duyệt 'tab_switch' vào ViPhamGiamSat (id={v1['violation_id']})")

        # 4. AI Proctoring Hook logs phone_detected without needing session_id
        v2 = await ingest_ai_violation_event(
            AIViolationHookRequest(
                room_id=created_room_id,
                student_id=student_id,
                violation_type="phone_detected",
                confidence=0.91,
                severity="high",
                description="YOLOv8 phát hiện điện thoại",
            ),
            current_user=instructor_user,
        )
        assert v2["violation_id"] > 0
        assert "91%" in (v2["description"] or "")
        print(f"✅ 4. Đầu chờ AI (/violations/ai-event) ghi nhận 'phone_detected' (id={v2['violation_id']})")

        # 5. Instructor lists room sessions (Attendance), room violations, reviews one, and unlocks student
        room_sessions = await list_room_sessions(created_room_id, current_user=instructor_user)
        assert any(s["session_id"] == session_id for s in room_sessions)

        room_vios = await get_room_violations(created_room_id, review_status=None, current_user=instructor_user)
        assert len(room_vios) == 2

        reviewed = await review_violation(
            v1["violation_id"],
            review_data=ViolationReviewRequest(review_status="confirmed"),
            current_user=instructor_user,
        )
        assert reviewed["review_status"] == "confirmed"

        unlock_res = await unlock_student_exam(created_room_id, student_id, current_user=instructor_user)
        assert unlock_res["student_id"] == student_id
        print("✅ 5. Giảng viên xem chuyên cần, duyệt vi phạm ('confirmed') & gửi lệnh mở khóa từ xa thành công")

        print("\n🎉 TẤT CẢ 5 BƯỚC E2E GIÁM SÁT VI PHẠM ĐỀU PASS!")
    finally:
        if created_room_id:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ViPhamGiamSat WHERE ma_phong = ?", (created_room_id,))
            cursor.execute("DELETE FROM PhienLamBai WHERE ma_phong = ?", (created_room_id,))
            conn.commit()
            conn.close()
            try:
                await remove_room(created_room_id, current_user=instructor_user)
            except Exception:
                pass


if __name__ == "__main__":
    asyncio.run(run_proctoring_violations_e2e())
