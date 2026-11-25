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
from database.room_db import get_current_vn_time

# Bảo đảm đường dẫn import module ai_workers từ thư mục backend ưu tiên
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.append(project_root)

from ai_workers.detector import proctor_detector


def _dhash_hamming_distance(hash_a: Optional[str], hash_b: Optional[str]) -> int:
    """Khoảng cách Hamming giữa 2 mã dHash 64-bit."""
    if not hash_a or not hash_b:
        return 64
    try:
        return bin(int(hash_a, 16) ^ int(hash_b, 16)).count("1")
    except ValueError:
        return 64

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
    snapshot_data: str,
    is_typing: bool = False,
    client_event: Optional[str] = None
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
    # Không drop các sự kiện quan trọng từ client (tab_switch, fullscreen_exit, camera_off, extended_screen)
    is_priority_event = client_event in ("tab_switch", "fullscreen_exit", "camera_off", "camera_disabled", "extended_screen")
    if r and not is_priority_event:
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

    # 3. Phân tích trạng thái chuỗi thời gian (Temporal Dwell Time & Pattern Analysis)
    now = time.time()
    session_state = _load_session_state(r, session_id)
    cooldowns = session_state.get("violation_cooldowns", {})

    def _add_violation_with_cooldown(v_type: str, severity: str, description: str, cooldown_sec: float = 30.0) -> bool:
        """Ghi nhận vi phạm có thời gian chờ (cooldown) để 1 sự cố không bị đếm trùng nhiều lần."""
        last_ts = cooldowns.get(v_type)
        if last_ts is not None and (now - float(last_ts)) < cooldown_sec:
            return False
        cooldowns[v_type] = now
        session_state["violation_cooldowns"] = cooldowns
        confirmed_violations.append({
            "type": v_type,
            "severity": severity,
            "description": description
        })
        return True

    confirmed_violations = []
    gentle_reminder = None
    attention_status = "normal"  # "normal" (xanh), "warning" (vàng), "violation" (đỏ)

    face_count = result.get("face_count", 0)
    looking_at_screen = result.get("looking_at_screen", False)
    lighting = result.get("lighting", {})
    liveness = result.get("liveness", {})

    # ─── 0. SỰ KIỆN TỪ PHÍA CLIENT (Chuyển tab, thoát toàn màn hình, tắt camera) ───────────
    if client_event == "tab_switch":
        if _add_violation_with_cooldown(
            "tab_switch",
            "high",
            "Thí sinh chuyển sang tab hoặc cửa sổ ứng dụng khác ngoài trang thi",
            cooldown_sec=10.0,
        ):
            attention_status = "violation"
    elif client_event == "fullscreen_exit":
        if _add_violation_with_cooldown(
            "fullscreen_exit",
            "medium",
            "Thí sinh thoát chế độ làm bài toàn màn hình",
            cooldown_sec=10.0,
        ):
            attention_status = "violation"
    elif client_event in ("camera_off", "camera_disabled"):
        if _add_violation_with_cooldown(
            "camera_blocked",
            "high",
            "Thí sinh đã tắt camera trong lúc làm bài thi",
            cooldown_sec=30.0,
        ):
            attention_status = "violation"
        # Đánh dấu đã kích hoạt để mục E không đếm trùng thêm 1 lần nữa
        session_state["dark_violation_triggered"] = True
    elif client_event == "extended_screen":
        if _add_violation_with_cooldown(
            "suspicious_object",
            "high",
            "Phát hiện thí sinh đang kết nối hoặc mở rộng sang màn hình phụ thứ hai",
            cooldown_sec=60.0,
        ):
            attention_status = "violation"

    # Kiểm tra trạng thái camera tắt hoặc bị che ống kính
    is_cam_off = lighting.get("is_camera_off", False) or (client_event in ("camera_off", "camera_disabled"))
    is_cam_covered = lighting.get("is_camera_covered", False)
    is_cam_off_or_covered = is_cam_off or is_cam_covered

    # A. Thiết bị cấm (YOLO) - Chỉ quét khi camera hoạt động bình thường
    # Xác nhận điện thoại qua nhiều khung hình (>= 2/3 frame) hoặc độ tin cậy rất cao (>= 0.70) + cooldown 30s
    if not is_cam_off_or_covered:
        detected_objects = result.get("detected_objects", [])
        phone_objs = [o for o in detected_objects if "phone" in o.get("class_name", "").lower()]
        phone_history = session_state.get("phone_history", [])
        phone_history.append(1 if phone_objs else 0)
        if len(phone_history) > 3:
            phone_history.pop(0)
        session_state["phone_history"] = phone_history

        if phone_objs:
            best_phone = max(phone_objs, key=lambda o: float(o.get("confidence", 0.0)))
            best_conf = float(best_phone.get("confidence", 0.0))
            if best_conf >= 0.70 or sum(phone_history) >= 2:
                if _add_violation_with_cooldown(
                    "phone_detected",
                    "critical",
                    f"Phát hiện điện thoại di động trong khung hình (Độ tin cậy: {best_conf*100:.1f}%)",
                    cooldown_sec=30.0,
                ):
                    attention_status = "violation"

        for obj in detected_objects:
            c_name = obj.get("class_name", "").lower()
            if "book" in c_name or "laptop" in c_name or "tv" in c_name:
                obj_key = f"obj_{c_name}_start"
                if not session_state.get(obj_key):
                    session_state[obj_key] = now
                elif now - session_state[obj_key] >= 3.0:
                    if _add_violation_with_cooldown(
                        "suspicious_object",
                        "high" if ("laptop" in c_name or "tv" in c_name) else "medium",
                        f"Phát hiện vật thể khả nghi ({c_name}) duy trì trong khung hình camera",
                        cooldown_sec=30.0,
                    ):
                        attention_status = "violation"
                    session_state[obj_key] = None

    # B12: Ghi nhận cảnh báo một lần mỗi phiên nếu hệ thống AI đang chạy ở chế độ fallback Haar Cascade
    if result.get("method") == "opencv_cascade" and not session_state.get("haar_fallback_warned"):
        session_state["haar_fallback_warned"] = True
        try:
            create_system_log(
                log_level="warning",
                module="AIProctoring",
                message=f"Phiên {session_id}: MediaPipe không khả dụng, đang chạy fallback OpenCV Haar Cascade (mất Head Pose/Gaze/Liveness)"
            )
        except Exception:
            pass

    # B. Quay đầu / Liếc mắt rời màn hình (Chỉ áp dụng khi camera mở rõ và có đúng 1 khuôn mặt)
    pitch_angle = result.get("head_pose", {}).get("pitch", 0.0)
    yaw_angle = abs(result.get("head_pose", {}).get("yaw", 0.0))
    is_looking_down = (pitch_angle < -15.0 and yaw_angle <= 25.0)

    # Chống giả mạo is_typing=true: chỉ miễn trừ khi cúi nhẹ nhìn bàn phím (-28 <= pitch < -15) và tối đa 15s liên tục
    if is_typing and (-28.0 <= pitch_angle < -15.0) and yaw_angle <= 25.0:
        typing_down_start = session_state.get("typing_down_start")
        if not typing_down_start:
            session_state["typing_down_start"] = now
            typing_down_duration = 0.0
        else:
            typing_down_duration = now - typing_down_start
        is_typing_looking_at_keyboard = (typing_down_duration < 15.0)
    else:
        session_state["typing_down_start"] = None
        is_typing_looking_at_keyboard = False

    if face_count == 1 and not is_cam_off_or_covered:
        if not looking_at_screen and not is_typing_looking_at_keyboard:
            start_off = session_state.get("off_screen_start")
            if not start_off:
                session_state["off_screen_start"] = now
                session_state["off_screen_violation_triggered"] = False
                dwell = 0.0
            else:
                dwell = now - start_off

            # Ngưỡng Dwell Time phân biệt theo hướng nhìn
            warning_threshold = 8.0 if is_looking_down else 3.0
            violation_threshold = 15.0 if is_looking_down else 7.0

            if warning_threshold <= dwell < violation_threshold:
                attention_status = "warning"
                reminder_msg = (
                    "Nhắc nhở: Bạn đang cúi mặt ra ngoài khá lâu. Vui lòng tập trung nhìn màn hình làm bài."
                    if is_looking_down
                    else "Nhắc nhở: Bạn đang quay mặt hoặc liếc mắt rời màn hình. Vui lòng tập trung vào bài thi."
                )
                gentle_reminder = {
                    "type": "proctor_reminder",
                    "room_id": room_id,
                    "student_id": student_id,
                    "session_id": session_id,
                    "message": reminder_msg,
                    "dwell_seconds": round(dwell, 1)
                }
            elif dwell >= violation_threshold and not session_state.get("off_screen_violation_triggered", False):
                gaze_dir = result.get("gaze", {}).get("gaze_direction", "rời màn hình")
                head_yaw = result.get("head_pose", {}).get("yaw", 0.0)

                desc = (
                    f"Thí sinh cúi mặt rời màn hình liên tục trong {round(dwell, 1)}s (Góc cúi: Pitch {pitch_angle}°)"
                    if is_looking_down
                    else f"Thí sinh quay đầu hoặc liếc mắt rời màn hình liên tục trong {round(dwell, 1)}s (Góc lệch: Yaw {head_yaw}°, Hướng mắt: {gaze_dir})"
                )
                if _add_violation_with_cooldown("looking_away", "high", desc, cooldown_sec=30.0):
                    attention_status = "violation"
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
                        if _add_violation_with_cooldown(
                            "looking_away",
                            "medium",
                            f"Thí sinh có hành vi liếc nhìn ngắt quãng lặp đi lặp lại {len(glances)} lần trong 60 giây",
                            cooldown_sec=30.0,
                        ):
                            attention_status = "violation"
                        session_state["recent_glances"] = []

            session_state["off_screen_start"] = None
            session_state["off_screen_violation_triggered"] = False
    else:
        # Nếu camera tắt, che hoặc không có mặt, hủy ngay bộ đếm quay đầu
        session_state["off_screen_start"] = None
        session_state["off_screen_violation_triggered"] = False

    # C. Vắng mặt khỏi camera (Ngưỡng Dwell Time >= 5s) - Chỉ tính khi camera đang mở bình thường
    if face_count == 0 and not is_cam_off_or_covered:
        start_no_face = session_state.get("no_face_start")
        if not start_no_face:
            session_state["no_face_start"] = now
            session_state["no_face_violation_triggered"] = False
            dwell_nf = 0.0
        else:
            dwell_nf = now - start_no_face

        if dwell_nf >= 5.0 and not session_state.get("no_face_violation_triggered", False):
            if _add_violation_with_cooldown(
                "no_face_detected",
                "medium",
                f"Không phát hiện khuôn mặt thí sinh trước camera trong {round(dwell_nf, 1)}s",
                cooldown_sec=30.0,
            ):
                attention_status = "violation"
            session_state["no_face_violation_triggered"] = True
    else:
        session_state["no_face_start"] = None
        session_state["no_face_violation_triggered"] = False

    # D. Nhiều khuôn mặt trước camera (Dwell >= 3s HOẶC xuất hiện >= 3/5 khung hình gần nhất - chống chập chờn)
    multi_face_history = session_state.get("multi_face_history", [])
    if not is_cam_off_or_covered:
        multi_face_history.append(1 if face_count > 1 else 0)
        if len(multi_face_history) > 5:
            multi_face_history.pop(0)
        session_state["multi_face_history"] = multi_face_history

    if face_count > 1 and not is_cam_off_or_covered:
        start_multi = session_state.get("multi_face_start")
        if not start_multi:
            session_state["multi_face_start"] = now
            session_state["multi_face_violation_triggered"] = False
            dwell_mf = 0.0
        else:
            dwell_mf = now - start_multi

        if (dwell_mf >= 3.0 or sum(multi_face_history) >= 3) and not session_state.get("multi_face_violation_triggered", False):
            desc_mf = (
                f"Phát hiện {face_count} khuôn mặt xuất hiện trước camera trong {round(dwell_mf, 1)}s"
                if dwell_mf >= 3.0
                else f"Phát hiện {face_count} khuôn mặt xuất hiện lặp lại ({sum(multi_face_history)}/5 khung hình gần nhất)"
            )
            if _add_violation_with_cooldown("multiple_faces", "high", desc_mf, cooldown_sec=30.0):
                attention_status = "violation"
            session_state["multi_face_violation_triggered"] = True
    else:
        session_state["multi_face_start"] = None
        if sum(multi_face_history) == 0:
            session_state["multi_face_violation_triggered"] = False

    # E. Camera bị che khuất hoặc tắt (Ngưỡng >= 4s, không đếm trùng nếu client_event camera_off đã ghi)
    if is_cam_off_or_covered:
        start_dark = session_state.get("dark_start")
        if not start_dark:
            session_state["dark_start"] = now
            if not session_state.get("dark_violation_triggered"):
                session_state["dark_violation_triggered"] = False
        elif now - start_dark >= 4.0 and not session_state.get("dark_violation_triggered", False):
            cam_desc = (
                "Thí sinh đã tắt camera trong phòng thi"
                if is_cam_off
                else f"Camera bị che khuất hoặc che mờ ống kính trong {round(now - start_dark, 1)}s"
            )
            if _add_violation_with_cooldown(
                "camera_blocked",
                "high" if is_cam_off else "medium",
                cam_desc,
                cooldown_sec=30.0,
            ):
                attention_status = "violation"
            session_state["dark_violation_triggered"] = True
    else:
        session_state["dark_start"] = None
        session_state["dark_violation_triggered"] = False

    # F. Liveness / Chống Webcam ảo & Ảnh tĩnh (Kết hợp phương sai EAR + phương sai tư thế đầu để giảm báo động giả)
    detector_method = result.get("method")
    if face_count == 1 and detector_method == "mediapipe_facemesh" and not is_cam_off_or_covered:
        current_ear = liveness.get("ear")
        if current_ear is not None:
            ear_history = session_state.get("ear_history", [])
            ear_history.append(float(current_ear))
            if len(ear_history) > 10:
                ear_history.pop(0)
            session_state["ear_history"] = ear_history

            pose_history = session_state.get("pose_history", [])
            hp = result.get("head_pose") or {}
            pose_history.append((float(hp.get("yaw", 0.0)), float(hp.get("pitch", 0.0))))
            if len(pose_history) > 10:
                pose_history.pop(0)
            session_state["pose_history"] = pose_history

            # Chỉ đánh dấu webcam ảo/ảnh bất động khi đủ 8 mẫu (~32s) VÀ cả EAR lẫn góc đầu đều bất động tuyệt đối
            if len(ear_history) >= 8:
                ear_mean = sum(ear_history) / len(ear_history)
                ear_variance = sum((x - ear_mean) ** 2 for x in ear_history) / len(ear_history)
                yaw_vals = [p[0] for p in pose_history]
                pitch_vals = [p[1] for p in pose_history]
                yaw_mean = sum(yaw_vals) / len(yaw_vals)
                pitch_mean = sum(pitch_vals) / len(pitch_vals)
                pose_variance = (
                    sum((y - yaw_mean) ** 2 for y in yaw_vals)
                    + sum((p - pitch_mean) ** 2 for p in pitch_vals)
                ) / (2 * len(pose_history))

                if ear_variance < 1e-6 and pose_variance < 0.05 and not session_state.get("liveness_violation_triggered", False):
                    if _add_violation_with_cooldown(
                        "suspicious_object",
                        "high",
                        "Phát hiện hình ảnh bất động tuyệt đối không có chuyển động tự nhiên (Nghi vấn webcam ảo)",
                        cooldown_sec=60.0,
                    ):
                        attention_status = "violation"
                    session_state["liveness_violation_triggered"] = True

    # G. Kiểm tra đóng băng khung hình (Freeze Frame / Static Photo) bằng perceptual dHash chịu nhiễu nhẹ
    if not is_cam_off_or_covered:
        current_dhash = result.get("dhash")
        last_dhash = session_state.get("last_frame_dhash")
        identical_count = session_state.get("identical_frame_count", 0)

        is_same_frame = False
        if current_dhash and last_dhash:
            is_same_frame = _dhash_hamming_distance(current_dhash, last_dhash) <= 2
        else:
            current_raw_hash = hash(snapshot_data[:400] + snapshot_data[-400:]) if len(snapshot_data) > 800 else hash(snapshot_data)
            last_raw_hash = session_state.get("last_frame_hash")
            is_same_frame = (last_raw_hash is not None and last_raw_hash == current_raw_hash)
            session_state["last_frame_hash"] = current_raw_hash

        if is_same_frame:
            identical_count += 1
            # Nếu gửi 6 frame liên tiếp giống nhau (~24s liên tục)
            if identical_count >= 6 and not session_state.get("frozen_camera_violation_triggered", False):
                if _add_violation_with_cooldown(
                    "suspicious_object",
                    "high",
                    "Phát hiện khung hình webcam bị đóng băng hoặc sử dụng ảnh tĩnh cố định",
                    cooldown_sec=60.0,
                ):
                    attention_status = "violation"
                session_state["frozen_camera_violation_triggered"] = True
        else:
            identical_count = 0
            session_state["frozen_camera_violation_triggered"] = False

        if current_dhash:
            session_state["last_frame_dhash"] = current_dhash
        session_state["identical_frame_count"] = identical_count
    else:
        session_state["identical_frame_count"] = 0
        session_state["frozen_camera_violation_triggered"] = False

    # 4. Quản lý lưu trữ ảnh snapshot (Tối ưu I/O: Chỉ ghi đĩa khi có vi phạm hoặc chu kỳ mẫu 30s)
    last_saved_time = session_state.get("last_saved_snapshot_time", 0.0)
    should_save_disk = (len(confirmed_violations) > 0) or (now - last_saved_time >= 30.0)

    snapshot_url = None
    if should_save_disk:
        snapshot_url = _save_snapshot_image(session_id, student_id, snapshot_data)
        if snapshot_url:
            session_state["last_saved_snapshot_time"] = now
            session_state["last_snapshot_url"] = snapshot_url

    if not snapshot_url:
        snapshot_url = session_state.get("last_snapshot_url") or f"/uploads/snapshots/placeholder_{session_id}_{student_id}.jpg"

    # Lưu bản ghi vào bảng Snapshots
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
                    "detected_at": get_current_vn_time().isoformat()
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
                "face_count": 0 if is_cam_off_or_covered else face_count,
                "looking_at_screen": False if is_cam_off_or_covered else looking_at_screen,
                "attention_status": attention_status,
                "camera_status": lighting.get("camera_status", "normal"),
                "head_pose": None if is_cam_off_or_covered else result.get("head_pose"),
                "gaze": None if is_cam_off_or_covered else result.get("gaze"),
                "liveness": None if is_cam_off_or_covered else result.get("liveness"),
                "confidence_score": 0.0 if is_cam_off_or_covered else result["confidence_score"],
                "snapshot_url": snapshot_url,
                "timestamp": get_current_vn_time().isoformat()
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
