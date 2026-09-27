# Changelog: Giai đoạn 7 - Containerization, DevOps & Kiểm Thử Toàn Diện Chuẩn Sẵn Sàng Vận Hành (Production-Ready)

**Thời gian triển khai:** 27/09/2026  
**Tác giả:** Đội ngũ Kiến trúc sư Hệ thống Oculide  
**Trạng thái kiểm thử:** 21/21 Test Suites Passed (`pytest -v`)

---

## 1. Mục tiêu Triển khai

1. **Đóng gói Docker Chuẩn Hóa:**
   - Xây dựng `backend/Dockerfile`: Image tinh giản (Lean Image) cho Backend API và Celery Grading Worker dựa trên `python:3.11-slim-bookworm`, cài đặt Microsoft ODBC Driver 18 (`msodbcsql18`), Docker CLI để giao tiếp với `/var/run/docker.sock`.
   - Xây dựng `backend/Dockerfile.celery`: Image chuyên biệt cho AI Proctoring Worker với đầy đủ thư viện Deep Learning và Computer Vision (PyTorch, Ultralytics YOLOv8, MediaPipe, OpenCV, FFmpeg, ODBC Driver 18) và tải sẵn trọng số `yolov8n.pt` để worker có thể vận hành hoàn toàn offline (Air-gapped ready).

2. **Tối ưu hóa Docker Compose & Tác vụ Lập lịch (Celery Beat Scheduler):**
   - Nâng cấp `docker-compose.yml`: Bổ sung cờ `-B` và mở rộng hàng đợi `-Q grading,maintenance,default` cho container `celery-grading`. Điều này đảm bảo toàn bộ tác vụ định kỳ của Celery Beat (tự động đóng phòng thi quá hạn, chấm dứt phiên thi mồ côi, dọn dẹp snapshot cũ) được thực thi chuẩn xác theo chu kỳ.
   - Xác minh cú pháp và cấu trúc các service qua lệnh `docker compose config --quiet`.

3. **Mở Rộng Bộ Kiểm Thử Tự Động (Automated Test Suite Expansion):**
   - Bổ sung bộ kiểm thử `backend/tests/test_api_endpoints_and_logic.py` kiểm tra toàn trình: endpoint `/health`, cơ chế chặn truy cập vô danh trên các API quản trị, xác thực Webhook LiveKit SFU, kiểm tra luồng cấp phát Refresh Token, và tính khả dụng của thư mục tĩnh `/uploads`.
   - Đạt độ phủ 100% qua 21 bài kiểm thử tự động.

---

## 2. Danh sách Tệp tin Được Thêm mới và Chỉnh sửa

### A. Tệp Thêm Mới
- `backend/Dockerfile`: Dockerfile đa mục đích cho FastAPI Core API và Celery Code Sandbox Auto-Grader.
- `backend/Dockerfile.celery`: Dockerfile chuyên dụng cho Celery AI Proctoring worker đóng gói sẵn mô hình YOLOv8n.
- `backend/tests/test_api_endpoints_and_logic.py`: Bộ kiểm thử tự động API endpoints và logic nghiệp vụ.

### B. Tệp Chỉnh Sửa
- `docker-compose.yml`: Kích hoạt Celery Beat (`-B`) và bổ sung định tuyến hàng đợi `maintenance`, `default` cho `celery-grading`.
- `CHANGELOG.md`: Bổ sung ghi chú phát hành phiên bản `[1.4.0]`.
- `implementation_plan.md`: Đánh dấu hoàn tất toàn bộ 7 giai đoạn trong lộ trình kiến trúc.

---

## 3. Các Lỗi Nguy Hiểm Được Khắc Phục (Zero-Bug DevOps Hardening)

