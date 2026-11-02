# 🎯 Hướng Dẫn Đồng Bộ Giao Diện Oculide (UI/UX Alignment Guide)

Tài liệu này cung cấp hướng dẫn và prompt mẫu để các thành viên phát triển vai trò **Giảng viên (Instructor)** và **Sinh viên (Student)** đồng bộ giao diện 100% với vai trò **Quản trị viên (Admin)** đã hoàn thiện.

---

## 1. Danh Sách Tài Liệu Thiết Kế Trong Repo
1. [`DESIGN.md`](../../DESIGN.md): Bảng mã màu Semantic tokens, quy chuẩn chiều cao điều khiển `h-11`/`h-9`, Typography scale, Dark & Light Mode.
2. [`docs/design/oculide-ui-skill.md`](./oculide-ui-skill.md): Bộ quy tắc UI chi tiết cho từng component (Code Editor, Live Proctoring WebRTC, Data Tables, Wizard, Header, Footer).
3. Các màn hình mẫu chuẩn đã hoàn thiện:
   - `frontend/src/app/admin/classes/page.tsx` (Mẫu Table Toolbar, Search, KPI Cards)
   - `frontend/src/app/admin/schedules/page.tsx` (Mẫu danh sách ca thi, trạng thái Live, nút bấm)
   - `frontend/src/app/(auth)/login/page.tsx` (Mẫu bố cục xác thực kèm Showcase Sandbox)
   - `frontend/src/components/common/InstitutionalFooter.tsx` (Chân trang học thuật NCKH 4 cột)

---

## 2. Hướng Dẫn Kéo Nhánh Về Máy
Mở terminal trong thư mục `oculide-v1` và chạy:
```bash
# Lấy danh sách nhánh mới nhất từ GitHub
git fetch origin

# Chuyển sang nhánh hướng dẫn thiết kế
git checkout docs/ui-design-guidelines
git pull origin docs/ui-design-guidelines
```

Hoặc hợp nhất tài liệu thiết kế vào nhánh bạn đang code:
```bash
# Ví dụ bạn đang ở nhánh feat/instructor-room-management:
git merge origin/docs/ui-design-guidelines --no-edit
```

---

## 3. Prompt Mẫu Dành Cho AI Assistant (Antigravity / Cursor / Claude)
*Copy toàn bộ đoạn dưới đây và dán vào AI Assistant của bạn:*

```markdown
Bạn là AI chuyên gia Frontend & UI/UX Design System cho nền tảng Oculide (Hệ thống NCKH 2026: Quản lý Phòng Thực hành Lập trình & Giám sát Thi Trực tuyến bằng AI).

Tôi đang phát triển giao diện cho vai trò [CHỌN: Giảng viên (Instructor) / Sinh viên (Student)].
Role Quản trị viên (Admin) và Xác thực (Auth/Login) đã hoàn thiện 100%. Nhiệm vụ của bạn là đọc các file quy chuẩn thiết kế có sẵn trong dự án và chỉnh sửa/tạo mới các trang của vai trò tôi đang phụ trách để MATCH 100% về mặt thẩm mỹ, layout và trải nghiệm người dùng với role Admin.

### 1. TÀI LIỆU CẦN ĐỌC TRƯỚC KHI CODE:
Hãy đọc kỹ các tệp quy chuẩn có sẵn trong repo:
1. `DESIGN.md` (Quy định Semantic Tokens, Spatial Density, Chiều cao controls h-11/h-9, Typography, Bảng màu).
2. `docs/design/oculide-ui-skill.md` (Quy tắc thiết kế UI chi tiết cho các component đặc thù).
3. `docs/design/TEAM_PROMPT_GUIDE.md` (Hướng dẫn quy trình làm việc nhóm).
4. Tham chiếu các màn hình Admin đã chuẩn hóa tại:
   - `frontend/src/app/admin/classes/page.tsx` (Mẫu Table Toolbar, Search, KPI Cards)
   - `frontend/src/app/admin/schedules/page.tsx` (Mẫu danh sách ca thi, trạng thái Live, nút bấm)
   - `frontend/src/components/common/InstitutionalFooter.tsx` (Chân trang học thuật NCKH 4 cột)

### 2. CÁC QUY TẮC BẮT BUỘC PHẢI TUÂN THỦ:
1. **Không White-on-White / Tương thích Dark & Light Mode**:
   - Tất cả các trang bắt buộc hỗ trợ đầy đủ Dark Mode (`dark:...`) và Light Mode.
   - Tuyệt đối không để xảy ra tình trạng chữ trắng trên nền sáng hoặc tương phản kém.
2. **Chuẩn hóa kích thước điều khiển (Spatial Density)**:
   - Thanh Search, bộ lọc, Dropdown và nút hành động chính (Primary button): bắt buộc chuẩn chiều cao `h-10` (40px) hoặc `h-11` (44px) với `rounded-xl`.
   - Nút hành động phụ trong dòng bảng (Action buttons): chuẩn `h-8` (32px) hoặc `h-9` (36px).
   - Card lớn: `rounded-2xl`, Input & Button: `rounded-xl`. Tránh viền lồng viền (Card-in-Card).
3. **Bảng màu trạng thái (Semantic Accents)**:
   - Đang thi / Live Proctoring: `red-600` (nền `red-500/10`, viền `red-500/20`, icon phát sóng nhấp nháy `animate-pulse`).
   - Sắp tới / Đã lên lịch: `blue-600`.
   - Đã kết thúc / Thành công: `emerald-600`.
   - Cảnh báo gian lận / Bất thường: `amber-600`.
4. **Typography & Dữ liệu kỹ thuật**:
   - Tất cả mã định danh (Mã phòng, Room Code, PIN, MSSV, Điểm số, IP, Thời gian đếm ngược): bắt buộc dùng `font-mono tabular-nums`.

### 3. YÊU CẦU CỤ THỂ CHO TỪNG ROLE:
- **Nếu làm Role Giảng viên (Instructor)**:
  - Đồng bộ Toolbar và Bảng quản lý đề thi, câu hỏi, lớp học tương tự như `admin/classes`.
  - Màn hình Tạo phòng thi (`/instructor/room`): Làm theo dạng Wizard nhiều bước rõ ràng, có bản tóm tắt cấu hình giám sát AI (Webcam, màn hình, chặn phím tắt).
  - Màn hình Live Proctoring: Lưới video camera sinh viên hiển thị rõ ràng mã SV, họ tên, cờ cảnh báo bất thường từ AI YOLOv8/MediaPipe.
- **Nếu làm Role Sinh viên (Student)**:
  - Màn hình Kiểm tra thiết bị (`/student/device-check`): Kiểm tra Camera, Micro, Màn hình với phản hồi trực quan, trạng thái đạt/chưa đạt.
  - Màn hình Phòng thi & Code Editor: Khu vực viết code rộng rãi, font Monospace, khu vực Test Cases (Input, Output mong muốn, Output thực tế) hiển thị kết quả trực quan (Passed xanh lá, Failed đỏ). Khung webcam AI góc trên mượt mà, không che khuất đề thi.

Hãy kiểm tra toàn bộ file TypeScript sau khi sửa để đảm bảo `tsc --noEmit` không bị lỗi.
Bây giờ, hãy phân tích màn hình [...] và đề xuất các chỉnh sửa cụ thể để đạt chuẩn.
```
