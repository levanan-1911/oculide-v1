# HƯỚNG DẪN CÀI ĐẶT, KẾT NỐI VÀ TỰ ĐỘNG XẢ CƠ SỞ DỮ LIỆU - OCULIDE V1

Tài liệu này cung cấp hướng dẫn đầy đủ, chi tiết từng bước và các câu lệnh chính xác để **tự động xả CSDL và dữ liệu mẫu** vào:
1. **SSMS (SQL Server máy thật Windows)** - Môi trường riêng biệt.
2. **Docker Container (`exam-sqlserver`)** - Môi trường riêng biệt.
3. **Chế độ xả SONG SONG (Đồng bộ cả SSMS và Docker cùng lúc)**.

---

## 1. TỔNG QUAN HỆ THỐNG CSDL

* **Tên CSDL (Database Name)**: `ExamSystem`
* **Hệ quản trị CSDL**: Microsoft SQL Server (2019/2022 hoặc Docker `mcr.microsoft.com/mssql/server:2022-latest`).
* **Cấu trúc**: 21 bảng tiếng Việt chuẩn hóa theo SRS Capstone 1 và mô hình ERD v2.
* **Cổng mặc định**: `1433`

### Các tệp tin quan trọng trong thư mục `database/`:

| Tệp tin | Vai trò |
| :--- | :--- |
| [`database/schema.sql`](file:///database/schema.sql) | DDL tạo Database `ExamSystem`, 21 bảng, khóa ngoại (FK), trigger, index. |
| [`database/sample_data.sql`](file:///database/sample_data.sql) | DML nạp toàn bộ dữ liệu mẫu (Người dùng, Lớp học, Phòng thi, Đề bài LeetCode, Testcases, Vi phạm AI). Mật khẩu mặc định: `admin123`. |
| [`database/init_db.py`](file:///database/init_db.py) | Script Python thông minh hỗ trợ các cờ `--target ssms`, `--target docker`, `--target all`. |
| [`database/seed_db.bat`](file:///database/seed_db.bat) | File chạy nhanh 1-click trên Windows, có menu chọn xả SSMS, Docker hoặc Song song. |
| [`database/init-db.sh`](file:///database/init-db.sh) | Script chạy ngầm trong container Docker, tự động xả schema và sample_data khi bật container. |

---

## 2. PHẦN A: TỰ ĐỘNG XẢ VÀO SSMS (SQL SERVER MÁY THẬT WINDOWS)

Dành cho các thành viên phát triển ứng dụng trực tiếp trên máy Windows, quản lý CSDL qua SQL Server Management Studio (SSMS).

### Lựa chọn 1: Sử dụng Script Python (Khuyên dùng - Nhanh nhất)
Script sẽ tự động nhận diện **Windows Authentication** (tài khoản máy tính của bạn), kết nối vào `localhost:1433`, tạo CSDL `ExamSystem`, xả 21 bảng và nạp toàn bộ dữ liệu mẫu trong 2 giây:

```powershell
# Chạy với cờ chỉ định riêng cho SSMS:
python database/init_db.py --target ssms

# Hoặc nếu chạy từ môi trường ảo venv backend:
& backend\venv\Scripts\python database/init_db.py --target ssms
```

### Lựa chọn 2: Sử dụng File chạy nhanh 1-Click (`seed_db.bat`)
Mở thư mục `database` và nhấp đúp chuột vào file:
```cmd
database\seed_db.bat
```
Nhập phím `1` (Chỉ xả vào SSMS) $\rightarrow$ Nhấn Enter.

### Lựa chọn 3: Sử dụng lệnh `sqlcmd` trực tiếp của Windows (Không cần Python)
Nếu máy bạn chưa cài Python hoặc thư viện `pyodbc`, bạn có thể dùng trực tiếp tiện ích `sqlcmd` có sẵn của Windows:

```powershell
# 1. Xả cấu trúc 21 bảng (Cờ -E: Dùng Windows Authentication tự động)
sqlcmd -S localhost -E -i database/schema.sql

# 2. Xả dữ liệu mẫu vào CSDL ExamSystem
sqlcmd -S localhost -E -d ExamSystem -i database/sample_data.sql
```

> **Kiểm tra trên SSMS**: Mở SSMS $\rightarrow$ Bấm **Connect** (Windows Authentication) $\rightarrow$ Chuột phải vào mục **Databases** $\rightarrow$ Chọn **Refresh (F5)** $\rightarrow$ Mở `ExamSystem > Tables` để thấy 21 bảng và dữ liệu.

---

## 3. PHẦN B: TỰ ĐỘNG XẢ VÀO DOCKER CONTAINER (`exam-sqlserver`)

Dành cho các thành viên phát triển hệ thống qua môi trường Docker hoặc chạy máy ảo / Linux.

### Lựa chọn 1: Tự động hoàn toàn khi khởi chạy Docker Compose
Hệ thống đã cấu hình sẵn kịch bản `init-db.sh` và mount cả `schema.sql` lẫn `sample_data.sql` vào container:

```powershell
# Khởi động container SQL Server:
docker compose up -d sqlserver
```
*Container sẽ tự động khởi động, chờ SQL Server sẵn sàng, xả 21 bảng và tự động nạp dữ liệu mẫu.*

> **Cách Reset CSDL Docker về mới tinh 100%**:
> ```powershell
> docker compose down -v
> docker compose up -d sqlserver
> ```
> *(Cờ `-v` sẽ xóa volume ổ cứng cũ `sqlserver_data` để Docker tạo lại CSDL sạch từ đầu).*

### Lựa chọn 2: Sử dụng Script Python xả vào Docker đang chạy
Nếu container `exam-sqlserver` đang chạy và bạn muốn xả lại CSDL ngay lập tức:

```powershell
python database/init_db.py --target docker
```

### Lựa chọn 3: Sử dụng các lệnh Docker CLI trực tiếp
```powershell
# 1. Xả 21 bảng vào container:
docker exec -i exam-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -No -i /schema.sql

# 2. Copy dữ liệu mẫu vào container và thực thi:
docker cp database/sample_data.sql exam-sqlserver:/sample_data.sql
docker exec -i exam-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YourStrong@Passw0rd" -No -d ExamSystem -i /sample_data.sql
```

---

## 4. PHẦN C: LỆNH XẢ SONG SONG VÀO CẢ HAI (SSMS + DOCKER)

Khi bạn muốn **đồng bộ dữ liệu 100% cùng lúc** trên cả SQL Server máy thật (để tra cứu trên SSMS) và Docker container (để chạy microservices/celery):

### Câu lệnh Python xả song song:
```powershell
python database/init_db.py --target all

# Hoặc dùng python trong venv:
& backend\venv\Scripts\python database/init_db.py --target all
```

### Câu lệnh Batch xả song song:
```cmd
database\seed_db.bat all
```

### Cơ chế hoạt động của chế độ song song:
1. Script sẽ kết nối và xả toàn bộ 21 bảng + dữ liệu mẫu vào SQL Server máy host (SSMS).
2. Kiểm tra container `exam-sqlserver` trên Docker Desktop:
   - Nếu container đang chạy: Tự động copy và nạp luôn vào Docker.
   - Nếu container chưa chạy: Báo nhắc nhở khởi động bằng `docker compose up -d sqlserver`.
3. In bảng tổng kết trạng thái thành công của cả hai môi trường:
   ```text
   📊 Kết quả: SSMS: ✅ Thành công | Docker: ✅ Thành công
   ```

---

## 5. BẢNG TỔNG HỢP CÁC LỆNH NHANH (CHEATSHEET)

| Mục tiêu | Lệnh Python | Lệnh Batch (Windows) | Lệnh CLI thuần |
| :--- | :--- | :--- | :--- |
| **Chỉ xả vào SSMS** | `python database/init_db.py --target ssms` | `database\seed_db.bat ssms` | `sqlcmd -S localhost -E -i database/schema.sql` |
| **Chỉ xả vào Docker** | `python database/init_db.py --target docker` | `database\seed_db.bat docker` | `docker exec -i exam-sqlserver ...` |
| **Xả SONG SONG cả 2** | `python database/init_db.py --target all` | `database\seed_db.bat all` | Chạy lần lượt cả 2 lệnh trên |
| **Tự động nhận diện** | `python database/init_db.py` | `database\seed_db.bat` | - |

---

## 6. CẤU HÌNH KẾT NỐI BACKEND (`backend/.env`)

| Môi trường chạy Backend | `DATABASE_SERVER` | `DATABASE_USERNAME` | `DATABASE_PASSWORD` | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| **Backend chạy trên máy thật (Windows Native)** | `localhost` | `sa` | `123456` *(hoặc Windows Auth)* | Kết nối trực tiếp vào SQL Server máy thật (SSMS). |
| **Backend chạy trong Docker Container** | `sqlserver` | `sa` | `YourStrong@Passw0rd` | Kết nối qua mạng nội bộ Docker `exam-network`. |

**Các tham số quan trọng luôn giữ nguyên cho môi trường phát triển**:
```env
DATABASE_NAME=ExamSystem
DATABASE_PORT=1433
DATABASE_DRIVER=ODBC Driver 18 for SQL Server
DATABASE_ENCRYPT=no
DATABASE_TRUST_SERVER=yes
DATABASE_CONNECTION_TIMEOUT=30
```

---

## 7. TÀI KHOẢN MẪU ĐÃ NẠP SẴN TRONG HỆ THỐNG

> 🔑 **MẬT KHẨU ĐỒNG BỘ CHO TẤT CẢ TÀI KHOẢN**: `admin123`

* **Quản trị viên (Admin)**: `admin` (`admin@oculide.edu.vn`)
* **Giảng viên**:
  * `nam.nv` (`nam.nv@oculide.edu.vn`): Giảng viên lớp CS404
  * `pvlong` (`longpahm2005@gmail.com`): Giảng viên lớp SE301
  * `an.lv` (`an.lv@oculide.edu.vn`): Giảng viên lớp IT202
* **Sinh viên**:
  * `student` (`student@oculide.edu.vn`): Sinh viên mẫu
  * `phamvanlong` (`long.pv@oculide.edu.vn`): Sinh viên lớp CS404, SE301
  * `nguyenvana` (`vana.nv@oculide.edu.vn`): Sinh viên lớp CS404
* **Đề bài & Phòng thi**:
  * Phòng thi: `EXAM_FINAL_CS404`, `LAB_PRACTICE_01`
  * Đề bài LeetCode: `Two Sum` (ID 1), `Palindrome Number` (ID 2) kèm bộ hidden testcases.

---

## 8. XỬ LÝ LỖI THƯỜNG GẶP (FAQ)

### ❓ Lỗi `Login failed for user 'sa'. (18456)` khi chạy lệnh xả SSMS
* **Nguyên nhân**: SQL Server trên Windows mặc định vô hiệu hóa tài khoản `sa`.
* **Khắc phục**: Dùng lệnh `python database/init_db.py --target ssms`. Script sẽ tự động dùng Windows Authentication và không bao giờ bị từ chối quyền.

### ❓ Lỗi cổng `1433: port is already allocated` khi bật Docker
* **Nguyên nhân**: Cả SQL Server máy thật (SSMS) và Docker đều muốn dùng cổng `1433`.
* **Khắc phục**:
  * Nếu dùng SSMS máy thật: Không cần bật container `exam-sqlserver`.
  * Nếu dùng Docker: Vào `services.msc` trên Windows $\rightarrow$ chuột phải `SQL Server (MSSQLSERVER)` $\rightarrow$ bấm **Stop**.
