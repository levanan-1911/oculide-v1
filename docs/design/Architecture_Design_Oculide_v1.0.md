# ARCHITECTURE DESIGN DOCUMENT
**Project:** OCULIDE – Online Proctoring & Automated Code Assessment System  
**Version:** 1.0  
**Date:** [Ngày/Tháng/Năm]  
**Course:** Capstone Project 1 (CMU-SE 450)  

---

## REVISION HISTORY

| Version | Date | Comments | Author |
| :--- | :--- | :--- | :--- |
| 1.0 | [DD/MM/YYYY] | Initial Release – System Architecture Design | [Tên thành viên] |

---

## TABLE OF CONTENTS
1. Introduction  
   1.1. Project Overview  
   1.2. Purpose & Scope of This Document  
   1.3. Relation to Other Design Documents  
2. Architecture Drivers  
   2.1. Business Constraints  
   2.2. Technical Constraints  
   2.3. Functional Requirements Summary  
   2.4. Quality Attributes & Utility Tree  
3. Architecture Overview & Views  
   3.1. System Context View (C4 Level 1)  
   3.2. Container View (C4 Level 2)  
   3.3. Component & Connector (C&C) View  
   3.4. Module View (Code & Layer Structure)  
   3.5. Activity Diagrams  
   3.6. Sequence Diagrams  
   3.7. Allocation / Deployment View (Docker & Infrastructure)  
4. Architecture Evaluation (ATAM)  
   4.1. Architectural Approaches  
   4.2. Tradeoffs, Sensitivity Points, Risks & Non-Risks  
5. References  

---

## 1. Introduction

### 1.1. Project Overview
**Oculide** là hệ thống thi lập trình trực tuyến tích hợp giám sát thông minh (AI Proctoring) và chấm bài tự động trong môi trường cô lập (Docker Sandbox). Hệ thống phục vụ 3 nhóm người dùng chính:
- **Student (Sinh viên):** Tham gia phòng thi, kiểm tra thiết bị (camera/mic), làm bài thi lập trình trên IDE trực tuyến, nhận gợi ý/chat với giám thị, và nộp bài để hệ thống chấm tự động.
- **Instructor / Proctor (Giảng viên / Giám thị):** Quản lý lớp học, ngân hàng câu hỏi/test case, tạo phòng thi, giám sát trực tiếp qua video WebRTC (LiveKit) và bảng điều khiển real-time (WebSocket), xem xét và xác minh các cảnh báo vi phạm do AI phát hiện, mở khóa/trục xuất sinh viên.
- **Admin (Quản trị viên):** Quản lý người dùng, cấu hình hệ thống (`SystemSettingsManager`), theo dõi nhật ký hệ thống (`system_logs`), sao lưu và giám sát tài nguyên máy chủ.

### 1.2. Purpose & Scope of This Document
Tài liệu **Architecture Design** là một trong ba tài liệu kỹ thuật trọng tâm của bộ **System Architecture & Design**:
1. **Architecture Design (Tài liệu này):** Mô tả cấu trúc tổng thể và sự kết nối giữa các thành phần kỹ thuật cốt lõi gồm: **Frontend (Next.js)**, **Backend (FastAPI)**, **WebSocket**, **Redis**, **Celery**, **SQL Server**, **LiveKit**, và **Docker / Sandbox**.
2. **Database Design:** Thiết kế chi tiết 17 bảng dữ liệu trên SQL Server, ERD, khóa chính/khóa ngoại và ràng buộc (xem `Thuyet_Minh_Thiet_Ke_CSDL_Oculide.docx`).
3. **Algorithm Design:** Mô tả chi tiết thuật toán chấm code tự động, pipeline xử lý hình ảnh AI (YOLO/CV), cơ chế sinh cảnh báo và quy trình giám thị xác minh vi phạm.

---

## 2. Architecture Drivers

