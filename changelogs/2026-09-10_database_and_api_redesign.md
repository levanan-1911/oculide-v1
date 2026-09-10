# 📌 Nhật Ký Cập Nhật: Chuẩn Hóa CSDL & Thiết Kế Lại Toàn Bộ API Oculide v1

- **Ngày thực hiện:** 2026-09-10
- **Phiên bản:** Oculide v1.0.0
- **Mục đích / Lý do thay đổi:**
  1. Di chuyển file `schema.sql` ở thư mục gốc vào đúng thư mục `database/` theo cấu trúc chuẩn dự án và ánh xạ volume của `docker-compose.yml`.
  2. Đổi tên và chuẩn hóa 13 bảng CSDL để loại bỏ các tiền tố không nhất quán (`Exam...`, `Student...`), do Oculide vận hành cả 2 chế độ: phòng học thường ngày (`classroom`) và phòng thi chính thức (`exam`).
  3. Bổ sung các trường còn thiếu trong schema thực tế (`passcode` trong bảng Rooms, trạng thái `saved` trong Submissions).
  4. Thiết kế lại toàn bộ hệ thống RESTful API sang chuẩn phiên bản `/api/v1/...` dựa trên mã nguồn dự án Oculide cũ (`D:\Oculide`), hoàn thiện tài liệu OpenAPI 3.0 và khung mã nguồn Backend FastAPI chuẩn modular.

---

## 1. Danh Sách File Thay Đổi

### 🟢 Thêm Mới ([NEW])
| Đường dẫn file | Chức năng & Vai trò |
|---|---|
| `database/schema.sql` | Kịch bản DDL tạo CSDL SQL Server với 13 bảng đã chuẩn hóa tên, ràng buộc, SP, View và Trigger |
| `database/init-db.sh` | Shell script tự động khởi tạo CSDL một lần duy nhất cho container SQL Server |
| `docs/api/API_DESIGN.md` | Tài liệu thiết kế kiến trúc API, quy chuẩn RESTful, RBAC, WebSocket và pipelines xử lý |
| `docs/api/openapi.yaml` | Tài liệu đặc tả OpenAPI 3.0 đầy đủ 27 endpoints (sẵn sàng cho Swagger / Postman) |
| `backend/requirements.txt` | Khai báo toàn bộ thư viện phụ thuộc của Backend Python (FastAPI, PyODBC, Celery, LiveKit,...) |
| `backend/core/config.py` | Quản lý biến môi trường Pydantic Settings và hàm kết nối CSDL SQL Server |
| `backend/core/security.py` | Mã hóa mật khẩu bcrypt và phát sinh/giải mã JWT access token |
| `backend/core/permissions.py` | Dependency injection kiểm tra xác thực và phân quyền RBAC (`get_current_user`, `admin_required`) |
| `backend/schemas/auth.py` | Pydantic Request/Response DTOs cho phân hệ Xác thực (Register, Login, Join Room, Profile) |
| `backend/schemas/admin.py` | Pydantic DTOs cho phân hệ Quản trị hệ thống (User CRUD, Role, Status, Batch Import) |
| `backend/schemas/room.py` | Pydantic DTOs cho phân hệ Quản lý Phòng (Create, Update, Dashboard, Public Info) |
| `backend/schemas/question.py` | Pydantic DTOs cho phân hệ Đề bài và Bộ Test Cases |
| `backend/schemas/submission.py` | Pydantic DTOs cho phân hệ Nộp bài, Điểm số và Chạy thử code sandbox |
| `backend/schemas/session.py` | Pydantic DTOs cho phân hệ Phiên làm bài của sinh viên |
| `backend/schemas/violation.py` | Pydantic DTOs cho phân hệ Nhật ký vi phạm và Phân tích ảnh AI |
| `backend/schemas/chat.py` | Pydantic DTOs cho phân hệ Tin nhắn trao đổi realtime |
| `backend/schemas/livekit.py` | Pydantic DTOs cho phân hệ Video Streaming LiveKit SFU |
| `backend/database/user_db.py` | Lớp thao tác dữ liệu (DAL) bảng `Users` |
| `backend/database/room_db.py` | Lớp thao tác dữ liệu bảng `Rooms` mới |
| `backend/database/question_db.py` | Lớp thao tác dữ liệu bảng `Questions` và `TestCases` mới |
| `backend/database/enrollment_db.py` | Lớp thao tác dữ liệu bảng `Enrollments` mới |
| `backend/database/submission_db.py` | Lớp thao tác dữ liệu bảng `Submissions` và `GradingResults` mới |
| `backend/database/session_db.py` | Lớp thao tác dữ liệu bảng `Sessions` mới |
| `backend/database/violation_db.py` | Lớp thao tác dữ liệu bảng `Violations` mới |
| `backend/database/chat_db.py` | Lớp thao tác dữ liệu bảng `Messages` mới |
| `backend/services/livekit_service.py` | Service kết nối máy chủ LiveKit SFU (tạo/xóa room, cấp access token) |
| `backend/websocket/connection_manager.py` | Quản lý kết nối WebSocket tập trung theo phòng |
| `backend/api/auth.py` | APIRouter cho `/api/v1/auth` |
| `backend/api/admin.py` | APIRouter cho `/api/v1/admin` |
| `backend/api/rooms.py` | APIRouter cho `/api/v1/rooms` |
| `backend/api/questions.py` | APIRouter cho `/api/v1/questions` |
| `backend/api/submissions.py` | APIRouter cho `/api/v1/submissions` |
| `backend/api/sessions.py` | APIRouter cho `/api/v1/sessions` |
| `backend/api/violations.py` | APIRouter cho `/api/v1/violations` |
| `backend/api/chat.py` | APIRouter cho `/api/v1/chat` |
| `backend/api/livekit.py` | APIRouter cho `/api/v1/livekit` |
| `backend/main.py` | File chạy chính của FastAPI Backend, đăng ký middleware CORS, routers và WebSocket |
| `changelogs/README.md` | Tài liệu hướng dẫn quy chuẩn ghi nhật ký phát triển |

