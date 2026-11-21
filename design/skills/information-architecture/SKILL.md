---
name: information-architecture
description: Tổ chức module, điều hướng và cấu trúc trang theo role và tác vụ.
---
# Information Architecture

- Điều hướng theo nhóm nghiệp vụ, không theo cấu trúc backend.
- Tên module ngắn, quen thuộc và nhất quán với SRS.
- Chỉ hiển thị module phù hợp role/quyền.
- Giữ vị trí điều hướng ổn định; hạn chế menu nhiều cấp.

## Nhóm tham khảo
- Admin: Tổng quan; Quản lý người dùng; Lớp học & sinh viên; Cấu hình/phân quyền; Nhật ký hệ thống.
- Giảng viên: Tổng quan; Lớp học & sinh viên; Ngân hàng câu hỏi; Bài kiểm tra; Lịch kiểm tra; Giám sát trực tiếp; Báo cáo/kết quả.
- Sinh viên: Trang chủ; Bài kiểm tra của tôi; Lịch kiểm tra; Lịch sử/kết quả nếu được phép; Tài khoản.

Đây là gợi ý, phải đối chiếu SRS và quyền thực tế trước khi chốt.

## Cấu trúc trang
Page title → mô tả/ngữ cảnh → primary action → search/filter → nội dung chính → pagination.
Dashboard chỉ trả lời: tình hình hiện tại, việc cần chú ý, và bước tiếp theo. Không biến dashboard thành bản sao của mọi module.
