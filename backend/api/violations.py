from fastapi import APIRouter, HTTPException, Depends, status, Query, Body
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import json

from schemas.violation import (
    ViolationCreateRequest, AIViolationHookRequest, SnapshotAnalyzeRequest,
    ViolationResponse, ViolationStatsItem, ViolationReviewRequest
)
from core.permissions import get_current_user, instructor_or_admin_required, instructor_required, verify_room_access
from database.violation_db import (
    create_violation, get_violations_by_session, get_violations_by_student,
    get_violations_by_room, get_violations_by_class, update_violation_review,
    get_student_violation_stats, get_session_risk_score, get_ai_precision_metrics
)
from database.session_db import get_session_by_id, get_sessions_by_student
from database.room_db import get_room_by_id
from database.classes_db import get_class_by_id
from database.system_log_db import create_system_log
from websocket.connection_manager import manager

router = APIRouter()

@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def log_violation(
    violation_data: ViolationCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Ghi nhận sự kiện vi phạm (từ browser hoặc AI Worker)"""
    session = get_session_by_id(violation_data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")

    # Chống IDOR: sinh viên chỉ được ghi nhận sự kiện cho chính phiên thi của mình
    if current_user.get("role") == "student" and session["student_id"] != current_user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền ghi nhận vi phạm cho phiên thi của sinh viên khác"
        )
        
    # Bỏ qua vi phạm nếu phòng là chế độ thực hành thông thường (classroom)
    room = get_room_by_id(session["room_id"])
    if room and room.get("room_type") == "classroom":
        return {
            "violation_id": 0,
            "session_id": violation_data.session_id,
            "student_id": session["student_id"],
            "violation_type": violation_data.violation_type,
            "severity": "low",
            "description": "Bỏ qua ghi nhận vi phạm trong chế độ lớp học (classroom)",
            "snapshot_url": None,
            "detected_at": session["started_at"],
            "is_reviewed": True,
            "review_status": "rejected",
            "reviewed_by": None,
            "reviewed_at": None
        }

    created = create_violation(
        session_id=violation_data.session_id,
        student_id=session["student_id"],
        violation_type=violation_data.violation_type,
        severity=violation_data.severity,
        description=violation_data.description,
        snapshot_url=violation_data.snapshot_url
    )
    try:
        await manager.broadcast_json(session["room_id"], {
            "type": "violation_alert",
            "room_id": session["room_id"],
            "student_id": session["student_id"],
            "violation": {
                **created,
                "detected_at": created["detected_at"].isoformat() if created.get("detected_at") else None,
            },
        })
    except Exception:
        pass
    return created

@router.post("/ai-event", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
async def ingest_ai_violation_event(
    ai_event: AIViolationHookRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Đầu chờ chuẩn cho mô-đun AI Proctoring (YOLOv8 / Pose) đẩy cảnh báo vi phạm vào hệ thống"""
    if current_user.get("role") not in ("instructor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ giảng viên, quản trị viên hoặc dịch vụ AI mới được gửi sự kiện AI"
        )
    session_id = ai_event.session_id
    if not session_id:
        active_sessions = get_sessions_by_student(ai_event.student_id, room_id=ai_event.room_id, active_only=True)
        if not active_sessions:
            active_sessions = get_sessions_by_student(ai_event.student_id, room_id=ai_event.room_id, active_only=False)
        if not active_sessions:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên làm bài của sinh viên trong phòng này")
        session_id = active_sessions[0]["session_id"]

    desc = ai_event.description or f"AI Proctoring phát hiện: {ai_event.violation_type}"
    if ai_event.confidence is not None:
        desc = f"{desc} (Độ tin cậy: {round(ai_event.confidence * 100)}%)"

    created = create_violation(
        session_id=session_id,
        student_id=ai_event.student_id,
        violation_type=ai_event.violation_type,
        severity=ai_event.severity,
        description=desc,
        snapshot_url=ai_event.snapshot_url,
    )
    try:
        await manager.broadcast_json(ai_event.room_id, {
            "type": "violation_alert",
            "source": "ai_proctoring",
            "room_id": ai_event.room_id,
            "student_id": ai_event.student_id,
            "confidence": ai_event.confidence,
            "violation": {
                **created,
                "detected_at": created["detected_at"].isoformat() if created.get("detected_at") else None,
            },
        })
    except Exception:
        pass
    return created

from pydantic import BaseModel


class VerifyFaceRequest(BaseModel):
    snapshot_data: str


@router.post("/verify-face")
async def verify_student_face(
    payload: VerifyFaceRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Xác thực khuôn mặt thật qua AI Proctoring worker trước khi cho phép vào phòng thi."""
    if not payload.snapshot_data or len(payload.snapshot_data) < 50:
        return {"verified": False, "face_count": 0, "message": "Không nhận được khung hình từ camera."}
    try:
        from celery_app import celery_app
        task = celery_app.send_task(
            "tasks.ai_proctoring_tasks.verify_face_frame",
            args=[payload.snapshot_data],
            queue="proctoring",
        )
        res = task.get(timeout=8)
    except Exception as e:
        return {
            "verified": False,
            "face_count": 0,
            "message": f"Không thể kết nối dịch vụ AI xác thực khuôn mặt ({e}). Vui lòng thử lại.",
        }

    if not res or not res.get("success"):
        return {
            "verified": False,
            "face_count": 0,
            "message": (res or {}).get("error") or "Không đọc được hình ảnh từ camera.",
        }

    if res.get("is_camera_off") or res.get("is_camera_covered"):
        return {
            "verified": False,
            "face_count": 0,
            "person_count": 0,
            "person_boxes": [],
            "message": "Camera đang bị che hoặc quá tối. Vui lòng mở nắp và đảm bảo đủ ánh sáng.",
        }

    face_count = int(res.get("face_count", 0))
    person_boxes = res.get("person_boxes") or []
    person_count = int(res.get("person_count", len(person_boxes)))

    if person_count > 1:
        return {
            "verified": False,
            "face_count": face_count,
            "person_count": person_count,
            "person_boxes": person_boxes,
            "message": f"Phát hiện {person_count} người trong khung hình (YOLOv8). Vui lòng chỉ có 1 thí sinh trước camera.",
        }
    if face_count > 1:
        return {
            "verified": False,
            "face_count": face_count,
            "person_count": person_count,
            "person_boxes": person_boxes,
            "message": f"Phát hiện {face_count} khuôn mặt. Vui lòng chỉ có 1 thí sinh trước camera.",
        }
    if face_count == 0:
        msg = (
            "Đã nhận diện người (YOLOv8), nhưng chưa thấy rõ khuôn mặt. Vui lòng nhìn thẳng vào camera."
            if person_count == 1
            else "Không phát hiện người hoặc khuôn mặt trong khung hình. Vui lòng ngồi vào giữa camera."
        )
        return {
            "verified": False,
            "face_count": 0,
            "person_count": person_count,
            "person_boxes": person_boxes,
            "message": msg,
        }

    return {
        "verified": True,
        "face_count": 1,
        "person_count": max(1, person_count),
        "person_boxes": person_boxes,
        "message": "Khuôn mặt & thí sinh hợp lệ - Đã xác thực qua AI YOLO.",
    }


@router.post("/analyze", status_code=status.HTTP_202_ACCEPTED)
async def analyze_webcam_snapshot(
    data: SnapshotAnalyzeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Tiếp nhận snapshot webcam và đẩy vào hàng đợi Celery AI Proctoring"""
    session = get_session_by_id(data.session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")

    # Chống IDOR: sinh viên chỉ được gửi snapshot cho chính phiên thi của mình
    if current_user.get("role") == "student" and session["student_id"] != current_user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không có quyền gửi dữ liệu giám sát cho phiên thi của sinh viên khác"
        )
        
    room = get_room_by_id(session["room_id"])
    if room and room.get("room_type") == "classroom":
        return {"status": "skipped", "message": "Classroom mode: AI proctoring disabled"}

    # Đọc cấu hình proctoring_config của phòng để áp dụng đúng các cờ AI & Ràng buộc
    proctoring_config = room.get("proctoring_config") if room else None
    if isinstance(proctoring_config, str):
        try:
            proctoring_config = json.loads(proctoring_config)
        except Exception:
            proctoring_config = {}
    elif not isinstance(proctoring_config, dict):
        proctoring_config = {}

    try:
        from celery_app import celery_app
        celery_app.send_task(
            "tasks.ai_proctoring_tasks.analyze_frame",
            args=[
                session["room_id"], session["student_id"], data.session_id,
                data.snapshot_data, data.is_typing, data.client_event,
                proctoring_config
            ],
            queue="proctoring"
        )
        return {"status": "queued", "message": "Ảnh đã được đưa vào hàng đợi phân tích"}

    except Exception as e:
        # B10: Fail-closed visibility — không âm thầm bỏ qua khi mất hàng đợi Celery/Redis
        try:
            create_system_log(
                log_level="error",
                module="AIProctoring",
                message=f"Không thể đẩy snapshot phiên {data.session_id} vào Celery queue 'proctoring': {e}"
            )
        except Exception:
            pass
        try:
            await manager.broadcast_json(session["room_id"], {
                "type": "proctoring_degraded",
                "room_id": session["room_id"],
                "student_id": session["student_id"],
                "session_id": data.session_id,
                "message": "Mất kết nối hàng đợi phân tích AI Proctoring"
            })
        except Exception:
            pass
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "degraded",
                "proctoring_active": False,
                "message": "Hàng đợi phân tích AI Proctoring tạm thời không khả dụng"
            }
        )

