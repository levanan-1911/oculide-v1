---
name: data-table-crud
description: Thiết kế danh sách, bảng, bộ lọc và luồng CRUD cho OCULIDE.
---
# Data Table & CRUD

## List page
- Page title và mô tả.
- Primary action rõ ràng.
- Search theo trường phù hợp.
- Filter theo trạng thái/lớp/thời gian nếu có nghiệp vụ.
- Data table, pagination và số kết quả.

## Table
- Chỉ đưa cột phục vụ quyết định/thao tác.
- Cột định danh gần đầu; căn chỉnh dữ liệu nhất quán.
- Hạn chế badge; chỉ dùng cho trạng thái cần nhận diện.
- Hành động chính hiển thị rõ; hành động phụ có thể gom menu.
- Có loading, empty, error, no-results.
- Mobile: cuộn ngang có chủ đích hoặc chuyển thành danh sách.

## CRUD
- Create: label, helper, validation, lỗi cụ thể.
- Read: trang chi tiết hoặc drawer phù hợp.
- Update: giữ ngữ cảnh, nêu trường được sửa.
- Delete: xác nhận khi khó hoàn tác, nêu đối tượng ảnh hưởng.
- Bulk action chỉ hiện khi có chọn bản ghi và đủ quyền.

Không tự thêm cột chỉ vì hệ thống khác có. Không giấu hành động chính trong menu ba chấm. Không tạo modal quá dài.
