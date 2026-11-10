-- ============================================================================
-- OCULIDE - DỮ LIỆU MẪU ĐỒ ÁN CAPSTONE (SAMPLE DATA SEED)
-- Phiên bản: v2.2 (Chuẩn hóa 21 Bảng Tiếng Việt theo ERD v2)
-- Hệ quản trị CSDL: Microsoft SQL Server (T-SQL)
-- Database: ExamSystem
-- Mật khẩu mặc định cho tất cả tài khoản mẫu: admin123
-- Hash Bcrypt: $2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6
-- ============================================================================

USE ExamSystem;
GO

PRINT N'🚀 Đang nạp dữ liệu mẫu cho hệ thống Oculide...';
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 1. BẢNG VaiTro (Đảm bảo có đủ 3 vai trò)
-- ────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE ten_vai_tro = 'admin')
    INSERT INTO VaiTro (ten_vai_tro, mo_ta) VALUES ('admin', N'Quản trị viên hệ thống toàn quyền');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE ten_vai_tro = 'instructor')
    INSERT INTO VaiTro (ten_vai_tro, mo_ta) VALUES ('instructor', N'Giảng viên phụ trách giảng dạy và tổ chức phòng');
IF NOT EXISTS (SELECT 1 FROM VaiTro WHERE ten_vai_tro = 'student')
    INSERT INTO VaiTro (ten_vai_tro, mo_ta) VALUES ('student', N'Sinh viên tham gia thực hành và thi cử');
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 2. BẢNG NguoiDung (Admin, Giảng viên, Sinh viên)
-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 Quản trị viên
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'admin')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'admin', 'admin@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Quản Trị Viên Hệ Thống', 'ADM001', N'Phòng Đào Tạo & Khảo Thí', 1, 1, 0, 'sent'
    );
END

-- 2.2 Giảng viên
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, hoc_vi, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'nam.nv', 'nam.nv@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'TS. Nguyễn Văn Nam', 'MSGV001', N'Khoa Khoa Học Máy Tính', N'Tiến sĩ', '0905123456', 2, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'pvlong')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, hoc_vi, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'pvlong', 'pvlong@dtu.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'ThS. Phạm Vũ Long', 'MSGV002', N'Khoa Công Nghệ Phần Mềm', N'Thạc sĩ', '0912345678', 2, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'instructor')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, hoc_vi, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'instructor', 'instructor@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'ThS. Trần Thị Mai', 'MSGV003', N'Khoa An Toàn Thông Tin', N'Thạc sĩ', '0987654321', 2, 1, 0, 'sent'
    );
END

-- 2.3 Sinh viên
IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'student')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'student', 'student@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Nguyễn Văn An', '20110001', N'Khoa Công Nghệ Thông Tin', '0345678901', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'phamvanlong')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'phamvanlong', 'phamvanlong050505@gmail.com', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Phạm Văn Long', '2222222222', N'Khoa Công Nghệ Thông Tin', '0988776655', 1, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'sv_bich')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'sv_bich', 'bich.tran@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Trần Thị Bích', '20110002', N'Khoa Công Nghệ Thông Tin', '0345678902', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'sv_cuong')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'sv_cuong', 'cuong.le@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Lê Văn Cường', '20110003', N'Khoa Khoa Học Máy Tính', '0345678903', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'sv_dung')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'sv_dung', 'dung.hoang@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Hoàng Tiến Dũng', '20110004', N'Khoa An Toàn Thông Tin', '0345678904', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM NguoiDung WHERE ten_dang_nhap = 'sv_yen')
BEGIN
    INSERT INTO NguoiDung (
        ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
        ma_dinh_danh, khoa_bo_mon, so_dien_thoai, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
    ) VALUES (
        'sv_yen', 'yen.vu@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Vũ Hải Yến', '20110005', N'Khoa Công Nghệ Phần Mềm', '0345678905', 3, 1, 0, 'sent'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 3. BẢNG LopHoc (Lớp học tín chỉ mẫu)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @id_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');
DECLARE @id_long INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'pvlong');

