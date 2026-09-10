# 📝 Thư Mục Nhật Ký Dự Án Oculide v1 (Project Changelogs)

Thư mục này dùng để lưu trữ toàn bộ nhật ký ghi nhận các hoạt động: **bổ sung, sửa chữa, thêm, xóa, đổi tên file và thay đổi kiến trúc/tính năng** của hệ thống Oculide v1. Mọi thành viên trong nhóm khi thực hiện chỉnh sửa cần cập nhật file nhật ký tương ứng theo quy chuẩn bên dưới.

---

## 📂 Quy Ước Đặt Tên File Nhật Ký
Mỗi đợt cập nhật lớn hoặc theo từng ngày làm việc, hãy tạo một file markdown theo định dạng:
```text
changelogs/YYYY-MM-DD_<ten_noi_dung_chinh>.md
```
*Ví dụ:*
- `2026-09-10_database_and_api_redesign.md`
- `2026-09-15_integrate_monaco_editor.md`
- `2026-09-20_setup_livekit_gridview.md`

---

## 📋 Mẫu Biên Bản Ghi Nhật Ký (Template)

Sao chép mẫu bên dưới để tạo file nhật ký mới:

```markdown
# 📌 Nhật Ký Cập Nhật: [Tiêu đề công việc]

- **Ngày thực hiện:** YYYY-MM-DD
- **Người thực hiện:** [Họ tên / MSSV]
- **Mục đích / Lý do thay đổi:** [Mô tả ngắn gọn lý do sửa đổi/bổ sung]

---

## 1. Danh Sách File Thay Đổi

### 🟢 Thêm Mới ([NEW])
- `duong/dan/den/file_moi.py`: [Mô tả chức năng file mới]

### 🟡 Chỉnh Sửa ([MODIFY])
- `duong/dan/den/file_sua.py`: [Mô tả các dòng hoặc hàm đã chỉnh sửa, lý do]

### 🔴 Xóa Bỏ ([DELETE])
- `duong/dan/den/file_xoa.sql`: [Lý do xóa bỏ file]

### 🔄 Di Chuyển / Đổi Tên ([RENAME / MOVE])
- `duong/dan/cu.sql` ➡️ `duong/dan/moi.sql`: [Lý do di chuyển]

---

## 2. Chi Tiết Thay Đổi Kỹ Thuật
- **Cơ sở dữ liệu / Schema:** [Nếu có bảng, cột hoặc ràng buộc thay đổi]
- **API Endpoints:** [Nếu có thêm hoặc sửa endpoint]
- **Giao diện / Frontend:** [Nếu có thay đổi UI/UX]

---

## 3. Tác Động & Lưu Ý Cho Thành Viên Khác (Breaking Changes)
- [Cảnh báo nếu có xung đột, yêu cầu chạy migration CSDL hoặc cài thêm thư viện mới]
- Hướng dẫn cài đặt/chạy lệnh (nếu có):
  ```bash
  pip install -r requirements.txt
  ```
```

---

## 📚 Danh Mục Nhật Ký Hiện Có
- [2026-09-10 - Chuyển đổi CSDL & Thiết kế lại toàn bộ API Oculide v1](file:///d:/oculide-v1/changelogs/2026-09-10_database_and_api_redesign.md)
