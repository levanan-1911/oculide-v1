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
    1. Kiểm soát tần suất nhận khung hình (Backpressure / Drop Frame Rate Limiting).
    2. Chạy pipeline thị giác máy tính: Face Detection, Head Pose, YOLOv8 Object Detection.
    3. Lưu trữ ảnh chụp và thông số thị giác vào bảng Snapshots.
    4. Ghi nhận vi phạm vào bảng Violations nếu phát hiện bất thường.
    5. Phát cảnh báo và cập nhật màn hình giám sát Panoptic Grid thời gian thực qua Redis Pub/Sub.
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

    # 5. Ghi nhận vi phạm và bắn sự kiện cảnh báo tức thì
    violations = result.get("violations", [])
    for v in violations:
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

    # 6. Phát bản tin cập nhật trạng thái khung hình webcam lên Panoptic Grid của Giám thị
    if r:
        try:
            grid_update = {
                "type": "snapshot_update",
                "room_id": room_id,
                "student_id": student_id,
                "session_id": session_id,
                "face_count": result["face_count"],
                "looking_at_screen": result["looking_at_screen"],
                "head_pose": result.get("head_pose"),
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
        "face_count": result["face_count"],
        "looking_at_screen": result["looking_at_screen"],
        "violations_count": len(violations),
        "snapshot_url": snapshot_url
    }
