-- ============================================================================
-- DATABASE SCHEMA CHO OCULIDE - HỆ THỐNG GIÁM SÁT THỰC HÀNH & THI TRỰC TUYẾN
-- Phiên bản: v2.1 (21 Bảng Chuẩn hóa ERD v2)
-- Hệ quản trị CSDL: Microsoft SQL Server (T-SQL)
-- Database Name: ExamSystem
-- Mô tả:
--   - Chuẩn hóa dùng chung cho cả Buổi thực hành (Lab) & Kỳ thi (Exam).
--   - Hồ sơ người dùng 3 Roles (Admin, Giảng viên, Sinh viên) tích hợp trên bảng NguoiDung.
--   - Phân hệ AI giám sát Computer Vision thực tế (YOLOv8 + MediaPipe), Snapshots timeline.
--   - Loại bỏ hoàn toàn vi phạm Micro và Face ID để tối ưu UX/UI và thực tế phòng Lab.
--   - Đầy đủ 21 bảng, Ràng buộc Khóa chính, Khóa ngoại, Khóa duy nhất (UK), Indexes và Seed Data.
-- ============================================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'ExamSystem')
BEGIN
    ALTER DATABASE ExamSystem SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ExamSystem;
END
GO

CREATE DATABASE ExamSystem;
GO

USE ExamSystem;
GO

-- ============================================================================
-- PHÂN HỆ 1: TÀI KHOẢN, XÁC THỰC, VAI TRÒ & HỒ SƠ 3 ROLES
-- ============================================================================

-- 1. Bảng VaiTro (Roles)
-- Quản lý 3 vai trò chính: admin, instructor, student
CREATE TABLE VaiTro (
    ma_vai_tro INT IDENTITY(1,1) PRIMARY KEY,
    ten_vai_tro NVARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'instructor', 'student'
    mo_ta NVARCHAR(255) NULL
);
GO

-- 2. Bảng NguoiDung (Users - Dùng chung 3 Roles)
-- Tích hợp thông tin profile của Admin, Giảng viên và Sinh viên
CREATE TABLE NguoiDung (
    ma_nguoi_dung INT IDENTITY(1,1) PRIMARY KEY,
    ten_dang_nhap NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    mat_khau_hash NVARCHAR(255) NOT NULL,
    ho_va_ten NVARCHAR(100) NOT NULL,
    ma_dinh_danh NVARCHAR(50) NULL,             -- MSSV (SV) / Mã giảng viên (GV) / Mã Admin
    khoa_bo_mon NVARCHAR(150) NULL,             -- Chuyên ngành (SV) / Khoa bộ môn (GV) / Đơn vị (Admin)
    hoc_vi NVARCHAR(50) NULL,                   -- Tiến sĩ / Thạc sĩ (chỉ áp dụng Giảng viên)
    so_dien_thoai NVARCHAR(20) NULL,
    anh_dai_dien NVARCHAR(500) NULL,
    ma_vai_tro INT NOT NULL,
    dang_hoat_dong BIT DEFAULT 1 NOT NULL,
    yeu_cau_doi_mat_khau BIT DEFAULT 0 NOT NULL,
    trang_thai_gui_mail NVARCHAR(20) DEFAULT 'chua_gui' NOT NULL, -- 'chua_gui', 'da_gui', 'that_bai'
    dang_nhap_cuoi DATETIME2 NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_NguoiDung_VaiTro FOREIGN KEY (ma_vai_tro) 
        REFERENCES VaiTro(ma_vai_tro),
    CONSTRAINT CHK_NguoiDung_TrangThaiMail CHECK (trang_thai_gui_mail IN ('chua_gui', 'da_gui', 'that_bai'))
);
GO
CREATE INDEX IDX_NguoiDung_Email ON NguoiDung(email);
CREATE INDEX IDX_NguoiDung_MaDinhDanh ON NguoiDung(ma_dinh_danh);
CREATE INDEX IDX_NguoiDung_VaiTro ON NguoiDung(ma_vai_tro);
GO