IF NOT EXISTS (SELECT 1 FROM LopHoc WHERE ma_lop_hoc = 'CS404_2026')
BEGIN
    INSERT INTO LopHoc (ma_lop_hoc, ten_lop, ma_mon_hoc, hoc_ky, ma_giang_vien, mo_ta, trang_thai)
    VALUES ('CS404_2026', N'Lập trình nâng cao - Nhóm 01', 'CS404', N'Học kỳ 1 - 2026', @id_nam, N'Học phần lập trình cấu trúc dữ liệu nâng cao, thuật toán tối ưu C++ & Python', 'active');
END

IF NOT EXISTS (SELECT 1 FROM LopHoc WHERE ma_lop_hoc = 'SE301_2026')
BEGIN
    INSERT INTO LopHoc (ma_lop_hoc, ten_lop, ma_mon_hoc, hoc_ky, ma_giang_vien, mo_ta, trang_thai)
    VALUES ('SE301_2026', N'Kiến trúc Công nghệ Phần mềm', 'SE301', N'Học kỳ 1 - 2026', @id_long, N'Phát triển ứng dụng hướng dịch vụ, microservices và kiểm thử tự động', 'active');
END

IF NOT EXISTS (SELECT 1 FROM LopHoc WHERE ma_lop_hoc = 'IT202_2026')
BEGIN
    INSERT INTO LopHoc (ma_lop_hoc, ten_lop, ma_mon_hoc, hoc_ky, ma_giang_vien, mo_ta, trang_thai)
    VALUES ('IT202_2026', N'Cơ sở dữ liệu & Hệ quản trị SQL Server', 'IT202', N'Học kỳ 1 - 2026', @id_nam, N'Thiết kế CSDL quan hệ, tối ưu hóa câu truy vấn T-SQL và Indexing', 'active');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 4. BẢNG SinhVienLopHoc (Ghi danh sinh viên vào lớp)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @lop_cs INT = (SELECT TOP 1 ma_lop FROM LopHoc WHERE ma_lop_hoc = 'CS404_2026');
DECLARE @lop_se INT = (SELECT TOP 1 ma_lop FROM LopHoc WHERE ma_lop_hoc = 'SE301_2026');
DECLARE @gv_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');

-- Ghi danh 5 sinh viên vào lớp CS404
INSERT INTO SinhVienLopHoc (ma_lop, ma_sinh_vien, nguoi_them, trang_thai)
SELECT @lop_cs, u.ma_nguoi_dung, @gv_nam, 'active'
FROM NguoiDung u
WHERE u.ma_vai_tro = 3 
  AND NOT EXISTS (SELECT 1 FROM SinhVienLopHoc WHERE ma_lop = @lop_cs AND ma_sinh_vien = u.ma_nguoi_dung);

-- Ghi danh 3 sinh viên vào lớp SE301
INSERT INTO SinhVienLopHoc (ma_lop, ma_sinh_vien, nguoi_them, trang_thai)
SELECT @lop_se, u.ma_nguoi_dung, @gv_nam, 'active'
FROM NguoiDung u
WHERE u.ten_dang_nhap IN ('student', 'sv_bich', 'sv_cuong')
  AND NOT EXISTS (SELECT 1 FROM SinhVienLopHoc WHERE ma_lop = @lop_se AND ma_sinh_vien = u.ma_nguoi_dung);
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 5. BẢNG Phong (Phòng thi & phòng thực hành trực tuyến)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @gv_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');
DECLARE @lop_cs INT = (SELECT TOP 1 ma_lop FROM LopHoc WHERE ma_lop_hoc = 'CS404_2026');

