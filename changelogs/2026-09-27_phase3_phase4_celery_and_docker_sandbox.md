# Changelog: Giai đoạn 3 & 4 - Động cơ Hàng đợi Phân tán Celery & Docker Sandbox Auto-Grader

**Thời gian triển khai:** 27/09/2026  
**Tác giả:** Đội ngũ Kiến trúc sư Hệ thống Oculide  
**Trạng thái kiểm thử:** 10/10 Test Suites Passed (`pytest -v`)

---

## 1. Mục tiêu Triển khai

1. **Giai đoạn 3 (Celery Distributed Task Engine):**
   - Xây dựng kiến trúc xử lý tác vụ bất đồng bộ phân tán bằng Celery qua Redis Broker.
   - Tách biệt các hàng đợi chuyên biệt (`grading`, `proctoring`, `maintenance`, `default`) để các tác vụ nặng (chấm code, AI giám thị) không bao giờ tranh chấp tài nguyên với tác vụ bảo trì hoặc API thời gian thực.
   - Thiết lập tác vụ bảo trì định kỳ (`celery-beat`) tự động đóng phòng thi quá hạn, dọn phiên thi mồ côi và thanh lọc ảnh chụp snapshot webcam.

2. **Giai đoạn 4 (Docker Sandbox Auto-Grader):**
   - Xây dựng sandbox cô lập tuyệt đối mã nguồn do sinh viên gửi lên, tuân thủ nguyên lý bảo mật Zero-Trust.
   - Hỗ trợ đa ngôn ngữ: **Python 3.11**, **C++20 (GCC 12)**, **Java 17 (Temurin)**.
   - Chặn đứng hoàn toàn các hình thức tấn công: Fork-bomb, Escape container, Data exfiltration (Network None), TLE (Infinite loops), Memory explosion, Privilege escalation.
   - Bộ so khớp kết quả chấm bài thông minh: Chuẩn hóa xuống dòng (`\r\n` -> `\n`), so sánh sai số thực (Float tolerance $\le 10^{-4}$), so sánh token-level độc lập khoảng trắng.

---

## 2. Danh sách Tệp tin Được Thêm mới và Chỉnh sửa

### A. Tệp Thêm Mới
- `backend/celery_app.py`: Khởi tạo Celery Application, cấu hình Dedicated Queues, `task_acks_late=True`, `worker_prefetch_multiplier=1`, cấu hình Celery Beat Schedule và tự động nạp task modules (`celery_app.loader.import_default_modules()`).
- `backend/tasks/grading_tasks.py`: Celery Task `grade_submission` thực thi chấm điểm tự động qua tất cả test cases, lưu kết quả nguyên khối vào `GradingResults`, tính điểm và phát thông báo WebSocket thời gian thực qua Redis Pub/Sub (`ws_updates`).
- `backend/tasks/cleanup_tasks.py`: Các Celery Task bảo trì tự động: `auto_close_expired_rooms`, `terminate_abandoned_sessions`, `prune_old_snapshots`.
- `backend/services/docker_sandbox_service.py`: Lớp điều phối `DockerSandboxService` tích hợp Docker SDK với các cờ cô lập hạt nhân Linux và cơ chế fallback an toàn qua Subprocess Runner cho máy trạm dev.
- `sandbox/runtimes/python/Dockerfile`: Runtime Python 3.11 Alpine với unprivileged user `runner` (UID 1001).
- `sandbox/runtimes/cpp/Dockerfile` & `run.sh`: Runtime GCC 13/12 Alpine với cờ tối ưu hóa `-O3 -std=c++20`.
- `sandbox/runtimes/java/Dockerfile` & `run.sh`: Runtime OpenJDK 17 Alpine kiểm soát bộ nhớ qua `-Xmx`.
- `backend/tests/test_sandbox_and_grading.py`: Bộ kiểm thử tự động 7 test cases bao quát so khớp kết quả, thực thi Python AC/RTE/TLE, biên dịch C++ AC/CE, và tính toàn vẹn của Celery registration.

### B. Tệp Chỉnh Sửa
- `backend/api/submissions.py`:
  - Chuẩn hóa endpoint `POST /api/v1/submissions`: Đẩy tác vụ chấm bài trực tiếp vào Celery queue `grading` thông qua `celery_app.send_task(...)` dùng chung, tránh khởi tạo lặp broker URL.
  - Cập nhật endpoint `POST /api/v1/submissions/run`: Gọi trực tiếp `_run_in_docker_sandbox` với giới hạn 10 giây để học sinh chạy thử nghiệm code với custom input mà không ảnh hưởng CSDL.
