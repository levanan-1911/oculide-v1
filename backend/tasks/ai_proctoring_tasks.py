import os
import sys
import json
import time
import base64
from datetime import datetime
from typing import Dict, Any, Optional
import redis

from celery_app import celery_app
from core.config import settings
from database.snapshot_db import create_snapshot
from database.violation_db import create_violation
from database.system_log_db import create_system_log

# Bảo đảm đường dẫn import module ai_workers từ thư mục gốc
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Thêm thư mục backend nếu cần
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ai_workers.detector import proctor_detector

def _get_redis_client():
    """Tạo kết nối đồng bộ đến Redis phục vụ việc publish tin nhắn WebSocket và kiểm soát tần suất"""
    if settings.REDIS_PASSWORD:
        return redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            db=settings.REDIS_DB,
            socket_timeout=2
        )
    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        socket_timeout=2
    )

def _save_snapshot_image(session_id: int, student_id: int, raw_data_b64: str) -> Optional[str]:
    """Lưu trữ file ảnh snapshot webcam lên đĩa cứng và trả về đường dẫn URL phục vụ hiển thị"""
    try:
        # Đường dẫn thư mục lưu trữ ảnh tĩnh
        upload_dir = os.path.join(backend_dir, "uploads", "snapshots")
        os.makedirs(upload_dir, exist_ok=True)

        if "," in raw_data_b64:
            raw_data_b64 = raw_data_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_data_b64)
        timestamp_ms = int(time.time() * 1000)
        filename = f"snap_s{session_id}_u{student_id}_{timestamp_ms}.jpg"
        file_path = os.path.join(upload_dir, filename)

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        return f"/uploads/snapshots/{filename}"
    except Exception as e:
        print(f"Lỗi khi lưu trữ file ảnh snapshot: {e}")
        return None

_LOCAL_SESSION_STATE: Dict[int, Dict[str, Any]] = {}