IF NOT EXISTS (SELECT 1 FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404')
BEGIN
    INSERT INTO Phong (
        ma_phong_code, tieu_de, loai_phong, nguoi_tao, mo_ta, 
        gio_bat_dau, gio_ket_thuc, thoi_luong_phut, so_lan_nop_toi_da, 
        mat_ma_phong, ma_lop, cau_hinh_giam_sat, dang_hoat_dong, trang_thai
    ) VALUES (
        'EXAM_FINAL_CS404', N'Thi Cuối Kỳ: Lập Trình Thuật Toán & Cấu Trúc Dữ Liệu', 'exam', @gv_nam, 
        N'Kỳ thi chính thức kết thúc học phần CS404. Giám sát AI toàn thời gian qua camera và chia sẻ màn hình.',
        DATEADD(hour, -1, GETDATE()), DATEADD(hour, 2, GETDATE()), 90, 5,
        '123456', @lop_cs, 
        N'{"webcam_required": true, "screen_share_required": true, "audio_required": true, "block_tab_switch": true, "max_violations": 5}',
        1, 'in_progress'
    );
END

IF NOT EXISTS (SELECT 1 FROM Phong WHERE ma_phong_code = 'LAB_PRACTICE_01')
BEGIN
    INSERT INTO Phong (
        ma_phong_code, tieu_de, loai_phong, nguoi_tao, mo_ta, 
        gio_bat_dau, gio_ket_thuc, thoi_luong_phut, so_lan_nop_toi_da, 
        mat_ma_phong, ma_lop, cau_hinh_giam_sat, dang_hoat_dong, trang_thai
    ) VALUES (
        'LAB_PRACTICE_01', N'Thực Hành Lab 05: Đệ Quy và Quy Hoạch Động', 'practice', @gv_nam, 
        N'Phòng thực hành tự do không tính điểm thi, hỗ trợ chạy thử mã nguồn và chấm điểm tự động tức thì.',
        DATEADD(day, -1, GETDATE()), DATEADD(day, 7, GETDATE()), 120, 20,
        '654321', @lop_cs, 
        N'{"webcam_required": false, "screen_share_required": false}',
        1, 'in_progress'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 6. BẢNG CanBoPhuTrachPhong (Cán bộ coi thi)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');
DECLARE @gv_long INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'pvlong');

IF NOT EXISTS (SELECT 1 FROM CanBoPhuTrachPhong WHERE ma_phong = @phong_exam AND ma_giang_vien = @gv_nam)
    INSERT INTO CanBoPhuTrachPhong (ma_phong, ma_giang_vien, vai_tro_trong_phong) VALUES (@phong_exam, @gv_nam, N'Cán bộ coi thi 1');
IF NOT EXISTS (SELECT 1 FROM CanBoPhuTrachPhong WHERE ma_phong = @phong_exam AND ma_giang_vien = @gv_long)
    INSERT INTO CanBoPhuTrachPhong (ma_phong, ma_giang_vien, vai_tro_trong_phong) VALUES (@phong_exam, @gv_long, N'Cán bộ coi thi 2');
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 7. BẢNG CauHoi (Các bài tập lập trình & tự luận)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');

-- Câu 1: Two Sum
IF NOT EXISTS (SELECT 1 FROM CauHoi WHERE ma_bai_toan = 'TWO_SUM')
BEGIN
    INSERT INTO CauHoi (
        ma_bai_toan, ma_phong, thu_tu_cau, tieu_de, noi_dung_de, loai_cau_hoi, do_kho, 
        gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb, ngon_ngu_cho_phep, diem_toi_da, nguoi_soan, dang_hoat_dong
    ) VALUES (
        'TWO_SUM', @phong_exam, 1, 
        N'Tìm Cặp Số Có Tổng Bằng Target (Two Sum)',
        N'Cho một mảng số nguyên nums và một số nguyên target. Hãy tìm chỉ số của hai số sao cho tổng của chúng bằng target.\n\nĐầu vào:\n- Dòng 1: Số nguyên N và target cách nhau bởi dấu cách.\n- Dòng 2: N số nguyên của mảng nums.\n\nĐầu ra:\n- In ra hai chỉ số cách nhau bởi dấu cách (theo thứ tự tăng dần).',
        'coding', 'easy', 1000, 128, 'python,cpp,java', 4.0, @gv_nam, 1
    );
END

-- Câu 2: Palindrome Number
IF NOT EXISTS (SELECT 1 FROM CauHoi WHERE ma_bai_toan = 'PALINDROME_NUM')
BEGIN
    INSERT INTO CauHoi (
        ma_bai_toan, ma_phong, thu_tu_cau, tieu_de, noi_dung_de, loai_cau_hoi, do_kho, 
        gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb, ngon_ngu_cho_phep, diem_toi_da, nguoi_soan, dang_hoat_dong
    ) VALUES (
        'PALINDROME_NUM', @phong_exam, 2, 
        N'Kiểm Tra Số Đối Xứng (Palindrome Number)',
        N'Cho một số nguyên x. Trả về YES nếu x là một số đối xứng, ngược lại trả về NO.\n\nVí dụ:\n- 121 -> YES\n- -121 -> NO\n- 10 -> NO',
        'coding', 'easy', 1000, 128, 'python,cpp,java', 3.0, @gv_nam, 1
    );
END

-- Câu 3: Tự luận Lý thuyết
IF NOT EXISTS (SELECT 1 FROM CauHoi WHERE ma_bai_toan = 'ESSAY_PROCTORING')
BEGIN
    INSERT INTO CauHoi (
        ma_bai_toan, ma_phong, thu_tu_cau, tieu_de, noi_dung_de, loai_cau_hoi, do_kho, 
        gioi_han_thoi_gian_ms, gioi_han_bo_nho_mb, ngon_ngu_cho_phep, diem_toi_da, nguoi_soan, dang_hoat_dong
    ) VALUES (
        'ESSAY_PROCTORING', @phong_exam, 3, 
        N'Phân Tích Kiến Trúc Hệ Thống Giám Sát Trực Tuyến AI',
        N'Trình bày nguyên lý hoạt động của kiến trúc WebSocket kết hợp SFU (LiveKit) và hàng đợi Celery trong việc xử lý giám sát đa luồng thời gian thực. Đánh giá giải pháp chống gian lận khi thí sinh chuyển tab hoặc mất kết nối mạng.',
        'essay', 'medium', 0, 0, 'text', 3.0, @gv_nam, 1
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 8. BẢNG BoKiemThu (Test Cases cho câu hỏi lập trình)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @q_two_sum INT = (SELECT TOP 1 ma_cau_hoi FROM CauHoi WHERE ma_bai_toan = 'TWO_SUM');
DECLARE @q_palin INT = (SELECT TOP 1 ma_cau_hoi FROM CauHoi WHERE ma_bai_toan = 'PALINDROME_NUM');

IF @q_two_sum IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BoKiemThu WHERE ma_cau_hoi = @q_two_sum)
BEGIN
    -- Test công khai (Sample test)
    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_two_sum, '4 9' + CHAR(10) + '2 7 11 15', '0 1', 1, 0, 1.0);

    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_two_sum, '3 6' + CHAR(10) + '3 2 4', '1 2', 1, 0, 1.0);

    -- Test ẩn (Hidden test)
    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_two_sum, '5 10' + CHAR(10) + '1 3 5 5 9', '2 3', 0, 1, 1.0);

    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_two_sum, '6 20' + CHAR(10) + '2 4 8 12 16 19', '2 3', 0, 1, 1.0);
