# Changelog: Giai đoạn 5 & 6 - AI Proctoring Vision Pipeline & WebRTC LiveKit / Redis Pub/Sub Cluster Backplane

**Thời gian triển khai:** 27/09/2026  
**Tác giả:** Đội ngũ Kiến trúc sư Hệ thống Oculide  
**Trạng thái kiểm thử:** 16/16 Test Suites Passed (`pytest -v`)

---

## 1. Mục tiêu Triển khai

1. **Giai đoạn 5 (AI Proctoring Vision Engine):**
   - Xây dựng động cơ thị giác máy tính giám sát phòng thi trực tuyến tự động (`ai_workers/detector.py`).
   - Tích hợp phát hiện và đếm khuôn mặt, phát hiện vắng mặt (`no_face_detected`) hoặc có người lạ vào phòng (`multiple_faces`).
   - Ước lượng tư thế xoay đầu 3D (Head Pose: Pitch, Yaw, Roll) từ 468 điểm mốc khuôn mặt qua `cv2.solvePnP` để phát hiện thí sinh quay đầu rời màn hình (`looking_away`).
   - Phát hiện các thiết bị gian lận qua YOLOv8: điện thoại di động (`phone_detected`), tài liệu/sách vở (`suspicious_object`), màn hình/laptop phụ.
   - Xây dựng Celery Task `analyze_frame` với cơ chế kiểm soát áp lực ngược (**Backpressure / Drop Frame Rate Limiting** tối đa 1 frame/2s mỗi session) để chống nghẽn hàng đợi và chống cạn kiệt Redis RAM.
   - Lưu trữ ảnh snapshot webcam định kỳ vào hệ thống tệp tin tĩnh (`/uploads/snapshots/...`) và ghi nhận CSDL vào bảng `Snapshots` & `Violations`.
   - Bắn cảnh báo thời gian thực và cập nhật Panoptic Grid tới giám thị qua Redis Pub/Sub.

2. **Giai đoạn 6 (LiveKit WebRTC SFU & Redis Pub/Sub Backplane):**
   - Nâng cấp `backend/api/livekit.py`: Tích hợp ghi nhận token vào CSDL bảng `LiveKitTokens` phục vụ kiểm toán và thu hồi.
   - Cung cấp endpoint thu hồi quyền stream `POST /api/v1/livekit/tokens/revoke` khi thí sinh bị đình chỉ/trục xuất khỏi phòng.
   - Cung cấp endpoint Webhook `POST /api/v1/livekit/webhook` tiếp nhận sự kiện thời gian thực từ LiveKit SFU (người tham gia gia nhập/rời đi, bật/tắt track video).
   - Nâng cấp `backend/main.py`: Hoàn thiện kênh lắng nghe Redis Pub/Sub nền (`ws_updates`) có hỗ trợ mật khẩu Redis, cấu chế tự động kết nối lại (Auto-Reconnect Resilience), và mount đường dẫn phục vụ ảnh tĩnh `/uploads`.

---

## 2. Danh sách Tệp tin Được Thêm mới và Chỉnh sửa

### A. Tệp Thêm Mới
- `ai_workers/__init__.py`: Đóng gói package `ai_workers`.
- `ai_workers/detector.py`: Lớp `AIProctorDetector` kiến trúc đa tầng (Tiered Architecture):
  - Tier 1: Nạp Ultralytics YOLOv8n và MediaPipe FaceMesh khi chạy trong container `oculide-celery-proctoring`.
  - Tier 2: Nạp OpenCV Haar Cascade và FaceLandmarker khi chạy trên môi trường test máy trạm.
  - Bộ giải mã ảnh an toàn chống tấn công Decompression Bomb (giới hạn kích thước payload $\le$ 10MB).
  - Thuật toán giải ma trận PnP tính góc Euler (Pitch, Yaw, Roll).
  - Thuật toán tính điểm tin cậy tổng thể (Confidence Score) dựa trên trọng số mức độ nghiêm trọng của vi phạm.
- `backend/tasks/ai_proctoring_tasks.py`: Celery Task `analyze_frame` tích hợp Redis Rate Limiting, lưu file ảnh snapshot, ghi nhận CSDL `Snapshots` & `Violations`, và phát sóng sự kiện qua kênh `ws_updates`.
- `backend/tests/test_ai_proctoring_and_livekit.py`: Bộ kiểm thử 6 test cases bao quát: giải mã ảnh Base64/Bytes/Malicious string, phát hiện vi phạm ảnh trống, kiểm tra logic đa khuôn mặt, đăng ký Celery task, sinh token LiveKit JWT, và mô phỏng phòng LiveKit.

### B. Tệp Chỉnh Sửa
- `backend/celery_app.py`: Bổ sung `"tasks.ai_proctoring_tasks"` vào danh sách nạp `include`.
- `backend/api/violations.py`: Chuyển đổi endpoint `POST /analyze` sang sử dụng instance `celery_app` dùng chung.
- `backend/api/livekit.py`: Thêm ghi nhận kiểm toán token vào bảng `LiveKitTokens`, thêm endpoint `POST /tokens/revoke`, và thêm endpoint `POST /webhook`.
- `backend/main.py`:
  - Thêm cấu hình xác thực mật khẩu `REDIS_PASSWORD` cho Redis Async client.
  - Vòng lặp `while True` với cơ chế phục hồi tự động khi Redis server tạm ngắt kết nối.
  - Mount tĩnh `/uploads` phục vụ truy xuất ảnh snapshot trực tiếp từ frontend.