### 2.1. Business Constraints
- **Quy mô nhóm & thời gian:** Phát triển theo quy trình Scrum trong khuôn khổ đồ án Capstone Project 1 (CMU-SE 450).
- **Đối tượng sử dụng:** Sinh viên, Giảng viên (Giám thị), Quản trị viên tại môi trường đại học.
- **Phạm vi phiên bản v1.0:** Tập trung vào nền tảng Web (Desktop/Laptop browser có Webcam/Microphone); chưa triển khai ứng dụng di động (Mobile App).

### 2.2. Technical Constraints

| Thành phần | Công nghệ / Phiên bản cố định | Vai trò trong hệ thống |
| :--- | :--- | :--- |
| **Frontend Web App** | Next.js 14.2.15 (App Router), React 18.3, TypeScript 5.6, Tailwind CSS 3.4 | Giao diện cho 3 vai trò (`/admin`, `/instructor`, `/student`), IDE làm bài thi, dashboard giám sát. |
| **WebRTC Streaming Client** | `livekit-client` (^2.24.0) | Kết nối phòng video/audio giám sát với LiveKit Cloud SFU. |
| **Backend Core API** | FastAPI 0.104.1, Uvicorn 0.24.0, Pydantic 2.5 (Python 3.11) | Cung cấp RESTful API (`/api/v1/*`), xác thực JWT (`python-jose`, `bcrypt`), WebSocket server (`/ws/{room_id}/{user_id}`). |
| **Database & ORM** | Microsoft SQL Server 2022 (`mcr.microsoft.com/mssql/server:2022-latest`), SQLAlchemy 2.0.23, `pyodbc` 5.0.1 | Lưu trữ bền vững toàn bộ dữ liệu nghiệp vụ (`ExamSystem`, 17 bảng). |
| **Message Broker & Pub/Sub** | Redis 7 (`redis:7-alpine`) | Làm Broker & Result Backend cho Celery; làm kênh Pub/Sub (`ws_updates`) đẩy sự kiện real-time về FastAPI WebSocket. |
| **Distributed Task Queue** | Celery 5.3.4 + Kombu | Xử lý bất đồng bộ tác vụ chấm bài (`grading`), phân tích AI (`proctoring`), và dọn dẹp định kỳ (`maintenance` via Celery Beat). |
| **Code Execution Sandbox** | Docker SDK (`docker==7.1.0`) + `/var/run/docker.sock` | Thực thi mã nguồn Python, C++, Java trong container cô lập (128MB RAM, 0.5 vCPU, timeout 10s). |
| **Video/Audio SFU** | LiveKit Cloud (`livekit-api==0.5.0`) | Quản lý phòng truyền phát video/audio thời gian thực giữa thí sinh và giám thị. |
| **Containerization** | Docker & Docker Compose (`exam-network` bridge) | Đóng gói và điều phối 6 services (`sqlserver`, `redis`, `backend`, `celery-grading`, `celery-proctoring`, `frontend`). |

### 2.3. Functional Requirements Summary
1. **Authentication & RBAC:** Đăng nhập bằng JWT; phân quyền chặt chẽ tại cả Next.js Middleware (`oculide_token`, `oculide_role`) và FastAPI Dependencies.
2. **Academic & Exam Management:** Quản lý lớp học (`classes`), ghi danh (`enrollments`), ngân hàng câu hỏi (`questions`, `templates`, `test_cases`), và phòng thi (`rooms`).
3. **Exam Taking & Code Auto-Grading:** Kiểm tra thiết bị (`device_checks`), lưu nháp code (`drafts`), nộp bài (`submissions`), chấm bài bất đồng bộ qua Celery + Docker Sandbox (`grading_results`).
4. **Live Proctoring & AI Violation Detection:** Truyền video WebRTC qua LiveKit, chụp ảnh định kỳ (`snapshots`), phân tích AI qua Celery worker (`proctoring`), cảnh báo real-time qua WebSocket, giám thị xác minh vi phạm (`violations`).
5. **Real-time Communication & Operations:** Chat 1-1 / broadcast trong phòng thi (`chat`), gửi gợi ý (`send_hint`), khóa/mở khóa hoặc trục xuất thí sinh (`unlock_student`, `kick_student`), thông báo (`notifications`, SMTP Email).