END

IF @q_palin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BoKiemThu WHERE ma_cau_hoi = @q_palin)
BEGIN
    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_palin, '121', 'YES', 1, 0, 1.0);

    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_palin, '-121', 'NO', 1, 0, 1.0);

    INSERT INTO BoKiemThu (ma_cau_hoi, du_lieu_dau_vao, ket_qua_mong_doi, la_test_vi_du, la_test_an, diem_test)
    VALUES (@q_palin, '12321', 'YES', 0, 1, 1.0);
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 9. BẢNG PhienLamBai (Thí sinh đang trong phòng thi)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');
DECLARE @sv2 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'sv_bich');

IF NOT EXISTS (SELECT 1 FROM PhienLamBai WHERE ma_phong = @phong_exam AND ma_sinh_vien = @sv1)
BEGIN
    INSERT INTO PhienLamBai (
        ma_phong, ma_sinh_vien, dia_chi_ip, thong_tin_trinh_duyet, ma_van_tay_trinh_duyet, 
        trang_thai, so_phut_duoc_cong, thoi_gian_bat_dau
    ) VALUES (
        @phong_exam, @sv1, '127.0.0.1', 'Chrome 122.0 Windows 11', 'fp_student_01_win11',
        'doing', 0, DATEADD(minute, -30, GETDATE())
    );
END

