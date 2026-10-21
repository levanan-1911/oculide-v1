# 🎓 Oculide v1 - Laboratory Monitoring & AI Proctoring System (LMS)

> **Hệ thống giám sát phòng thực hành lập trình trực tuyến & Gác thi bằng Trí tuệ Nhân tạo (AI)**  
> Chuẩn đặc tả: **IEEE 830-1998 Specification** | Giai đoạn: **Capstone 1 (Tập trung Bài thi & Thực hành Lập trình)**

---

## 📌 1. Giới Thiệu Tổng Quan (Overview)

**Oculide v1** là nền tảng quản lý phòng thực hành và tổ chức thi lập trình trực tuyến toàn diện, tích hợp công nghệ giám sát thời gian thực bằng AI và WebRTC. Hệ thống hỗ trợ sinh viên viết code trực tiếp trên trình duyệt, chấm điểm tự động qua Docker Sandbox cô lập, đồng thời hỗ trợ Giảng viên và Giám thị theo dõi toàn diện phòng thi qua lưới video đa điểm (Panoptic Grid).

### 🌟 Tính năng trọng tâm Capstone 1:
- **Online Code Editor & Auto-Save**: Trình soạn thảo mã nguồn tích hợp Monaco Editor, tự động lưu nháp (`CodeDrafts`) phòng mất điện, sập mạng.
- **Docker Sandbox Auto-Grader**: Chấm điểm tự động và đo lường tài nguyên (thời gian chạy, dung lượng RAM) trên môi trường cô lập bảo mật.
- **Pre-exam Device Checks**: Kiểm tra điều kiện phần cứng (Webcam, Mic, Mạng) trước khi cấp quyền làm bài.
- **AI Proctoring & Human Verification**: AI phát hiện hành vi nghi vấn (vắng mặt, nhiều người, dùng điện thoại, chuyển tab). Tuân thủ đạo đức AI: **AI chỉ sinh cảnh báo (`pending`), Giám thị mới là người kết luận vi phạm (`confirmed` / `rejected`)**.
- **Real-time LiveKit SFU & Emergency Support**: Truyền phát video trực tiếp qua LiveKit WebRTC và kênh cứu hộ sự cố kỹ thuật khẩn cấp (`SupportRequests`).

---

## 🛠️ 2. Kiến Trúc Ngăn Xếp Công Nghệ (Tech Stack)

| Thành phần | Công nghệ sử dụng | Mục đích / Vai trò |
| :--- | :--- | :--- |
| **Backend Core** | FastAPI (Python 3.11), Uvicorn | RESTful API hiệu năng cao, WebSocket realtime, async I/O |
| **Database** | Microsoft SQL Server 2022 (T-SQL) | CSDL quan hệ chính (17 bảng chuẩn hoá ACID) |
| **Caching & Pub/Sub** | Redis 7 Alpine | Lưu trữ token, quản lý phiên và làm Message Broker cho Celery & WebSocket |
| **Async Tasks** | Celery 5.3 | Xử lý tác vụ nền: Phân tích khung hình AI, xếp hàng chấm bài code |
| **AI Proctoring** | Ultralytics YOLOv8, MediaPipe, OpenCV | Phát hiện vật thể gian lận (điện thoại), nhận diện khuôn mặt, ánh mắt |
| **Video Streaming** | LiveKit SFU (WebRTC) | Truyền tải luồng webcam và màn hình độ trễ cực thấp (< 300ms) |
| **Execution Sandbox** | Docker Engine SDK | Chạy code sinh viên trong container cô lập (Python, C++, Java) |
| **Frontend Web** | Next.js 14, React 18, TypeScript, TailwindCSS | Giao diện Single Page Application (SPA), Monaco Editor, Panoptic Grid |

---

## 📁 3. Chi Tiết Cấu Trúc Thư Mục & Chức Năng Từng File (File Directory Breakdown)

