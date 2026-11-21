from fastapi import APIRouter, HTTPException, Depends, status, Query, Request, Body
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from schemas.room import (
    RoomCreateRequest, RoomUpdateRequest, RoomResponse, PublicRoomResponse,
    RoomDashboardResponse, RoomDashboardStudentItem, RoomEnrollmentRequest,
    RoomStatusUpdateRequest, RoomLobbyResponse, RoomManualAttendanceRequest,
    StudentJoinRoomResponse, DeviceCheckRequest, StudentRoomStatusResponse
)
from schemas.auth import JoinRoomRequest
from core.permissions import get_current_user, instructor_or_admin_required, instructor_required
from database.room_db import (
    create_room, get_room_by_id, get_room_by_code, get_rooms_by_instructor,
    get_all_rooms, get_rooms_for_student, update_room, delete_room, get_room_dashboard_data,
    get_exam_templates, get_room_lobby_details, check_instructor_active_room,
    update_room_status, toggle_manual_attendance,
    is_student_in_class, get_class_metadata, upsert_student_lobby_session,
    save_student_device_check
)
from database.scoreboard_db import get_room_scoreboard
from database.template_db import get_exam_content_for_room
from database.enrollment_db import enroll_student, get_enrollments_by_room, remove_enrollment, is_student_enrolled
from database.session_db import get_sessions_by_room
from database.violation_db import get_violations_by_session
from services.livekit_service import livekit_service
from core.config import settings
from api.auth import extract_client_ip

router = APIRouter()


def _is_room_expired(room: Dict[str, Any]) -> bool:
    terminal_statuses = {
        "da_dong",
        "da_huy",
        "da_ket_thuc",
        "closed",
        "completed",
        "ended",
        "cancelled",
        "canceled",
    }
    if not room.get("is_active", True) or str(room.get("status") or "").lower() in terminal_statuses:
        return True

    end_time = room.get("end_time")
    if isinstance(end_time, str):
        try:
            end_time = datetime.fromisoformat(end_time.replace("Z", "+00:00"))
        except ValueError:
            return False
    if not isinstance(end_time, datetime):
        return False

    now = datetime.now(end_time.tzinfo) if end_time.tzinfo else datetime.now()
    return now >= end_time


def _room_lobby_opens_at(room: Dict[str, Any]) -> Optional[datetime]:
    start_time = room.get("start_time")
    if isinstance(start_time, str):
        try:
            start_time = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(start_time, datetime):
        return None
    return start_time - timedelta(minutes=15)


def _is_before_lobby_open(open_time: datetime) -> bool:
    now = datetime.now(open_time.tzinfo) if open_time.tzinfo else datetime.now()
    return now < open_time