IF NOT EXISTS (SELECT 1 FROM PhienLamBai WHERE ma_phong = @phong_exam AND ma_sinh_vien = @sv2)
BEGIN
    INSERT INTO PhienLamBai (
        ma_phong, ma_sinh_vien, dia_chi_ip, thong_tin_trinh_duyet, ma_van_tay_trinh_duyet, 
        trang_thai, so_phut_duoc_cong, thoi_gian_bat_dau
    ) VALUES (
        @phong_exam, @sv2, '192.168.1.15', 'Edge 121.0 Windows 10', 'fp_student_02_win10',
        'doing', 0, DATEADD(minute, -25, GETDATE())
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 10. BẢNG KiemTraThietBi (Kiểm tra phần cứng trước giờ thi)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phien1 INT = (SELECT TOP 1 ma_phien FROM PhienLamBai WHERE ma_van_tay_trinh_duyet = 'fp_student_01_win11');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');

IF @phien1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM KiemTraThietBi WHERE ma_phien = @phien1)
BEGIN
    INSERT INTO KiemTraThietBi (
        ma_phien, ma_sinh_vien, trang_thai_camera, trang_thai_micro, 
        do_tre_mang_ms, thong_tin_he_dieu_hanh, thong_tin_trinh_duyet, du_dieu_kien_thi
    ) VALUES (
        @phien1, @sv1, 1, 1, 18, 'Windows 11 Home 64-bit', 'Google Chrome 122', 1
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 11. BẢNG BanNhapCode & BaiNop (Code nháp & Bài nộp đã chấm)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phien1 INT = (SELECT TOP 1 ma_phien FROM PhienLamBai WHERE ma_van_tay_trinh_duyet = 'fp_student_01_win11');
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');
DECLARE @q_two_sum INT = (SELECT TOP 1 ma_cau_hoi FROM CauHoi WHERE ma_bai_toan = 'TWO_SUM');

-- Bản nháp code đang gõ
IF @phien1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BanNhapCode WHERE ma_phien = @phien1 AND ma_cau_hoi = @q_two_sum)
BEGIN
    INSERT INTO BanNhapCode (ma_phien, ma_cau_hoi, ma_sinh_vien, ngon_ngu_lap_trinh, ma_nguon_nhap)
    VALUES (
        @phien1, @q_two_sum, @sv1, 'python',
        'def two_sum():\n    n, target = map(int, input().split())\n    nums = list(map(int, input().split()))\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            print(lookup[diff], i)\n            return\n        lookup[num] = i\n\ntwo_sum()'
    );
END

-- Bài nộp chính thức đã chấm (AC - 100 điểm)
IF @phien1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM BaiNop WHERE ma_phien = @phien1 AND ma_cau_hoi = @q_two_sum)
BEGIN
    INSERT INTO BaiNop (
        ma_phong, ma_sinh_vien, ma_cau_hoi, ma_phien, lan_nop, 
        ma_nguon_nop, ngon_ngu, trang_thai_cham, tong_diem, thoi_gian_chay_toi_da_ms, bo_nho_chay_toi_da_kb
    ) VALUES (
        @phong_exam, @sv1, @q_two_sum, @phien1, 1,
        'def two_sum():\n    n, target = map(int, input().split())\n    nums = list(map(int, input().split()))\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            print(lookup[diff], i)\n            return\n        lookup[num] = i\n\ntwo_sum()',
        'python', 'completed', 4.0, 45, 14200
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 12. BẢNG ViPhamGiamSat & Snapshots (Cảnh báo gian lận AI mẫu)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phien1 INT = (SELECT TOP 1 ma_phien FROM PhienLamBai WHERE ma_van_tay_trinh_duyet = 'fp_student_01_win11');
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');

IF @phien1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ViPhamGiamSat WHERE ma_phien = @phien1)
BEGIN
    INSERT INTO ViPhamGiamSat (
        ma_phien, ma_phong, ma_sinh_vien, loai_vi_pham, muc_do_nghiem_trong, 
        mo_ta, do_tin_cay_ai, link_anh_bang_chung, da_kiem_tra, trang_thai_duyet
    ) VALUES (
        @phien1, @phong_exam, @sv1, 'tab_switch', 'medium', 
        N'Thí sinh rời khỏi tab thi sang ứng dụng khác (phát hiện qua Page Visibility API)', 0.95, 
        '/uploads/snapshots/sample_tab_switch.jpg', 0, 'pending'
    );

    INSERT INTO ViPhamGiamSat (
        ma_phien, ma_phong, ma_sinh_vien, loai_vi_pham, muc_do_nghiem_trong, 
        mo_ta, do_tin_cay_ai, link_anh_bang_chung, da_kiem_tra, trang_thai_duyet
    ) VALUES (
        @phien1, @phong_exam, @sv1, 'multiple_faces', 'high', 
        N'Phát hiện 2 khuôn mặt đồng thời xuất hiện trong khung hình webcam', 0.88, 
        '/uploads/snapshots/sample_multi_faces.jpg', 0, 'pending'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 13. BẢNG TinNhanPhong (Chat trao đổi trong phòng thi)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'nam.nv');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');