### 2.4. Quality Attributes & Utility Tree

#### 2.4.1. Quality Attribute Utility Table
*(Thang đo: `H` = High, `M` = Medium, `L` = Low cho mức độ quan trọng **Importance (I)** và độ khó kỹ thuật **Difficulty (D)**)*

| Quality Attribute | Refinement | Scenario Summary | (I, D) |
| :--- | :--- | :--- | :--- |
| **Security** | Code Isolation | Thực thi code của sinh viên trong Docker Sandbox không mạng, giới hạn RAM/CPU, ngăn chặn truy cập file hệ thống. | (H, H) |
| **Security** | Auth & Anti-Spoofing | Xác thực JWT trên cả HTTP & WebSocket; chặn giả mạo `proctor_` hoặc `user_id` của sinh viên khác. | (H, M) |
| **Performance** | Asynchronous Grading | Đẩy bài nộp vào hàng đợi `grading` trên Redis để API trả về ngay, không làm nghẽn luồng thi của hàng trăm sinh viên. | (H, M) |
| **Availability / Reliability** | Zero Lost Tasks & Self-Healing | Bật `task_acks_late`, `task_reject_on_worker_lost` và Celery Beat quét giải cứu bài kẹt / container rác mỗi 1–2 phút. | (H, H) |
| **Scalability** | Horizontal Worker Scaling | Tách riêng `celery-grading` và `celery-proctoring` thành các container độc lập để scale theo tải CPU/RAM. | (M, M) |
| **Usability / Real-time** | Low-latency Monitoring | Cảnh báo vi phạm và trạng thái thí sinh hiển thị lên màn hình giám thị qua WebSocket + Redis Pub/Sub trong < 2 giây. | (H, M) |

#### 2.4.2. Detailed Quality Attribute Scenarios
*(Bảng chi tiết 6 kịch bản chất lượng trọng tâm: Stimulus, Source, Environment, Artifact, Response, Response Measure)*

- **Scenario 1 (Security – Sandbox Isolation):** Sinh viên nộp mã nguồn chứa vòng lặp vô tận hoặc lệnh đọc `/etc/passwd` → Docker Sandbox giới hạn `128MB RAM`, `0.5 CPU`, `timeout 10s`, ngắt mạng → Container bị hủy sau timeout, hệ thống an toàn 100%.
- **Scenario 2 (Performance – Concurrent Submissions):** 100 sinh viên nộp bài cùng lúc → FastAPI đẩy job vào Celery queue `grading` → API phản hồi `< 500ms`, worker xử lý tuần tự theo `concurrency=2` và `prefetch_multiplier=1` không sập server.
- **Scenario 3 (Reliability – Self-Healing Watchdog):** Worker chấm bài bị crash giữa chừng → `task_reject_on_worker_lost=True` trả task về queue; Celery Beat `reap_stuck_submissions` và `reap_orphaned_sandbox_containers` dọn dẹp sau mỗi 60–120 giây.
- **Scenario 4 (Availability – Health Probes & Graceful Degradation):** Redis tạm mất kết nối → FastAPI `/health` báo `degraded`, vòng lặp `redis_listener` tự động retry (exponential backoff 15s–60s) và fallback về bộ nhớ cục bộ cho WebSocket đơn node.
- **Scenario 5 (Security – WebSocket RBAC):** Sinh viên dùng token cá nhân cố gắng kết nối `/ws/{room_id}/proctor_1` hoặc gửi lệnh `kick_student` → FastAPI kiểm tra `role` trong JWT và đóng kết nối ngay với mã `WS_1008_POLICY_VIOLATION`.
- **Scenario 6 (Real-time – Proctoring Alert Latency):** Celery Proctoring phát hiện vi phạm → Publish JSON lên kênh Redis `ws_updates` → FastAPI `redis_listener` nhận và `broadcast_json` qua WebSocket tới giám thị trong `< 2 giây`.

---

## 3. Architecture Overview & Views

