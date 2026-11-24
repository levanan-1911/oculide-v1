"""Unit tests kiểm thử các bản vá cứng hóa AI Proctoring (Head Pose, Camera Cover, dHash, Cooldown, Sliding Window, IDOR)."""
import base64
import math
import os
import sys
from unittest.mock import patch

import cv2
import numpy as np
import pytest
from fastapi import HTTPException

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Đảm bảo import đúng detector trong backend/ai_workers
import importlib.util

_det_spec = importlib.util.spec_from_file_location(
    "backend_ai_detector", os.path.join(backend_dir, "ai_workers", "detector.py")
)
_det_mod = importlib.util.module_from_spec(_det_spec)
_det_spec.loader.exec_module(_det_mod)
BackendDetector = _det_mod.AIProctorDetector


def _make_scene(mean: float, texture: float, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    h, w = 480, 640
    img = np.zeros((h, w), np.float32)
    for _ in range(25):
        x, y = int(rng.integers(0, w)), int(rng.integers(0, h))
        cv2.rectangle(
            img,
            (x, y),
            (x + int(rng.integers(20, 200)), y + int(rng.integers(20, 200))),
            float(rng.uniform(-1, 1)),
            -1,
        )
    img = img * texture + mean + rng.normal(0, 3, img.shape)
    return cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)


def _make_blur_cover(bgr, noise: float = 2.0, seed: int = 1) -> np.ndarray:
    rng = np.random.default_rng(seed)
    img = np.full((480, 640, 3), bgr, np.float32) + rng.normal(0, noise, (480, 640, 3))
    img = cv2.GaussianBlur(img, (0, 0), 25)
    return np.clip(img, 0, 255).astype(np.uint8)


def test_camera_quality_distinguishes_covered_vs_dark_room():
    # 1. Tắt camera (đen tuyệt đối) -> off
    r_off = BackendDetector.check_illumination_and_quality(np.zeros((480, 640, 3), np.uint8))
    assert r_off["camera_status"] == "off"
    assert r_off["is_camera_off"] is True

    # 2. Phòng tối hợp lệ vẫn rõ chi tiết (mean ~ 22, lap cao) -> normal (không phạt oan)
    r_dark_ok = BackendDetector.check_illumination_and_quality(_make_scene(22, 18))
    assert r_dark_ok["camera_status"] == "normal"
    assert r_dark_ok["is_camera_covered"] is False

    # 3. Che camera bằng tay / giấy trắng / băng dính (sáng nhưng mờ phẳng) -> covered
    for cover_bgr in [(80, 110, 160), (200, 200, 205), (60, 60, 60)]:
        r_cov = BackendDetector.check_illumination_and_quality(_make_blur_cover(cover_bgr))
        assert r_cov["camera_status"] == "covered"
        assert r_cov["is_camera_covered"] is True

    # 4. Che 1/2 ống kính -> covered
    half = _make_scene(120, 60)
    half[:, :320] = _make_blur_cover((70, 90, 140))[:, :320]
    r_half = BackendDetector.check_illumination_and_quality(half)
    assert r_half["camera_status"] == "covered"
    assert r_half["is_partial_covered"] is True


def test_head_pose_no_180_flip():
    det = BackendDetector(enable_yolo=False)
    h, w = 480, 640
    # Mô hình 3D gốc (Y-up) chiếu sang tọa độ ảnh (Y-down) như camera thật
    model_yup = np.array(
        [
            (0.0, 0.0, 0.0),
            (0.0, -330.0, -65.0),
            (-225.0, 170.0, -135.0),
            (225.0, 170.0, -135.0),
            (-150.0, -150.0, -125.0),
            (150.0, -150.0, -125.0),
        ],
        dtype=np.float64,
    )
    idxs = [1, 152, 33, 263, 61, 291]

    class _LM:
        def __init__(self, x, y):
            self.x, self.y = x, y

    def _synth(yaw_deg: float, pitch_deg: float):
        ry, rp = math.radians(yaw_deg), math.radians(pitch_deg)
        Ry = np.array([[math.cos(ry), 0, math.sin(ry)], [0, 1, 0], [-math.sin(ry), 0, math.cos(ry)]])
        Rx = np.array([[1, 0, 0], [0, math.cos(rp), -math.sin(rp)], [0, math.sin(rp), math.cos(rp)]])
        pts3 = (Ry @ Rx @ model_yup.T).T
        pts3[:, 1] *= -1
        pts3[:, 2] = -pts3[:, 2] + 1500.0
        pts2 = np.stack([w * pts3[:, 0] / pts3[:, 2] + w / 2, w * pts3[:, 1] / pts3[:, 2] + h / 2], axis=1)
        lms = [_LM(0.5, 0.5) for _ in range(478)]
        for idx, (px, py) in zip(idxs, pts2):
            lms[idx] = _LM(px / w, py / h)
        return lms

    # Nhìn thẳng: pitch ~ 0, yaw ~ 0 (không bị lật 180°)
    p0, y0, _ = det.estimate_head_pose(_synth(0, 0), (h, w))
    assert abs(p0) < 2.0 and abs(y0) < 2.0

    # Quay phải 30°
    p30, y30, _ = det.estimate_head_pose(_synth(30, 0), (h, w))
    assert abs(y30 - 30.0) < 2.0 and abs(p30) < 2.0

    # Cúi xuống -30° -> pitch âm để is_looking_down nhận đúng
    pd, yd, _ = det.estimate_head_pose(_synth(0, -30), (h, w))
    assert abs(pd - (-30.0)) < 2.0 and abs(yd) < 2.0