### 🔴 Xóa Bỏ ([DELETE])
| Đường dẫn file cũ | Lý do xóa bỏ |
|---|---|
| `schema.sql` (ở thư mục gốc) | Di chuyển vào thư mục `database/schema.sql` để đúng vị trí phân cấp và khớp mount của `docker-compose.yml` |

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật

### 2.1 Cơ Sở Dữ Liệu SQL Server
- Đổi tên 8 bảng CSDL sang tên trực quan, chuẩn miền nghiệp vụ:
  - `ExamRooms` ➡️ **`Rooms`** (bổ sung cột `passcode NVARCHAR(50) NULL`)
  - `ExamQuestions` ➡️ **`Questions`**
  - `StudentEnrollments` ➡️ **`Enrollments`**
  - `StudentSubmissions` ➡️ **`Submissions`** (check constraint status bổ sung thêm giá trị `'saved'` cho classroom mode)
  - `ExamSessions` ➡️ **`Sessions`**
  - `ViolationLogs` ➡️ **`Violations`** (hỗ trợ các loại vi phạm: `tab_switch`, `copy_paste`, `no_face_detected`, `multiple_faces`, `phone_detected`, `suspicious_object`, `fullscreen_exit`, `camera_blocked`, `time_exceeded`, `inactive_30s`, `multiple_people`)
  - `WebcamSnapshots` ➡️ **`Snapshots`**
  - `ChatMessages` ➡️ **`Messages`**
- Đã cập nhật 100% tên khóa ngoại (Foreign Keys), Index, Trigger (`tr_Users_UpdateTimestamp`, `tr_Rooms_UpdateTimestamp`, `tr_Questions_UpdateTimestamp`), Stored Procedures (`sp_GetStudentViolationStats`, `sp_GetStudentExamResults`, `sp_GetOnlineStudents`) và Views (`vw_RoomOverview`, `vw_ViolationReport`).

### 2.2 Kiến Trúc Backend RESTful API
- Chuẩn hóa toàn bộ URI sang prefix `/api/v1/...`:
  - `/api/v1/auth`
  - `/api/v1/admin`
  - `/api/v1/rooms`
  - `/api/v1/questions`
  - `/api/v1/submissions`
  - `/api/v1/sessions`
  - `/api/v1/violations`
  - `/api/v1/chat`
  - `/api/v1/livekit`
- Đồng thời giữ lại các alias cũ `/api/...` để tương thích ngược hoàn hảo.
- Tách biệt hoàn toàn tầng DTO Validation (`schemas/`), tầng dữ liệu (`database/`), tầng điều phối API (`api/`) và tầng bảo mật/cấu hình (`core/`).

---

## 3. Lưu Ý Cho Các Thành Viên Trong Nhóm (Notice for Team Members)

1. **Khởi tạo lại CSDL cục bộ:**
   - Nếu bạn đang chạy SQL Server bằng Docker:
     ```bash
     docker-compose down -v
     docker-compose up -d sqlserver
     ```
   - Hoặc mở SSMS (SQL Server Management Studio), mở file `database/schema.sql` và bấm **F5 (Execute)** để tạo mới CSDL `ExamSystem`.
2. **Cài đặt thư viện Python:**
   - Di chuyển vào thư mục backend và cài đặt:
     ```bash
     cd backend
     pip install -r requirements.txt
     ```
3. **Chạy thử Backend API:**
   - Lệnh khởi động server:
     ```bash
     uvicorn main:app --reload --port 8000
     ```
   - Xem tài liệu Swagger UI tự động: `http://localhost:8000/docs`
   - Xem tài liệu ReDoc: `http://localhost:8000/redoc`