- `CHANGELOG.md`: Cập nhật ghi chú phát hành phiên bản `[1.3.0]`.
- `implementation_plan.md`: Đánh dấu hoàn thành Giai đoạn 5 và 6.

---

## 3. Các Lỗi Nguy Hiểm Được Phát Hiện và Triệt Tiêu (Zero-Bug Discovery)

1. **Khác biệt API giữa MediaPipe 0.10.18 (Docker) và MediaPipe 0.10.33+ (Host):**
   - *Nguyên nhân:* Trong các phiên bản MediaPipe mới trên máy trạm (`0.10.33+`), Google đã loại bỏ submodule cũ `mediapipe.solutions`, dẫn tới lỗi `AttributeError: module 'mediapipe' has no attribute 'solutions'`. Tuy nhiên trong image Docker chính thức `oculide-celery-proctoring`, MediaPipe là bản `0.10.18` với đầy đủ `mp.solutions.face_mesh` và `ultralytics`.
   - *Khắc phục:* Thiết kế **Kiến trúc Nhận thức Đa tầng (Tiered Fallback Architecture)**:
     Kiểm tra `hasattr(mp, "solutions")` trước khi nạp FaceMesh. Nếu không có, tự động kích hoạt OpenCV Haar Cascade (`haarcascade_frontalface_default.xml`) có sẵn trong lõi OpenCV. Nhờ đó, code chạy hoàn hảo ở mọi môi trường, không crash khi chạy unit test trên máy trạm và đạt độ chính xác tối đa trong Docker container.

2. **Nguy cơ Tấn công Từ chối Dịch vụ (DoS) & Tràn Bộ Nhớ Redis (Buffer Explosion):**
   - *Nguyên nhân:* Nếu sinh viên gửi liên tục video frame (30fps) lên endpoint `POST /api/v1/violations/analyze`, hàng đợi Redis sẽ bị bơm hàng nghìn ảnh Base64 mỗi giây, dẫn tới tràn RAM máy chủ và làm tê liệt các worker khác.
   - *Khắc phục:* Bổ sung cơ chế **Backpressure Frame Dropping**:
     Tại đầu vào của Celery task, sử dụng lệnh atomic `r.set(f"ratelimit:ai_frame:{session_id}", "1", nx=True, ex=2)`. Nếu phiên thi đó đã có ảnh được xử lý trong vòng 2 giây qua, ảnh mới lập tức bị hủy bỏ (`dropped`), đảm bảo CPU/GPU chỉ xử lý tối đa 1 ảnh/2 giây cho mỗi sinh viên.

3. **Lỗ hổng Lặng lẽ (Silent Failure) của Redis Pub/Sub Listener:**
   - *Nguyên nhân:* Vòng lặp `async for message in pubsub.listen()` ban đầu không có khối bọc reconnect bên ngoài. Nếu Redis khởi động lại hoặc rớt mạng 1 giây, listener task sẽ ném exception và kết thúc vĩnh viễn, làm mất toàn bộ tính năng cập nhật điểm và vi phạm thời gian thực trên giao diện Giám thị.
   - *Khắc phục:* Bọc listener trong vòng lặp vô tận có `try...except Exception`, kèm lệnh nghỉ phục hồi `await asyncio.sleep(3)` để tự động tái thiết lập kết nối ngay khi Redis trực tuyến trở lại.

---

## 4. Kết Quả Kiểm Thử Toàn Diện (Test Suite Execution)

```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\oculide-v1\backend
configfile: pytest.ini
testpaths: tests
collected 16 items

tests/test_ai_proctoring_and_livekit.py::test_ai_detector_decode_image PASSED [  6%]
tests/test_ai_proctoring_and_livekit.py::test_ai_detector_blank_image_no_face_violation PASSED [ 12%]
tests/test_ai_proctoring_and_livekit.py::test_ai_detector_multiple_faces_violation_logic PASSED [ 18%]
tests/test_ai_proctoring_and_livekit.py::test_celery_ai_proctoring_task_registration PASSED [ 25%]
tests/test_ai_proctoring_and_livekit.py::test_livekit_token_generation PASSED [ 31%]
tests/test_ai_proctoring_and_livekit.py::test_livekit_create_and_delete_room_simulation PASSED [ 37%]
tests/test_sandbox_and_grading.py::test_normalize_and_compare_output PASSED [ 43%]
tests/test_sandbox_and_grading.py::test_python_code_execution_ac PASSED  [ 50%]
tests/test_sandbox_and_grading.py::test_python_runtime_error PASSED      [ 56%]
tests/test_sandbox_and_grading.py::test_python_time_limit_exceeded PASSED [ 62%]
tests/test_sandbox_and_grading.py::test_cpp_code_execution PASSED        [ 68%]
tests/test_sandbox_and_grading.py::test_cpp_compilation_error PASSED     [ 75%]
tests/test_sandbox_and_grading.py::test_celery_task_registration PASSED  [ 81%]
tests/test_security_and_auth.py::test_password_hashing PASSED            [ 87%]
tests/test_security_and_auth.py::test_jwt_access_and_refresh_tokens PASSED [ 93%]
tests/test_security_and_auth.py::test_invalid_token_decoding PASSED      [100%]

======================= 16 passed, 3 warnings in 9.91s ========================
```
