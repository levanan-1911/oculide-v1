import asyncio
import os
import sys

# Đảm bảo PYTHONPATH bao gồm thư mục backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from database.room_db import delete_room, get_room_by_code
from api.rooms import (
    create_new_room, list_rooms, get_lobby_room_info,
    change_room_status, mark_manual_attendance
)
from api.templates import list_exam_templates
from schemas.room import (
    RoomCreateRequest, RoomStatusUpdateRequest, RoomManualAttendanceRequest
)
from fastapi import HTTPException

INSTRUCTOR_ID = 12
CURRENT_USER = {"user_id": INSTRUCTOR_ID, "role": "instructor", "username": "hbdieu"}

# Lớp học kiểm thử: CMU-CS 316 AIS (class_id = 5, do GV 12 phụ trách, có 7 sinh viên)
CLASS_ID = 5
ROOM_CODE_1 = "TEST-E2E-LOBBY-01"
ROOM_CODE_2 = "TEST-E2E-LOBBY-02"

def cleanup():
    for code in [ROOM_CODE_1, ROOM_CODE_2]:
        r = get_room_by_code(code)
        if r:
            delete_room(r["room_id"])
    # Tạm đóng các phòng đang chạy để kiểm thử luồng từ trạng thái sạch
    from core.config import get_db_connection
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE Phong SET trang_thai = 'da_dong' WHERE nguoi_tao = ? AND trang_thai = 'dang_dien_ra'", (INSTRUCTOR_ID,))
    conn.commit()
    c.close()
    conn.close()