IF @phong_exam IS NOT NULL AND NOT EXISTS (SELECT 1 FROM TinNhanPhong WHERE ma_phong = @phong_exam)
BEGIN
    INSERT INTO TinNhanPhong (ma_phong, nguoi_gui, loai_tin_nhan, la_tin_rieng, noi_dung)
    VALUES (@phong_exam, @gv_nam, 'broadcast', 0, N'Chào các em, đề thi đã được kích hoạt. Chúc các em làm bài tốt!');

    INSERT INTO TinNhanPhong (ma_phong, nguoi_gui, nguoi_nhan, loai_tin_nhan, la_tin_rieng, noi_dung)
    VALUES (@phong_exam, @sv1, @gv_nam, 'direct', 1, N'Thầy ơi cho em hỏi câu 1 giới hạn thời gian tính bằng giây hay mili giây ạ?');

    INSERT INTO TinNhanPhong (ma_phong, nguoi_gui, nguoi_nhan, loai_tin_nhan, la_tin_rieng, noi_dung)
    VALUES (@phong_exam, @gv_nam, @sv1, 'direct', 1, N'Thời gian chạy tối đa là 1.0 giây (1000ms) em nhé.');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 14. BẢNG YeuCauTroGiup (Yêu cầu hỗ trợ SOS)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @phien1 INT = (SELECT TOP 1 ma_phien FROM PhienLamBai WHERE ma_van_tay_trinh_duyet = 'fp_student_01_win11');
DECLARE @phong_exam INT = (SELECT TOP 1 ma_phong FROM Phong WHERE ma_phong_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'student');

IF @phien1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM YeuCauTroGiup WHERE ma_phien = @phien1)
BEGIN
    INSERT INTO YeuCauTroGiup (ma_phien, ma_phong, ma_sinh_vien, danh_muc_su_co, tin_nhan_sos, trang_thai)
    VALUES (@phien1, @phong_exam, @sv1, 'camera_frozen', N'Camera của em bị chớp tắt, em xin phép khởi động lại trình duyệt ạ', 'resolved');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 15. BẢNG NhatKyHeThong (System Audit Logs)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @id_admin INT = (SELECT TOP 1 ma_nguoi_dung FROM NguoiDung WHERE ten_dang_nhap = 'admin');

IF NOT EXISTS (SELECT 1 FROM NhatKyHeThong)
BEGIN
    INSERT INTO NhatKyHeThong (ma_nguoi_dung, muc_do, hanh_dong, thong_bao, dia_chi_ip)
    VALUES (@id_admin, 'INFO', 'SYSTEM_BOOT', N'Khởi tạo thành công cơ sở dữ liệu và cấu hình hệ thống Oculide', '127.0.0.1');

    INSERT INTO NhatKyHeThong (ma_nguoi_dung, muc_do, hanh_dong, thong_bao, dia_chi_ip)
    VALUES (@id_admin, 'INFO', 'USER_LOGIN', N'Quản trị viên đăng nhập vào hệ thống', '127.0.0.1');

    INSERT INTO NhatKyHeThong (ma_nguoi_dung, muc_do, hanh_dong, thong_bao, dia_chi_ip)
    VALUES (@id_admin, 'INFO', 'CREATE_ROOM', N'Giảng viên Nguyễn Văn Nam tạo phòng thi EXAM_FINAL_CS404', '127.0.0.1');
END
GO

PRINT N'🎉 NẠP DỮ LIỆU MẪU THÀNH CÔNG! Đã khởi tạo đầy đủ dữ liệu cho 21 bảng trong ExamSystem.';
GO
