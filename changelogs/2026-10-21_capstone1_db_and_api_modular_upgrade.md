# 📌 Nhật Ký Cập Nhật: Chuẩn Hóa CSDL & Bổ Sung Module API Cho Capstone 1 (Oculide v1)

- **Ngày thực hiện:** 2026-10-21
- **Người thực hiện:** Đội ngũ Phát triển Oculide v1
- **Tiêu chuẩn đáp ứng:** IEEE 830-1998, AI Ethics & Proctoring Standards
- **Mục đích / Lý do thay đổi:** 
  1. Loại bỏ tính năng thi trắc nghiệm (MCQ) để dành riêng cho Capstone 2, tập trung 100% tài nguyên hoàn thiện hệ thống thi/thực hành lập trình (Coding LMS).
  2. Chuẩn hóa quy chuẩn Đạo đức & Bảo mật AI: AI chỉ sinh Cảnh báo (Alert), Giám thị mới là người kết luận Vi phạm (Confirmed / Rejected).
  3. Bổ sung các tính năng cốt lõi theo SRS: Tự động lưu nháp mã nguồn (Auto-save), Kiểm tra thiết bị trước khi thi (Pre-exam Device Check), Cứu hộ thí sinh (Technical Support Requests), và Quản lý Lớp học phần (Classes).

---

## 1. Danh Sách File Thay Đổi