-- 3. Bảng TokenXacThuc (AuthTokens)
-- Lưu Refresh Token, Token đặt lại mật khẩu, Token xác thực email
CREATE TABLE TokenXacThuc (
    ma_token INT IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung INT NOT NULL,
    ma_token_hash NVARCHAR(255) UNIQUE NOT NULL,
    loai_token NVARCHAR(50) NOT NULL,           -- 'refresh', 'reset_password', 'verify'
    thong_tin_thiet_bi NVARCHAR(255) NULL,
    ngay_het_han DATETIME2 NOT NULL,
    da_su_dung BIT DEFAULT 0 NOT NULL,
    ngay_thu_hoi DATETIME2 NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_TokenXacThuc_NguoiDung FOREIGN KEY (ma_nguoi_dung) 
        REFERENCES NguoiDung(ma_nguoi_dung) ON DELETE CASCADE,
    CONSTRAINT CHK_TokenXacThuc_Loai CHECK (loai_token IN ('refresh', 'reset_password', 'verify'))
);
GO
CREATE INDEX IDX_TokenXacThuc_NguoiDung ON TokenXacThuc(ma_nguoi_dung);
GO

-- 4. Bảng NhatKyHeThong (SystemAuditLogs)
-- Lưu vết hành động hệ thống, bảo mật và kiểm toán
CREATE TABLE NhatKyHeThong (
    ma_nhat_ky INT IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung INT NULL,
    muc_do NVARCHAR(20) NOT NULL,               -- 'INFO', 'WARNING', 'CRITICAL', 'SECURITY'
    hanh_dong NVARCHAR(100) NOT NULL,
    dia_chi_ip NVARCHAR(45) NULL,
    du_lieu_chi_tiet NVARCHAR(MAX) NULL,
    thoi_gian DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_NhatKyHeThong_NguoiDung FOREIGN KEY (ma_nguoi_dung) 
        REFERENCES NguoiDung(ma_nguoi_dung) ON DELETE SET NULL,
    CONSTRAINT CHK_NhatKyHeThong_MucDo CHECK (muc_do IN ('INFO', 'WARNING', 'CRITICAL', 'SECURITY'))
);
GO
CREATE INDEX IDX_NhatKyHeThong_ThoiGian ON NhatKyHeThong(thoi_gian DESC);
CREATE INDEX IDX_NhatKyHeThong_NguoiDung ON NhatKyHeThong(ma_nguoi_dung);
GO

-- ============================================================================
-- PHÂN HỆ 2: QUẢN LÝ LỚP HỌC & DANH SÁCH SINH VIÊN
-- ============================================================================