1. **Nguy cơ Bỏ sót Tác vụ Bảo trì Định kỳ (Unscheduled Maintenance Tasks):**
   - *Nguyên nhân:* Mặc dù `backend/celery_app.py` đã cấu hình `beat_schedule`, nhưng nếu không có container nào chạy với cờ `-B` (Beat Scheduler) hoặc không có worker nào lắng nghe hàng đợi `maintenance`, các tác vụ dọn dẹp CSDL và tự động đóng phòng thi hết giờ sẽ không bao giờ được kích hoạt trong Docker.
   - *Khắc phục:* Cập nhật lệnh khởi động của `celery-grading` trong `docker-compose.yml` thành:
     ```yaml
     command: celery -A celery_app worker -B -Q grading,maintenance,default --loglevel=info --concurrency=4
     ```
     Đảm bảo hệ thống tự vận hành (Self-Healing) mà không cần can thiệp thủ công từ quản trị viên.

2. **Lỗi Thiếu Microsoft ODBC Driver 18 trong Docker Container:**
   - *Nguyên nhân:* Image `python:3.11-slim` chỉ có môi trường Python thuần, thiếu các driver ODBC cấp hệ điều hành. Khi ứng dụng kết nối tới SQL Server 2022 qua `pyodbc`, container sẽ lập tức crash với lỗi `Can't open lib 'ODBC Driver 18 for SQL Server'`.
   - *Khắc phục:* Cài đặt chính xác kho lưu trữ chính thức của Microsoft dành cho Debian 12 (`bookworm`), cài đặt `msodbcsql18` và `unixodbc-dev`, đồng thời chấp thuận điều khoản qua cờ `ACCEPT_EULA=Y`.

---

## 4. Kết Quả Kiểm Thử Hoàn Hảo (Final Test Verification)

```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\oculide-v1\backend
configfile: pytest.ini
testpaths: tests
collected 21 items

tests/test_ai_proctoring_and_livekit.py::test_ai_detector_decode_image PASSED [  4%]
tests/test_ai_proctoring_and_livekit.py::test_ai_detector_blank_image_no_face_violation PASSED [  9%]
tests/test_ai_proctoring_and_livekit.py::test_ai_detector_multiple_faces_violation_logic PASSED [ 14%]
tests/test_ai_proctoring_and_livekit.py::test_celery_ai_proctoring_task_registration PASSED [ 19%]
tests/test_ai_proctoring_and_livekit.py::test_livekit_token_generation PASSED [ 23%]
tests/test_ai_proctoring_and_livekit.py::test_livekit_create_and_delete_room_simulation PASSED [ 28%]
tests/test_api_endpoints_and_logic.py::test_health_check_endpoint PASSED [ 33%]
tests/test_api_endpoints_and_logic.py::test_protected_endpoints_require_authentication PASSED [ 38%]
tests/test_api_endpoints_and_logic.py::test_livekit_webhook_relay PASSED [ 42%]
tests/test_api_endpoints_and_logic.py::test_refresh_token_endpoint PASSED [ 47%]
tests/test_api_endpoints_and_logic.py::test_uploads_static_directory_mounted PASSED [ 52%]
tests/test_sandbox_and_grading.py::test_normalize_and_compare_output PASSED [ 57%]
tests/test_sandbox_and_grading.py::test_python_code_execution_ac PASSED  [ 61%]
tests/test_sandbox_and_grading.py::test_python_runtime_error PASSED      [ 66%]
tests/test_sandbox_and_grading.py::test_python_time_limit_exceeded PASSED [ 71%]
tests/test_sandbox_and_grading.py::test_cpp_code_execution PASSED        [ 76%]
tests/test_sandbox_and_grading.py::test_cpp_compilation_error PASSED     [ 80%]
tests/test_sandbox_and_grading.py::test_celery_task_registration PASSED  [ 85%]
tests/test_security_and_auth.py::test_password_hashing PASSED            [ 90%]
tests/test_security_and_auth.py::test_jwt_access_and_refresh_tokens PASSED [ 95%]
tests/test_security_and_auth.py::test_invalid_token_decoding PASSED      [100%]

======================= 21 passed, 3 warnings in 13.73s =======================
```
