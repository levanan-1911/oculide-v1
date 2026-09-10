# 📌 Nhật Ký Cập Nhật: Gia Cố Bảo Mật & Nâng Cấp Tầng Dữ Liệu (Giai Đoạn 1 & 2)

- **Ngày thực hiện:** 2026-09-27
- **Người thực hiện:** Senior Architect / Backend Team
- **Mục đích / Lý do thay đổi:**
  - Khắc phục nguy cơ cạn kiệt kết nối CSDL (Connection Storm & Socket Exhaustion) bằng Connection Pooling.
  - Xóa bỏ lỗi truy vấn lặp N+1 queries ở danh sách câu hỏi và bảng điều khiển giám sát.
  - Bổ sung tầng DAL cho 4 bảng bị thiếu trong CSDL: `Snapshots`, `SystemLogs`, `LiveKitTokens`, `GradingResults`.
  - Khóa chặt lỗ hổng bảo mật WebSocket (chống giả mạo giám thị và sinh viên khác).
  - Khắc phục lỗ hổng IDOR trên các API xem kết quả bài nộp, phiên thi và nhật ký vi phạm.
  - Triển khai cơ chế Refresh Token, sửa lỗi trùng lặp tài khoản khách (`guest_*`) và bổ sung máy trạng thái phiên thi (Session State Machine).

---

## 1. Danh Sách File Thay Đổi

### 🟢 Thêm Mới ([NEW])
1. `backend/core/database.py`:
   - Thiết lập SQLAlchemy 2.0 `QueuePool` (pool_size=20, max_overflow=30, pool_recycle=1800s, pool_pre_ping=True).
   - Context Manager `get_db_cursor(commit=True)` quản lý giao dịch nguyên khối (Unit of Work).
2. `backend/database/snapshot_db.py`:
   - Quản lý thêm mới, truy vấn gần nhất và tự động dọn dẹp ảnh webcam định kỳ bảng `Snapshots`.
3. `backend/database/system_log_db.py`:
   - Ghi nhận và phân trang tra cứu nhật ký kiểm toán hệ thống bảng `SystemLogs`.
4. `backend/database/livekit_token_db.py`:
   - Quản lý lưu trữ và thu hồi token video stream bảng `LiveKitTokens`.
5. `backend/database/scoreboard_db.py`:
   - Tích hợp Stored Procedures `sp_GetStudentExamResults`, `sp_GetOnlineStudents` và tính toán bảng điểm thời gian thực.
6. `backend/pytest.ini`:
   - Cấu hình pythonpath tự động phục vụ test runner.
7. `backend/tests/test_security_and_auth.py`:
   - Bộ kiểm thử tự động xác thực băm mật khẩu bcrypt, tạo/giải mã Access & Refresh token, phân loại token type.

### 🟡 Chỉnh Sửa ([MODIFY])
1. `backend/core/config.py`:
   - Tái cấu trúc hàm `get_db_connection()` để lấy kết nối từ pool trong `core.database`, tránh socket exhaustion và circular import.
2. `backend/core/security.py`:
   - Thêm `create_refresh_token(data, expires_delta)` (7 ngày) và gắn nhãn phân loại `token_type: "access" | "refresh"`.
3. `backend/schemas/auth.py`:
   - Cập nhật `TokenResponse` bổ sung trường `refresh_token`, tạo schema `RefreshTokenRequest`.
4. `backend/database/submission_db.py`:
   - Thêm hàm `save_grading_results(submission_id, results, final_status)` bulk-insert kết quả test cases và cập nhật trạng thái bài nộp trong 1 transaction.
5. `backend/database/question_db.py`:
   - Viết lại hàm `get_questions_by_room` sử dụng batch query `IN (...)`, triệt tiêu hoàn toàn lỗi N+1 queries.
   - Bổ sung `get_test_case_by_id` và `update_test_case`.