### 3.1. System Context View (C4 Level 1)
Mô tả ranh giới của hệ thống **Oculide** và các tác nhân / hệ thống bên ngoài tương tác trực tiếp với nó:
- **Actors:** Student, Instructor (Proctor), Admin.
- **External Systems:** LiveKit Cloud (WebRTC SFU Server), Gmail SMTP Server (Email Notification), Host Docker Daemon (cho Sandbox execution).

> **[CHÈN SƠ ĐỒ 1: Figure 1. System Context Diagram]**  
> *Gợi ý vẽ:* Đặt khối **Oculide System** ở trung tâm. Xung quanh là 3 Actor (Student, Instructor/Proctor, Admin) và 3 External Systems (LiveKit Cloud, SMTP Email Server, Docker Engine). Ghi rõ luồng dữ liệu trên từng mũi tên (HTTPS/WSS, WebRTC Media, SMTP, Docker Socket).

---

### 3.2. Container View (C4 Level 2)
Hệ thống Oculide được phân tách thành các Container thực thi độc lập (theo `docker-compose.yml`):

1. **Web Application (`frontend` – Next.js 14, Port 3000):** Phục vụ SSR/CSR UI cho 3 vai trò, thực hiện RBAC ở Middleware, giao tiếp với Backend qua REST (`/api/v1`) và WebSocket (`/ws`), kết nối trực tiếp LiveKit Cloud để truyền video.
2. **Backend API & WebSocket Server (`backend` – FastAPI, Port 8000):** Xử lý toàn bộ logic nghiệp vụ RESTful, phát hành token LiveKit, quản lý kết nối WebSocket (`ConnectionManager`), và lắng nghe Redis Pub/Sub.
3. **Distributed Message Broker (`redis` – Redis 7, Port 6379):** Hàng đợi nhiệm vụ cho Celery và kênh Pub/Sub `ws_updates`.
4. **Code Grading Worker (`celery-grading` – Celery + Beat):** Tiêu thụ queue `grading`, `maintenance`, `default`; gọi `DockerSandboxService` để biên dịch & chạy test case; chạy Celery Beat định kỳ.
5. **AI Proctoring Worker (`celery-proctoring` – Celery + YOLO/OpenCV):** Tiêu thụ queue `proctoring`, xử lý ảnh snapshot từ thí sinh và sinh cảnh báo vi phạm.
6. **Relational Database (`sqlserver` – SQL Server 2022, Port 1433):** Lưu trữ dữ liệu quan hệ `ExamSystem` (17 bảng).

> **[CHÈN SƠ ĐỒ 2: Figure 2. Container Diagram (C4 Level 2)]**  
> *Gợi ý vẽ:* Vẽ ranh giới hệ thống Oculide chứa 6 container trên (`frontend`, `backend`, `redis`, `celery-grading`, `celery-proctoring`, `sqlserver`) + các container Sandbox tạm thời (`Python/C++/Java Sandbox`). Bên ngoài là Browser của người dùng, LiveKit Cloud và SMTP Server. Ghi rõ giao thức kết nối (`HTTPS`, `WSS`, `TCP/ODBC 1433`, `Redis Protocol 6379`, `Docker Socket`).

---

### 3.3. Component & Connector (C&C) View
Mô tả kiến trúc runtime bên trong **Backend FastAPI** và **Frontend Next.js** cùng các cơ chế kết nối:
- **API Routers Layer:** 20 routers dưới `/api/v1/*` (`auth`, `rooms`, `submissions`, `violations`, `livekit`, `snapshots`, `sessions`, ...).
- **WebSocket ConnectionManager:** Quản lý map `{room_id: {user_id: WebSocket}}`, hỗ trợ `send_personal_message`, `broadcast_json`, heartbeat `ping/pong`.
- **Redis Pub/Sub Listener (`lifespan`):** Task chạy nền `redis_listener()` subscribe kênh `ws_updates` để chuyển tiếp sự kiện từ Celery Worker (vốn chạy ở process khác) sang WebSocket của FastAPI.
- **Core Services:** `DockerSandboxService`, `LiveKitService`, `GradingService`, `EmailService`, `SystemSettingsManager`, `BackupService`, `IDEBehaviorService`.
- **Data Access Layer (`database/*` & `models/*`):** Kết nối SQL Server qua SQLAlchemy & PyODBC.