- `CHANGELOG.md`: Bổ sung ghi chú phát hành chi tiết cho Giai đoạn 3 & 4.

---

## 3. Các Lỗi Nguy Hiểm Được Phát Hiện và Triệt Tiêu (Zero-Bug Discovery)

Trong quá trình phân tích và thử nghiệm trực tiếp trên Docker Engine, chúng tôi đã phát hiện và xử lý 2 lỗi thiết kế kiến trúc nghiêm trọng:

1. **Lỗi `Permission denied` do cờ `noexec` trên `/tmp` đối với C++ và Java:**
   - *Nguyên nhân:* Để bảo vệ filesystem read-only, cấu hình ban đầu mount `/tmp` với `tmpfs={"/tmp": "size=32m,noexec,nosuid"}`. Tuy nhiên đối với các ngôn ngữ biên dịch như C++ hoặc Java, binary sinh ra tại `/tmp/solution` sẽ bị hạt nhân Linux chặn đứng lệnh gọi hệ thống `execve` với mã lỗi `EACCES` (`sh: 1: /tmp/test: Permission denied`).
   - *Khắc phục:* Tinh chỉnh cờ mount tmpfs thành `size=64m,exec,nosuid,nodev,mode=1777` kết hợp với `user="1001:1001"`. Quyền `exec` cho phép thực thi binary vừa compile, trong khi `nosuid`, `nodev` và `user="1001:1001"` ngăn chặn hoàn toàn việc can thiệp vào thiết bị hoặc chiếm quyền root.

2. **Lỗi Race Condition và Buffer Deadlock khi truyền `stdin` qua Socket Docker:**
   - *Nguyên nhân:* Ban đầu dùng `container.attach_socket()` sau khi `container.start()`. Đối với chương trình chạy nhanh, container thoát trước khi socket kịp gắn; đối với C++, trình biên dịch `g++` đang chạy sẽ nhận luồng stdin của chương trình đích gây hỏng hóc hoặc deadlock socket buffer khi input lớn (>64KB).
   - *Khắc phục:* Chuyển đổi sang mô hình **Stdin File Redirection Deterministic**: Lưu `stdin.txt` vào thư mục tạm trên host được gắn kết chỉ đọc (`/workspace/stdin.txt:ro`), sau đó chuyển hướng luồng `run_cmd` qua `< /workspace/stdin.txt`. Cơ chế này loại bỏ hoàn toàn race condition, tương thích 100% với cả compilation phase lẫn execution phase.

3. **Lỗi Lazy-Loading Module của Celery App trong môi trường kiểm thử:**
   - *Nguyên nhân:* Celery chỉ tự động nạp các module tác vụ trong danh sách `include` khi worker daemon khởi động. Trong môi trường test hoặc script import đơn lẻ, `celery_app.tasks` chưa kịp đăng ký tasks.
   - *Khắc phục:* Thêm lệnh `celery_app.loader.import_default_modules()` ngay cuối file `backend/celery_app.py`, bảo đảm toàn bộ tác vụ luôn sẵn sàng phục vụ kiểm thử và gọi trực tiếp.

---

## 4. Kết Quả Kiểm Thử (Verification)

```text
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\oculide-v1\backend
configfile: pytest.ini
testpaths: tests
collected 10 items

tests/test_sandbox_and_grading.py::test_normalize_and_compare_output PASSED [ 10%]
tests/test_sandbox_and_grading.py::test_python_code_execution_ac PASSED  [ 20%]
tests/test_sandbox_and_grading.py::test_python_runtime_error PASSED      [ 30%]
tests/test_sandbox_and_grading.py::test_python_time_limit_exceeded PASSED [ 40%]
tests/test_sandbox_and_grading.py::test_cpp_code_execution PASSED        [ 50%]
tests/test_sandbox_and_grading.py::test_cpp_compilation_error PASSED     [ 60%]
tests/test_sandbox_and_grading.py::test_celery_task_registration PASSED  [ 70%]
tests/test_security_and_auth.py::test_password_hashing PASSED            [ 80%]
tests/test_security_and_auth.py::test_jwt_access_and_refresh_tokens PASSED [ 90%]
tests/test_security_and_auth.py::test_invalid_token_decoding PASSED      [100%]

======================== 10 passed, 1 warning in 5.54s ========================
```