-- 5. Bảng LopHoc (Classes)
-- Quản lý danh sách lớp tín chỉ / lớp học phần do Giảng viên phụ trách
CREATE TABLE LopHoc (
    ma_lop INT IDENTITY(1,1) PRIMARY KEY,
    ma_lop_hoc NVARCHAR(50) UNIQUE NOT NULL,    -- Ví dụ: PRN231_SE1801
    ten_lop NVARCHAR(150) NOT NULL,
    ma_mon_hoc NVARCHAR(50) NULL,
    hoc_ky NVARCHAR(20) NULL,                   -- Ví dụ: Fall 2026, Spring 2027
    ma_giang_vien INT NOT NULL,                 -- Giảng viên phụ trách chính
    trang_thai NVARCHAR(20) DEFAULT 'dang_mo' NOT NULL, -- 'dang_mo', 'da_dong'
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_LopHoc_GiangVien FOREIGN KEY (ma_giang_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_LopHoc_TrangThai CHECK (trang_thai IN ('dang_mo', 'da_dong'))
);
GO
CREATE INDEX IDX_LopHoc_GiangVien ON LopHoc(ma_giang_vien);
GO

-- 6. Bảng SinhVienLopHoc (ClassStudents)
-- Danh sách sinh viên thuộc lớp học phần
CREATE TABLE SinhVienLopHoc (
    ma_dong INT IDENTITY(1,1) PRIMARY KEY,
    ma_lop INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    trang_thai NVARCHAR(20) DEFAULT 'dang_hoc' NOT NULL, -- 'dang_hoc', 'da_rut', 'hoan_thanh'
    ngay_tham_gia DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_SinhVienLopHoc_Lop FOREIGN KEY (ma_lop) 
        REFERENCES LopHoc(ma_lop) ON DELETE CASCADE,
    CONSTRAINT FK_SinhVienLopHoc_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT UQ_SinhVien_Lop UNIQUE (ma_lop, ma_sinh_vien),
    CONSTRAINT CHK_SinhVienLopHoc_TrangThai CHECK (trang_thai IN ('dang_hoc', 'da_rut', 'hoan_thanh'))
);
GO
CREATE INDEX IDX_SinhVienLopHoc_SinhVien ON SinhVienLopHoc(ma_sinh_vien);
GO

-- ============================================================================
-- PHÂN HỆ 3: NGÂN HÀNG CÂU HỎI & BỘ ĐỀ (LAB & EXAM)
-- ============================================================================

-- 7. Bảng CauHoi (Questions)
-- Ngân hàng bài tập lập trình
CREATE TABLE CauHoi (
    ma_cau_hoi INT IDENTITY(1,1) PRIMARY KEY,
    ma_bai_toan NVARCHAR(50) UNIQUE NOT NULL,   -- Ví dụ: TWO_SUM, PALINDROME_CHECK
    tieu_de NVARCHAR(200) NOT NULL,
    noi_dung_de NVARCHAR(MAX) NOT NULL,
    do_kho NVARCHAR(20) DEFAULT 'medium' NOT NULL, -- 'easy', 'medium', 'hard'
    gioi_han_thoi_gian_ms INT DEFAULT 1000 NOT NULL,
    gioi_han_bo_nho_mb INT DEFAULT 256 NOT NULL,
    ngon_ngu_cho_phep NVARCHAR(100) DEFAULT 'c,cpp,python,java' NOT NULL,
    nguoi_soan INT NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_CauHoi_NguoiSoan FOREIGN KEY (nguoi_soan) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_CauHoi_DoKho CHECK (do_kho IN ('easy', 'medium', 'hard'))
);
GO
CREATE INDEX IDX_CauHoi_NguoiSoan ON CauHoi(nguoi_soan);
GO

-- 8. Bảng BoKiemThu (TestCases)
-- Danh sách testcase chấm bài tự động
CREATE TABLE BoKiemThu (
    ma_test_case INT IDENTITY(1,1) PRIMARY KEY,
    ma_cau_hoi INT NOT NULL,
    du_lieu_dau_vao NVARCHAR(MAX) NOT NULL,
    ket_qua_mong_doi NVARCHAR(MAX) NOT NULL,
    la_test_vi_du BIT DEFAULT 0 NOT NULL,
    la_test_an BIT DEFAULT 0 NOT NULL,

    CONSTRAINT FK_BoKiemThu_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi) ON DELETE CASCADE
);
GO
CREATE INDEX IDX_BoKiemThu_CauHoi ON BoKiemThu(ma_cau_hoi);
GO

-- 9. Bảng BoDeMau (ExamTemplates / LabTemplates)
-- Cấu trúc bộ đề mẫu cho buổi Lab hoặc đề thi Exam
CREATE TABLE BoDeMau (
    ma_de_thi INT IDENTITY(1,1) PRIMARY KEY,
    ma_de NVARCHAR(50) UNIQUE NOT NULL,         -- Ví dụ: DE_LAB_01, THI_CUOIKY_CS101
    tieu_de NVARCHAR(200) NOT NULL,
    loai_de NVARCHAR(20) NOT NULL,              -- 'lab' hoặc 'exam'
    tong_thoi_gian_phut INT NOT NULL,
    tong_diem DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
    nguoi_tao INT NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_BoDeMau_NguoiTao FOREIGN KEY (nguoi_tao) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_BoDeMau_LoaiDe CHECK (loai_de IN ('lab', 'exam'))
);
GO
CREATE INDEX IDX_BoDeMau_NguoiTao ON BoDeMau(nguoi_tao);
GO