> **[CHÈN SƠ ĐỒ 3: Figure 3. Component & Connector (C&C) Diagram]**  
> *Gợi ý vẽ:* Thể hiện rõ các thành phần runtime bên trong Frontend (Next.js Middleware, Exam IDE, Proctor Dashboard, LiveKit Client) và Backend (API Routers, WS ConnectionManager, Redis Pub/Sub Listener, Services, Celery Workers, Sandbox Runner) cùng các connector (REST JSON, WebSocket, Redis Pub/Sub, Celery Queue, PyODBC, Docker SDK).

| Thành phần (Component) | Trách nhiệm chính |
| :--- | :--- |
| **Next.js Middleware** | Kiểm tra JWT cookie `oculide_token` & `oculide_role`, điều hướng và chặn truy cập trái phép giữa `/admin`, `/instructor`, `/student`. |
| **FastAPI Routers** | Tiếp nhận HTTP request, validate schema bằng Pydantic, gọi Service/DB layer. |
| **WS ConnectionManager** | Duy trì kết nối hai chiều theo `room_id`, xử lý chat, thông báo, gợi ý, lệnh khóa/mở khóa và trạng thái online/offline. |
| **Redis Broker & Pub/Sub** | Lưu hàng đợi task (`grading`, `proctoring`, `maintenance`) và phát sự kiện real-time qua kênh `ws_updates`. |
| **DockerSandboxService** | Tạo container cô lập cho Python/C++/Java qua Docker SDK, chuẩn hóa & so khớp output (hỗ trợ float tolerance). |
| **LiveKitService** | Giao tiếp Twirp HTTP API với LiveKit Cloud để tạo phòng và cấp phát JWT AccessToken cho thí sinh/giám thị. |

---

### 3.4. Module View (Code & Layer Structure)
Thể hiện cách tổ chức mã nguồn tĩnh theo lớp (Layered & Modular Architecture) trong thư mục `backend/` và `frontend/src/`:
- **Frontend (`frontend/src/`):** `app/(auth)`, `app/admin`, `app/instructor`, `app/student`, `components/`, `hooks/`, `services/`, `store/`, `types/`, `utils/`, `middleware.ts`.
- **Backend (`backend/`):**
  - `api/` (Presentation / Endpoint Layer)
  - `services/` & `tasks/` (Business Logic & Async Worker Layer)
  - `websocket/` (Real-time Gateway Layer)
  - `database/` & `models/` (Data Access & ORM Layer)
  - `core/` (Configuration, Security, Database Engine)

> **[CHÈN SƠ ĐỒ 4: Figure 4. Module View Diagram]**  
> *Gợi ý vẽ:* Vẽ sơ đồ phân lớp từ trên xuống: Presentation Layer (Frontend App Router + FastAPI `api/`) → Business & Async Layer (`services/`, `tasks/`, `websocket/`) → Data Access Layer (`database/`, `models/`) → Infrastructure (`core/`, External SDKs). Không vẽ mũi tên bỏ qua lớp trái quy tắc.

---

### 3.5. Activity Diagrams
Các sơ đồ hoạt động (Activity Diagram) mô tả từng bước xử lý nghiệp vụ và điều phối hệ thống qua các swimlane (Frontend, Backend, Celery, Redis, LiveKit, Docker Sandbox):