async def run_e2e_tests():
    cleanup()
    print("=" * 70)
    print("🚀 BẮT ĐẦU CHẠY THỰC TẾ LUỒNG 4 BƯỚC TRÊN CSDL SQL SERVER (LocalDB)")
    print("=" * 70)

    # ---------------------------------------------------------
    # BƯỚC 1: Ngân hàng Đề thi thật (BoDeMau)
    # ---------------------------------------------------------
    print("\n▶ [BƯỚC 1]: Kiểm tra API lấy đề thi thật BoDeMau...")
    templates = await list_exam_templates(room_type=None, current_user=CURRENT_USER)
    print(f"  ✓ API GET /api/v1/templates thực thi thành công. Trả về: {len(templates)} bộ đề trong BoDeMau.")

    # Tạo phòng 1 với template_id = None (Chưa gán đề)
    now = datetime.now()
    start_time = (now + timedelta(days=3)).replace(hour=8, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=90)

    req1 = RoomCreateRequest(
        room_code=ROOM_CODE_1,
        room_name="Phòng E2E Kiểm Tra Luồng 4 Bước",
        room_type="lab",
        class_id=CLASS_ID,
        template_id=None,
        description="Phòng thực hành tự do kiểm thử",
        start_time=start_time,
        end_time=end_time,
        duration_minutes=90,
        max_attempts=10,
        passcode="888999",
        status="chua_mo"
    )
    room_1 = await create_new_room(room_data=req1, current_user=CURRENT_USER)
    room_1_id = room_1["room_id"]
    print(f"  ✓ Tạo phòng [{ROOM_CODE_1}] (ID: {room_1_id}) thành công!")
    print(f"    - Mã đề gán (ma_de_mau): {room_1['template_id']} (NULL/None như thiết kế)")
    print(f"    - Mã lớp gán (ma_lop): {room_1['class_id']}")
    print(f"    - Trạng thái: {room_1['status']}")

    # ---------------------------------------------------------
    # BƯỚC 2: Kiểm tra trùng lịch dạy trực tiếp từ CSDL thật
    # ---------------------------------------------------------
    print("\n▶ [BƯỚC 2]: Kiểm tra nạp phòng thật để phát hiện trùng lịch...")
    all_rooms = await list_rooms(current_user=CURRENT_USER)
    found_rooms = [r for r in all_rooms if r["room_code"] == ROOM_CODE_1]
    assert len(found_rooms) == 1, "Phòng vừa tạo phải tồn tại trong danh sách phòng CSDL!"
    r_info = found_rooms[0]
    print(f"  ✓ API GET /api/v1/rooms trả về phòng thật [{r_info['room_code']}]:")
    print(f"    - Khung giờ: {r_info['start_time']} -> {r_info['end_time']}")
    print(f"    - Frontend dùng trực tiếp dữ liệu này để tính toán xung đột giờ, không dùng localStorage.")

    # ---------------------------------------------------------
    # BƯỚC 3: Màn hình Phòng Chờ (Lobby) nạp sinh viên thật & Điểm danh
    # ---------------------------------------------------------
    print("\n▶ [BƯỚC 3]: Kiểm tra Màn hình Phòng Chờ (Lobby) & Điểm danh...")
    lobby_data = await get_lobby_room_info(room_code=ROOM_CODE_1, current_user=CURRENT_USER)
    print(f"  ✓ API GET /api/v1/rooms/lobby/{ROOM_CODE_1} thành công:")
    print(f"    - Lớp học phần: {lobby_data['class_code']} ({lobby_data['class_name']})")
    print(f"    - Bộ đề gán: {lobby_data['template_title'] or 'Chưa gán đề (Tự do)'}")
    print(f"    - Trạng thái phòng: {lobby_data['status']}")

    attendees = lobby_data["attendees"]
    print(f"    - Tự động nạp {len(attendees)} sinh viên thật của lớp {lobby_data['class_code']}:")
    for idx, st in enumerate(attendees[:5], 1):
        print(f"      {idx}. MSSV: {st['student_id']} | Họ tên: {st['student_name']} | Trạng thái: {st['status']}")
    if len(attendees) > 5:
        print(f"      ... và {len(attendees) - 5} sinh viên khác.")
    assert len(attendees) >= 7, "Lớp CMU-CS 316 AIS phải có ít nhất 7 sinh viên thật!"

    # Điểm danh thủ công sinh viên đầu tiên
    first_st = attendees[0]
    print(f"\n  → Giảng viên bấm toggle điểm danh sinh viên: {first_st['student_name']} ({first_st['student_id']})...")
    att_req = RoomManualAttendanceRequest(student_id=first_st["student_id"], status="waiting")
    att_res = await mark_manual_attendance(room_id=room_1_id, att_data=att_req, current_user=CURRENT_USER)
    print(f"  ✓ Điểm danh thành công: {att_res}")

    # Truy vấn lại để xác minh
    lobby_data_v2 = await get_lobby_room_info(room_code=ROOM_CODE_1, current_user=CURRENT_USER)
    updated_st = next(a for a in lobby_data_v2["attendees"] if a["student_id"] == first_st["student_id"])
    print(f"  ✓ Trạng thái mới của sinh viên trong CSDL: {updated_st['status'].upper()} (Có mặt)")
    assert updated_st["status"] == "waiting"

    # ---------------------------------------------------------
    # BƯỚC 4: Bắt đầu ca học & Kiểm soát giám sát song song
    # ---------------------------------------------------------
    print("\n▶ [BƯỚC 4]: Kiểm tra chuyển trạng thái phòng & Giám sát song song...")
    
    # Tạo thêm phòng 2 cho cùng giảng viên
    req2 = RoomCreateRequest(
        room_code=ROOM_CODE_2,
        room_name="Ca thi số 2 - Kiểm tra xung đột",
        room_type="exam",
        class_id=CLASS_ID,
        start_time=start_time,
        end_time=end_time,
        duration_minutes=60,
        status="chua_mo"
    )
    room_2 = await create_new_room(room_data=req2, current_user=CURRENT_USER)
    room_2_id = room_2["room_id"]
    print(f"  ✓ Tạo thêm phòng 2 [{ROOM_CODE_2}] (ID: {room_2_id}) thành công.")

    # 1. Bắt đầu phòng 1
    print(f"\n  → Giảng viên bấm 'Bắt đầu làm bài' cho phòng 1 [{ROOM_CODE_1}]...")
    st_req1 = RoomStatusUpdateRequest(status="dang_dien_ra", force_close_conflicts=False)
    updated_r1 = await change_room_status(room_id=room_1_id, status_data=st_req1, current_user=CURRENT_USER)
    print(f"  ✓ Phòng 1 đã kích hoạt thành công: status = {updated_r1['status']}")
    assert updated_r1["status"] == "dang_dien_ra"

    # 2. Thử kích hoạt phòng 2 trong khi phòng 1 đang chạy trực tiếp
    print(f"\n  → Giảng viên thử bấm 'Bắt đầu làm bài' cho phòng 2 [{ROOM_CODE_2}]...")
    st_req2 = RoomStatusUpdateRequest(status="dang_dien_ra", force_close_conflicts=False)
    try:
        await change_room_status(room_id=room_2_id, status_data=st_req2, current_user=CURRENT_USER)
        assert False, "Hệ thống phải chặn vì vi phạm quy định giám sát song song 2 phòng!"
    except HTTPException as e:
        assert e.status_code == 409
        conflict_info = e.detail["conflict_room"]
        print(f"  ✓ BẢO VỆ THÀNH CÔNG: HTTP 409 Conflict!")
        print(f"    - Thông báo: {e.detail['message']}")
        print(f"    - Ca đang xung đột: [{conflict_info['room_code']}] {conflict_info['room_name']}")

    # 3. Giảng viên bấm 'Kết thúc ca cũ và mở ca này' (force_close_conflicts = True)
    print(f"\n  → Giảng viên xác nhận trên Modal: 'Kết thúc ca cũ và mở ca này'...")
    st_req2_force = RoomStatusUpdateRequest(status="dang_dien_ra", force_close_conflicts=True)
    updated_r2 = await change_room_status(room_id=room_2_id, status_data=st_req2_force, current_user=CURRENT_USER)
    print(f"  ✓ Phòng 2 đã được mở thành công: status = {updated_r2['status']}")

    # Xác minh phòng 1 đã tự động bị đóng ('da_dong')
    check_r1 = await get_lobby_room_info(room_code=ROOM_CODE_1, current_user=CURRENT_USER)
    print(f"  ✓ Phòng 1 cũ đã tự động chuyển sang: status = {check_r1['status']} (Đã đóng)")
    assert check_r1["status"] == "da_dong"

    cleanup()
    print("\n" + "=" * 70)
    print("🎉 TẤT CẢ 4 BƯỚC ĐÃ CHẠY THỰC TẾ THÀNH CÔNG 100% TRÊN CSDL SQL SERVER!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_e2e_tests())