-- 10. Bảng CauHoiTrongDe (TemplateQuestions)
-- Bảng liên kết nhiều-nhiều giữa Bộ đề mẫu và Câu hỏi
CREATE TABLE CauHoiTrongDe (
    ma_dong INT IDENTITY(1,1) PRIMARY KEY,
    ma_de_thi INT NOT NULL,
    ma_cau_hoi INT NOT NULL,
    thu_tu_cau INT DEFAULT 1 NOT NULL,
    so_diem DECIMAL(5,2) NOT NULL,

    CONSTRAINT FK_CauHoiTrongDe_DeThi FOREIGN KEY (ma_de_thi) 
        REFERENCES BoDeMau(ma_de_thi) ON DELETE CASCADE,
    CONSTRAINT FK_CauHoiTrongDe_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi),
    CONSTRAINT UQ_De_CauHoi UNIQUE (ma_de_thi, ma_cau_hoi)
);
GO
CREATE INDEX IDX_CauHoiTrongDe_DeThi ON CauHoiTrongDe(ma_de_thi);
GO

-- ============================================================================
-- PHÂN HỆ 4: QUẢN LÝ PHÒNG (LAB & EXAM DÙNG CHUNG)
-- ============================================================================

-- 11. Bảng Phong (Rooms - Dùng chung Lab & Exam)
CREATE TABLE Phong (
    ma_phong INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong_code NVARCHAR(50) UNIQUE NOT NULL, -- Mã PIN tham gia phòng (ví dụ: LAB03-8841)
    tieu_de NVARCHAR(200) NOT NULL,
    loai_phong NVARCHAR(20) NOT NULL,           -- 'lab' hoặc 'exam'
    mat_ma_phong NVARCHAR(50) NULL,             -- Passcode mở phòng
    ma_lop INT NULL,
    ma_de_mau INT NULL,
    nguoi_tao INT NOT NULL,                     -- Giảng viên mở phòng
    gio_bat_dau DATETIME2 NOT NULL,
    gio_ket_thuc DATETIME2 NOT NULL,
    cau_hinh_giam_sat NVARCHAR(MAX) NULL,       -- JSON cấu hình (webcam, ngưỡng AI, tab switch...)
    trang_thai NVARCHAR(20) DEFAULT 'chua_mo' NOT NULL, -- 'chua_mo', 'dang_dien_ra', 'da_dong'

    CONSTRAINT FK_Phong_LopHoc FOREIGN KEY (ma_lop) 
        REFERENCES LopHoc(ma_lop),
    CONSTRAINT FK_Phong_BoDeMau FOREIGN KEY (ma_de_mau) 
        REFERENCES BoDeMau(ma_de_thi),
    CONSTRAINT FK_Phong_NguoiTao FOREIGN KEY (nguoi_tao) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_Phong_LoaiPhong CHECK (loai_phong IN ('lab', 'exam')),
    CONSTRAINT CHK_Phong_TrangThai CHECK (trang_thai IN ('chua_mo', 'dang_dien_ra', 'da_dong'))
);
GO
CREATE INDEX IDX_Phong_Code ON Phong(ma_phong_code);
CREATE INDEX IDX_Phong_NguoiTao ON Phong(nguoi_tao);
CREATE INDEX IDX_Phong_Lop ON Phong(ma_lop);
GO

-- 12. Bảng CanBoPhuTrachPhong (RoomProctors / Staff)
-- Phân công Giám thị, Trợ giảng, Giảng viên đồng phụ trách
CREATE TABLE CanBoPhuTrachPhong (
    ma_dong INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    ma_giang_vien INT NOT NULL,
    vai_tro_trong_phong NVARCHAR(50) DEFAULT 'giam_thi' NOT NULL, -- 'giang_vien_chinh', 'tro_giang', 'giam_thi'

    CONSTRAINT FK_CanBoPhuTrach_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong) ON DELETE CASCADE,
    CONSTRAINT FK_CanBoPhuTrach_GiangVien FOREIGN KEY (ma_giang_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT UQ_Phong_CanBo UNIQUE (ma_phong, ma_giang_vien),
    CONSTRAINT CHK_CanBo_VaiTro CHECK (vai_tro_trong_phong IN ('giang_vien_chinh', 'tro_giang', 'giam_thi'))
);
GO
CREATE INDEX IDX_CanBoPhuTrach_Phong ON CanBoPhuTrachPhong(ma_phong);
GO