1. **Luồng Tham gia Phòng thi & Kiểm tra Thiết bị (Student Exam & Device Check Flow):**
   - **Bước 1:** Sinh viên đăng nhập và chọn phòng thi.
   - **Bước 2:** Frontend kiểm tra Camera/Microphone.
   - **Bước 3:** Backend xác thực ghi danh và lưu kết quả (`POST /api/v1/device-checks`).
   - **Bước 4:** Nếu không đạt → cấu hình lại thiết bị; nếu hợp lệ → tạo phiên thi (`POST /sessions`) và cấp token LiveKit (`POST /livekit/token`).
   - **Bước 5 (Song song):** Kết nối LiveKit SFU (WebRTC) đồng thời mở WebSocket `/ws/{room_id}/{user_id}` (xác thực JWT).
   - **Bước 6–7:** Tải câu hỏi/templates, viết code trên IDE và tự động lưu nháp (`POST /drafts`).
   - **Bước 8–9:** Khi nộp bài hoặc hết giờ → gọi `POST /api/v1/submissions`, đẩy job chấm bài và kết thúc phiên nhập liệu.
   > **[CHÈN SƠ ĐỒ 5: Figure 5. Activity Diagram – Student Exam & Device Check Flow]**

2. **Luồng Chấm Code Tự Động qua Celery & Docker Sandbox (Automated Code Grading Flow):**
   - **Bước 1–2:** Backend nhận `POST /submissions`, lưu trạng thái `Pending`, đẩy job vào Redis queue `grading` và trả về HTTP 202.
   - **Bước 3:** `celery-grading` nhận task (`acks_late=True`), tải danh sách test case và giới hạn tài nguyên.
   - **Bước 4:** Kiểm tra Docker Daemon: nếu sẵn sàng → tạo container cô lập (`128MB` RAM, `0.5` CPU, timeout `10s`); nếu không → fallback Subprocess Runner.
   - **Bước 5:** Chạy từng test case và chuẩn hóa/so khớp output (`\r\n`, Float Tolerance `1e-4`).
   - **Bước 6–7:** Dọn dẹp container, lưu `grading_results` vào SQL Server và publish sự kiện lên Redis `ws_updates`.
   - **Bước 8:** `redis_listener` nhận sự kiện và broadcast điểm về Client qua WebSocket.
   > **[CHÈN SƠ ĐỒ 6: Figure 6. Activity Diagram – Automated Code Grading Flow]**

3. **Luồng Giám sát AI Proctoring & Xác minh Vi phạm (AI Proctoring & Verification Flow):**
   - **Bước 1–2:** Frontend chụp webcam snapshot định kỳ, gửi `POST /api/v1/snapshots` → Backend lưu ảnh (`/uploads`) và đẩy task vào queue `proctoring`.
   - **Bước 3:** `celery-proctoring` chạy mô hình AI (YOLOv8 / MediaPipe).
   - **Bước 4:** Nếu bình thường → kết thúc lượt kiểm tra; nếu phát hiện vi phạm → lưu bảng `violations` và publish cảnh báo lên `ws_updates`.
   - **Bước 5–6:** Dashboard Giám thị hiển thị cảnh báo real-time kèm ảnh bằng chứng; Giám thị xem xét và xác minh.
   - **Bước 7–8:** Nếu chỉ ghi nhận → lưu trạng thái; nếu cần can thiệp → gửi lệnh `unlock_student` / `kick_student` qua WebSocket để áp dụng lên phiên thi của sinh viên.
   > **[CHÈN SƠ ĐỒ 7: Figure 7. Activity Diagram – AI Proctoring & Violation Verification Flow]**

4. **Luồng Vòng đời Phiên thi & Tự phục hồi Định kỳ (Exam Lifecycle & Celery Beat Self-Healing Flow):**
   - **Bước 1:** Celery Beat kích hoạt lịch định kỳ (`60s` / `120s` / `5m` / `24h`).
   - **Bước 2 (Song song 5 tác vụ):** `auto_close_expired_rooms` (60s), `terminate_abandoned_sessions` (5m), `reap_stuck_submissions` (60s), `reap_orphaned_sandbox` (2m), `prune_old_snapshots` (24h).
   - **Bước 3:** Đồng bộ trạng thái vào SQL Server và giải phóng tài nguyên Docker/ổ đĩa.
   > **[CHÈN SƠ ĐỒ 8: Figure 8. Activity Diagram – Exam Lifecycle & Self-Healing Flow]**

