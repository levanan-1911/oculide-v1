---
name: accessibility-responsive-qa
description: Kiểm tra accessibility, responsive và chất lượng giao diện OCULIDE.
---
# Accessibility, Responsive & UI QA

## Accessibility
- Không dùng màu làm tín hiệu duy nhất.
- Đảm bảo contrast và focus state.
- Label gắn với input; lỗi có mô tả bằng chữ.
- Nút có tên hành động rõ, không chỉ icon khi ngữ cảnh chưa đủ.
- Hỗ trợ bàn phím cho menu, dialog, điều hướng và bảng.

## Responsive
- Desktop: tối ưu quản trị và bảng.
- Tablet: thu sidebar, giảm cột phụ.
- Mobile: ưu tiên tác vụ thiết yếu; bảng rộng cuộn ngang có chủ đích hoặc chuyển thành list.
- Không chỉ thu nhỏ desktop; xác định lại thứ tự nội dung.

## QA checklist
- Đúng role, quyền và thuật ngữ SRS?
- Hành động chính dễ tìm?
- Có cột hoặc card thừa?
- Có loading/empty/error?
- Nội dung tiếng Việt có tràn?
- Responsive và keyboard focus hoạt động?
- Có nhất quán token/component hiện hành?
- Thành phần nào chỉ trang trí mà không hỗ trợ tác vụ?