-- 13. Bảng TinNhanPhong (RoomMessages / Announcements)
-- Thông báo của Giám thị hoặc trao đổi nội bộ phòng
CREATE TABLE TinNhanPhong (
    ma_tin_nhan INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    nguoi_gui INT NOT NULL,
    loai_tin_nhan NVARCHAR(30) DEFAULT 'chat' NOT NULL, -- 'chat', 'thong_bao_noi', 'canh_bao'
    noi_dung NVARCHAR(MAX) NOT NULL,
    thoi_gian_gui DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_TinNhanPhong_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong) ON DELETE CASCADE,
    CONSTRAINT FK_TinNhanPhong_NguoiGui FOREIGN KEY (nguoi_gui) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_TinNhan_Loai CHECK (loai_tin_nhan IN ('chat', 'thong_bao_noi', 'canh_bao'))
);
GO
CREATE INDEX IDX_TinNhanPhong_Phong ON TinNhanPhong(ma_phong);
GO

-- ============================================================================
-- PHÂN HỆ 5: PHIÊN LÀM BÀI, GIÁM SÁT REAL-TIME AI & CHẤM ĐIỂM
-- ============================================================================

-- 14. Bảng PhienLamBai (ExamSessions)
-- Đã loại bỏ do_khop_khuon_mat và trang_thai_micro
CREATE TABLE PhienLamBai (
    ma_phien INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    trang_thai NVARCHAR(20) DEFAULT 'dang_lam' NOT NULL, -- 'dang_lam', 'da_nop', 'bi_khoa'
    so_phut_duoc_cong INT DEFAULT 0 NOT NULL,
    ma_dinh_danh_livekit NVARCHAR(100) NULL,
    thoi_gian_bat_dau DATETIME2 DEFAULT GETDATE() NOT NULL,
    thoi_gian_nop_bai DATETIME2 NULL,

    CONSTRAINT FK_PhienLamBai_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong),
    CONSTRAINT FK_PhienLamBai_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT UQ_Phong_SinhVien UNIQUE (ma_phong, ma_sinh_vien),
    CONSTRAINT CHK_PhienLamBai_TrangThai CHECK (trang_thai IN ('dang_lam', 'da_nop', 'bi_khoa'))
);
GO
CREATE INDEX IDX_PhienLamBai_Phong ON PhienLamBai(ma_phong);
CREATE INDEX IDX_PhienLamBai_SinhVien ON PhienLamBai(ma_sinh_vien);
GO