---

### 3.6. Sequence Diagrams
Các sơ đồ trình tự (Sequence Diagram) minh họa chi tiết thứ tự thông điệp trao đổi theo thời gian giữa các tiến trình/container:

1. **Luồng Xác thực & Phân quyền WebSocket (JWT + RBAC):**
   - User đăng nhập → `POST /api/v1/auth/...` → nhận JWT → Next.js Middleware bảo vệ route → Client mở `/ws/{room_id}/{user_id}?token=...` → FastAPI kiểm tra token, chống giả mạo `proctor_` và `user_id` → `ConnectionManager.connect()`.
   > **[CHÈN SƠ ĐỒ 9: Figure 9. Authentication & WebSocket Handshake Sequence Diagram]**

2. **Luồng Chấm code tự động (FastAPI → Redis → Celery → Docker Sandbox → WebSocket):**
   - Sinh viên bấm Submit → `POST /api/v1/submissions` lưu DB (`Pending`) → đẩy task vào queue `grading` trên Redis → trả về ngay cho Client → `celery-grading` nhận task → `DockerSandboxService` tạo container cô lập chạy từng test case → lưu `grading_results` vào SQL Server → publish sự kiện lên Redis `ws_updates` → FastAPI `redis_listener` đẩy kết quả về Student/Instructor qua WebSocket.
   > **[CHÈN SƠ ĐỒ 10: Figure 10. Asynchronous Code Grading Sequence Diagram]**  
   > *(Lưu ý: Chi tiết thuật toán so khớp/chấm điểm nằm ở tài liệu Algorithm Design; sơ đồ này tập trung vào luồng giao tiếp giữa các service).*

3. **Luồng Giám sát Video & Cảnh báo AI Proctoring (LiveKit + Celery + WebSocket):**
   - Thí sinh xin token từ `POST /api/v1/livekit/...` → kết nối LiveKit Cloud SFU để stream webcam/screen → đồng thời gửi snapshot định kỳ (`POST /api/v1/snapshots`) → FastAPI đẩy task vào queue `proctoring` → `celery-proctoring` chạy model AI → nếu có vi phạm, lưu SQL Server và publish lên `ws_updates` → WebSocket báo động real-time trên Dashboard Giám thị → Giám thị xem xét và xác minh.
   > **[CHÈN SƠ ĐỒ 11: Figure 11. LiveKit Streaming & AI Proctoring Alert Sequence Diagram]**

---

### 3.7. Allocation / Deployment View (Docker & Infrastructure)
Mô tả ánh xạ các thành phần phần mềm lên môi trường hạ tầng vật lý / container hóa (`docker-compose.yml` & Nginx):
- **Client Tier:** Trình duyệt người dùng (Chrome/Edge/Firefox) kết nối qua HTTPS/WSS.
- **Reverse Proxy / SSL Tier:** `nginx` (Port 80/443) định tuyến traffic tới `frontend:3000` và `backend:8000` (hỗ trợ WebSocket upgrade headers).
- **Application & Worker Tier (Docker Bridge Network `exam-network`):**
  - `exam-frontend` (Next.js 14)
  - `exam-backend` (FastAPI + Uvicorn, mount `/var/run/docker.sock`)
  - `exam-celery-grading` (Celery Worker + Beat, mount `/var/run/docker.sock`)
  - `exam-celery-proctoring` (Celery Worker + volume `yolo_weights`)
  - Ephemeral Sandbox Containers (`python`, `cpp`, `java`) được spawn động trên Host Docker Engine.
- **Data & Messaging Tier:**
  - `exam-sqlserver` (SQL Server 2022 + volume `sqlserver_data`)
  - `exam-redis` (Redis 7 + volume `redis_data`)
- **External Cloud Tier:** LiveKit Cloud (`wss://oculide-exam-4eu7af2s.livekit.cloud`), Gmail SMTP (`smtp.gmail.com:587`).