def test_dhash_tolerant_to_minor_noise():
    base = _make_scene(120, 60, seed=42)
    rng = np.random.default_rng(7)
    noisy = np.clip(base.astype(np.int16) + rng.integers(-2, 3, base.shape), 0, 255).astype(np.uint8)
    other = _make_scene(120, 60, seed=99)

    h_base = BackendDetector.compute_dhash(base)
    h_noisy = BackendDetector.compute_dhash(noisy)
    h_other = BackendDetector.compute_dhash(other)

    assert BackendDetector.dhash_hamming_distance(h_base, h_noisy) <= 2
    assert BackendDetector.dhash_hamming_distance(h_base, h_other) > 10


def test_temporal_cooldown_and_sliding_window():
    from tasks.ai_proctoring_tasks import analyze_frame, _LOCAL_SESSION_STATE

    _LOCAL_SESSION_STATE.clear()
    recorded = []

    def _base_res(**kw):
        d = {
            "success": True,
            "face_detected": True,
            "face_count": 1,
            "looking_at_screen": True,
            "head_on_screen": True,
            "head_pose": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
            "gaze": {"gaze_direction": "center", "is_deviated": False},
            "liveness": {"ear": 0.3, "eyes_closed": False},
            "lighting": {"camera_status": "normal", "is_camera_off": False, "is_camera_covered": False},
            "detected_objects": [],
            "violations": [],
            "confidence_score": 0.95,
            "method": "mediapipe_facemesh",
            "dhash": "0123456789abcdef",
        }
        d.update(kw)
        return d

    with patch("tasks.ai_proctoring_tasks._save_snapshot_image", return_value="/uploads/test.jpg"), \
         patch("tasks.ai_proctoring_tasks.create_snapshot"), \
         patch("tasks.ai_proctoring_tasks.create_violation", side_effect=lambda **k: recorded.append(k)), \
         patch("tasks.ai_proctoring_tasks.create_system_log"), \
         patch("tasks.ai_proctoring_tasks._get_redis_client", return_value=None):

        # 1. Tắt cam 12s (3 frame camera_off) -> chỉ ghi ĐÚNG 1 vi phạm camera_blocked (không spam 4 lần)
        t = 1000.0
        for i in range(3):
            res_off = _base_res(
                face_detected=False,
                face_count=0,
                looking_at_screen=False,
                lighting={"camera_status": "off", "is_camera_off": True, "is_camera_covered": True},
            )
            with patch("time.time", return_value=t), \
                 patch("tasks.ai_proctoring_tasks.proctor_detector.process_frame", return_value=res_off):
                analyze_frame(1, 10, 501, "black_b64", False, "camera_off")
            t += 4.0
        assert [v["violation_type"] for v in recorded] == ["camera_blocked"]

        # 2. YOLO phone 41% trong 3 frame -> xác nhận ở frame 2, cooldown chặn frame 3 -> chỉ 1 vi phạm
        _LOCAL_SESSION_STATE.clear()
        recorded.clear()
        t = 2000.0
        for i in range(3):
            res_phone = _base_res(
                detected_objects=[{"class_name": "cell phone", "confidence": 0.41}],
                dhash=f"{i:016x}",
            )
            with patch("time.time", return_value=t), \
                 patch("tasks.ai_proctoring_tasks.proctor_detector.process_frame", return_value=res_phone):
                analyze_frame(1, 10, 502, f"f{i}", False, "periodic")
            t += 4.0
        assert [v["violation_type"] for v in recorded] == ["phone_detected"]

        # 3. Người thứ 2 xuất hiện chập chờn (2, 1, 2, 1, 2) -> sliding window 3/5 bắt được
        _LOCAL_SESSION_STATE.clear()
        recorded.clear()
        t = 3000.0
        for i, fc in enumerate([2, 1, 2, 1, 2]):
            res_mf = _base_res(face_count=fc, dhash=f"{(i + 1) * 1234567:016x}")
            with patch("time.time", return_value=t), \
                 patch("tasks.ai_proctoring_tasks.proctor_detector.process_frame", return_value=res_mf):
                analyze_frame(1, 10, 503, f"mf{i}", False, "periodic")
            t += 2.0
        assert [v["violation_type"] for v in recorded] == ["multiple_faces"]


def test_violations_idor_blocked_for_other_student():
    from api.violations import log_violation, ingest_ai_violation_event, analyze_webcam_snapshot
    from schemas.violation import ViolationCreateRequest, AIViolationHookRequest, SnapshotAnalyzeRequest

    attacker = {"user_id": 999, "role": "student"}
    victim_session = {"session_id": 77, "room_id": 1, "student_id": 123, "started_at": None}

    def _exec_sync(coro):
        try:
            coro.send(None)
        except StopIteration as stop:
            return stop.value
        finally:
            coro.close()

    with patch("api.violations.get_session_by_id", return_value=victim_session):
        with pytest.raises(HTTPException) as exc1:
            _exec_sync(
                log_violation(
                    ViolationCreateRequest(session_id=77, violation_type="tab_switch", severity="high"),
                    current_user=attacker,
                )
            )
        assert exc1.value.status_code == 403

        with pytest.raises(HTTPException) as exc2:
            _exec_sync(
                analyze_webcam_snapshot(
                    SnapshotAnalyzeRequest(session_id=77, snapshot_data="abc"),
                    current_user=attacker,
                )
            )
        assert exc2.value.status_code == 403

    with pytest.raises(HTTPException) as exc3:
        _exec_sync(
            ingest_ai_violation_event(
                AIViolationHookRequest(room_id=1, student_id=123, violation_type="phone_detected"),
                current_user=attacker,
            )
        )
    assert exc3.value.status_code == 403