-- 15. Bảng KiemTraThietBi (DeviceChecks)
-- Kiểm tra trước khi thi: Camera, Độ trễ mạng, OS, Trình duyệt
CREATE TABLE KiemTraThietBi (
    ma_kiem_tra INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    trang_thai_camera BIT DEFAULT 0 NOT NULL,
    do_tre_mang_ms INT DEFAULT 0 NOT NULL,
    thong_tin_he_dieu_hanh NVARCHAR(100) NULL,
    thong_tin_trinh_duyet NVARCHAR(100) NULL,
    du_dieu_kien_thi BIT DEFAULT 0 NOT NULL,     -- is_passed: Đủ điều kiện mở đề thi
    thoi_gian_kiem_tra DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_KiemTraThietBi_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_KiemTraThietBi_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_KiemTraThietBi_Phien ON KiemTraThietBi(ma_phien);
GO

-- 16. Bảng Snapshots (Khung hình webcam định kỳ AI phân tích cho Timeline ca thi)
CREATE TABLE Snapshots (
    ma_snapshot INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    link_anh NVARCHAR(500) NOT NULL,
    co_khuon_mat BIT DEFAULT 1 NOT NULL,
    so_luong_mat INT DEFAULT 1 NOT NULL,
    nhin_man_hinh BIT DEFAULT 1 NOT NULL,
    diem_tin_cay DECIMAL(4,3) DEFAULT 1.000 NOT NULL, -- 0.000 đến 1.000
    thoi_gian_chup DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Snapshots_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_Snapshots_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_Snapshots_Phien_ThoiGian ON Snapshots(ma_phien, thoi_gian_chup DESC);
GO

-- 17. Bảng BanNhapCode (CodeDrafts - Tự động lưu nháp Auto-save)
-- Đảm bảo sinh viên không mất bài khi mất kết nối/mất điện
CREATE TABLE BanNhapCode (
    ma_ban_nhap INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_cau_hoi INT NOT NULL,
    ngon_ngu_lap_trinh NVARCHAR(30) NOT NULL,
    ma_nguon_nhap NVARCHAR(MAX) NOT NULL,
    lan_luu_cuoi DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_BanNhapCode_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_BanNhapCode_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi),
    CONSTRAINT UQ_Phien_CauHoi_Draft UNIQUE (ma_phien, ma_cau_hoi)
);
GO
CREATE INDEX IDX_BanNhapCode_Phien ON BanNhapCode(ma_phien);
GO

-- 18. Bảng YeuCauTroGiup (SupportRequests - Sinh viên gửi SOS sự cố máy)
CREATE TABLE YeuCauTroGiup (
    ma_yeu_cau INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    danh_muc_su_co NVARCHAR(100) NOT NULL,      -- 'mat_mang', 'loi_may', 'thac_mac_de'
    tin_nhan_sos NVARCHAR(MAX) NOT NULL,
    trang_thai NVARCHAR(20) DEFAULT 'cho_xu_ly' NOT NULL, -- 'cho_xu_ly', 'dang_ho_tro', 'da_xong'
    thoi_gian_gui DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_YeuCauTroGiup_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT CHK_YeuCauTroGiup_TrangThai CHECK (trang_thai IN ('cho_xu_ly', 'dang_ho_tro', 'da_xong'))
);
GO
CREATE INDEX IDX_YeuCauTroGiup_Phien ON YeuCauTroGiup(ma_phien);
GO

-- 19. Bảng ViPhamGiamSat (Violations - AI sinh cảnh báo -> Giám thị kết luận)
CREATE TABLE ViPhamGiamSat (
    ma_vi_pham INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_phong INT NOT NULL,                      -- Tối ưu hóa truy vấn Dashboard phòng
    ma_sinh_vien INT NOT NULL,                  -- Tối ưu hóa truy vấn theo sinh viên
    loai_vi_pham NVARCHAR(50) NOT NULL,         -- 'mat_mat', 'nguoi_la', 'chuyen_tab', 'dien_thoai', 'chup_thu_cong'
    do_tin_cay_ai DECIMAL(4,3) DEFAULT 1.000 NOT NULL,
    link_anh_bang_chung NVARCHAR(500) NULL,
    trang_thai_duyet NVARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'rejected'
    thoi_gian_phat_hien DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_ViPhamGiamSat_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_ViPhamGiamSat_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong),
    CONSTRAINT FK_ViPhamGiamSat_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_ViPham_TrangThaiDuyet CHECK (trang_thai_duyet IN ('pending', 'confirmed', 'rejected'))
);
GO
CREATE INDEX IDX_ViPham_Phong_TrangThai ON ViPhamGiamSat(ma_phong, trang_thai_duyet);
CREATE INDEX IDX_ViPham_Phien ON ViPhamGiamSat(ma_phien);
GO