@router.get("/session/{session_id}", response_model=List[ViolationResponse])
async def get_session_violations(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy danh sách các vi phạm trong một phiên thi (Chống IDOR)"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user["role"] == "student" and session["student_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của phiên thi khác")
    return get_violations_by_session(session_id)

@router.get("/my", response_model=List[ViolationResponse])
async def get_my_violations(
    room_id: Optional[int] = None,
    class_id: Optional[int] = Query(None, description="Lọc danh sách vi phạm theo lớp học phần"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy toàn bộ danh sách vi phạm của chính sinh viên đang đăng nhập"""
    return get_violations_by_student(current_user["user_id"], room_id=room_id, class_id=class_id)

@router.get("/student/{student_id}", response_model=List[ViolationResponse])
async def get_student_violations(
    student_id: int,
    room_id: Optional[int] = None,
    class_id: Optional[int] = Query(None, description="Lọc danh sách vi phạm theo lớp học phần"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy các vi phạm của một sinh viên, có thể lọc theo room_id hoặc class_id (Chống IDOR)"""
    if current_user["role"] == "student" and student_id != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của sinh viên khác")
    return get_violations_by_student(student_id, room_id=room_id, class_id=class_id)

@router.get("/class/{class_id}", response_model=List[ViolationResponse])
async def get_class_violations(
    class_id: int,
    review_status: Optional[str] = Query(None, pattern="^(pending|confirmed|rejected)$"),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên / Admin lấy toàn bộ danh sách vi phạm AI thuộc một lớp học phần, có thể lọc theo review_status"""
    cls = get_class_by_id(class_id)
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lớp học phần")
    if current_user["role"] != "admin" and cls.get("instructor_id") != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của lớp học phần này")
    return get_violations_by_class(class_id, review_status=review_status)

@router.get("/room/{room_id}", response_model=List[ViolationResponse])
async def get_room_violations(
    room_id: int,
    review_status: Optional[str] = Query(None, pattern="^(pending|confirmed|rejected)$"),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giám thị / Giảng viên lấy toàn bộ danh sách vi phạm trong phòng thi, có thể lọc theo review_status"""
    room = get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phòng")
    if current_user["role"] != "admin" and room["instructor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem vi phạm của phòng này")
    return get_violations_by_room(room_id, review_status=review_status)

@router.patch("/{violation_id}/review", response_model=ViolationResponse)
async def review_violation(
    violation_id: int,
    review_data: Optional[ViolationReviewRequest] = Body(None),
    review_status: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Giảng viên duyệt / phúc khảo sự kiện vi phạm (confirmed hoặc rejected)"""
    from core.database import get_db_cursor
    with get_db_cursor(commit=False) as cursor:
        cursor.execute("SELECT room_id FROM Violations WHERE violation_id = ?", (violation_id,))
        v_row = cursor.fetchone()
    if not v_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi vi phạm")
    if v_row[0] is not None:
        verify_room_access(int(v_row[0]), current_user)

    status_val = (review_data.review_status if review_data else None) or review_status or "confirmed"
    if status_val not in ["confirmed", "rejected"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Trạng thái duyệt phải là confirmed hoặc rejected")
    try:
        updated = update_violation_review(violation_id, reviewed_by=current_user["user_id"], review_status=status_val)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bản ghi vi phạm")

    if updated.get("room_id"):
        try:
            await manager.broadcast_json(
                int(updated["room_id"]),
                {
                    "type": "violation_report_created",
                    "violation_id": violation_id,
                    "student_id": updated.get("student_id"),
                    "review_status": status_val,
                    "violation_type": updated.get("violation_type"),
                    "description": updated.get("description"),
                },
            )
        except Exception:
            pass
    
    try:
        from database.system_log_db import create_system_log
        action_name = "Giải oan" if status_val == "rejected" else "Xác nhận phạt"
        create_system_log(
            log_level="info",
            module="Phúc khảo",
            message=f"{action_name} cho biên bản vi phạm #{violation_id}",
            user_id=current_user.get("user_id"),
            extra_data={"violation_id": violation_id, "review_status": status_val}
        )
    except Exception:
        pass

    return updated

@router.get("/room/{room_id}/stats", response_model=List[ViolationStatsItem])
async def get_room_violation_statistics(
    room_id: int,
    student_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Thống kê chi tiết các vi phạm theo loại và mức độ cảnh báo qua Stored Procedure"""
    verify_room_access(room_id, current_user)
    return get_student_violation_stats(room_id, student_id)


@router.get("/session/{session_id}/risk")
async def get_session_risk(
    session_id: int,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lấy điểm rủi ro có trọng số (Risk Engine) của phiên thi"""
    session = get_session_by_id(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phiên thi")
    if current_user.get("role") == "student" and session["student_id"] != current_user.get("user_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Không có quyền xem điểm rủi ro của sinh viên khác")
    return get_session_risk_score(session_id)


@router.get("/room/{room_id}/ai-metrics")
async def get_room_ai_precision_metrics(
    room_id: int,
    current_user: Dict[str, Any] = Depends(instructor_or_admin_required)
):
    """Thống kê vòng phản hồi (Precision) từ kết quả giám thị xác nhận/bác bỏ cảnh báo AI"""
    verify_room_access(room_id, current_user)
    return get_ai_precision_metrics(room_id)
