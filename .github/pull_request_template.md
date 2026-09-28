## 📌 Loại Thay Đổi (Type of Change)
Vui lòng đánh dấu `[x]` vào ô tương ứng:
- [ ] 🚀 `feat`: Chức năng mới hoàn chỉnh
- [ ] 🐛 `fix`: Sửa lỗi hệ thống / logic
- [ ] ♻️ `refactor`: Tái cấu trúc mã nguồn (không đổi logic nghiệp vụ)
- [ ] ⚡ `perf`: Cải thiện hiệu năng xử lý
- [ ] 🛡️ `security`: Vá lỗ hổng bảo mật / gia cố an toàn
- [ ] 📝 `docs`: Cập nhật tài liệu kỹ thuật / CHANGELOG
- [ ] 🧪 `test`: Bổ sung hoặc chỉnh sửa bộ kiểm thử
- [ ] 🔧 `chore` / `ci`: Thay đổi cấu hình CI/CD, dependency hoặc tooling

---

## 📝 Mô Tả Chi Tiết (Description)
> Tóm tắt ngắn gọn: PR này giải quyết vấn đề gì, cơ chế hoạt động ra sao và những thay đổi chính trong code.

- **Vấn đề cần giải quyết:** ...
- **Giải pháp kỹ thuật đã thực hiện:** ...
- **Bán kính ảnh hưởng (Blast Radius):** ...

---

## 🔗 Liên Kết Issue (Related Issues)
> Bắt buộc sử dụng từ khóa để GitHub tự động đóng Issue khi PR được merge (ví dụ: `Closes #123`, `Fixes #456`).

- Closes #
- Fixes #

---

## 🧪 Bằng Chứng Kiểm Thử & Tự Đánh Giá (Verification & Checklist)
Vui lòng hoàn thành checklist dưới đây trước khi yêu cầu review:

### Checklist Lập trình viên:
- [ ] Đã chạy kiểm thử cục bộ và toàn bộ tests đều pass (`pytest backend/tests/`).
- [ ] Không có lỗi cú pháp hoặc cảnh báo linter mới (`flake8` / `eslint`).
- [ ] Đã bổ sung unit/integration tests cho tính năng hoặc bug vừa sửa.
- [ ] Đã kiểm tra tính tương thích ngược (Backward Compatibility) với các API hiện có.
- [ ] Không vô tình commit các file nhạy cảm (`.env`, mật khẩu, token, private keys).
- [ ] Đã cập nhật `CHANGELOG.md` và viết log chi tiết trong `changelogs/` (nếu là tính năng lớn hoặc fix bug quan trọng).

### Ảnh Chụp / Logs Chứng Minh Kết Quả (Proof):
<!-- Dán ảnh chụp màn hình UI, kết quả chạy test hoặc log phản hồi của API tại đây -->

```bash
# Ví dụ kết quả test:
======================= 28 passed in 14.20s =======================
```

---

## ⚠️ Cảnh Báo Rủi Ro & Lưu Ý Cho Reviewer (Reviewer Notes)
> Nêu rõ nếu PR có can thiệp vào: CSDL (cần migrate), biến môi trường mới (cần bổ sung vào .env), hoặc thay đổi các cờ cấu hình Docker/Celery.