-- 20. Bảng BaiNop (Submissions - Bài nộp giải thuật lập trình)
CREATE TABLE BaiNop (
    ma_bai_nop NVARCHAR(50) PRIMARY KEY,        -- UUID v4
    ma_phien INT NOT NULL,
    ma_cau_hoi INT NOT NULL,
    ma_nguon_nop NVARCHAR(MAX) NOT NULL,
    ngon_ngu NVARCHAR(30) NOT NULL,
    trang_thai_cham NVARCHAR(30) DEFAULT 'PENDING' NOT NULL, -- 'PENDING', 'JUDGING', 'COMPLETED', 'FAILED'
    tong_diem DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    thoi_gian_chay_toi_da_ms INT DEFAULT 0 NOT NULL,
    bo_nho_chay_toi_da_kb INT DEFAULT 0 NOT NULL,
    thoi_gian_nop DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_BaiNop_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_BaiNop_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi),
    CONSTRAINT CHK_BaiNop_TrangThai CHECK (trang_thai_cham IN ('PENDING', 'JUDGING', 'COMPLETED', 'FAILED'))
);
GO
CREATE INDEX IDX_BaiNop_Phien ON BaiNop(ma_phien);
CREATE INDEX IDX_BaiNop_CauHoi ON BaiNop(ma_cau_hoi);
GO

-- 21. Bảng KetQuaChamDiem (SubmissionDetails - Chi tiết chấm từng TestCase)
CREATE TABLE KetQuaChamDiem (
    ma_ket_qua INT IDENTITY(1,1) PRIMARY KEY,
    ma_bai_nop NVARCHAR(50) NOT NULL,
    ma_test_case INT NOT NULL,
    trang_thai NVARCHAR(20) NOT NULL,           -- 'AC', 'WA', 'TLE', 'RTE', 'MLE', 'CE', 'SE'
    diem_dat_duoc DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    thoi_gian_chay_ms INT DEFAULT 0 NOT NULL,

    CONSTRAINT FK_KetQuaChamDiem_BaiNop FOREIGN KEY (ma_bai_nop) 
        REFERENCES BaiNop(ma_bai_nop) ON DELETE CASCADE,
    CONSTRAINT FK_KetQuaChamDiem_TestCase FOREIGN KEY (ma_test_case) 
        REFERENCES BoKiemThu(ma_test_case),
    CONSTRAINT CHK_KetQuaCham_TrangThai CHECK (trang_thai IN ('AC', 'WA', 'TLE', 'RTE', 'MLE', 'CE', 'SE'))
);
GO
CREATE INDEX IDX_KetQuaCham_BaiNop ON KetQuaChamDiem(ma_bai_nop);
GO

-- ============================================================================
-- VIEWS BÁO CÁO & THỐNG KÊ (HỖ TRỢ GIÁM THỊ & GIẢNG VIÊN)
-- ============================================================================

-- View: Tổng quan phòng học / phòng thi
CREATE VIEW vw_TongQuanPhong AS
SELECT 
    p.ma_phong,
    p.ma_phong_code,
    p.tieu_de,
    p.loai_phong,
    u.ho_va_ten AS giang_vien_tao,
    p.gio_bat_dau,
    p.gio_ket_thuc,
    p.trang_thai,
    COUNT(DISTINCT pl.ma_phien) AS tong_sinh_vien_tham_gia,
    COUNT(DISTINCT CASE WHEN pl.trang_thai = 'dang_lam' THEN pl.ma_sinh_vien END) AS sinh_vien_dang_lam,
    COUNT(DISTINCT CASE WHEN pl.trang_thai = 'da_nop' THEN pl.ma_sinh_vien END) AS sinh_vien_da_nop,
    COUNT(DISTINCT vp.ma_vi_pham) AS tong_vi_pham_ghi_nhan
FROM Phong p
JOIN NguoiDung u ON p.nguoi_tao = u.ma_nguoi_dung
LEFT JOIN PhienLamBai pl ON p.ma_phong = pl.ma_phong
LEFT JOIN ViPhamGiamSat vp ON p.ma_phong = vp.ma_phong
GROUP BY p.ma_phong, p.ma_phong_code, p.tieu_de, p.loai_phong, u.ho_va_ten, 
         p.gio_bat_dau, p.gio_ket_thuc, p.trang_thai;
GO