@router.get("/templates")
async def list_exam_templates(
    room_type: Optional[str] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các bộ đề mẫu có trong CSDL (BoDeMau)"""
    instructor_id = current_user["user_id"] if current_user.get("role") == "instructor" else None
    return get_exam_templates(instructor_id=instructor_id, room_type=room_type)

@router.get("/lobby/{room_code}", response_model=RoomLobbyResponse)
async def get_lobby_room_info(
    room_code: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy thông tin chi tiết phòng chờ và danh sách điểm danh sinh viên thời gian thực"""
    lobby_data = get_room_lobby_details(room_code)
    if not lobby_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng chờ")
    if _is_room_expired(lobby_data):
        lobby_data["passcode"] = None

    lobby_open_time = _room_lobby_opens_at(lobby_data)
    if (
        lobby_open_time
        and _is_before_lobby_open(lobby_open_time)
        and current_user.get("role") == "student"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Phòng chờ sẽ mở từ {lobby_open_time.strftime('%H:%M %d/%m/%Y')} (15 phút trước giờ bắt đầu)."
        )

    return lobby_data

@router.patch("/{room_id}/status")
async def change_room_status(
    room_id: int,
    status_data: RoomStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Cập nhật trạng thái phòng thi (bắt đầu thi, kết thúc thi, hủy phòng)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền thay đổi trạng thái phòng này")

    # Đối với các ca thi (giữa kỳ / kết thúc học phần): Giám thị chỉ giám sát, không thể kết thúc sớm!
    # Đối với phòng thực hành (lab/practice): Giảng viên có quyền kết thúc ca sớm.
    target_status = status_data.status.lower()
    if target_status in ("ended", "da_dong", "da_ket_thuc", "closed", "completed") and current_user["role"] != "admin":
        r_type = (room.get("room_type") or "").lower()
        r_name = str(room.get("room_name", "")).lower()
        if r_type in ("exam", "midterm", "final", "final_exam") or "thi" in r_name or "cuối kỳ" in r_name or "kết thúc" in r_name or "giữa kỳ" in r_name:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Đối với các ca thi (giữa kỳ / kết thúc học phần), quy chế thi không cho phép kết thúc sớm. Hệ thống sẽ tự động đóng phòng khi hết thời gian làm bài."
            )

    # Kiểm tra xung đột nếu chuyển sang dang_dien_ra / in_progress
    target_status = status_data.status.lower()
    if target_status in ("dang_dien_ra", "in_progress"):
        active_conflict = check_instructor_active_room(current_user["user_id"], room_id)
        if active_conflict and not status_data.force_close_conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": (
                        f"Chỉ có thể giám sát một phòng tại một thời điểm. "
                        f"Phòng [{active_conflict['room_code']}] vẫn đang diễn ra; "
                        "hãy kết thúc phòng đó trước khi bắt đầu phiên mới."
                    ),
                    "conflict_room": active_conflict
                }
            )

    updated = update_room_status(
        room_id=room_id,
        status=target_status,
        instructor_id=current_user["user_id"],
        force_close_conflicts=bool(status_data.force_close_conflicts)
    )
    return updated