```text
oculide-v1/
├── 📂 backend/                      # Mã nguồn máy chủ Backend Core (FastAPI)
├── 📂 frontend/                     # Ứng dụng giao diện người dùng (Next.js 14 App Router)
├── 📂 ai_workers/                   # Worker phân tích thị giác máy tính AI Proctoring
├── 📂 sandbox/                      # Hạ tầng Docker Sandbox thực thi code an toàn
├── 📂 livekit/                      # Cấu hình LiveKit SFU WebRTC Streaming
├── 📂 database/                     # Quản lý CSDL SQL Server (Schema, Migrations, Seeds)
├── 📂 nginx/                        # Cấu hình Reverse Proxy & SSL Routing
├── 📂 scripts/                      # Bộ công cụ & Script bảo trì tự động
├── 📂 docs/                         # Tài liệu đặc tả kỹ thuật, hướng dẫn & SRS
├── 📂 changelogs/                   # Nhật ký ghi nhận toàn bộ thay đổi dự án
├── .env.example                     # File mẫu biến môi trường
├── .gitignore                       # Danh sách loại trừ kiểm soát phiên bản Git
└── docker-compose.yml               # Cấu hình điều phối container đa dịch vụ
```

---

### 📂 Chi tiết thư mục `backend/`

```text
backend/
├── 📄 main.py                       # Điểm khởi chạy FastAPI, cấu hình CORS, Lifespan Redis Pub/Sub, Health probes, Đăng ký Router
├── 📄 celery_app.py                 # Khởi tạo Celery Application kết nối Redis Broker
├── 📄 requirements.txt              # Danh sách thư viện Python phụ thuộc
├── 📄 Dockerfile                    # Kịch bản đóng gói container Backend
│
├── 📂 core/                         # Các module hạ tầng dùng chung (Cross-cutting Concerns)
│   ├── 📄 config.py                 # Đọc cấu hình biến môi trường (.env), chuỗi kết nối CSDL (ODBC SQL Server)
│   ├── 📄 database.py               # Quản lý connection pool, hàm ping kiểm tra sức khỏe CSDL
│   ├── 📄 security.py               # Băm mật khẩu (bcrypt), sinh và giải mã JWT Access/Refresh Token
│   └── 📄 permissions.py            # Middleware phân quyền RBAC (get_current_user, instructor_or_admin_required, admin_required)
│
├── 📂 schemas/                      # Tầng Pydantic DTO (Data Transfer Objects) - Validate dữ liệu Request/Response
│   ├── 📄 auth.py                   # Schema Đăng ký, Đăng nhập, Đổi mật khẩu, Token
│   ├── 📄 admin.py                  # Schema Thống kê quản trị, Cập nhật trạng thái người dùng
│   ├── 📄 room.py                   # Schema Tạo phòng, Cập nhật phòng, Lọc phòng thi/thực hành
│   ├── 📄 question.py               # Schema Câu hỏi lập trình (coding, essay), Test case (đã loại bỏ trắc nghiệm)
│   ├── 📄 submission.py             # Schema Nộp bài, Kết quả chạy test case tự động
│   ├── 📄 session.py                # Schema Quản lý phiên làm bài của thí sinh
│   ├── 📄 violation.py              # Schema Ghi nhận cảnh báo AI & Duyệt vi phạm (review_status)
│   ├── 📄 draft.py                  # Schema Lưu/Khôi phục bài nháp code tự động (CodeDrafts)
│   ├── 📄 device_check.py           # Schema Kết quả kiểm tra thiết bị phần cứng trước khi thi (DeviceChecks)
│   ├── 📄 support.py                # Schema Yêu cầu cứu hộ & Hỗ trợ kỹ thuật khẩn cấp (SupportRequests)
│   ├── 📄 classes.py                # Schema Quản lý lớp học phần (Classes)
│   ├── 📄 chat.py                   # Schema Tin nhắn trao đổi phòng thi / Chat riêng
│   └── 📄 livekit.py                # Schema Yêu cầu cấp phát Token LiveKit SFU
│
├── 📂 database/                     # Tầng Truy Cập Dữ Liệu (DAL / Repositories) giao tiếp T-SQL SQL Server
│   ├── 📄 user_db.py                # Thao tác CRUD bảng Users, kiểm tra trùng lặp tài khoản
│   ├── 📄 room_db.py                # Thao tác CRUD bảng Rooms, tra cứu passcode, kiểm tra thời gian thi
│   ├── 📄 enrollment_db.py          # Thao tác bảng Enrollments, phân bổ thí sinh vào phòng
│   ├── 📄 question_db.py            # Thao tác bảng Questions & TestCases, cấu hình điểm số
│   ├── 📄 submission_db.py          # Thao tác bảng Submissions & GradingResults, tổng hợp điểm
│   ├── 📄 session_db.py             # Thao tác bảng Sessions, quản lý vòng đời phiên làm bài
│   ├── 📄 violation_db.py           # Thao tác bảng Violations, ghi nhận sự kiện và cập nhật review_status
│   ├── 📄 draft_db.py               # Thao tác bảng CodeDrafts với lệnh nguyên tử MERGE (Upsert)
│   ├── 📄 device_check_db.py        # Thao tác bảng DeviceChecks, lưu và thống kê trạng thái thiết bị
│   ├── 📄 support_db.py             # Thao tác bảng SupportRequests, cập nhật trạng thái xử lý sự cố
│   ├── 📄 classes_db.py             # Thao tác CRUD bảng Classes, phân nhóm sinh viên theo học phần
│   ├── 📄 chat_db.py                # Thao tác bảng Messages, lưu vết lịch sử trò chuyện
│   └── 📄 admin_db.py               # Truy vấn thống kê dashboard quản trị hệ thống
│
├── 📂 api/                          # Tầng Điều Khiển REST API (Controllers / Routers)
│   ├── 📄 auth.py                   # Endpoint /api/v1/auth (login, register, me, refresh)
│   ├── 📄 admin.py                  # Endpoint /api/v1/admin (users, stats, system monitoring)
│   ├── 📄 rooms.py                  # Endpoint /api/v1/rooms (quản lý phòng thi, danh sách sinh viên)
│   ├── 📄 questions.py              # Endpoint /api/v1/questions (ngân hàng đề bài, cấu hình test cases)
│   ├── 📄 submissions.py            # Endpoint /api/v1/submissions (nộp bài, xem kết quả chấm điểm)
│   ├── 📄 sessions.py               # Endpoint /api/v1/sessions (bắt đầu làm bài, kết thúc phiên, chống IDOR)
│   ├── 📄 violations.py             # Endpoint /api/v1/violations (nhận cảnh báo AI, duyệt vi phạm, thống kê)
│   ├── 📄 drafts.py                 # Endpoint /api/v1/drafts (tự động lưu nháp code, phục hồi khi reload trang)
│   ├── 📄 device_checks.py          # Endpoint /api/v1/device-checks (kiểm tra webcam/mic/mạng trước khi thi)
│   ├── 📄 support.py                # Endpoint /api/v1/support (gửi yêu cầu cứu hộ kỹ thuật, giám thị xử lý)
│   ├── 📄 classes.py                # Endpoint /api/v1/classes (quản lý lớp học phần cho giảng viên)
│   ├── 📄 chat.py                   # Endpoint /api/v1/chat (kênh chat công khai phòng hoặc riêng tư)
│   └── 📄 livekit.py                # Endpoint /api/v1/livekit (cấp token LiveKit SFU cho thí sinh và giám thị)
│
├── 📂 tasks/                        # Celery Background Tasks
│   ├── 📄 ai_proctoring_tasks.py    # Phân tích khung hình webcam, phát hiện bất thường, gửi cảnh báo
│   └── 📄 grading_tasks.py          # Đẩy mã nguồn vào Sandbox thực thi và ghi nhận kết quả test case
│
└── 📂 websocket/                    # Quản lý WebSocket Thời Gian Thực
    └── 📄 connection_manager.py     # Quản lý kết nối WebSocket theo room_id, phát sóng sự kiện realtime
```