-- View: Báo cáo vi phạm chi tiết theo phòng
CREATE VIEW vw_BaoCaoViPham AS
SELECT 
    p.ma_phong,
    p.ma_phong_code,
    p.tieu_de AS tieu_de_phong,
    u.ma_nguoi_dung,
    u.ma_dinh_danh AS mssv,
    u.ho_va_ten AS ten_sinh_vien,
    vp.ma_vi_pham,
    vp.loai_vi_pham,
    vp.do_tin_cay_ai,
    vp.link_anh_bang_chung,
    vp.trang_thai_duyet,
    vp.thoi_gian_phat_hien
FROM ViPhamGiamSat vp
JOIN Phong p ON vp.ma_phong = p.ma_phong
JOIN NguoiDung u ON vp.ma_sinh_vien = u.ma_nguoi_dung;
GO

-- ============================================================================
-- STORED PROCEDURES (HỖ TRỢ TRUY VẤN REAL-TIME)
-- ============================================================================

-- Lấy thống kê vi phạm của sinh viên trong phòng
CREATE PROCEDURE sp_ThongKeViPhamSinhVien
    @ma_phong INT,
    @ma_sinh_vien INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        vp.loai_vi_pham,
        vp.trang_thai_duyet,
        COUNT(*) AS so_lan_vi_pham,
        MIN(vp.thoi_gian_phat_hien) AS lan_dau_tien,
        MAX(vp.thoi_gian_phat_hien) AS lan_cuoi_cung
    FROM ViPhamGiamSat vp
    WHERE vp.ma_phong = @ma_phong 
      AND vp.ma_sinh_vien = @ma_sinh_vien
    GROUP BY vp.loai_vi_pham, vp.trang_thai_duyet
    ORDER BY so_lan_vi_pham DESC;
END;
GO

-- Lấy danh sách sinh viên đang online làm bài trong phòng
CREATE PROCEDURE sp_SinhVienDangLamBai
    @ma_phong INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.ma_nguoi_dung,
        u.ma_dinh_danh AS mssv,
        u.ho_va_ten,
        pl.ma_phien,
        pl.thoi_gian_bat_dau,
        DATEDIFF(MINUTE, pl.thoi_gian_bat_dau, GETDATE()) AS so_phut_da_lam,
        (SELECT COUNT(*) FROM ViPhamGiamSat WHERE ma_phien = pl.ma_phien) AS so_vi_pham,
        (SELECT COUNT(*) FROM ViPhamGiamSat WHERE ma_phien = pl.ma_phien AND trang_thai_duyet = 'pending') AS so_vi_pham_cho_duyet
    FROM PhienLamBai pl
    JOIN NguoiDung u ON pl.ma_sinh_vien = u.ma_nguoi_dung
    WHERE pl.ma_phong = @ma_phong 
      AND pl.trang_thai = 'dang_lam'
    ORDER BY pl.thoi_gian_bat_dau;
END;
GO

-- ============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU (SEED DATA)
-- ============================================================================

-- Khởi tạo 3 vai trò hệ thống
INSERT INTO VaiTro (ten_vai_tro, mo_ta) VALUES 
('admin', N'Quản trị viên hệ thống toàn quyền'),
('instructor', N'Giảng viên phụ trách giảng dạy và tổ chức phòng'),
('student', N'Sinh viên tham gia thực hành và thi cử');
GO

-- Khởi tạo tài khoản Admin mặc định (mật khẩu mẫu hash: Admin@123456)
INSERT INTO NguoiDung (
    ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
    ma_dinh_danh, khoa_bo_mon, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
) VALUES (
    'admin', 
    'admin@oculide.edu.vn', 
    '$2b$12$e80yq5b5VbZ9N.m5lB23a.XhV1a6gC7PqD9M1GkH3F7o6rE1tU3yK', 
    N'Quản trị viên Hệ thống', 
    'ADM_001', 
    N'Phòng Khảo thí & CNTT', 
    1, 
    1, 
    0, 
    'da_gui'
);
GO

PRINT N'====================================================================';
PRINT N'Đã khởi tạo thành công CSDL ExamSystem gồm 21 bảng chuẩn hóa ERD v2!';
PRINT N'Tập tin gốc: database/schema.sql';
PRINT N'====================================================================';
