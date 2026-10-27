# 📘 HƯỚNG DẪN QUY TRÌNH PHÁT TRIỂN FRONTEND - CẤU TRÚC 3 ROLE
**Dự án Oculide v1 - Capstone 1 (C1SE.16) | Chương trình CMU - Đại học Duy Tân**

Tài liệu này quy chuẩn toàn bộ kiến trúc cây thư mục Frontend (Next.js 14 App Router), phân chia không gian làm việc giữa **Quản trị viên (Admin)**, **Giảng viên (Instructor)** và **Sinh viên (Student)**, đồng thời hướng dẫn quy trình code chuẩn mực để cả 5 thành viên trong nhóm không bị xung đột mã nguồn.

---

## 📑 MỤC LỤC
1. [Sơ đồ Cây Thư Mục Chuẩn Frontend](#1-sơ-đồ-cây-thư-mục-chuẩn-frontend)
2. [Nguyên Tắc Phân Quyền (RBAC) & Điều Hướng Route](#2-nguyên-tắc-phân-quyền-rbac--điều-hướng-route)
3. [Quy Chuẩn Tái Sử Dụng Component (Tránh Trùng Lặp Code)](#3-quy-chuẩn-tái-sử-dụng-component-tránh-trùng-lặp-code)
4. [Quy Trình Code Các Tính Năng Trọng Tâm](#4-quy-trình-code-các-tính-năng-trọng-tâm)
   - 4.1. Chế độ Bài Lab (Mở) vs Bài Kiểm Tra (Khóa Tab & AI)
   - 4.2. Điểm danh tự động qua MSSV
   - 4.3. Quy trình Công bố điểm thi
   - 4.4. Minh bạch Cảnh báo Vi phạm AI
5. [Quy Trình Git & Checklist Trước Khi Tạo Pull Request](#5-quy-trình-git--checklist-trước-khi-tạo-pull-request)

---

## 1. SƠ ĐỒ CÂY THƯ MỤC CHUẨN FRONTEND

```text
frontend/src/app/
│
├── (auth)/                                  # ── 1. CỔNG XÁC THỰC (BỎ HOÀN TOÀN REGISTER) ──
│   ├── login/page.tsx                       # Đăng nhập chung -> Tự rẽ nhánh theo Role
│   ├── forgot-password/page.tsx             # Quên mật khẩu
│   └── reset-password/page.tsx              # Đặt lại mật khẩu mới
│
├── profile/page.tsx                         # ── 2. HỒ SƠ CÁ NHÂN (Cả 3 Role dùng chung) ──
│                                            # Xem thông tin, MSSV/Mã GV, form Đổi mật khẩu
│
├── student/                                 # ── 3. KHÔNG GIAN SINH VIÊN ──
│   ├── dashboard/page.tsx                   # Lớp đang học, ca thi sắp tới, xem điểm đã công bố
│   ├── join/page.tsx                        # Cổng vào phòng thi -> TỰ ĐỘNG ĐIỂM DANH QUA MSSV
│   ├── exams/page.tsx                       # Danh sách các bài thi / thực hành lập trình
│   ├── schedule/page.tsx                    # Lịch thi và lịch thực hành cá nhân
│   ├── device-check/page.tsx                # Kiểm tra webcam & micro trước khi vào phòng
│   ├── waiting-room/page.tsx                # Phòng chờ làm bài trước giờ thi
│   └── violations/page.tsx                  # Nhật ký cảnh báo AI & bằng chứng ảnh chụp
│
├── instructor/                              # ── 4. KHÔNG GIAN GIẢNG VIÊN ──
│   ├── layout.tsx                           # Shell riêng: Sidebar & Topbar Giảng viên
│   ├── dashboard/page.tsx                   # Thống kê cá nhân: Lớp dạy, ca thi hôm nay
│   ├── classes/page.tsx                     # Quản lý lớp, tạo bài Lab, nút "CÔNG BỐ ĐIỂM"
│   ├── questions/page.tsx                   # Kho đề & test cases cá nhân (C++, Java, Python)
│   ├── schedules/page.tsx                   # Lịch thực hành: Mở phòng sớm / gia hạn giờ
│   ├── monitoring/page.tsx                  # Lưới webcam LiveKit & duyệt cảnh báo AI
│   └── reports/page.tsx                     # Bảng điểm tự động & báo cáo vi phạm của sinh viên
│
└── admin/                                   # ── 5. KHÔNG GIAN QUẢN TRỊ VIÊN (ĐỦ 8 MODULE MENTOR DUYỆT) ──
    ├── dashboard/page.tsx                   # Bảng điều khiển vĩ mô toàn trường, biểu đồ tuần
    ├── users/page.tsx                       # Quản lý tài khoản: Cấp tài khoản GV, import Excel SV
    ├── classes/                             # Danh mục toàn bộ lớp học của trường & gán GV
    │   ├── page.tsx                         # Danh sách lớp học toàn trường (code class-manager)
    │   ├── create/page.tsx                  # Form tạo lớp học mới
    │   └── types.ts                         # Định nghĩa kiểu dữ liệu lớp học
    ├── questions/page.tsx                   # Ngân hàng đề thi & câu hỏi mẫu chuẩn hệ thống
    ├── schedules/page.tsx                   # Điều phối lịch thi toàn trường, cân bằng tải server
    ├── monitoring/page.tsx                  # Giám sát trạng thái hoạt động tất cả phòng thi
    ├── reports/page.tsx                     # Báo cáo tổng hợp số liệu đào tạo toàn trường
    └── system/page.tsx                      # Cấu hình máy chủ Docker Sandbox & LiveKit WebRTC
```

---

## 2. NGUYÊN TẮC PHÂN QUYỀN (RBAC) & ĐIỀU HƯỚNG ROUTE

### 2.1. Không có tính năng Đăng ký tự do (No Public Register)
- Nhà phát triển tạo tài khoản Admin ban đầu qua script Database Seed.
- Admin tạo tài khoản cho Giảng viên và import danh sách Sinh viên qua file Excel tại `/admin/users`.
- Toàn bộ người dùng đăng nhập tại cổng chung `/login`.

### 2.2. Luồng điều hướng sau khi Đăng nhập (`login/page.tsx`)
Khi API trả về JWT Token và thông tin `user.role`, Frontend bắt buộc rẽ nhánh theo mã chuẩn:

```typescript
const role = data.user?.role;
if (role === 'admin') {
  window.location.href = '/admin';
} else if (role === 'instructor') {
  window.location.href = '/instructor/dashboard';
} else {
  window.location.href = '/student/dashboard';
}
```

---

## 3. QUY CHUẨN TÁI SỬ DỤNG COMPONENT (TRÁNH TRÙNG LẶP CODE)

Nhóm **tuyệt đối không sao chép (copy-paste)** code giữa các trang của Admin và Giảng viên. Toàn bộ logic giao diện phức tạp phải được viết thành **Shared Component** đặt trong `frontend/src/components/`:

- `QuestionsManagerView.tsx`: Dùng chung cho `/admin/questions` và `/instructor/questions`.
- Code danh sách lớp học: Dùng chung giữa `/admin/classes` và `/instructor/classes`.
- Phân biệt hành vi thông qua thuộc tính `role`:
  ```tsx
  // Giảng viên: Chỉ thao tác trên các lớp mình phụ trách
  <ClassesView role="instructor" instructorId={currentUser.id} />

  // Admin: Xem và phân công toàn bộ danh mục lớp
  <ClassesView role="admin" canAssignTeacher={true} />
  ```

---

## 4. QUY TRÌNH CODE CÁC TÍNH NĂNG TRỌNG TÂM

### 4.1. Chế độ Bài Lab (Mở) vs Bài Kiểm Tra (Khóa Tab & AI)
Trong Form tạo bài (`ClassLab`), bổ sung trường `session_type`:
- **`LAB` (Thực hành)**:
  - Sinh viên được tự do mở Tab tra cứu tài liệu (Google, StackOverflow).
  - Không bắt sự kiện `blur` hay `visibilitychange`.
  - Camera có thể tắt hoặc chỉ dùng điểm danh ban đầu.
- **`EXAM` (Kiểm tra / Thi)**:
  - Bắt buộc toàn màn hình (Fullscreen).
  - Chặn phím tắt (`F12`, `Ctrl+C/V` ngoài vùng editor).
  - Lắng nghe sự kiện rời khỏi ứng dụng:
    ```typescript
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && sessionType === 'EXAM') {
        recordViolation('TAB_SWITCH', 'Rời khỏi cửa sổ làm bài');
      }
    });
    ```
  - Bật nhận diện AI: Quay mặt khỏi camera > 10s, có người thứ 2, phát hiện điện thoại.

### 4.2. Điểm danh Tự Động Qua MSSV (`student/join/page.tsx`)
- Khi sinh viên nhập: **Mã phòng (Room Code)** + **Mật mã (Passcode)** + **MSSV**.
- Hệ thống tự động:
  1. Kiểm tra MSSV có nằm trong danh sách sinh viên của lớp (`ClassRow.students`) hay không.
  2. Ghi nhận thời gian vào phòng (Timestamp).
  3. Cập nhật trạng thái điểm danh: *Có mặt* (đúng giờ) hoặc *Đi muộn* (> 15 phút).
  4. Hiển thị danh sách này theo thời gian thực trên màn hình Giảng viên kèm nút **"Xuất Excel điểm danh"**.

### 4.3. Quy trình Công bố Điểm (`class-manager`)
- Sau khi sinh viên nộp bài, điểm Docker Test Cases được lưu tạm thời.
- Sinh viên **chưa thể xem điểm** ngay trên Dashboard nếu cờ `is_published === false`.
- Giảng viên kiểm tra lại nhật ký vi phạm, sau đó bấm nút **"Công bố điểm"**.
- Khi đó cờ chuyển thành `is_published = true`, sinh viên mới thấy cột Điểm số hiển thị trên Dashboard của mình.

### 4.4. Minh bạch Cảnh báo Vi phạm AI (`student/violations`)
- Tuân thủ quy chuẩn đạo đức AI: AI chỉ tạo cảnh báo tạm thời (`review_status = 'pending'`).
- Giảng viên là người duy nhất có quyền xác nhận vi phạm (`confirmed`) hoặc hủy cảnh báo (`rejected`).
- Sinh viên được quyền xem lại toàn bộ các lần bị AI cảnh báo kèm ảnh chụp bằng chứng tại `/student/violations` để khiếu nại nếu bị trừ điểm oan.

---

## 5. QUY TRÌNH GIT & CHECKLIST TRƯỚC KHI TẠO PULL REQUEST

Để không bị hệ thống CI/CD từ chối hoặc gây xung đột với đồng đội, mỗi thành viên phải tuân thủ nghiêm ngặt 3 bước sau:

### Bước 1: Luôn kéo code mới nhất từ `main` trước khi làm
```powershell
git checkout main
git pull origin main
git checkout -b <loai-nhanh>/<ten-tinh-nang>
```

### Bước 2: Bắt buộc chạy kiểm tra cục bộ trước khi push
Mở terminal tại thư mục `frontend/` và chạy:
```powershell
npm run lint
npm run build
```
*(Chỉ khi nào build báo `Compiled successfully` và không có lỗi mới được commit).*

### Bước 3: Đặt tiêu đề Pull Request (PR Title) chuẩn Conventional Commits
Hệ thống GitHub Actions sẽ tự động kiểm tra tiêu đề PR. Tiêu đề **bắt buộc** phải có tiền tố hợp lệ viết thường:
- `feat(scope): <mo-ta>`: Khi thêm tính năng mới.
- `fix(scope): <mo-ta>`: Khi sửa lỗi.
- `refactor(scope): <mo-ta>`: Khi sắp xếp, dọn dẹp lại cấu trúc mã nguồn.
- `chore(scope): <mo-ta>`: Khi cập nhật cấu hình, thư viện.

*(Ví dụ hợp lệ: `refactor(fe-structure): clean up redundant folders and consolidate role-based routes`)*