---

### 📂 Chi tiết thư mục `database/`

```text
database/
├── 📄 schema.sql                    # Script DDL khởi tạo toàn bộ 17 bảng chuẩn CSDL trên Microsoft SQL Server
├── 📄 init-db.sh                    # Shell script tự động kích hoạt schema.sql trên Docker container khi khởi động lần đầu
├── 📂 migrations/
│   └── 📄 01_capstone1_schema_update.sql  # Script T-SQL di chuyển schema cho Capstone 1 (Bỏ trắc nghiệm, thêm review_status, thêm 4 bảng mới)
└── 📂 seeds/                        # Dữ liệu hạt giống khởi tạo (Default Admin, Test cases mẫu)
```

---

### 📂 Chi tiết các thư mục Hạ Tầng & Nghiệp Vụ Khác

- **`ai_workers/`**: Chứa pipeline xử lý thị giác máy tính với mô hình YOLOv8 phát hiện vật thể khả nghi (điện thoại) và MediaPipe phát hiện khuôn mặt/hướng nhìn.
- **`sandbox/`**: Chứa môi trường runner Docker cô lập (chạy mã Python, C++, Java), giới hạn RAM và thời gian thực thi nghiêm ngặt, chống tấn công hệ thống (RCE).
- **`livekit/`**: Hạ tầng máy chủ LiveKit SFU phục vụ phát trực tiếp video WebRTC băng thông tối ưu cho phòng thi đông người.
- **`nginx/`**: Cấu hình định tuyến Reverse Proxy phân phối tải giữa Frontend, Backend API, WebSocket và WebRTC.
- **`docs/`**: Chứa tài liệu đặc tả yêu cầu phần mềm (**SRS**), biểu đồ kiến trúc hệ thống, hướng dẫn di chuyển CSDL [`docs/HUONG_DAN_MIGRATION_CAPSTONE1.md`](file:///d:/oculide-v1/docs/HUONG_DAN_MIGRATION_CAPSTONE1.md), và quy chuẩn phát triển [`docs/QUY_CHUAN_PHAT_TRIEN_OCULIDE.md`](file:///d:/oculide-v1/docs/QUY_CHUAN_PHAT_TRIEN_OCULIDE.md).
- **`changelogs/`**: Lưu trữ toàn bộ biên bản nhật ký thay đổi kiến trúc và mã nguồn qua các đợt cập nhật lớn (xem mục 5).

---

## 🚀 4. Hướng Dẫn Cài Đặt & Khởi Chạy (Quickstart Guide)

### 📋 Yêu cầu tiên quyết:
- **Docker Desktop** (phiên bản mới nhất)
- **Git**
- Đã sao chép file cấu hình môi trường:
  ```powershell
  copy .env.example .env
  ```

### ⚡ Khởi chạy toàn bộ hệ thống bằng Docker:
```powershell
# Khởi động cụm dịch vụ (SQL Server, Redis, Backend, Celery, LiveKit, Frontend)
docker compose up -d
```

### 🔍 Kiểm tra trạng thái hoạt động:
- **FastAPI Swagger Docs**: `http://localhost:8000/docs`
- **Health Check Probe**: `http://localhost:8000/health`
- **Frontend Portal**: `http://localhost:3000`
- **SQL Server**: `localhost:1433` (User: `sa`, Password cấu hình trong `.env`)

---

## 📝 5. Quản Lý Nhật Ký Thay Đổi (Changelogs Index)

Mọi thay đổi trong dự án đều được ghi lại chi tiết tại thư mục [`changelogs/`](file:///d:/oculide-v1/changelogs/):
- **[2026-10-21]**: [Chuẩn Hóa CSDL & Bổ Sung Module API Cho Capstone 1](file:///d:/oculide-v1/changelogs/2026-10-21_capstone1_db_and_api_modular_upgrade.md) *(Bỏ trắc nghiệm, AI Alert Review, CodeDrafts, DeviceChecks, SupportRequests, Classes)*
- **[2026-09-28]**: [Chuẩn Hóa Quy Trình Phát Triển Nhóm & Tự Động Hóa GitHub CI/CD](file:///d:/oculide-v1/changelogs/2026-09-28_team_workflow_and_github_governance.md)
- **[2026-09-28]**: [Hệ Thống Tự Phục Hồi, Giám Sát Sức Khỏe & Quản Lý Tiến Trình](file:///d:/oculide-v1/changelogs/2026-09-28_self_healing_watchdog_reaper_and_healthchecks.md)
- **[2026-09-27]**: [Đóng Gói Container & Thiết Lập Môi Trường DevOps](file:///d:/oculide-v1/changelogs/2026-09-27_phase7_containerization_and_devops.md)
- **[2026-09-27]**: [Tích Hợp AI Proctoring, LiveKit WebRTC & Redis Pub/Sub](file:///d:/oculide-v1/changelogs/2026-09-27_phase5_phase6_ai_proctoring_and_livekit_pubsub.md)
- **[2026-09-27]**: [Hạ Tầng Celery Background Tasks & Docker Sandbox Auto-Grader](file:///d:/oculide-v1/changelogs/2026-09-27_phase3_phase4_celery_and_docker_sandbox.md)
- **[2026-09-27]**: [Bảo Mật Hệ Thống & Gia Cố Cơ Sở Dữ Liệu](file:///d:/oculide-v1/changelogs/2026-09-27_phase1_phase2_security_and_database_hardening.md)
- **[2026-09-10]**: [Chuyển Đổi CSDL & Thiết Kế Lại Toàn Bộ API Oculide v1](file:///d:/oculide-v1/changelogs/2026-09-10_database_and_api_redesign.md)

---
*Dự án Oculide v1 — Được phát triển với mục tiêu công bằng, minh bạch và an toàn trong giáo dục lập trình.*