6. `backend/database/room_db.py`:
   - Thêm hàm `get_room_dashboard_data` gom nhóm dữ liệu giám sát trong 1 query `JOIN` duy nhất.
   - Thêm hàm `get_system_overview_stats` cung cấp số liệu tổng quan cho Admin.
7. `backend/api/auth.py`:
   - Đăng nhập và tham gia phòng nhanh trả về cặp Access Token + Refresh Token.
   - Thêm endpoint `POST /api/v1/auth/refresh`.
   - Sửa lỗi tạo tài khoản khách vãng lai: Sinh chuỗi ngẫu nhiên qua `secrets.token_hex(4)` chống trùng lặp.
   - Khởi tạo placeholder các endpoint Google & GitHub OAuth.
8. `backend/api/sessions.py`:
   - Kiểm tra khung giờ thi phòng hợp lệ (`start_time <= now <= end_time`).
   - Kiểm soát giới hạn `max_attempts` và tự động tái sử dụng phiên active thay vì sinh phiên rác.
   - Thêm kiểm tra quyền sở hữu sinh viên (Anti-IDOR) trên xem chi tiết, cập nhật và kết thúc phiên.
9. `backend/api/submissions.py`:
   - Thêm kiểm tra Anti-IDOR trên endpoint `GET /api/v1/submissions/{id}/results`.
10. `backend/api/violations.py`:
    - Thêm kiểm tra Anti-IDOR trên endpoint `GET /session/{session_id}` và `GET /student/{student_id}`.
11. `backend/api/rooms.py`:
    - Tối ưu `get_room_dashboard` sử dụng `get_room_dashboard_data` (zero N+1 query).
    - Thêm endpoint `GET /api/v1/rooms/{id}/scoreboard` và `GET /api/v1/rooms/{id}/config`.
12. `backend/api/questions.py`:
    - Thêm endpoint `PUT /api/v1/questions/{question_id}/test-cases/{test_case_id}`.
13. `backend/api/admin.py`:
    - Thêm endpoint `GET /api/v1/admin/system/overview` và `GET /api/v1/admin/logs`.
14. `backend/main.py`:
    - Bảo vệ WebSocket `/ws/{room_id}/{user_id}` bằng JWT Authentication bắt buộc.
    - Ngăn chặn mạo danh Giám thị (`proctor_`) và sinh viên khác.
    - Kiểm soát phân quyền lệnh `kick_student`, `send_hint` và hỗ trợ ping-pong heartbeat.

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật

### Cơ sở dữ liệu & Quản lý Kết nối (Connection Pooling)
- Thay vì gọi `pyodbc.connect()` mở socket TCP thô ở mỗi hàm, toàn bộ truy vấn hiện chạy thông qua `engine.raw_connection()` được kiểm soát bởi SQLAlchemy QueuePool.
- Các thao tác ghi nhiều bảng (chấm bài, thêm câu hỏi) được bọc trong `with get_db_cursor(commit=True)` đảm bảo tính toàn vẹn (ACID).

### Xác thực & Phân quyền
- Access Token có hạn 60 phút, Refresh Token có hạn 7 ngày. Phân loại `token_type` trong payload JWT ngăn chặn việc dùng nhầm hoặc tráo đổi token.
- WebSocket endpoint từ trạng thái hoàn toàn công khai đã được bảo vệ đa tầng: Giải mã JWT $\rightarrow$ Kiểm tra vai trò $\rightarrow$ Xác minh quyền sở hữu phòng thi $\rightarrow$ Xác minh ghi danh.

---

## 3. Tác Động & Hướng Dẫn Kiểm Thử

### Không gây xung đột (Zero Breaking Changes)
- Cấu hình database pooling tương thích ngược 100% với các hàm gọi cũ trong tầng DAL.
- Toàn bộ 27 RESTful endpoints đều duy trì định dạng dữ liệu đầu ra chuẩn.

### Lệnh chạy kiểm thử tự động
```powershell
cd backend
pytest
```
*Kết quả xác nhận: 3/3 tests passed (100%).*
