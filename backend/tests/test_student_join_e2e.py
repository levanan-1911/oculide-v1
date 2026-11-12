import asyncio
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import HTTPException
from starlette.requests import Request
from api.rooms import (
    create_new_room,
    join_room_authenticated,
    save_device_check_endpoint,
    get_student_room_status,
    get_lobby_room_info,
    change_room_status,
    remove_room,
)
from schemas.room import RoomCreateRequest, RoomStatusUpdateRequest, DeviceCheckRequest
from schemas.auth import JoinRoomRequest
from core.config import get_db_connection


def make_dummy_request() -> Request:
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/rooms/join",
        "headers": [(b"user-agent", b"Mozilla/5.0 OculideTestBrowser")],
        "client": ("127.0.0.1", 50000),
    }
    return Request(scope)


async def run_student_join_e2e():
    print("=" * 70)
    print("🚀 KIỂM THỬ E2E 2 CHIỀU: GIẢNG VIÊN TẠO PHÒNG <-> SINH VIÊN JOIN")
    print("=" * 70)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 ma_giang_vien FROM LopHoc WHERE ma_lop = 5")
    inst_row = cursor.fetchone()
    instructor_id = inst_row[0] if inst_row else 1

    # Lấy 1 sinh viên thật thuộc lớp 5 (CMU-CS 316 AIS)
    cursor.execute("""
        SELECT TOP 1 u.ma_nguoi_dung, u.ho_va_ten, u.ma_dinh_danh
        FROM SinhVienLopHoc svl
        JOIN NguoiDung u ON svl.ma_sinh_vien = u.ma_nguoi_dung
        WHERE svl.ma_lop = 5
    """)
    stu_row = cursor.fetchone()
    assert stu_row is not None, "Cần có ít nhất 1 sinh viên trong lớp 5"
    student_user = {"user_id": stu_row[0], "role": "student", "name": stu_row[1], "ma_dinh_danh": stu_row[2]}

    # Lấy 1 user không thuộc lớp 5 để test chặn ngoài lớp
    cursor.execute("""
        SELECT TOP 1 ma_nguoi_dung FROM NguoiDung
        WHERE ma_vai_tro = 3 AND ma_nguoi_dung NOT IN (SELECT ma_sinh_vien FROM SinhVienLopHoc WHERE ma_lop = 5)
    """)
    outsider_row = cursor.fetchone()
    conn.close()

    instructor_user = {"user_id": instructor_id, "role": "instructor"}
    test_code = "TEST-SV-JOIN-01"

    # Dọn phòng cũ nếu tồn tại
    from database.room_db import get_room_by_code
    old = get_room_by_code(test_code)
    if old:
        await remove_room(old["room_id"], instructor_user)

    # 1. Giảng viên tạo phòng mới
    now = datetime.now()
    room = await create_new_room(
        RoomCreateRequest(
            room_code=test_code,
            room_name="Phòng Kiểm Thử Sinh Viên Join",
            room_type="exam",
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=2),
            duration_minutes=60,
            passcode="654321",
            class_id=5,
            status="chua_mo",
        ),
        instructor_user,
    )
    room_id = room["room_id"]
    print(f"✓ [1] Giảng viên tạo phòng [{test_code}] (ID: {room_id}) thành công.")

    try:
        # 2. Test nhập sai mã PIN -> 403
        try:
            await join_room_authenticated(
                JoinRoomRequest(room_code=test_code, passcode="000000"),
                make_dummy_request(),
                student_user,
            )
            raise AssertionError("Lẽ ra phải báo lỗi sai passcode!")
        except HTTPException as exc:
            assert exc.status_code == 403
            print("✓ [2] Nhập sai mã PIN bị chặn đúng chuẩn HTTP 403.")

        # 3. Test sinh viên ngoài lớp -> 403
        if outsider_row:
            outsider_user = {"user_id": outsider_row[0], "role": "student"}
            try:
                await join_room_authenticated(
                    JoinRoomRequest(room_code=test_code, passcode="654321"),
                    make_dummy_request(),
                    outsider_user,
                )
                raise AssertionError("Lẽ ra phải chặn sinh viên ngoài lớp!")
            except HTTPException as exc:
                assert exc.status_code == 403
                print("✓ [3] Sinh viên ngoài lớp bị chặn đúng chuẩn HTTP 403.")

        # 4. Sinh viên thật của lớp join thành công
        joined = await join_room_authenticated(
            JoinRoomRequest(room_code=test_code, passcode="654321"),
            make_dummy_request(),
            student_user,
        )
        assert joined["session_id"] is not None
        assert joined["class_code"] == "CMU-CS 316 AIS"
        print(f"✓ [4] Sinh viên [{stu_row[1]} - {stu_row[2]}] join thành công! Session ID: {joined['session_id']}")

        # 5. Giảng viên kiểm tra Lobby -> thấy sinh viên đã chuyển sang waiting
        lobby = await get_lobby_room_info(test_code, instructor_user)
        matched = [a for a in lobby["attendees"] if str(a["user_id"]) == str(stu_row[0])]
        assert len(matched) == 1
        assert matched[0]["status"] == "waiting", f"Expected waiting, got {matched[0]['status']}"
        assert matched[0]["camera_ready"] is False
        print("✓ [5] Màn hình Giảng viên lập tức thấy sinh viên ở trạng thái WAITING (Camera: chưa sẵn sàng).")

        # 6. Sinh viên thực hiện Device Check -> Camera sẵn sàng
        dc_res = await save_device_check_endpoint(
            room_id,
            DeviceCheckRequest(camera_ready=True, mic_ready=True, screen_ready=True),
            make_dummy_request(),
            student_user,
        )
        assert dc_res["camera_ready"] is True
        lobby_after_dc = await get_lobby_room_info(test_code, instructor_user)
        matched_dc = [a for a in lobby_after_dc["attendees"] if str(a["user_id"]) == str(stu_row[0])]
        assert matched_dc[0]["camera_ready"] is True
        print("✓ [6] Sau Device Check, màn hình Giảng viên cập nhật ngay: Camera = Sẵn sàng (True).")

        # 7. Sinh viên poll trạng thái phòng chờ -> đang chua_mo, sau khi GV Bắt Đầu -> dang_dien_ra
        st1 = await get_student_room_status(test_code, student_user)
        assert st1["status"] == "chua_mo"
        print("✓ [7a] Sinh viên poll trạng thái phòng chờ: status = chua_mo (Chờ GV phát đề).")

        await change_room_status(
            room_id,
            RoomStatusUpdateRequest(status="dang_dien_ra", force_close_conflicts=True),
            instructor_user,
        )
        st2 = await get_student_room_status(test_code, student_user)
        assert st2["status"] == "dang_dien_ra"
        print("✓ [7b] Sau khi Giảng viên bấm Bắt Đầu -> Sinh viên poll nhận ngay: status = dang_dien_ra (Mở phòng thi!).")

    finally:
        await remove_room(room_id, instructor_user)
        print("✓ [Dọn dẹp] Đã xóa sạch phòng kiểm thử trên CSDL và LiveKit Cloud.")

    print("=" * 70)
    print("🎉 TOÀN BỘ LUỒNG 2 CHIỀU GIẢNG VIÊN <-> SINH VIÊN ĐÃ PASS 100%!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_student_join_e2e())
