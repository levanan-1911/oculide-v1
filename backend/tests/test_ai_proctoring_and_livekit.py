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

def test_illumination_and_quality_check():
    # 1. Khung hình quá tối (< 35)
    dark_frame = np.full((100, 100, 3), 10, dtype=np.uint8)
    res_dark = proctor_detector.check_illumination_and_quality(dark_frame)
    assert res_dark["is_too_dark"] is True
    assert res_dark["lighting_ok"] is False

    # 2. Khung hình đủ sáng (chuẩn phòng thi)
    normal_frame = np.full((100, 100, 3), 128, dtype=np.uint8)
    res_normal = proctor_detector.check_illumination_and_quality(normal_frame)
    assert res_normal["is_too_dark"] is False
    assert res_normal["is_overexposed"] is False
    assert res_normal["lighting_ok"] is True

def test_ear_blink_calculation_mock():
    # Giả lập 468 điểm mốc với mắt mở to
    class MockPt:
        def __init__(self, x, y):
            self.x = x
            self.y = y

    landmarks = [MockPt(0.5, 0.5) for _ in range(478)]
    # Đặt tọa độ cho mắt mở
    # Mắt trái: 33 (p1), 160 (p2), 158 (p3), 133 (p4), 153 (p5), 144 (p6)
    landmarks[33] = MockPt(0.2, 0.5)
    landmarks[133] = MockPt(0.4, 0.5)
    landmarks[160] = MockPt(0.25, 0.4)
    landmarks[158] = MockPt(0.35, 0.4)
    landmarks[144] = MockPt(0.25, 0.6)
    landmarks[153] = MockPt(0.35, 0.6)

    # Mắt phải: 362 (p1), 385 (p2), 387 (p3), 263 (p4), 373 (p5), 380 (p6)
    landmarks[362] = MockPt(0.6, 0.5)
    landmarks[263] = MockPt(0.8, 0.5)
    landmarks[385] = MockPt(0.65, 0.4)
    landmarks[387] = MockPt(0.75, 0.4)
    landmarks[380] = MockPt(0.65, 0.6)
    landmarks[373] = MockPt(0.75, 0.6)

    ear, eyes_closed = proctor_detector.calculate_ear(landmarks, (480, 640))
    assert ear > 0.20
    assert eyes_closed is False

def test_temporal_dwell_time_state_machine():
    from unittest.mock import patch, MagicMock
    from tasks.ai_proctoring_tasks import analyze_frame, _LOCAL_SESSION_STATE

    # Reset state
    _LOCAL_SESSION_STATE.clear()

    # Giả lập kết quả phát hiện nhìn lệch màn hình (looking_at_screen=False, face_count=1)
    mock_off_screen = {
        "success": True,
        "face_detected": True,
        "face_count": 1,
        "looking_at_screen": False,
        "head_pose": {"yaw": 30.0, "pitch": 5.0, "roll": 0.0},
        "gaze": {"gaze_direction": "left", "horizontal_ratio": 0.25, "is_deviated": True},
        "liveness": {"ear": 0.28, "eyes_closed": False},
        "lighting": {"lighting_ok": True, "is_too_dark": False},
        "detected_objects": [],
        "violations": [],
        "confidence_score": 0.85
    }

    with patch("tasks.ai_proctoring_tasks._save_snapshot_image", return_value="/uploads/test.jpg"), \
         patch("tasks.ai_proctoring_tasks.create_snapshot"), \
         patch("tasks.ai_proctoring_tasks.create_violation") as mock_create_violation, \
         patch("tasks.ai_proctoring_tasks.create_system_log"), \
         patch("tasks.ai_proctoring_tasks._get_redis_client", return_value=None), \
         patch.object(proctor_detector, "process_frame", return_value=mock_off_screen):

        # 1. Khung hình đầu tiên tại t = 100.0 (dwell = 0s < 3s): Không phạt, không vi phạm
        with patch("time.time", return_value=100.0):
            res1 = analyze_frame(room_id=1, student_id=10, session_id=999, snapshot_data="fake_b64")
            assert res1["violations_count"] == 0
            assert mock_create_violation.call_count == 0
            assert res1["attention_status"] == "normal"

        # 2. Khung hình tại t = 104.0 (dwell = 4.0s: 3s <= dwell < 7s): Cảnh báo mềm (warning), VẪN CHƯA PHẠT
        with patch("time.time", return_value=104.0):
            res2 = analyze_frame(room_id=1, student_id=10, session_id=999, snapshot_data="fake_b64")
            assert res2["violations_count"] == 0
            assert mock_create_violation.call_count == 0
            assert res2["attention_status"] == "warning"

        # 3. Khung hình tại t = 108.0 (dwell = 8.0s >= 7s): KÍCH HOẠT VI PHẠM CHÍNH THỨC
        with patch("time.time", return_value=108.0):
            res3 = analyze_frame(room_id=1, student_id=10, session_id=999, snapshot_data="fake_b64")
            assert res3["violations_count"] == 1
            assert mock_create_violation.call_count == 1
            assert res3["attention_status"] == "violation"

