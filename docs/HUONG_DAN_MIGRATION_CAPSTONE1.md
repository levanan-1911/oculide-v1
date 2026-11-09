# HƯỚNG DẪN KHỞI TẠO & QUẢN LÝ CƠ SỞ DỮ LIỆU - CAPSTONE 1

Tài liệu này hướng dẫn chi tiết cách khởi tạo và đồng bộ cơ sở dữ liệu dự án **Oculide v1** theo đúng chuẩn SRS và kiến trúc chuẩn hóa 22 bảng tiếng Việt:
1. **Loại bỏ tính năng thi trắc nghiệm (MCQ)**: Dành lại cho Capstone 2, Capstone 1 chỉ tập trung vào bài thi/phòng thực hành Lập trình (Coding).
2. **Quy chuẩn Cảnh báo AI**: AI chỉ sinh cảnh báo (`review_status = 'pending'`), Giám thị/Giảng viên là người xác nhận vi phạm (`confirmed` hoặc `rejected`).
3. **Chuẩn hóa danh mục Học kỳ**: Bổ sung bảng `HocKy` quản lý tập trung thời gian bắt đầu, kết thúc, cờ học kỳ hiện tại, loại bỏ lỗi bộ lọc do hardcode.
4. **Hệ thống bảng Tiếng Việt thuần**: Toàn bộ 22 bảng được đồng bộ nhất quán giữa Database và Backend (`LopHoc`, `BanNhapCode`, `KiemTraThietBi`, `YeuCauTroGiup`, `ViPhamGiamSat`...).

---

## 1. Vị trí các file CSDL trong dự án

- **File Schema DDL tổng thể**: [`database/schema.sql`](file:///d:/driver_E/ki1nam4/capstone/oculide-v1/database/schema.sql) *(Khởi tạo toàn bộ 22 bảng và tài khoản mặc định)*
- **File Dữ liệu mẫu hoàn chỉnh**: [`database/sample_data.sql`](file:///d:/driver_E/ki1nam4/capstone/oculide-v1/database/sample_data.sql) *(Người dùng mẫu, 4 học kỳ, lớp học mẫu, đề thi & test cases)*
- **Script tự động nạp thông minh**: [`database/init_db.py`](file:///d:/driver_E/ki1nam4/capstone/oculide-v1/database/init_db.py) *(Hỗ trợ tự động nhận diện cả SSMS máy thật và Docker)*
- **Hệ quản trị CSDL**: Microsoft SQL Server (T-SQL) - Database: `ExamSystem`.

---

## 2. Cách thực thi CSDL vào Database

### Cách 1: Sử dụng Script Python tự động (Khuyên dùng - Nhanh & Tiện nhất)
Mở terminal tại thư mục gốc của dự án và chạy:
```powershell
backend\venv\Scripts\python database/init_db.py
```
Script sẽ tự động dò tìm kết nối SQL Server (SSMS máy Windows hoặc Docker container) và nạp đầy đủ toàn bộ 22 bảng cùng dữ liệu mẫu.

### Cách 2: Chạy trực tiếp trên SQL Server Management Studio (SSMS)
1. Mở SSMS và kết nối vào SQL Server.
2. Mở file [`database/schema.sql`](file:///d:/driver_E/ki1nam4/capstone/oculide-v1/database/schema.sql) $\rightarrow$ Bấm **Execute (F5)** để tạo CSDL `ExamSystem` cùng 22 bảng.
3. Mở file [`database/sample_data.sql`](file:///d:/driver_E/ki1nam4/capstone/oculide-v1/database/sample_data.sql) $\rightarrow$ Bấm **Execute (F5)** để nạp dữ liệu mẫu.
4. Click chuột phải vào thư mục `Tables` $\rightarrow$ chọn **Refresh (F5)** để hiển thị toàn bộ bảng.

---

## 3. Danh mục 22 Bảng chuẩn hóa của hệ thống

| STT | Tên bảng | Ý nghĩa |
| :---: | :--- | :--- |
| 1 | `VaiTro` | Phân quyền vai trò hệ thống (`admin`, `instructor`, `student`) |
| 2 | `NguoiDung` | Hồ sơ người dùng toàn hệ thống |
| 3 | `TokenXacThuc` | Token xác thực JWT & LiveKit Video |
| 4 | `NhatKyHeThong` | Audit log ghi nhận lịch sử hoạt động bảo mật |
| 5 | `HocKy` | Danh mục quản lý học kỳ và năm học |
| 6 | `LopHoc` | Quản lý lớp học phần tín chỉ |
| 7 | `SinhVienLopHoc` | Danh sách sinh viên ghi danh vào từng lớp học phần |
| 8 | `CauHoi` | Ngân hàng câu hỏi bài tập / bài thi lập trình |
| 9 | `BoKiemThu` | Bộ Test Cases chấm điểm tự động (Input/Output ẩn/hiện) |
| 10 | `BoDeMau` | Bộ đề thi mẫu do giảng viên biên soạn |
| 11 | `CauHoiTrongDe` | Danh sách câu hỏi nằm trong từng đề thi |
| 12 | `Phong` | Phòng thực hành Lab / Phòng thi trực tuyến |
| 13 | `CanBoPhuTrachPhong` | Giám thị / Cán bộ coi thi được phân công vào phòng |
| 14 | `TinNhanPhong` | Kênh chat trực tiếp trong phòng thi |
| 15 | `PhienLamBai` | Phiên làm bài của từng sinh viên trong phòng |
| 16 | `KiemTraThietBi` | Kết quả kiểm tra thiết bị (Webcam, Mic, Mạng) trước khi vào phòng |
| 17 | `Snapshots` | Ảnh chụp màn hình / ảnh giám sát định kỳ của thí sinh |
| 18 | `BanNhapCode` | Tự động lưu nháp mã nguồn (Auto-save) phòng mất điện/mất mạng |
| 19 | `YeuCauTroGiup` | Yêu cầu trợ giúp kỹ thuật khẩn cấp gửi tới giám thị |
| 20 | `ViPhamGiamSat` | Bản ghi vi phạm do AI phát hiện và giám thị kết luận |
| 21 | `BaiNop` | Bài nộp mã nguồn chính thức của sinh viên |
| 22 | `KetQuaChamDiem` | Kết quả chấm điểm tự động từ Sandbox Runner |
