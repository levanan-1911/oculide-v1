# Nhật Ký Thay Đổi & Đánh Giá Mã Nguồn: Hệ Thống Tự Phục Hồi (Self-Healing Watchdog, Sandbox Reaper & Healthcheck Auto-Restart)

**Ngày thực hiện:** 28/09/2026  
**Chuyên gia thiết kế & Review:** Kỹ sư Trưởng Hệ Thống (30+ năm kinh nghiệm)  
**Tiêu chuẩn đáp ứng:** IEEE 830-1998, Zero Data Loss, Cascading Failure Mitigation  
**Trạng thái kiểm thử:** 28/28 passed (100%)

---

## 1. Bối Cảnh & Mục Tiêu Kỹ Thuật (Architectural Context)

Trong một hệ thống thi lập trình trực tuyến có giám sát trực tiếp bằng AI và chấm điểm tự động, các sự cố không thể lường trước (hardware faults, out of memory, network flaps, malicious student payloads) luôn xảy ra ở quy mô sản xuất.

Nếu không có cơ chế tự phục hồi:
1. **Bài nộp bị treo vô hạn:** Khi Worker chấm bài bị hệ điều hành bắn tỉa (`OOMKilled` do sinh viên nộp mã nguồn ngốn RAM), bản ghi trong CSDL vĩnh viễn ở trạng thái `grading`. Sinh viên ngồi đợi kết quả đến hết giờ thi.
2. **Container rác gây cạn kiệt tài nguyên Host:** Khi quá trình giao tiếp giữa Docker Daemon và Worker bị ngắt, container chấm bài tiếp tục chạy ngầm, rò rỉ file descriptors, Inodes và RAM.
3. **Healthcheck giả tạo (False Sense of Security):** Endpoint `/health` trước đây chỉ trả về chuỗi JSON tĩnh `{"status": "healthy"}` mà không kiểm tra liveness thực tế của SQL Server và Redis. Nếu database ngắt kết nối, Docker vẫn coi container là khỏe mạnh và không bao giờ tự kích hoạt khởi động lại.
4. **Tràn bộ nhớ do AI/PyTorch (Memory Fragmentation):** Worker xử lý frame webcam AI liên tục không bao giờ giải phóng triệt để bộ nhớ C-heap trong CPython runtime, dần dần dẫn đến sập toàn bộ dịch vụ.

---

## 2. Chi Tiết Các Thay Đổi & Cơ Chế Vận Hành (Code & Plumbing Changes)

### 2.1. Worker Watchdog (`backend/tasks/cleanup_tasks.py` & `backend/database/submission_db.py`)
- **Hàm DAL:** 
  - `get_stuck_submissions(older_than_seconds=120)`: Sử dụng câu lệnh T-SQL tối ưu với hàm `DATEDIFF(second, submitted_at, GETDATE()) > ?` trên bảng `Submissions` có index `idx_submissions_status`.
  - `mark_submission_failed(submission_id, error_message)`: Atomic transaction cập nhật `status = 'failed'` và ghi nhận lỗi vào bảng `GradingResults` với khóa ngoại `test_case_id` hợp lệ.
- **Tác vụ Celery Watchdog (`reap_stuck_submissions`):**
  - Quét định kỳ mỗi 60 giây qua Celery Beat.
  - Sử dụng Redis key `watchdog:retry:{submission_id}` để đếm số lần tự động thử lại (TTL 3600s).
  - Nếu `retry_count <= 2`: Chuyển trạng thái về `'pending'` và re-dispatch lại tác vụ chấm bài `grade_submission.delay()`.
  - Nếu `retry_count > 2`: Đánh dấu bài nộp là `'failed'`, lưu giải thích rõ ràng và phát WebSocket event thông báo tức thời tới màn hình sinh viên qua kênh `ws_updates`.

### 2.2. Sandbox Orphan Reaper (`backend/services/docker_sandbox_service.py` & `backend/tasks/cleanup_tasks.py`)
- **Gắn nhãn định danh thời gian sống:**
  - Mọi container sinh ra đều gắn nhãn:
    `labels={"app": "oculide-grader", "created_at": str(int(time.time()))}`.
- **Phương thức dọn dẹp:**
  - `cleanup_orphaned_containers(max_age_seconds=30)`: Quét toàn bộ container có nhãn `app=oculide-grader`. Force remove bất kỳ container nào ở trạng thái `exited`/`dead` hoặc đang chạy nhưng vượt quá `max_age_seconds` (trong khi bài nộp bình thường chỉ được chạy tối đa 10s).
