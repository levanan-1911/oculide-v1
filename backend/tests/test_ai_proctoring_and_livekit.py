import pytest
import numpy as np
import cv2
import base64
import sys
import os

# Add root path to sys.path
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from ai_workers.detector import proctor_detector, AIProctorDetector
from services.livekit_service import livekit_service
from celery_app import celery_app

def test_ai_detector_decode_image():
    # 1. Tạo ảnh mẫu chuẩn OpenCV
    sample_img = np.zeros((200, 300, 3), dtype=np.uint8)
    cv2.putText(sample_img, "Oculide", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    _, buffer = cv2.imencode(".jpg", sample_img)
    
    # 2. Test giải mã từ Data URL
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")
    decoded = proctor_detector.decode_image(b64_str)
    assert decoded is not None
    assert decoded.shape == (200, 300, 3)
    
    # 3. Test giải mã từ Raw Bytes
    raw_bytes = buffer.tobytes()
    decoded_bytes = proctor_detector.decode_image(raw_bytes)
    assert decoded_bytes is not None
    assert decoded_bytes.shape == (200, 300, 3)
    
    # 4. Test chuỗi rác không gây crash
    assert proctor_detector.decode_image("invalid_base64_string_here!@#$") is None
    assert proctor_detector.decode_image(None) is None

def test_ai_detector_blank_image_no_face_violation():
    # Khung hình màu đen không có người
    blank_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    res = proctor_detector.process_frame(blank_frame)
    
    assert res["success"] is True
    assert res["face_detected"] is False
    assert res["face_count"] == 0
    assert res["looking_at_screen"] is False
    
    # Kiểm tra vi phạm vắng mặt được phát hiện
    violation_types = [v["type"] for v in res["violations"]]
    assert "no_face_detected" in violation_types
    # Điểm tin cậy bị trừ
    assert res["confidence_score"] < 0.90

def test_ai_detector_multiple_faces_violation_logic():
    detector = AIProctorDetector(enable_yolo=False)
    # Giả lập kết quả detect nhiều hơn 1 mặt
    fake_frame = np.zeros((100, 100, 3), dtype=np.uint8)
    
    # Mock hàm detect_faces trả về 2 khuôn mặt
    original_detect_faces = detector.detect_faces
    detector.detect_faces = lambda frame: {
        "face_detected": True,
        "face_count": 2,
        "looking_at_screen": True,
        "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
        "method": "mock"
    }
    
    res = detector.process_frame(fake_frame)
    violation_types = [v["type"] for v in res["violations"]]
    assert "multiple_faces" in violation_types
    assert res["confidence_score"] <= 0.40  # Vi phạm mức high bị trừ nặng

def test_celery_ai_proctoring_task_registration():
    # Kiểm tra task AI Proctoring đã đăng ký thành công trong Celery broker
    registered_tasks = celery_app.tasks.keys()
    assert "tasks.ai_proctoring_tasks.analyze_frame" in registered_tasks

def test_livekit_token_generation():
    room_name = "test_exam_room_101"
    identity = "user_99"
    full_name = "Tran Thi B"
    
    token = livekit_service.generate_token(
        room_name=room_name,
        participant_identity=identity,
        participant_name=full_name,
        can_publish=True,
        can_subscribe=True
    )
    
    # Token phải là chuỗi JWT hợp lệ gồm 3 phần ngăn cách bởi dấu chấm
    assert token is not None
    assert isinstance(token, str)
    parts = token.split(".")
    assert len(parts) == 3

def test_livekit_create_and_delete_room_simulation():
    # Trong môi trường test offline, dịch vụ trả về object mô phỏng
    room_name = "offline_sim_room"
    res = livekit_service.create_room(room_name)
    assert res is not None
    assert res["name"] == room_name
    
    # Xóa phòng không gây ngoại lệ
    deleted = livekit_service.delete_room(room_name)
    assert isinstance(deleted, bool)
