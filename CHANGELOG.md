# 📝 Changelog - Oculide v1

Tất cả các thay đổi lớn trong dự án **Oculide v1** được ghi nhận và quản lý tại đây theo định dạng [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

Thư mục chi tiết từng đợt cập nhật: [changelogs/](file:///d:/oculide-v1/changelogs)

## [1.6.0] - 2026-09-28

### 🟢 Added (Thêm mới)
- **Chuẩn Hóa Quy Trình Phát Triển Nhóm & Tự Động Hóa GitHub CI/CD**:
  - **Phân quyền Sở hữu File ([.github/CODEOWNERS](file:///d:/oculide-v1/.github/CODEOWNERS))**:
    - Phân quyền bắt buộc Tech Lead duyệt các thay đổi CSDL (`/database/`), bảo mật (`/backend/core/security.py`), hạ tầng Docker (`docker-compose*.yml`, `Dockerfile*`) và CI/CD workflows.
    - Phân quyền cho lập trình viên Backend và Frontend tự do review chéo mã nguồn tính năng và giao diện.
  - **Kiểm Soát Tiêu Đề PR Chuẩn ([.github/workflows/pr-lint.yml](file:///d:/oculide-v1/.github/workflows/pr-lint.yml))**:
    - Tự động kiểm tra tiêu đề Pull Request theo chuẩn Conventional Commits (`type(scope): description`), khóa nút Merge nếu sai định dạng.
  - **Pipeline CI Song Song ([.github/workflows/ci.yml](file:///d:/oculide-v1/.github/workflows/ci.yml))**:
    - Job `backend-ci`: Tích hợp service Redis container, cài đặt ODBC & dependencies, chạy linter Flake8, thực thi 28 test cases và tự động đẩy báo cáo độ phủ mã nguồn lên Codecov.
    - Job `frontend-ci`: Tự động nhận diện cấu hình Node.js 20, kiểm tra lint, type-check và build giao diện Next.js.
  - **Pipeline CD Tự Động ([.github/workflows/cd.yml](file:///d:/oculide-v1/.github/workflows/cd.yml))**:
    - Tự động đóng gói và xuất bản Docker Image đa tầng cho Backend API và Celery Worker lên GitHub Container Registry (GHCR) khi PR được merge vào nhánh `main`.
    - Tích hợp hook sẵn sàng triển khai qua SSH về máy chủ Production.
  - **Mẫu Biểu Chuẩn Hóa & Cẩm Nang Nhóm**:
    - [.github/pull_request_template.md](file:///d:/oculide-v1/.github/pull_request_template.md): Mẫu PR với checklist 6 bước bắt buộc.
    - [.github/ISSUE_TEMPLATE/](file:///d:/oculide-v1/.github/ISSUE_TEMPLATE/): Mẫu báo lỗi (`bug_report.md`) và yêu cầu tính năng (`feature_request.md`).
    - [CONTRIBUTING.md](file:///d:/oculide-v1/CONTRIBUTING.md): Cẩm nang quy chuẩn phân nhánh (GitHub Flow) và quy tắc Branch Protection cho nhóm 5 người.
- **Nhật ký Chi tiết**:
  - Biên bản [changelogs/2026-09-28_team_workflow_and_github_governance.md](file:///d:/oculide-v1/changelogs/2026-09-28_team_workflow_and_github_governance.md).

---

## [1.5.0] - 2026-09-28

### 🟢 Added (Thêm mới)
- **Hệ Thống Tự Động Phục Hồi & Tự Hàn Gắn (Self-Healing Architecture)**:
  - **Worker Watchdog** ([backend/tasks/cleanup_tasks.py](file:///d:/oculide-v1/backend/tasks/cleanup_tasks.py)):
    - Quét định kỳ mỗi 60 giây qua Celery Beat giải cứu các bài nộp bị kẹt ở trạng thái `grading` >120s khi worker bị `OOMKilled` hoặc host restart.
    - Cơ chế Retry có kiểm soát qua Redis key (`watchdog:retry:{sub_id}`, tối đa 2 lần). Quá 2 lần sẽ tự động chuyển sang `failed`, ghi nhận nguyên nhân vào `GradingResults` và bắn event WebSocket thông báo cho sinh viên để không bị treo giao diện thi.
  - **Sandbox Orphan Reaper** ([backend/services/docker_sandbox_service.py](file:///d:/oculide-v1/backend/services/docker_sandbox_service.py)):
    - Đánh dấu mọi container sandbox với nhãn `labels={"app": "oculide-grader", "created_at": ...}`.
    - Quét định kỳ mỗi 120 giây qua Celery Beat, tự động tiêu diệt và dọn dẹp các container sandbox mồ côi/rác sống quá 30 giây hoặc đã `exited`, giải phóng RAM, Inodes và CPU của Host.
  - **Deep Health Probes & Tự Khởi Động Lại Container** ([backend/main.py](file:///d:/oculide-v1/backend/main.py) & [docker-compose.yml](file:///d:/oculide-v1/docker-compose.yml)):
    - Nâng cấp `/health` kiểm tra đồng thời liveness và readiness của SQL Server (`SELECT 1`) và Redis (`ping()`), trả về mã 503 khi CSDL bị gián đoạn.
    - Bổ sung `/health/liveness` và `/health/readiness` phục vụ Reverse Proxy và Load Balancer.
    - Cấu hình chính sách `restart: unless-stopped` cho toàn bộ 6 dịch vụ trong `docker-compose.yml`.
    - Bổ sung cờ chống rò rỉ RAM `--max-memory-per-child` và `--max-tasks-per-child` cho các Celery worker cùng script probe healthcheck tự động.
- **Bộ Kiểm Thử Tự Động Mới**:
  - [backend/tests/test_self_healing.py](file:///d:/oculide-v1/backend/tests/test_self_healing.py): 7 test cases bao quát liveness, readiness, deep health, sandbox reaper, và watchdog retry/failover.
  - Tổng số lượng test tự động nâng lên **28/28 passed (100%)**.
- **Nhật ký Chi tiết**:
  - Biên bản [changelogs/2026-09-28_self_healing_watchdog_reaper_and_healthchecks.md](file:///d:/oculide-v1/changelogs/2026-09-28_self_healing_watchdog_reaper_and_healthchecks.md).

### 🐛 Fixed & Hardened (Sửa lỗi & Gia cố)
- **Compile Timeout Buffer**: Bổ sung bộ đệm thời gian biên dịch `compile_timeout = max(time_limit, 15)` cho C++ và Java trong `_run_in_subprocess`, triệt tiêu hoàn toàn hiện tượng TLE giả khi CPU máy chủ bị chiếm dụng cao.

---

## [1.4.0] - 2026-09-27

### 🟢 Added (Thêm mới)
- **Containerization & Docker Packaging (Phase 7)**:
  - [backend/Dockerfile](file:///d:/oculide-v1/backend/Dockerfile): Image tinh giản cho FastAPI Core API và Celery Grading Worker (Debian 12 Bookworm, Python 3.11, Microsoft ODBC Driver 18 `msodbcsql18`, Docker CLI giao tiếp qua `/var/run/docker.sock`).
  - [backend/Dockerfile.celery](file:///d:/oculide-v1/backend/Dockerfile.celery): Image chuyên biệt cho AI Proctoring Worker với đầy đủ thư viện Deep Learning và Computer Vision (PyTorch, Ultralytics YOLOv8, MediaPipe, OpenCV, FFmpeg, ODBC Driver 18), đóng gói sẵn pre-trained model `yolov8n.pt`.
- **Nâng cấp DevOps & Tự Động Hóa Vận Hành**:
  - Module [docker-compose.yml](file:///d:/oculide-v1/docker-compose.yml): Kích hoạt Celery Beat Scheduler (`-B`) và mở rộng lắng nghe các hàng đợi `maintenance`, `default` trên container `celery-grading`, đảm bảo các cron job bảo trì CSDL và đóng phòng thi tự động chạy chuẩn xác.
- **Bộ Kiểm Thử Toàn Trình (Full End-to-End Test Suite)**:
  - [backend/tests/test_api_endpoints_and_logic.py](file:///d:/oculide-v1/backend/tests/test_api_endpoints_and_logic.py): 5 test cases bao quát `/health`, cơ chế bảo vệ phân quyền trên các route nhạy cảm, tiếp nhận Webhook LiveKit SFU, và xác thực cấp mới Refresh Token.
  - Tổng số lượng test tự động nâng lên **21/21 passed (100%)**.
- **Nhật ký Chi tiết**:
  - Biên bản [changelogs/2026-09-27_phase7_containerization_and_devops.md](file:///d:/oculide-v1/changelogs/2026-09-27_phase7_containerization_and_devops.md).

---

## [1.3.0] - 2026-09-27

### 🟢 Added (Thêm mới)
- **Động cơ Thị giác Máy tính AI Proctoring (Phase 5)**:
  - Module [ai_workers/detector.py](file:///d:/oculide-v1/ai_workers/detector.py):
    - Đếm và phát hiện khuôn mặt, phát hiện vắng mặt (`no_face_detected`) hoặc có người lạ vào phòng (`multiple_faces`).
    - Ước lượng tư thế đầu 3D (Head Pose: Pitch, Yaw, Roll) từ 468 điểm mốc qua MediaPipe FaceMesh & `cv2.solvePnP` để phát hiện quay đầu rời màn hình.
    - Phát hiện thiết bị cấm qua Ultralytics YOLOv8n (điện thoại di động, sách/tài liệu, màn hình/laptop phụ).
    - Kiến trúc đa tầng (Tiered Architecture) tự động fallback an toàn giữa MediaPipe và OpenCV Haar Cascade.
    - Bộ giải mã ảnh an toàn chống tấn công Decompression Bomb (giới hạn dung lượng payload $\le$ 10MB).
  - Celery Task [backend/tasks/ai_proctoring_tasks.py](file:///d:/oculide-v1/backend/tasks/ai_proctoring_tasks.py):
    - Cơ chế kiểm soát áp lực ngược (Backpressure Drop-Frame Rate Limiting tối đa 1 frame/2s mỗi session qua Redis `ratelimit:ai_frame:{session_id}`).
    - Tự động lưu file snapshot vào thư mục tĩnh `/uploads/snapshots/` và ghi nhận CSDL vào bảng `Snapshots` & `Violations`.
    - Bắn cảnh báo thời gian thực (`violation_alert`) và cập nhật Panoptic Grid (`snapshot_update`) tới giám thị qua Redis Pub/Sub (`ws_updates`).
- **WebRTC LiveKit Streaming & Redis Pub/Sub Cluster Backplane (Phase 6)**:
  - Module [backend/api/livekit.py](file:///d:/oculide-v1/backend/api/livekit.py):
    - Ghi nhận token phát hành vào bảng `LiveKitTokens` để kiểm toán thời gian hiệu lực.
    - Endpoint thu hồi quyền stream `POST /api/v1/livekit/tokens/revoke` khi sinh viên bị đình chỉ thi.
    - Endpoint Webhook `POST /api/v1/livekit/webhook` chuyển tiếp các sự kiện stream (participant joined/left, track published) tới giám thị qua Redis Pub/Sub.
  - Module [backend/main.py](file:///d:/oculide-v1/backend/main.py):
    - Nâng cấp vòng lặp lắng nghe Redis Pub/Sub nền với cơ chế tự động kết nối lại (Auto-Reconnect Resilience) và hỗ trợ mật khẩu Redis.
    - Mount thư mục tĩnh `/uploads` phục vụ truy xuất ảnh snapshot trực tiếp từ frontend.
- **Hệ thống Kiểm thử Tự động**:
  - [backend/tests/test_ai_proctoring_and_livekit.py](file:///d:/oculide-v1/backend/tests/test_ai_proctoring_and_livekit.py): 6 test cases mới nâng tổng số lên **16/16 test suites passed** (100%).
- **Nhật ký Chi tiết**:
  - Biên bản [changelogs/2026-09-27_phase5_phase6_ai_proctoring_and_livekit_pubsub.md](file:///d:/oculide-v1/changelogs/2026-09-27_phase5_phase6_ai_proctoring_and_livekit_pubsub.md).

### 🐛 Fixed & Hardened (Sửa lỗi & Gia cố)
- **Khắc phục xung đột phiên bản MediaPipe (0.10.18 vs 0.10.33+)**:
  - Tự động nhận diện cấu trúc module `mediapipe.solutions` và chuyển đổi sang OpenCV Cascade khi chạy trên môi trường test máy trạm, loại bỏ lỗi `AttributeError`.
- **Triệt tiêu nguy cơ DoS & Tràn RAM Redis khi nhận webcam frame**:
  - Áp dụng cơ chế Atomic Rate Limiting tại Celery worker, tự động drop các khung hình vượt ngưỡng 1 frame/2s.
- **Khắc phục lỗi Silent Disconnect của Redis Pub/Sub Listener**:
  - Bổ sung cơ chế auto-reconnect với backoff 3s để hệ thống không bao giờ bị đứt kết nối WebSocket cluster nền khi Redis khởi động lại.

---

## [1.2.0] - 2026-09-27

### 🟢 Added (Thêm mới)
- **Hệ thống Hàng đợi Phân tán Celery (Phase 3)**:
  - Module [backend/celery_app.py](file:///d:/oculide-v1/backend/celery_app.py) cấu hình 4 hàng đợi chuyên biệt (`grading`, `proctoring`, `maintenance`, `default`), kích hoạt `task_acks_late=True`, `worker_prefetch_multiplier=1`, định dạng serialization JSON an toàn.
  - Bộ tác vụ bảo trì định kỳ [backend/tasks/cleanup_tasks.py](file:///d:/oculide-v1/backend/tasks/cleanup_tasks.py):
    - `auto_close_expired_rooms`: Tự động đóng phòng thi quá giờ `end_time` (mỗi phút).
    - `terminate_abandoned_sessions`: Cập nhật trạng thái `abandoned` cho phiên mồ côi (mỗi 5 phút).
    - `prune_old_snapshots`: Xóa ảnh webcam cũ hơn 30 ngày giải phóng dung lượng đĩa (mỗi 24 giờ).
- **Hệ thống Chấm bài Docker Sandbox Độc lập (Phase 4)**:
  - Module [backend/services/docker_sandbox_service.py](file:///d:/oculide-v1/backend/services/docker_sandbox_service.py):
    - Khởi tạo container Docker cô lập tuyệt đối với: `network_mode="none"`, `mem_limit="128m"`, `pids_limit=64`, `read_only=True`, `tmpfs={"/tmp": "size=64m,exec,nosuid,nodev,mode=1777"}`, `cap_drop=["ALL"]`, `security_opt=["no-new-privileges:true"]`, `user="1001:1001"`.
    - Hỗ trợ đa ngôn ngữ: Python 3.11 (`python:3.11-alpine`), C++20 (`gcc:12`), Java 17 (`eclipse-temurin:17-alpine`).
    - Cơ chế chuyển hướng Stdin qua file (`< /workspace/stdin.txt`) loại bỏ triệt để race condition và socket buffer deadlock.
    - Bộ so khớp kết quả thông minh: Chuẩn hóa ngắt dòng `\r\n` -> `\n`, so khớp sai số số thực ($\le 10^{-4}$), và so khớp chuỗi token độc lập khoảng trắng.
    - Cơ chế Fallback sang Subprocess Runner với `sys.executable` và bắt lỗi `FileNotFoundError` khi môi trường dev chưa có Docker.
  - Celery Task [backend/tasks/grading_tasks.py](file:///d:/oculide-v1/backend/tasks/grading_tasks.py): Chấm điểm bài nộp qua toàn bộ test cases, lưu kết quả nguyên khối vào `GradingResults`, tính điểm và phát thông báo WebSocket thời gian thực qua Redis Pub/Sub (`ws_updates`).
  - Container Runtimes: Thư mục [sandbox/runtimes/](file:///d:/oculide-v1/sandbox/runtimes) cho Python, C++, Java.
- **Bộ Kiểm thử Tự động**:
  - [backend/tests/test_sandbox_and_grading.py](file:///d:/oculide-v1/backend/tests/test_sandbox_and_grading.py): 7 test cases bao quát chuẩn hóa output, chạy code AC/RTE/TLE, biên dịch C++ AC/CE, và tính toàn vẹn đăng ký Celery (10/10 test suites passed).
- **Nhật ký Chi tiết**:
  - Biên bản [changelogs/2026-09-27_phase3_phase4_celery_and_docker_sandbox.md](file:///d:/oculide-v1/changelogs/2026-09-27_phase3_phase4_celery_and_docker_sandbox.md).

### 🐛 Fixed & Hardened (Sửa lỗi & Gia cố)
- **Triệt tiêu lỗi `Permission denied` khi chạy C++/Java trong Docker**:
  - Tinh chỉnh cờ mount tmpfs từ `noexec` sang `exec,nosuid,nodev,mode=1777`, cho phép thực thi binary vừa compile nhưng vẫn ngăn chặn can thiệp kernel thiết bị và leo thang đặc quyền.
- **Khắc phục lỗi Socket Race Condition khi truyền Stdin vào Container**:
  - Chuyển từ socket attach không đồng bộ sang mount `stdin.txt` chỉ đọc và chuyển hướng đầu vào bằng shell redirection `< /workspace/stdin.txt`.
- **Đồng bộ hóa kết nối Celery**:
  - Sửa `api/submissions.py` để sử dụng `from celery_app import celery_app` dùng chung cấu hình broker password thay vì khởi tạo client riêng lẻ.

---

## [1.1.0] - 2026-09-27


### 🟢 Added (Thêm mới)
- **Tầng Quản lý Kết nối CSDL (Connection Pooling)**:
  - Module [backend/core/database.py](file:///d:/oculide-v1/backend/core/database.py) tích hợp SQLAlchemy 2.0 `QueuePool` (20 kết nối thường trực, 30 max overflow, tự động recycle) và Context Manager `get_db_cursor(commit=True)` quản lý giao dịch nguyên khối.
- **Data Access Layer (DAL) mới**:
  - [backend/database/snapshot_db.py](file:///d:/oculide-v1/backend/database/snapshot_db.py) (thao tác bảng `Snapshots`).
  - [backend/database/system_log_db.py](file:///d:/oculide-v1/backend/database/system_log_db.py) (thao tác bảng `SystemLogs`).
  - [backend/database/livekit_token_db.py](file:///d:/oculide-v1/backend/database/livekit_token_db.py) (thao tác bảng `LiveKitTokens`).
  - [backend/database/scoreboard_db.py](file:///d:/oculide-v1/backend/database/scoreboard_db.py) (bảng điểm thời gian thực & Stored Procedures `sp_GetStudentExamResults`, `sp_GetOnlineStudents`).
- **Endpoints API Mới**:
  - `GET /api/v1/rooms/{id}/scoreboard`: Bảng điểm tổng hợp thời gian thực.
  - `GET /api/v1/rooms/{id}/config`: Cấu hình runtime và giới hạn sandbox của phòng.
  - `PUT /api/v1/questions/{id}/test-cases/{tc_id}`: Chỉnh sửa dữ liệu test case.
  - `GET /api/v1/admin/system/overview`: Thống kê tổng thể tài nguyên hệ thống.
  - `GET /api/v1/admin/logs`: Tra cứu nhật ký kiểm toán hệ thống có lọc và phân trang.
  - `POST /api/v1/auth/refresh`: Cấp lại access token qua refresh token dài hạn.
  - `GET /api/v1/auth/login/google`, `/callback/google`, `/login/github`, `/callback/github`.
- **Hệ thống Kiểm thử Tự động**:
  - [backend/pytest.ini](file:///d:/oculide-v1/backend/pytest.ini) và bộ test suite [backend/tests/test_security_and_auth.py](file:///d:/oculide-v1/backend/tests/test_security_and_auth.py).
- **Nhật ký Chi tiết**:
  - Biên bản thay đổi chi tiết [changelogs/2026-09-27_phase1_phase2_security_and_database_hardening.md](file:///d:/oculide-v1/changelogs/2026-09-27_phase1_phase2_security_and_database_hardening.md).

### 🔒 Security Hardening (Gia cố An ninh)
- **Bảo vệ WebSocket Real-time**:
  - Endpoint `/ws/{room_id}/{user_id}` bắt buộc xác thực qua JWT Token query param.
  - Chống giả mạo định danh Giám thị (`proctor_`) và sinh viên khác (ID Spoofing).
  - Kiểm tra điều kiện ghi danh phòng thi trước khi chấp thuận kết nối.
  - Kiểm soát phân quyền lệnh `kick_student` và `send_hint` (chỉ cho phép Giám thị/Admin).
  - Tích hợp Ping-Pong Heartbeat phát hiện rớt mạng.
- **Triệt tiêu Lỗ hổng IDOR**:
  - Bổ sung xác minh quyền sở hữu tài nguyên trên `api/sessions.py` (xem/kết thúc phiên), `api/submissions.py` (kết quả chấm test case), và `api/violations.py` (nhật ký vi phạm).
- **Phân loại Token & Chống Trùng lặp Khách**:
  - Cơ chế Refresh Token 7 ngày với cờ phân loại `token_type: "access" | "refresh"`.
  - Sinh username khách ngẫu nhiên an toàn qua `secrets.token_hex(4)` thay vì chuỗi cố định.
- **Ràng buộc Máy trạng thái Phiên thi (Session State Machine)**:
  - Kiểm tra khung thời gian thi hợp lệ (`start_time` / `end_time`).
  - Kiểm soát giới hạn số lần làm bài `max_attempts`.
  - Tái sử dụng phiên active hiện tại, chặn đứng việc sinh phiên rác.

### ⚡ Performance & Optimization
- **Triệt tiêu Lỗi N+1 Queries**:
  - Viết lại hàm `get_questions_by_room` sử dụng batch query `IN (...)`, giảm từ $1 + N$ queries xuống 2 queries duy nhất.
  - Tối ưu `get_room_dashboard` gom nhóm toàn bộ dữ liệu sinh viên trong 1 câu truy vấn JOIN duy nhất.

---

## [1.0.0] - 2026-09-10

### 🟢 Added (Thêm mới)
- **Cơ sở dữ liệu**:
  - File kịch bản DDL chuẩn hóa [database/schema.sql](file:///d:/oculide-v1/database/schema.sql) với 13 bảng quan hệ, ràng buộc toàn vẹn, indexes, stored procedures, views và triggers.
  - Script khởi tạo tự động [database/init-db.sh](file:///d:/oculide-v1/database/init-db.sh) phục vụ container SQL Server.
- **Tài liệu & Đặc tả API**:
  - Tài liệu thiết kế kiến trúc [docs/api/API_DESIGN.md](file:///d:/oculide-v1/docs/api/API_DESIGN.md).
  - Đặc tả OpenAPI 3.0 hoàn chỉnh [docs/api/openapi.yaml](file:///d:/oculide-v1/docs/api/openapi.yaml) với 27 RESTful endpoints.
- **Khung mã nguồn Backend FastAPI**:
  - `backend/core/`: [config.py](file:///d:/oculide-v1/backend/core/config.py), [security.py](file:///d:/oculide-v1/backend/core/security.py), [permissions.py](file:///d:/oculide-v1/backend/core/permissions.py).
  - `backend/schemas/`: Hệ thống Pydantic DTOs cho 9 phân hệ (Auth, Admin, Room, Question, Submission, Session, Violation, Chat, LiveKit).
  - `backend/database/`: Tầng truy cập dữ liệu (DAL) tương thích 100% với tên bảng mới.
  - `backend/api/`: 9 APIRouters chuẩn RESTful `/api/v1/...`.
  - `backend/websocket/`: [connection_manager.py](file:///d:/oculide-v1/backend/websocket/connection_manager.py) quản lý kết nối realtime theo phòng.
  - `backend/main.py`: Entrypoint FastAPI tích hợp CORS, health check `/health`, WebSocket `/ws/{room_id}/{user_id}`.
  - `backend/requirements.txt`: Khai báo phụ thuộc backend.
- **Quy chuẩn ghi nhật ký**:
  - Thư mục [changelogs/](file:///d:/oculide-v1/changelogs) kèm hướng dẫn [changelogs/README.md](file:///d:/oculide-v1/changelogs/README.md) và biên bản chi tiết [changelogs/2026-09-10_database_and_api_redesign.md](file:///d:/oculide-v1/changelogs/2026-09-10_database_and_api_redesign.md).

### 🔄 Changed (Chỉnh sửa / Chuẩn hóa)
- Đổi tên 8 bảng CSDL sang tên trực quan, phản ánh chính xác nghiệp vụ (loại bỏ tiền tố thừa `Exam...` và `Student...`):
  - `ExamRooms` ➡️ `Rooms` (bổ sung cột `passcode`)
  - `ExamQuestions` ➡️ `Questions`
  - `StudentEnrollments` ➡️ `Enrollments`
  - `StudentSubmissions` ➡️ `Submissions` (bổ sung trạng thái `saved` cho classroom mode)
  - `ExamSessions` ➡️ `Sessions`
  - `ViolationLogs` ➡️ `Violations`
  - `WebcamSnapshots` ➡️ `Snapshots`
  - `ChatMessages` ➡️ `Messages`
- Nâng cấp API endpoints lên chuẩn phiên bản `/api/v1/...` (đồng thời giữ alias tương thích ngược).

### 🔴 Removed (Xóa bỏ)
- Xóa file `schema.sql` ở thư mục gốc sau khi đã di chuyển an toàn vào `database/schema.sql`.