- **Tác vụ định kỳ:**
  - `reap_orphaned_sandbox_containers`: Đăng ký vào Celery Beat chạy mỗi 120 giây trên hàng đợi `maintenance`, ghi log cảnh báo chi tiết vào `SystemLogs`.
- **Bộ đệm biên dịch Subprocess (Compile Timeout Buffer):**
  - Bổ sung `compile_timeout = max(time_limit, 15)` cho trình biên dịch C++ (`g++`) và Java (`javac`) để loại trừ hiện tượng TLE giả định khi máy chủ Host bị cao tải CPU.

### 2.3. Deep Health Probes & Tự Khởi Động Lại Container (`backend/main.py` & `docker-compose.yml`)
- **Kiểm tra liveness & readiness sâu:**
  - `GET /health/liveness`: Trả về HTTP 200 `{"status": "alive"}` xác nhận Uvicorn process không bị treo luồng.
  - `GET /health/readiness`: Thực hiện truy vấn `SELECT 1` tới SQL Server qua `ping_database()`. Nếu CSDL ngắt kết nối, trả về HTTP 503 `{"status": "not_ready"}` để Load Balancer / Reverse Proxy ngắt định tuyến lưu lượng tới node này.
  - `GET /health`: Kiểm tra song song SQL Server và Redis, trả về báo cáo thành phần chi tiết và mã HTTP 503 nếu CSDL gặp sự cố.
- **Docker Compose Self-Healing:**
  - Cấu hình chính sách khởi động lại vĩnh viễn: `restart: unless-stopped` cho toàn bộ 6 dịch vụ (`sqlserver`, `redis`, `backend`, `celery-grading`, `celery-proctoring`, `frontend`).
  - Cấu hình cờ tái sinh vòng đời Worker (Anti-Memory Leak):
    - `celery-grading`: `--max-memory-per-child=300000 --max-tasks-per-child=500`
    - `celery-proctoring`: `--max-memory-per-child=400000 --max-tasks-per-child=200`
  - Healthcheck tự động cho Celery Workers qua script ping nội bộ `python -c "from celery_app import celery_app; res = celery_app.control.ping(timeout=2.0); exit(0 if res else 1)"`.

---

## 3. Đánh Giá Mã Nguồn Dưới Góc Nhìn Code Review (Senior Architect Review)

| Tiêu Chí Đánh Giá | Hiện Trạng Sau Khi Sửa Đổi | Đánh Giá & Rủi Ro Tiềm Ẩn Đã Triệt Tiêu |
| :--- | :--- | :--- |
| **Deadlock & Thread Exhaustion** | Tách bạch Liveness (non-blocking) và Readiness (có timeout 2s) | Không làm nghẽn Event Loop của FastAPI khi DB chết. |
| **Poison Pill Tasks** | Sử dụng Redis Key đếm `retry_count <= 2` | Chặn đứng vòng lặp vô hạn nếu sinh viên nộp code cố tình kích nổ segfault trong worker. |
| **Blast Radius (Bán kính ảnh hưởng)** | Container sandbox có label riêng biệt và cách ly mạng `none` | Quá trình reaper chỉ diệt container của chính Oculide, không ảnh hưởng đến container khác của Host. |
| **Downtime trong quá trình tái sinh** | `--max-memory-per-child` tái sinh từng child process tuần tự | Zero downtime: Master process của Celery vẫn giữ kết nối broker trong khi tái sinh worker con. |

---

## 4. Kết Quả Kiểm Thử (Automated Verification)

Tạo mới bộ kiểm thử tự động `backend/tests/test_self_healing.py`:
- `test_health_liveness_endpoint`: PASS
- `test_health_readiness_endpoint` (Kiểm tra phản ứng mã 200 và 503 khi CSDL ngắt kết nối): PASS
- `test_health_deep_check_endpoint` (Kiểm tra báo cáo chi tiết các thành phần): PASS
- `test_sandbox_cleanup_orphaned_containers_mock`: PASS
- `test_reap_orphaned_sandbox_containers_task`: PASS
- `test_reap_stuck_submissions_redispatch`: PASS
- `test_reap_stuck_submissions_max_retries_fail`: PASS

**Toàn bộ hệ thống:** **28/28 tests passed (100%)** trên tất cả các module.