### 🟢 Thêm Mới ([NEW])
- [`database/migrations/01_capstone1_schema_update.sql`](file:///d:/oculide-v1/database/migrations/01_capstone1_schema_update.sql): Script di chuyển CSDL (T-SQL) trên SQL Server, thêm 4 bảng mới và ràng buộc kiểm tra.
- [`docs/HUONG_DAN_MIGRATION_CAPSTONE1.md`](file:///d:/oculide-v1/docs/HUONG_DAN_MIGRATION_CAPSTONE1.md): Hướng dẫn chi tiết quy trình chạy migration CSDL qua Docker hoặc SSMS.
- [`backend/schemas/draft.py`](file:///d:/oculide-v1/backend/schemas/draft.py): Pydantic DTO validation cho việc lưu nháp bài code tự động.
- [`backend/database/draft_db.py`](file:///d:/oculide-v1/backend/database/draft_db.py): Tầng DAL tương tác bảng `CodeDrafts` sử dụng lệnh nguyên tử `MERGE` của SQL Server.
- [`backend/api/drafts.py`](file:///d:/oculide-v1/backend/api/drafts.py): Controller xử lý REST API lưu nháp, khôi phục code khi F5 và dọn dẹp nháp khi nộp bài.
- [`backend/schemas/device_check.py`](file:///d:/oculide-v1/backend/schemas/device_check.py): Pydantic DTO kiểm tra Webcam, Mic, Network Latency, OS, Browser.
- [`backend/database/device_check_db.py`](file:///d:/oculide-v1/backend/database/device_check_db.py): Lưu và truy vấn lịch sử test thiết bị theo phiên thi và theo phòng.
- [`backend/api/device_checks.py`](file:///d:/oculide-v1/backend/api/device_checks.py): Controller ghi nhận kết quả kiểm tra phần cứng của thí sinh trước khi vào phòng.
- [`backend/schemas/support.py`](file:///d:/oculide-v1/backend/schemas/support.py): Pydantic DTO tạo và cập nhật trạng thái yêu cầu hỗ trợ kỹ thuật khẩn cấp.
- [`backend/database/support_db.py`](file:///d:/oculide-v1/backend/database/support_db.py): Lưu trữ và truy vấn yêu cầu cứu hộ của sinh viên trong phòng thi.
- [`backend/api/support.py`](file:///d:/oculide-v1/backend/api/support.py): Controller tiếp nhận sự cố từ sinh viên và cho phép giám thị xử lý `in_progress`, `resolved`, `rejected`.
- [`backend/schemas/classes.py`](file:///d:/oculide-v1/backend/schemas/classes.py): Pydantic DTO quản lý lớp học phần.
- [`backend/database/classes_db.py`](file:///d:/oculide-v1/backend/database/classes_db.py): Truy vấn CRUD thông tin lớp học phần.
- [`backend/api/classes.py`](file:///d:/oculide-v1/backend/api/classes.py): Controller quản lý lớp học dành cho Giảng viên và Admin.

### 🟡 Chỉnh Sửa ([MODIFY])
- [`database/schema.sql`](file:///d:/oculide-v1/database/schema.sql): Cập nhật file khởi tạo CSDL gốc từ 13 bảng lên 17 bảng chuẩn, loại bỏ `multiple_choice` khỏi ràng buộc `Questions.question_type`, thêm cột `review_status` vào bảng `Violations`.
- [`backend/schemas/question.py`](file:///d:/oculide-v1/backend/schemas/question.py): Cập nhật Regex validation chỉ chấp nhận `^(coding|essay)$`.
- [`backend/schemas/violation.py`](file:///d:/oculide-v1/backend/schemas/violation.py): Thêm trường `review_status: str = 'pending'` vào `ViolationResponse`.
- [`backend/database/violation_db.py`](file:///d:/oculide-v1/backend/database/violation_db.py): Thêm `review_status` vào các truy vấn `INSERT`, `SELECT`, `UPDATE` và hỗ trợ tham số duyệt.
- [`backend/api/violations.py`](file:///d:/oculide-v1/backend/api/violations.py): API `PATCH /{violation_id}/review` cho phép Giám thị chọn `confirmed` hoặc `rejected`.
- [`backend/main.py`](file:///d:/oculide-v1/backend/main.py): Đăng ký 4 router mới (`drafts`, `device_checks`, `support`, `classes`) vào hệ thống (tổng 161 endpoints).
- [`.gitignore`](file:///d:/oculide-v1/.gitignore): Bổ sung các thư mục/tập tin tạm (`.gemini/`, các file text phân tích tạm).

---

## 2. Chi Tiết Kỹ Thuật

### 2.1. Cập Nhật Cơ Sở Dữ Liệu (T-SQL - Microsoft SQL Server)
1. **Loại bỏ Trắc nghiệm**:
   - Ràng buộc mới: `ALTER TABLE Questions ADD CONSTRAINT chk_questions_type CHECK (question_type IN ('coding', 'essay'))`.
2. **Quy chuẩn Đạo đức AI**:
   - Bổ sung cột: `ALTER TABLE Violations ADD review_status NVARCHAR(20) DEFAULT 'pending' NOT NULL`.
   - Ràng buộc: `CHECK (review_status IN ('pending', 'confirmed', 'rejected'))`.
3. **Các bảng mới bổ sung**:
   - `Classes`: Quản lý lớp học phần (`class_id`, `class_code`, `class_name`, `instructor_id`).
   - `CodeDrafts`: Tự động lưu nháp code (`draft_id`, `session_id`, `question_id`, `student_id`, `draft_code`, `language`, `last_saved_at`).
   - `DeviceChecks`: Kiểm tra phần cứng (`check_id`, `session_id`, `student_id`, `camera_status`, `mic_status`, `network_latency_ms`, `os_info`, `browser_info`, `is_passed`).
   - `SupportRequests`: Cứu hộ sự cố (`request_id`, `room_id`, `student_id`, `session_id`, `issue_type`, `message`, `status`, `resolved_by`).

### 2.2. Chi Tiết API Endpoints Mới Được Đăng Ký
- **Code Drafts API**:
  - `POST /api/v1/drafts`: Tự động lưu bản nháp code
  - `GET /api/v1/drafts/session/{session_id}/question/{question_id}`: Tải lại nháp khi F5
  - `DELETE /api/v1/drafts/session/{session_id}/question/{question_id}`: Xóa nháp khi nộp bài
- **Device Checks API**:
  - `POST /api/v1/device-checks`: Nộp kết quả test thiết bị
  - `GET /api/v1/device-checks/session/{session_id}`: Xem chi tiết test của thí sinh
  - `GET /api/v1/device-checks/room/{room_id}`: Giám thị theo dõi toàn bộ phòng
- **Support Requests API**:
  - `POST /api/v1/support`: Thí sinh gửi yêu cầu hỗ trợ
  - `GET /api/v1/support/room/{room_id}`: Giám thị xem danh sách yêu cầu
  - `PATCH /api/v1/support/{request_id}/status`: Cập nhật trạng thái xử lý
- **Classes API**:
  - `POST /api/v1/classes`: Tạo lớp học phần
  - `GET /api/v1/classes`: Lấy danh sách lớp
  - `GET /api/v1/classes/{class_id}`: Chi tiết lớp
  - `PUT /api/v1/classes/{class_id}`: Sửa lớp
  - `DELETE /api/v1/classes/{class_id}`: Xóa lớp
- **Violations Review API**:
  - `PATCH /api/v1/violations/{violation_id}/review?review_status=confirmed|rejected`: Duyệt cảnh báo AI

---

## 3. Kiểm Thử & Xác Minh (Verification)
- Đã chạy kiểm tra trực tiếp qua `sqlcmd` trên container `exam-sqlserver`: Xác nhận tồn tại đủ 17 bảng.
- Đã nạp thành công ứng dụng FastAPI trong môi trường Python: `161 routes registered`, không có lỗi cú pháp hoặc thiếu dependencies.