> **[CHÈN SƠ ĐỒ 12: Figure 12. Deployment & Docker Network Architecture Diagram]**  
> *Gợi ý vẽ:* Vẽ các Deployment Node (Client PC, Reverse Proxy Nginx, Docker Host với network `exam-network` chứa 6 container + các Volume + Sandbox containers, và khối External Cloud cho LiveKit Cloud & SMTP). Ghi rõ tên container, port, và volume đúng như `docker-compose.yml`.

---

## 4. Architecture Evaluation (ATAM)

### 4.1. Architectural Approaches
Hệ thống áp dụng kiến trúc **Modular Monolith kết hợp Event-Driven Asynchronous Workers (Distributed Task Queue & Pub/Sub)**:
- **Core Backend (FastAPI):** Đóng gói các domain module trong một tiến trình API thống nhất để dễ phát triển và triển khai nhanh.
- **Tách tải tính toán nặng (Offloading):** Chấm code (CPU/Memory-bound, cần cô lập bảo mật) và AI Proctoring (CPU/GPU-bound) được tách sang các Celery Worker container riêng biệt qua Redis.
- **Real-time Bridge:** Dùng Redis Pub/Sub (`ws_updates`) làm cầu nối giữa các worker xử lý nền và WebSocket server của FastAPI.
- **Managed Media SFU:** Ủy thác toàn bộ luồng truyền tải video WebRTC nặng nề cho LiveKit Cloud thay vì tự xử lý media qua Backend.

### 4.2. Tradeoffs, Sensitivity Points, Risks & Non-Risks

| Loại phân tích | Điểm phân tích | Giải thích kỹ thuật |
| :--- | :--- | :--- |
| **Tradeoff** | **Bảo mật Sandbox vs. Độ trễ & Tài nguyên** | Spawn Docker container riêng cho mỗi bài nộp đảm bảo cô lập tuyệt đối nhưng tốn thêm thời gian khởi tạo (~200–500ms) và RAM so với chạy `subprocess` trực tiếp. |
| **Tradeoff** | **Single-host Docker Socket vs. Multi-node Scaling** | Mount `/var/run/docker.sock` vào `backend` và `celery-grading` rất tiện lợi cho triển khai Docker Compose, nhưng nếu mở rộng đa máy chủ (multi-node) sau này sẽ cần chuyển sang Kubernetes Jobs hoặc Remote Docker API. |
| **Sensitivity Point** | **Redis Availability** | Redis vừa làm Broker cho Celery vừa làm Pub/Sub cho WebSocket. Nếu Redis quá tải hoặc gián đoạn, việc chấm bài và đẩy cảnh báo real-time sẽ bị ảnh hưởng trực tiếp. |
| **Risk** | **Docker Socket Privilege & Orphan Containers** | Quyền truy cập `/var/run/docker.sock` có rủi ro bảo mật cao nếu container backend bị chiếm quyền; ngoài ra container sandbox bị treo có thể làm cạn tài nguyên host (đã giảm thiểu bằng `reap_orphaned_sandbox_containers` mỗi 2 phút). |
| **Non-Risk** | **LiveKit Video Bandwidth** | Lưu lượng video WebRTC đi thẳng từ Client tới LiveKit Cloud SFU, không đi qua `exam-backend`, nên không gây nghẽn băng thông cho API Server. |

---

## 5. References
1. Tài liệu Database Design: `docs/design/Thuyet_Minh_Thiet_Ke_CSDL_Oculide.docx` & `docs/design/ERD_OCULIDE_MERMAID.mmd`.
2. Tài liệu Đặc tả Yêu cầu Phần mềm (SRS): `docs/C1SE.16_SoftwareRequirementSpecification_OCLIDE_VIE_ver1.0.docx`.
3. Tài liệu Quy chuẩn Phát triển Oculide: `docs/QUY_CHUAN_PHAT_TRIEN_OCULIDE.md`.
4. Cấu hình triển khai: `docker-compose.yml`, `backend/celery_app.py`, `backend/main.py`.
5. Tài liệu chính thức: FastAPI, Next.js 14, Celery 5, Redis 7, LiveKit, Microsoft SQL Server 2022.