def _load_session_state(r, session_id: int) -> Dict[str, Any]:
    """Tải trạng thái giám sát chuỗi thời gian của phiên thi từ Redis hoặc bộ nhớ đệm cục bộ"""
    if r:
        try:
            raw = r.get(f"proctor:state:{session_id}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    return _LOCAL_SESSION_STATE.get(session_id, {})

def _save_session_state(r, session_id: int, state: Dict[str, Any]):
    """Lưu trữ trạng thái giám sát chuỗi thời gian (TTL 300 giây)"""
    if r:
        try:
            r.set(f"proctor:state:{session_id}", json.dumps(state), ex=300)
        except Exception:
            pass
    _LOCAL_SESSION_STATE[session_id] = state

@celery_app.task(name="tasks.ai_proctoring_tasks.analyze_frame", bind=True, max_retries=1)
def analyze_frame(
    self,
    room_id: int,
    student_id: int,
    session_id: int,
    snapshot_data: str
) -> Dict[str, Any]:
    """
    Tác vụ Celery xử lý và phân tích hình ảnh giám sát webcam:
    1. Kiểm soát tần suất nhận khung hình (Backpressure Rate Limiting: tối đa 1 frame/2s mỗi session).
    2. Chạy pipeline thị giác máy tính: Face Detection, Head Pose, Iris Gaze, YOLOv8 Object Detection.
    3. Bộ đếm Thời gian Duy trì (Dwell Time >= 7s): Phân biệt lắc đầu/đảo mắt mỏi với gian lận xem tài liệu.
    4. Lưu trữ ảnh chụp và thông số thị giác vào bảng Snapshots.
    5. Ghi nhận vi phạm vào bảng Violations nếu phát hiện bất thường xác thực.
    6. Phát cảnh báo và cập nhật màn hình giám sát Panoptic Grid thời gian thực qua Redis Pub/Sub.
    """
    r = None
    try:
        r = _get_redis_client()
    except Exception:
        pass

    # 1. Cơ chế Kiểm soát Tần suất (Backpressure Rate Limiting: tối đa 1 frame/2s mỗi session)
    if r:
        try:
            ratelimit_key = f"ratelimit:ai_frame:{session_id}"
            # Chỉ cho phép phân tích nếu khóa chưa tồn tại (hạn 2 giây)
            if not r.set(ratelimit_key, "1", nx=True, ex=2):
                return {"status": "dropped", "reason": "rate_limited_backpressure"}
        except Exception:
            pass

    # 2. Thực thi phân tích thị giác máy tính qua AI Proctor Detector
    result = proctor_detector.process_frame(snapshot_data)
    if not result.get("success"):
        return {"status": "failed", "error": result.get("error")}

    # 3. Lưu trữ ảnh lên hệ thống tệp tin
    snapshot_url = _save_snapshot_image(session_id, student_id, snapshot_data)
    if not snapshot_url:
        snapshot_url = f"/uploads/snapshots/placeholder_{session_id}_{student_id}.jpg"

    # 4. Lưu bản ghi vào bảng Snapshots
    try:
        create_snapshot(
            session_id=session_id,
            student_id=student_id,
            image_url=snapshot_url,
            face_detected=result["face_detected"],
            face_count=result["face_count"],
            looking_at_screen=result["looking_at_screen"],
            confidence_score=result["confidence_score"]
        )
    except Exception as db_err:
        create_system_log(
            log_level="error",
            module="AIProctoring",
            message=f"Lỗi khi lưu snapshot phiên {session_id}: {str(db_err)}"
        )

    # 5. Phân tích trạng thái chuỗi thời gian (Temporal Dwell Time & Pattern Analysis)
    now = time.time()
    session_state = _load_session_state(r, session_id)

    confirmed_violations = []
    gentle_reminder = None
    attention_status = "normal"  # "normal" (xanh), "warning" (vàng), "violation" (đỏ)

    face_count = result.get("face_count", 0)
    looking_at_screen = result.get("looking_at_screen", False)
    lighting = result.get("lighting", {})
    liveness = result.get("liveness", {})

    # A. Thiết bị cấm (YOLO) - Điện thoại xử lý ngay lập tức
    for obj in result.get("detected_objects", []):
        c_name = obj.get("class_name", "").lower()
        if "phone" in c_name:
            confirmed_violations.append({
                "type": "phone_detected",
                "severity": "critical",
                "description": f"Phát hiện điện thoại di động trong khung hình (Độ tin cậy: {obj['confidence']*100:.1f}%)"
            })
            attention_status = "violation"
        elif "book" in c_name or "laptop" in c_name:
            obj_key = f"obj_{c_name}_start"
            if not session_state.get(obj_key):
                session_state[obj_key] = now
            elif now - session_state[obj_key] >= 3.0:
                confirmed_violations.append({
                    "type": "suspicious_object",
                    "severity": "high" if "laptop" in c_name else "medium",
                    "description": f"Phát hiện vật thể khả nghi ({c_name}) duy trì trong khung hình camera"
                })
                attention_status = "violation"
                session_state[obj_key] = None

    # B. Quay đầu / Liếc mắt rời màn hình (Ngưỡng Dwell Time >= 7s)
    if face_count == 1:
        if not looking_at_screen:
            start_off = session_state.get("off_screen_start")
            if not start_off:
                session_state["off_screen_start"] = now
                session_state["off_screen_violation_triggered"] = False
                dwell = 0.0
            else:
                dwell = now - start_off

            if 3.0 <= dwell < 7.0:
                # Cảnh báo mềm (3s - 6s): Thí sinh có thể đang mỏi cổ hoặc bắt đầu nhìn tài liệu
                attention_status = "warning"
                gentle_reminder = {
                    "type": "proctor_reminder",
                    "room_id": room_id,
                    "student_id": student_id,
                    "session_id": session_id,
                    "message": "Nhắc nhở: Bạn đang quay mặt hoặc liếc mắt rời màn hình. Vui lòng tập trung vào bài thi.",
                    "dwell_seconds": round(dwell, 1)
                }
            elif dwell >= 7.0 and not session_state.get("off_screen_violation_triggered", False):
                # Đạt ngưỡng VI PHẠM THỰC SỰ (>= 7s)
                attention_status = "violation"
                gaze_dir = result.get("gaze", {}).get("gaze_direction", "rời màn hình")
                head_yaw = result.get("head_pose", {}).get("yaw", 0.0)

                desc = f"Thí sinh quay đầu hoặc liếc mắt rời màn hình liên tục trong {round(dwell, 1)}s (Góc lệch: Yaw {head_yaw}°, Hướng mắt: {gaze_dir})"
                confirmed_violations.append({
                    "type": "suspicious_object",
                    "severity": "high",
                    "description": desc
                })
                session_state["off_screen_violation_triggered"] = True
        else:
            # Thí sinh đã quay trở lại nhìn màn hình
            start_off = session_state.get("off_screen_start")
            if start_off:
                dwell = now - start_off
                # Nếu là hành vi liếc ngắn (2s - 6.9s) -> Ghi nhận vào chuỗi tần suất
                if 2.0 <= dwell < 7.0 and not session_state.get("off_screen_violation_triggered", False):
                    glances = [t for t in session_state.get("recent_glances", []) if now - t <= 60.0]
                    glances.append(now)
                    session_state["recent_glances"] = glances

                    # Nếu trong 60 giây liếc lặp lại >= 4 lần
                    if len(glances) >= 4:
                        confirmed_violations.append({
                            "type": "suspicious_object",
                            "severity": "medium",
                            "description": f"Thí sinh có hành vi liếc nhìn ngắt quãng lặp đi lặp lại {len(glances)} lần trong 60 giây"
                        })
                        attention_status = "violation"
                        session_state["recent_glances"] = []

            session_state["off_screen_start"] = None
            session_state["off_screen_violation_triggered"] = False

    # C. Vắng mặt khỏi camera (Ngưỡng Dwell Time >= 5s)
    if face_count == 0:
        start_no_face = session_state.get("no_face_start")
        if not start_no_face:
            session_state["no_face_start"] = now
            session_state["no_face_violation_triggered"] = False
            dwell_nf = 0.0
        else:
            dwell_nf = now - start_no_face

        if dwell_nf >= 5.0 and not session_state.get("no_face_violation_triggered", False):
            confirmed_violations.append({
                "type": "no_face_detected",
                "severity": "medium",
                "description": f"Không phát hiện khuôn mặt thí sinh trước camera trong {round(dwell_nf, 1)}s"
            })
            attention_status = "violation"
            session_state["no_face_violation_triggered"] = True
    else:
        session_state["no_face_start"] = None
        session_state["no_face_violation_triggered"] = False

    # D. Nhiều khuôn mặt trước camera (Ngưỡng >= 3s)
    if face_count > 1:
        start_multi = session_state.get("multi_face_start")
        if not start_multi:
            session_state["multi_face_start"] = now
            session_state["multi_face_violation_triggered"] = False
            dwell_mf = 0.0
        else:
            dwell_mf = now - start_multi

        if dwell_mf >= 3.0 and not session_state.get("multi_face_violation_triggered", False):
            confirmed_violations.append({
                "type": "multiple_faces",
                "severity": "high",
                "description": f"Phát hiện {face_count} khuôn mặt xuất hiện trước camera trong {round(dwell_mf, 1)}s"
            })
            attention_status = "violation"
            session_state["multi_face_violation_triggered"] = True
    else:
        session_state["multi_face_start"] = None
        session_state["multi_face_violation_triggered"] = False

    # E. Camera bị che khuất hoặc quá tối (Ngưỡng >= 6s)
    if lighting.get("is_too_dark", False):
        start_dark = session_state.get("dark_start")
        if not start_dark:
            session_state["dark_start"] = now
            session_state["dark_violation_triggered"] = False
        elif now - start_dark >= 6.0 and not session_state.get("dark_violation_triggered", False):
            confirmed_violations.append({
                "type": "camera_blocked",
                "severity": "medium",
                "description": f"Camera bị che khuất hoặc ánh sáng phòng thi quá tối trong {round(now - start_dark, 1)}s"
            })
            attention_status = "violation"
            session_state["dark_violation_triggered"] = True
    else:
        session_state["dark_start"] = None
        session_state["dark_violation_triggered"] = False

    # F. Liveness / Chống Webcam ảo & Ảnh tĩnh (Phân tích phương sai EAR)
    if face_count == 1:
        current_ear = liveness.get("ear")
        if current_ear is not None:
            ear_history = session_state.get("ear_history", [])
            ear_history.append(float(current_ear))
            if len(ear_history) > 10:
                ear_history.pop(0)
            session_state["ear_history"] = ear_history

            # Khi đã thu thập đủ 8 mẫu (~16s)
            if len(ear_history) >= 8:
                ear_mean = sum(ear_history) / len(ear_history)
                ear_variance = sum((x - ear_mean) ** 2 for x in ear_history) / len(ear_history)
                # Nếu mắt mở nhưng hoàn toàn không chớp mắt (phương sai < 0.0001)
                if ear_variance < 0.0001 and not session_state.get("liveness_violation_triggered", False):
                    confirmed_violations.append({
                        "type": "suspicious_object",
                        "severity": "high",
                        "description": "Phát hiện hình ảnh bất động hoặc video lặp không có phản xạ chớp mắt tự nhiên (Nghi vấn webcam ảo)"
                    })
                    attention_status = "violation"
                    session_state["liveness_violation_triggered"] = True

    # Lưu lại trạng thái phiên thi
    _save_session_state(r, session_id, session_state)

    # 6. Ghi nhận vi phạm đã xác nhận vào CSDL và phát cảnh báo
    for v in confirmed_violations:
        try:
            create_violation(
                session_id=session_id,
                student_id=student_id,
                violation_type=v["type"],
                severity=v.get("severity", "warning"),
                description=v.get("description"),
                snapshot_url=snapshot_url
            )

            # Bắn sự kiện vi phạm đến Dashboard Giám thị qua kênh Redis ws_updates
            if r:
                alert_event = {
                    "type": "violation_alert",
                    "room_id": room_id,
                    "student_id": student_id,
                    "session_id": session_id,
                    "violation_type": v["type"],
                    "severity": v.get("severity", "warning"),
                    "description": v.get("description"),
                    "snapshot_url": snapshot_url,
                    "detected_at": datetime.now().isoformat()
                }
                r.publish("ws_updates", json.dumps(alert_event))
        except Exception as v_err:
            create_system_log(
                log_level="error",
                module="AIProctoring",
                message=f"Lỗi khi ghi nhận vi phạm '{v.get('type')}' cho sinh viên {student_id}: {str(v_err)}"
            )

    # 7. Phát bản tin nhắc nhở mềm nếu có
    if gentle_reminder and r:
        try:
            r.publish("ws_updates", json.dumps(gentle_reminder))
        except Exception:
            pass

    # 8. Phát bản tin cập nhật trạng thái khung hình webcam lên Panoptic Grid của Giám thị
    if r:
        try:
            grid_update = {
                "type": "snapshot_update",
                "room_id": room_id,
                "student_id": student_id,
                "session_id": session_id,
                "face_count": face_count,
                "looking_at_screen": looking_at_screen,
                "attention_status": attention_status,
                "head_pose": result.get("head_pose"),
                "gaze": result.get("gaze"),
                "liveness": result.get("liveness"),
                "confidence_score": result["confidence_score"],
                "snapshot_url": snapshot_url,
                "timestamp": datetime.now().isoformat()
            }
            r.publish("ws_updates", json.dumps(grid_update))
            r.close()
        except Exception:
            pass

    return {
        "status": "completed",
        "face_count": face_count,
        "looking_at_screen": looking_at_screen,
        "attention_status": attention_status,
        "violations_count": len(confirmed_violations),
        "snapshot_url": snapshot_url
    }
