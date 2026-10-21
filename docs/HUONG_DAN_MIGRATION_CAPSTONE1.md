# HƯỚNG DẪN CẬP NHẬT CƠ SỞ DỮ LIỆU (MIGRATION) - CAPSTONE 1

Tài liệu này hướng dẫn chi tiết việc điều chỉnh cơ sở dữ liệu dự án **Oculide v1** theo đúng chuẩn SRS và quyết định kỹ thuật mới nhất:
1. **Loại bỏ tính năng thi trắc nghiệm (MCQ)**: Dành lại cho Capstone 2, Capstone 1 chỉ tập trung vào bài thi/phòng thực hành Lập trình (Coding).
2. **Quy chuẩn Cảnh báo AI**: AI chỉ sinh cảnh báo (`review_status = 'pending'`), Giám thị/Giảng viên là người xác nhận vi phạm (`confirmed` hoặc `rejected`).
3. **Bổ sung các bảng còn thiếu**: Hỗ trợ lưu nháp code tự động (`CodeDrafts`), kiểm tra thiết bị (`DeviceChecks`), lớp học (`Classes`), và yêu cầu trợ giúp kỹ thuật (`SupportRequests`).

---

## 1. Vị trí file trong dự án

File script SQL đã được đặt ngay trong thư mục mã nguồn:
- **Đường dẫn file SQL**: [`database/migrations/01_capstone1_schema_update.sql`](file:///d:/oculide-v1/database/migrations/01_capstone1_schema_update.sql)
- **Hệ quản trị CSDL**: Microsoft SQL Server (T-SQL) - Database `ExamSystem`.

---

## 2. Chi tiết các nội dung cập nhật

| Hạng mục | Trước cập nhật | Sau cập nhật | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| **Questions** | Hỗ trợ `coding`, `multiple_choice`, `essay` | Chỉ hỗ trợ `coding`, `essay` | Bỏ trắc nghiệm theo chỉ đạo, tập trung hoàn thiện chấm bài lập trình tự động |
| **Violations** | Chỉ có cờ `is_reviewed` (0/1) | Thêm cột `review_status` (`pending`, `confirmed`, `rejected`) | Đảm bảo tính đạo đức AI: AI chỉ cảnh báo tạm thời, người giám thị quyết định |
| **CodeDrafts** | Chưa có | Bảng lưu nháp code tự động | Giúp sinh viên không mất bài khi mất kết nối/mất điện giữa giờ |
| **DeviceChecks** | Chưa có | Bảng ghi nhận test webcam, mic, mạng | Đảm bảo sinh viên đủ điều kiện trước khi vào phòng thi/lab |
| **SupportRequests**| Chưa có | Bảng sinh viên xin hỗ trợ kỹ thuật | Giám thị xử lý sự cố trực tiếp trong phiên thi/lab |
| **Classes** | Chưa có | Quản lý danh sách lớp học | Phân nhóm sinh viên theo học phần |

---

## 3. Cách thực thi Script vào Database

### Cách 1: Chạy trực tiếp qua Docker Container (Khuyên dùng)
Nếu bạn đang chạy hệ thống qua Docker (`exam-sqlserver`):

Mở terminal (PowerShell) tại thư mục `d:\oculide-v1` và chạy lệnh:
```powershell
docker exec -i exam-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -No -d ExamSystem -i /var/opt/mssql/01_capstone1_schema_update.sql
```
*(Hoặc copy file vào container rồi chạy)*:
```powershell
docker cp database/migrations/01_capstone1_schema_update.sql exam-sqlserver:/01_capstone1_schema_update.sql
docker exec -it exam-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -No -d ExamSystem -i /01_capstone1_schema_update.sql
```

### Cách 2: Sử dụng Azure Data Studio, DBeaver hoặc SQL Server Management Studio (SSMS)
1. Mở công cụ quản lý DB (DBeaver / SSMS / Azure Data Studio).
2. Kết nối tới SQL Server: `localhost:1433`, User: `sa`, Mật khẩu cấu hình trong `.env` (`MSSQL_SA_PASSWORD`).
3. Chọn database: `ExamSystem`.
4. Mở file [`database/migrations/01_capstone1_schema_update.sql`](file:///d:/oculide-v1/database/migrations/01_capstone1_schema_update.sql) và nhấn **Execute (F5)**.

---

## 4. Công việc tiếp theo cho các thành viên trong nhóm

1. **Backend Team**:
   - Trong `backend/`: Đảm bảo API tạo câu hỏi chỉ nhận loại `coding` (hoặc `essay`), không cho phép chọn `multiple_choice`.
   - Cập nhật model và schema phản ánh cột `review_status` trong API Giám thị duyệt vi phạm.
2. **Frontend Team**:
   - Ẩn/xóa form tạo câu hỏi trắc nghiệm khỏi giao diện Quản lý đề thi của Giảng viên.
   - Thêm nút duyệt: `Chấp nhận vi phạm (Confirmed)` / `Hủy cảnh báo (Rejected)` trên giao diện giám thị.
3. **Tester**:
   - Kiểm tra luồng làm bài coding, kiểm tra tính năng auto-save bài nháp.
