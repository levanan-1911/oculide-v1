# OCULIDE Product Context

OCULIDE là nền tảng kiểm tra trực tuyến, trọng tâm là bài kiểm tra lập trình, có IDE trên web, tổ chức phiên kiểm tra, theo dõi quá trình làm bài và hỗ trợ AI Proctoring.

## Vai trò
- **Admin:** quản trị hệ thống, tài khoản/phân quyền, lớp và sinh viên, cấu hình, nhật ký.
- **Giảng viên:** quản lý lớp, câu hỏi, bài kiểm tra, lịch, chính sách giám sát, phiên kiểm tra, cảnh báo và kết quả.
- **Sinh viên:** đăng nhập, tham gia phiên hợp lệ, kiểm tra thiết bị, viết/chạy/nộp mã, xem kết quả được phép.

## Nguyên tắc nghiệp vụ
- Sinh viên có tài khoản đăng nhập.
- Không tự thêm mật khẩu phòng nếu đặc tả không yêu cầu.
- Bài lập trình cần đề bài, ngôn ngữ, editor, input/output, chạy thử và nộp bài.
- Webcam/chia sẻ màn hình phụ thuộc chính sách phiên.
- Cảnh báo AI là tín hiệu cần xem xét, không tự động kết luận gian lận.
- Phân quyền được thực thi ở backend; UI phản ánh quyền được cấp.
- Không tự khẳng định tính năng đã triển khai nếu chưa có bằng chứng.

## Visual direction
- Phong cách: Modern Academic SaaS.
- Tính cách: đáng tin cậy, tập trung, dễ hiểu, chuyên nghiệp, không phô trương.
- Palette đề xuất: Deep Burgundy `#552333`; Muted Wine `#813B50`; Warm White `#F7F5F4`; White `#FFFFFF`; Charcoal `#343238`; Border `#E9E3E5`.
- Status colors: success `#239B68`, warning `#E99A36`, danger `#D64545`, info `#4386C6`.
- Nếu Figma/SVG/code đã có token chính thức, ưu tiên nguồn hiện hành.

## Layout principles
- Bố cục phẳng, dễ quét; không lạm dụng KPI card, biểu đồ, gradient, glassmorphism, shadow hay icon trang trí.
- Mỗi trang có tiêu đề, hành động chính và nội dung trọng tâm.
- Dùng bảng khi cần so sánh nhiều bản ghi.
- Dashboard chỉ trả lời tình hình, việc cần chú ý và bước tiếp theo.
- Thiết kế riêng theo role, không dùng một dashboard chung cho tất cả.