@router.post("/{room_id}/attendance")
async def mark_manual_attendance(
    room_id: int,
    att_data: RoomManualAttendanceRequest,
    current_user: Dict[str, Any] = Depends(instructor_required)
):
    """Điểm danh thủ công sinh viên trong phòng chờ (Quyền độc quyền của Giảng viên)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if room.get("instructor_id") != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền điểm danh phòng thi của giảng viên khác")
    success = toggle_manual_attendance(room_id, att_data.student_id, att_data.status)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không thể cập nhật trạng thái điểm danh cho sinh viên")
    return {"success": True, "student_id": att_data.student_id, "status": att_data.status}

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_new_room(
    room_data: RoomCreateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Tạo phòng thi hoặc phòng thực hành mới"""
    if room_data.room_type == "lab" and room_data.session_type not in (None, "LAB"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng thực hành phải dùng session_type LAB",
        )
    if room_data.room_type == "exam" and room_data.session_type not in (None, "MIDTERM", "FINAL"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng thi phải dùng session_type MIDTERM hoặc FINAL",
        )
    if room_data.room_type == "classroom" and room_data.session_type is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng học không nhận session_type",
        )

    if current_user.get("role") != "admin":
        is_legacy_unspecified_exam = room_data.room_type == "exam" and room_data.session_type is None
        is_final_exam = room_data.session_type == "FINAL"
        exam_title_mentions_final = (
            "cuối kỳ" in str(room_data.room_name).lower()
            or "kết thúc" in str(room_data.room_name).lower()
        )
        if is_legacy_unspecified_exam or is_final_exam or exam_title_mentions_final:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Giảng viên không có quyền tạo kỳ thi kết thúc học phần (cuối kỳ). Kỳ thi kết thúc học phần do Phòng Đào tạo & Quản trị viên khởi tạo."
            )

    if get_room_by_code(room_data.room_code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã phòng (room_code) đã tồn tại")
    
    livekit_room_name = f"room_{room_data.room_code}"
    # Khởi tạo LiveKit Room nếu chế độ thi yêu cầu video
    livekit_service.create_room(livekit_room_name)

    import json
    cfg_str = None
    if room_data.proctoring_config:
        if isinstance(room_data.proctoring_config, str):
            cfg_str = room_data.proctoring_config
        else:
            cfg_str = json.dumps(room_data.proctoring_config)
    
    new_room = create_room(
        room_code=room_data.room_code,
        room_name=room_data.room_name,
        room_type=room_data.room_type,
        instructor_id=current_user["user_id"],
        description=room_data.description,
        start_time=room_data.start_time,
        end_time=room_data.end_time,
        duration_minutes=room_data.duration_minutes,
        max_attempts=room_data.max_attempts,
        passcode=room_data.passcode,
        livekit_room_name=livekit_room_name,
        class_id=room_data.class_id,
        template_id=room_data.template_id,
        proctoring_config=cfg_str,
        status=room_data.status or "chua_mo",
        session_type=room_data.session_type,
    )

    return new_room

@router.post("/join", response_model=StudentJoinRoomResponse)
async def join_room_authenticated(
    join_data: JoinRoomRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Thí sinh / Sinh viên ĐÃ ĐĂNG NHẬP tham gia phòng thi bằng mã phòng và passcode.
    Kiểm tra lớp học phần, ghi nhận PhienLamBai ở trạng thái dang_lam để Giảng viên thấy ngay trên Lobby.
    """
    room_code = join_data.room_code.strip().upper()
    room = get_room_by_code(room_code)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phòng với mã '{join_data.room_code}' không tồn tại"
        )
    if _is_room_expired(room):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Phòng học/thi đã kết thúc hoặc bị hủy; mã phòng và mật khẩu đã hết hiệu lực."
        )
    if room.get("passcode"):
        provided_passcode = (join_data.passcode or "").strip()
        if not provided_passcode:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Phòng thi này yêu cầu nhập mật khẩu vào phòng (passcode)"
            )
        if room["passcode"].strip() != provided_passcode:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Mật khẩu vào phòng (passcode) không chính xác"
            )

    lobby_open_time = _room_lobby_opens_at(room)
    if (
        current_user.get("role") == "student"
        and lobby_open_time
        and _is_before_lobby_open(lobby_open_time)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Phòng chờ sẽ mở từ {lobby_open_time.strftime('%H:%M %d/%m/%Y')} (15 phút trước giờ bắt đầu)."
        )

    # Cho phép sinh viên vào phòng chờ trước giờ thi; không cho tham gia sau khi ca thi đã bắt đầu.
    if current_user.get("role") == "student" and (room.get("room_type") == "exam" or "thi" in str(room.get("room_name", "")).lower()):
        r_status = (room.get("status") or "").lower()
        if r_status in ("dang_dien_ra", "in_progress"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Phòng thi đã bắt đầu. Theo quy chế khảo thí, thí sinh không được phép vào phòng chờ sau khi ca thi đã chính thức bắt đầu."
            )

    student_id = current_user["user_id"]
    class_meta = None
    if room.get("class_id"):
        if current_user.get("role") == "student" and not is_student_in_class(room["class_id"], student_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có tên trong danh sách lớp học phần của phòng này"
            )
        class_meta = get_class_metadata(room["class_id"])

    if not is_student_enrolled(room["room_id"], student_id):
        try:
            enroll_student(room["room_id"], student_id, enrolled_by=room.get("instructor_id") or 1)
        except Exception:
            pass

    client_ip = extract_client_ip(request)
    user_agent = request.headers.get("user-agent")
    session_id = upsert_student_lobby_session(
        room_id=room["room_id"],
        student_id=student_id,
        ip_address=client_ip,
        user_agent=user_agent,
    )

    return {
        **room,
        "session_id": session_id,
        "class_code": class_meta.get("class_code") if class_meta else None,
        "class_name": class_meta.get("class_name") if class_meta else None,
        "course_name": class_meta.get("course_name") if class_meta else None,
    }


@router.post("/{room_id}/device-check")
async def save_device_check_endpoint(
    room_id: int,
    payload: DeviceCheckRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lưu kết quả kiểm tra Camera/Mic của sinh viên vào bảng KiemTraThietBi"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")

    browser_info = payload.browser_info or request.headers.get("user-agent")
    return save_student_device_check(
        room_id=room_id,
        student_id=current_user["user_id"],
        camera_ready=payload.camera_ready,
        mic_ready=payload.mic_ready,
        network_latency_ms=payload.network_latency_ms,
        os_info=payload.os_info,
        browser_info=browser_info,
    )


@router.get("/{room_code}/student-status", response_model=StudentRoomStatusResponse)
async def get_student_room_status(
    room_code: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Endpoint nhẹ cho màn hình Phòng Chờ Sinh Viên polling trạng thái bắt đầu thi từ Giảng viên"""
    room = get_room_by_code(room_code.strip().upper())
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    is_expired = _is_room_expired(room)
    return {
        "room_id": room["room_id"],
        "room_code": "" if is_expired else room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "session_type": room.get("session_type"),
        "status": "completed" if is_expired else (room.get("status") or "chua_mo"),
        "is_active": bool(room.get("is_active", True)) and not is_expired,
        "duration_minutes": room.get("duration_minutes") or 60,
        "start_time": room["start_time"],
        "end_time": room["end_time"],
    }

@router.get("", response_model=List[RoomResponse])
async def list_rooms(
    room_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các phòng khả dụng"""
    if current_user["role"] == "admin":
        return get_all_rooms(skip=skip, limit=limit, room_type=room_type)
    elif current_user["role"] == "instructor":
        return get_rooms_by_instructor(current_user["user_id"], skip=skip, limit=limit, room_type=room_type)
    else:
        # Sinh viên: Lấy danh sách phòng theo lớp học phần / phiên thi của sinh viên
        return get_rooms_for_student(current_user["user_id"], skip=skip, limit=limit, room_type=room_type)

@router.get("/public/{room_code}", response_model=PublicRoomResponse)
async def get_public_room_info(room_code: str):
    """Lấy thông tin công khai của phòng thi trước khi đăng nhập hoặc nhập passcode"""
    room = get_room_by_code(room_code.strip().upper())
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if _is_room_expired(room):
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Phòng thi đã kết thúc hoặc bị hủy; mã phòng và mật khẩu đã hết hiệu lực."
        )
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "session_type": room.get("session_type"),
        "start_time": room["start_time"],
        "end_time": room["end_time"],
        "duration_minutes": room["duration_minutes"],
        "requires_passcode": bool(room.get("passcode")),
        "instructor_name": room.get("instructor_name"),
        "class_code": room.get("class_code"),
        "class_name": room.get("class_name"),
        "course_name": room.get("course_name"),
        "status": room.get("status") or "chua_mo",
        "is_active": bool(room.get("is_active", True)),
    }

@router.get("/{room_id}", response_model=RoomResponse)
async def get_room_details(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Xem cấu hình chi tiết của phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return room

@router.put("/{room_id}", response_model=RoomResponse)
async def update_room_details(
    room_id: int,
    room_data: RoomUpdateRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Chỉnh sửa cấu hình phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phòng này")
    
    dumped = room_data.model_dump(exclude_unset=True)
    target_room_type = str(dumped.get("room_type") or room.get("room_type") or "").lower()
    session_type = dumped.get("session_type", room.get("session_type"))
    if target_room_type in ("lab", "practice") and session_type not in (None, "LAB"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng thực hành phải dùng session_type LAB",
        )
    if target_room_type == "exam" and session_type not in (None, "MIDTERM", "FINAL"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng thi phải dùng session_type MIDTERM hoặc FINAL",
        )
    if target_room_type == "classroom" and session_type is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phòng học không nhận session_type",
        )

    # Quy chế khảo thí: Các kỳ thi không cho phép gia hạn thêm thời gian làm bài
    if "duration_minutes" in dumped and room.get("room_type") == "exam":
        new_dur = dumped["duration_minutes"]
        old_dur = room.get("duration_minutes") or 0
        if new_dur > old_dur:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quy chế khảo thí: Các kỳ thi không cho phép gia hạn thêm thời gian làm bài."
            )

    updated = update_room(room_id, **dumped)
    return updated

@router.patch("/{room_id}/template")
async def assign_room_template(
    room_id: int,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Gán hoặc đổi đề thi cho phòng thi / phòng chờ theo ID"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phòng này")

    template_id = payload.get("template_id") or payload.get("templateId")
    updated = update_room(room_id, template_id=template_id)
    return {
        "success": True,
        "message": "Đã cập nhật bộ đề thành công cho phòng",
        "room": updated
    }

@router.patch("/by-code/{room_code}/template")
async def assign_room_template_by_code(
    room_code: str,
    payload: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Gán hoặc đổi đề thi cho phòng thi / phòng chờ theo room_code"""
    room = get_room_by_code(room_code)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền chỉnh sửa phòng này")

    template_id = payload.get("template_id") or payload.get("templateId")
    updated = update_room(room["room_id"], template_id=template_id)
    return {
        "success": True,
        "message": "Đã cập nhật bộ đề thành công cho phòng",
        "room": updated
    }


@router.delete("/by-code/{room_code}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_room_by_code(
    room_code: str,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa phòng thi theo mã phòng (room_code)"""
    room = get_room_by_code(room_code)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa phòng này")
    
    if room.get("livekit_room_name"):
        livekit_service.delete_room(room["livekit_room_name"])
    delete_room(room["room_id"])
    return None

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_room(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa phòng thi"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xóa phòng này")
    
    if room.get("livekit_room_name"):
        livekit_service.delete_room(room["livekit_room_name"])
    delete_room(room_id)
    return None

@router.get("/{room_id}/dashboard", response_model=RoomDashboardResponse)
async def get_room_dashboard(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Dữ liệu Panoptic Grid View tổng hợp giám sát phòng thi thời gian thực (Zero N+1 query)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
        
    dashboard_data = get_room_dashboard_data(room_id)
    students_list = [
        RoomDashboardStudentItem(
            student_id=st["student_id"],
            student_name=st.get("student_name") or f"Student #{st['student_id']}",
            status=st.get("status", "offline"),
            violation_count=st.get("violation_count", 0),
            duration_minutes=st.get("duration_minutes", 0),
            last_snapshot_url=st.get("last_snapshot_url")
        )
        for st in dashboard_data
    ]
        
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "session_type": room.get("session_type"),
        "active_students_count": len([st for st in students_list if st.status == "active"]),
        "students": students_list
    }

@router.get("/{room_id}/scoreboard")
async def get_scoreboard(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Bảng điểm thời gian thực tổng hợp kết quả của sinh viên trong phòng"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return get_room_scoreboard(room_id)

@router.get("/{room_id}/exam-content")
async def get_room_exam_content(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách câu hỏi và test case công khai cho phòng thi (/student/exam-room)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    include_hidden = current_user.get("role") in ("instructor", "admin")
    return get_exam_content_for_room(room_id, include_hidden_tests=include_hidden)


@router.get("/{room_id}/config")
async def get_room_config(
    room_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy cấu hình runtime môi trường phòng (danh sách ngôn ngữ, giới hạn sandbox)"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    return {
        "room_id": room["room_id"],
        "room_code": room["room_code"],
        "room_name": room["room_name"],
        "room_type": room["room_type"],
        "session_type": room.get("session_type"),
        "duration_minutes": room["duration_minutes"],
        "max_attempts": room["max_attempts"],
        "allowed_languages": ["python", "cpp", "java"],
        "ai_proctoring_enabled": room["room_type"] == "exam",
        "sandbox_limits": {
            "time_limit_seconds": settings.SANDBOX_TIME_LIMIT_S,
            "memory_limit": settings.SANDBOX_MEM_LIMIT
        }
    }


@router.get("/{room_id}/enrollments")
async def list_room_enrollments(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Lấy danh sách sinh viên ghi danh trong phòng"""
    return get_enrollments_by_room(room_id)

@router.post("/{room_id}/enrollments")
async def add_room_enrollments(
    room_id: int,
    data: RoomEnrollmentRequest,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Ghi danh danh sách sinh viên vào phòng"""
    added = 0
    for sid in data.student_ids:
        try:
            enroll_student(room_id, sid, enrolled_by=current_user["user_id"])
            added += 1
        except Exception:
            pass
    return {"message": f"Đã ghi danh thành công {added} sinh viên"}

@router.delete("/{room_id}/enrollments/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_student_from_room(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Xóa sinh viên khỏi phòng"""
    remove_enrollment(room_id, student_id)
    return None
