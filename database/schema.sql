-- ============================================================================
-- DATABASE SCHEMA CHO OCULIDE - HỆ THỐNG GIÁM SÁT THỰC HÀNH & THI TRỰC TUYẾN
-- Phiên bản: v2.2 (Chuẩn hóa 21 Bảng Tiếng Việt theo ERD v2 & ma_dinh_danh)
-- Hệ quản trị CSDL: Microsoft SQL Server (T-SQL)
-- Database Name: ExamSystem
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
CREATE TABLE VaiTro (
    ma_vai_tro INT IDENTITY(1,1) PRIMARY KEY,
    ten_vai_tro NVARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'instructor', 'student'
    mo_ta NVARCHAR(255) NULL
);
GO

-- 2. Bảng NguoiDung (Users)
CREATE TABLE NguoiDung (
    ma_nguoi_dung INT IDENTITY(1,1) PRIMARY KEY,
    ten_dang_nhap NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    mat_khau_hash NVARCHAR(255) NOT NULL,
    ho_va_ten NVARCHAR(100) NOT NULL,
    ma_dinh_danh NVARCHAR(50) NULL,             -- MSSV (SV) / Mã giảng viên (GV) / Mã Admin
    khoa_bo_mon NVARCHAR(150) NULL,             -- Chuyên ngành (SV) / Bộ môn (GV) / Đơn vị (Admin)
    hoc_vi NVARCHAR(50) NULL,                   -- Tiến sĩ / Thạc sĩ (Giảng viên)
    so_dien_thoai NVARCHAR(20) NULL,
    anh_dai_dien NVARCHAR(500) NULL,
    ma_vai_tro INT NOT NULL,
    dang_hoat_dong BIT DEFAULT 1 NOT NULL,
    yeu_cau_doi_mat_khau BIT DEFAULT 0 NOT NULL,
    trang_thai_gui_mail NVARCHAR(20) DEFAULT 'chua_gui' NOT NULL,
    dang_nhap_cuoi DATETIME2 NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_NguoiDung_VaiTro FOREIGN KEY (ma_vai_tro) 
        REFERENCES VaiTro(ma_vai_tro),
    CONSTRAINT CHK_NguoiDung_TrangThaiMail CHECK (trang_thai_gui_mail IN ('chua_gui', 'da_gui', 'that_bai'))
);
GO
CREATE INDEX IDX_NguoiDung_TenDangNhap ON NguoiDung(ten_dang_nhap);
CREATE INDEX IDX_NguoiDung_Email ON NguoiDung(email);
CREATE INDEX IDX_NguoiDung_MaDinhDanh ON NguoiDung(ma_dinh_danh);
CREATE INDEX IDX_NguoiDung_VaiTro ON NguoiDung(ma_vai_tro);
GO

-- 3. Bảng TokenXacThuc (AuthTokens & LiveKit Tokens)
CREATE TABLE TokenXacThuc (
    ma_token INT IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung INT NOT NULL,
    ma_token_hash NVARCHAR(MAX) NOT NULL,
    loai_token NVARCHAR(50) NOT NULL,           -- 'refresh', 'reset_password', 'verify', 'livekit'
    ma_phong INT NULL,
    dinh_danh_nguoi_dung NVARCHAR(100) NULL,
    thong_tin_thiet_bi NVARCHAR(255) NULL,
    ngay_het_han DATETIME2 NOT NULL,
    da_su_dung BIT DEFAULT 0 NOT NULL,
    da_thu_hoi BIT DEFAULT 0 NOT NULL,
    ngay_thu_hoi DATETIME2 NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_TokenXacThuc_NguoiDung FOREIGN KEY (ma_nguoi_dung) 
        REFERENCES NguoiDung(ma_nguoi_dung) ON DELETE CASCADE
);
GO
CREATE INDEX IDX_TokenXacThuc_NguoiDung ON TokenXacThuc(ma_nguoi_dung);
CREATE INDEX IDX_TokenXacThuc_Loai ON TokenXacThuc(loai_token);
GO

-- 4. Bảng NhatKyHeThong (SystemAuditLogs)
CREATE TABLE NhatKyHeThong (
    ma_nhat_ky INT IDENTITY(1,1) PRIMARY KEY,
    ma_nguoi_dung INT NULL,
    muc_do NVARCHAR(20) NOT NULL,               -- 'info', 'warning', 'critical', 'security', 'error', 'debug'
    hanh_dong NVARCHAR(100) NOT NULL,           -- module / action
    thong_bao NVARCHAR(MAX) NULL,               -- log message
    dia_chi_ip NVARCHAR(45) NULL,
    du_lieu_chi_tiet NVARCHAR(MAX) NULL,        -- extra JSON metadata
    thoi_gian DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_NhatKyHeThong_NguoiDung FOREIGN KEY (ma_nguoi_dung) 
        REFERENCES NguoiDung(ma_nguoi_dung) ON DELETE SET NULL
);
GO
CREATE INDEX IDX_NhatKyHeThong_ThoiGian ON NhatKyHeThong(thoi_gian DESC);
CREATE INDEX IDX_NhatKyHeThong_NguoiDung ON NhatKyHeThong(ma_nguoi_dung);
GO

-- ============================================================================
-- PHÂN HỆ 2: QUẢN LÝ LỚP HỌC & DANH SÁCH SINH VIÊN
-- ============================================================================

-- 5. Bảng LopHoc (Classes)
CREATE TABLE LopHoc (
    ma_lop INT IDENTITY(1,1) PRIMARY KEY,
    ma_lop_hoc NVARCHAR(50) UNIQUE NOT NULL,    -- Ví dụ: PRN231_SE1801
    ten_lop NVARCHAR(150) NOT NULL,
    ma_mon_hoc NVARCHAR(50) NULL,
    hoc_ky NVARCHAR(20) NULL,                   -- Ví dụ: Fall 2026, Spring 2027
    ma_giang_vien INT NOT NULL,                 -- Giảng viên phụ trách chính
    mo_ta NVARCHAR(500) NULL,
    trang_thai NVARCHAR(20) DEFAULT 'dang_mo' NOT NULL, -- 'dang_mo', 'da_dong'
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_LopHoc_GiangVien FOREIGN KEY (ma_giang_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT CHK_LopHoc_TrangThai CHECK (trang_thai IN ('dang_mo', 'da_dong'))
);
GO
CREATE INDEX IDX_LopHoc_GiangVien ON LopHoc(ma_giang_vien);
GO

-- 6. Bảng SinhVienLopHoc (ClassStudents / Enrollments)
CREATE TABLE SinhVienLopHoc (
    ma_dong INT IDENTITY(1,1) PRIMARY KEY,
    ma_lop INT NULL,
    ma_phong INT NULL,
    ma_sinh_vien INT NOT NULL,
    nguoi_them INT NULL,
    trang_thai NVARCHAR(20) DEFAULT 'dang_hoc' NOT NULL, -- 'dang_hoc', 'da_rut', 'hoan_thanh'
    ngay_tham_gia DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_SinhVienLopHoc_Lop FOREIGN KEY (ma_lop) 
        REFERENCES LopHoc(ma_lop) ON DELETE CASCADE,
    CONSTRAINT FK_SinhVienLopHoc_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT FK_SinhVienLopHoc_NguoiThem FOREIGN KEY (nguoi_them) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_SinhVienLopHoc_SinhVien ON SinhVienLopHoc(ma_sinh_vien);
CREATE INDEX IDX_SinhVienLopHoc_Lop ON SinhVienLopHoc(ma_lop);
CREATE INDEX IDX_SinhVienLopHoc_Phong ON SinhVienLopHoc(ma_phong);
GO

-- ============================================================================
-- PHÂN HỆ 3: NGÂN HÀNG CÂU HỎI & BỘ ĐỀ (LAB & EXAM)
-- ============================================================================

-- 7. Bảng CauHoi (Questions)
CREATE TABLE CauHoi (
    ma_cau_hoi INT IDENTITY(1,1) PRIMARY KEY,
    ma_bai_toan NVARCHAR(50) NULL,              -- Mã định danh (Ví dụ: TWO_SUM)
    ma_phong INT NULL,                          -- Gán trực tiếp cho phòng thi/lab nếu tạo nhanh
    thu_tu_cau INT DEFAULT 1 NOT NULL,          -- Thứ tự câu hỏi trong đề/phòng
    tieu_de NVARCHAR(200) NOT NULL,
    noi_dung_de NVARCHAR(MAX) NOT NULL,
    loai_cau_hoi NVARCHAR(50) DEFAULT 'coding' NOT NULL,
    do_kho NVARCHAR(20) DEFAULT 'medium' NOT NULL, -- 'easy', 'medium', 'hard'
    gioi_han_thoi_gian_ms INT DEFAULT 1000 NOT NULL,
    gioi_han_bo_nho_mb INT DEFAULT 256 NOT NULL,
    ngon_ngu_cho_phep NVARCHAR(100) DEFAULT 'c,cpp,python,java' NOT NULL,
    diem_toi_da DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
    nguoi_soan INT NULL,
    dang_hoat_dong BIT DEFAULT 1 NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_CauHoi_NguoiSoan FOREIGN KEY (nguoi_soan) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_CauHoi_Phong ON CauHoi(ma_phong);
CREATE INDEX IDX_CauHoi_NguoiSoan ON CauHoi(nguoi_soan);
GO

-- 8. Bảng BoKiemThu (TestCases)
CREATE TABLE BoKiemThu (
    ma_test_case INT IDENTITY(1,1) PRIMARY KEY,
    ma_cau_hoi INT NOT NULL,
    du_lieu_dau_vao NVARCHAR(MAX) NOT NULL,
    ket_qua_mong_doi NVARCHAR(MAX) NOT NULL,
    la_test_vi_du BIT DEFAULT 0 NOT NULL,
    la_test_an BIT DEFAULT 0 NOT NULL,
    diem_test DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_BoKiemThu_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi) ON DELETE CASCADE
);
GO
CREATE INDEX IDX_BoKiemThu_CauHoi ON BoKiemThu(ma_cau_hoi);
GO

-- 9. Bảng BoDeMau (ExamTemplates / LabTemplates)
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

-- 11. Bảng Phong (Rooms)
CREATE TABLE Phong (
    ma_phong INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong_code NVARCHAR(50) UNIQUE NOT NULL, -- Mã PIN tham gia phòng (ví dụ: LAB03-8841)
    tieu_de NVARCHAR(200) NOT NULL,             -- room_name
    loai_phong NVARCHAR(20) NOT NULL,           -- 'lab' hoặc 'exam' (hoặc 'classroom')
    nguoi_tao INT NOT NULL,                     -- Giảng viên mở phòng (instructor_id)
    mo_ta NVARCHAR(500) NULL,                   -- description
    gio_bat_dau DATETIME2 NOT NULL,             -- start_time
    gio_ket_thuc DATETIME2 NOT NULL,            -- end_time
    thoi_luong_phut INT DEFAULT 60 NOT NULL,    -- duration_minutes
    so_lan_nop_toi_da INT DEFAULT 10 NOT NULL,  -- max_attempts
    mat_ma_phong NVARCHAR(50) NULL,             -- passcode
    ma_dinh_danh_livekit NVARCHAR(100) NULL,    -- livekit_room_name
    ma_lop INT NULL,
    ma_de_mau INT NULL,
    cau_hinh_giam_sat NVARCHAR(MAX) NULL,       -- JSON cấu hình giám sát AI
    dang_hoat_dong BIT DEFAULT 1 NOT NULL,      -- is_active
    trang_thai NVARCHAR(20) DEFAULT 'chua_mo' NOT NULL, -- 'chua_mo', 'dang_dien_ra', 'da_dong'
    ngay_tao DATETIME2 DEFAULT GETDATE() NOT NULL,
    ngay_cap_nhat DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Phong_LopHoc FOREIGN KEY (ma_lop) 
        REFERENCES LopHoc(ma_lop),
    CONSTRAINT FK_Phong_BoDeMau FOREIGN KEY (ma_de_mau) 
        REFERENCES BoDeMau(ma_de_thi),
    CONSTRAINT FK_Phong_NguoiTao FOREIGN KEY (nguoi_tao) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_Phong_Code ON Phong(ma_phong_code);
CREATE INDEX IDX_Phong_NguoiTao ON Phong(nguoi_tao);
CREATE INDEX IDX_Phong_Lop ON Phong(ma_lop);
GO

-- 12. Bảng CanBoPhuTrachPhong (RoomProctors / Staff)
CREATE TABLE CanBoPhuTrachPhong (
    ma_dong INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    ma_giang_vien INT NOT NULL,
    vai_tro_trong_phong NVARCHAR(50) DEFAULT 'giam_thi' NOT NULL, -- 'giang_vien_chinh', 'tro_giang', 'giam_thi'

    CONSTRAINT FK_CanBoPhuTrach_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong) ON DELETE CASCADE,
    CONSTRAINT FK_CanBoPhuTrach_GiangVien FOREIGN KEY (ma_giang_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT UQ_Phong_CanBo UNIQUE (ma_phong, ma_giang_vien)
);
GO
CREATE INDEX IDX_CanBoPhuTrach_Phong ON CanBoPhuTrachPhong(ma_phong);
GO

-- 13. Bảng TinNhanPhong (RoomMessages / Chat)
CREATE TABLE TinNhanPhong (
    ma_tin_nhan INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    nguoi_gui INT NOT NULL,
    nguoi_nhan INT NULL,                        -- NULL nếu gửi chung toàn phòng
    loai_tin_nhan NVARCHAR(30) DEFAULT 'chat' NOT NULL, -- 'chat', 'text', 'thong_bao_noi', 'canh_bao'
    la_tin_rieng BIT DEFAULT 0 NOT NULL,
    noi_dung NVARCHAR(MAX) NOT NULL,
    thoi_gian_gui DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_TinNhanPhong_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong) ON DELETE CASCADE,
    CONSTRAINT FK_TinNhanPhong_NguoiGui FOREIGN KEY (nguoi_gui) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT FK_TinNhanPhong_NguoiNhan FOREIGN KEY (nguoi_nhan) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_TinNhanPhong_Phong ON TinNhanPhong(ma_phong);
CREATE INDEX IDX_TinNhanPhong_NguoiGui ON TinNhanPhong(nguoi_gui);
GO

-- ============================================================================
-- PHÂN HỆ 5: PHIÊN LÀM BÀI, GIÁM SÁT REAL-TIME AI & CHẤM ĐIỂM
-- ============================================================================

-- 14. Bảng PhienLamBai (ExamSessions)
CREATE TABLE PhienLamBai (
    ma_phien INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    dia_chi_ip NVARCHAR(45) NULL,
    thong_tin_trinh_duyet NVARCHAR(255) NULL,   -- user_agent
    ma_van_tay_trinh_duyet NVARCHAR(255) NULL,  -- browser_fingerprint
    trang_thai NVARCHAR(20) DEFAULT 'dang_lam' NOT NULL, -- 'active', 'completed', 'dang_lam', 'da_nop', 'bi_khoa'
    so_phut_duoc_cong INT DEFAULT 0 NOT NULL,
    ma_dinh_danh_livekit NVARCHAR(100) NULL,
    thoi_gian_bat_dau DATETIME2 DEFAULT GETDATE() NOT NULL,
    thoi_gian_nop_bai DATETIME2 NULL,
    thoi_gian_ket_thuc DATETIME2 NULL,

    CONSTRAINT FK_PhienLamBai_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong),
    CONSTRAINT FK_PhienLamBai_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_PhienLamBai_Phong ON PhienLamBai(ma_phong);
CREATE INDEX IDX_PhienLamBai_SinhVien ON PhienLamBai(ma_sinh_vien);
CREATE INDEX IDX_PhienLamBai_TrangThai ON PhienLamBai(trang_thai);
GO

-- 15. Bảng KiemTraThietBi (DeviceChecks)
CREATE TABLE KiemTraThietBi (
    ma_kiem_tra INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    trang_thai_camera BIT DEFAULT 0 NOT NULL,
    trang_thai_micro BIT DEFAULT 0 NOT NULL,
    do_tre_mang_ms INT DEFAULT 0 NOT NULL,
    thong_tin_he_dieu_hanh NVARCHAR(100) NULL,
    thong_tin_trinh_duyet NVARCHAR(100) NULL,
    du_dieu_kien_thi BIT DEFAULT 0 NOT NULL,     -- is_passed
    thoi_gian_kiem_tra DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_KiemTraThietBi_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_KiemTraThietBi_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_KiemTraThietBi_Phien ON KiemTraThietBi(ma_phien);
GO

-- 16. Bảng Snapshots (Webcam snapshots timeline)
CREATE TABLE Snapshots (
    ma_snapshot INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    link_anh NVARCHAR(500) NOT NULL,
    co_khuon_mat BIT DEFAULT 1 NOT NULL,
    so_luong_mat INT DEFAULT 1 NOT NULL,
    nhin_man_hinh BIT DEFAULT 1 NOT NULL,
    diem_tin_cay DECIMAL(4,3) DEFAULT 1.000 NOT NULL,
    thoi_gian_chup DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Snapshots_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_Snapshots_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_Snapshots_Phien_ThoiGian ON Snapshots(ma_phien, thoi_gian_chup DESC);
GO

-- 17. Bảng BanNhapCode (CodeDrafts - Auto-save)
CREATE TABLE BanNhapCode (
    ma_ban_nhap INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_cau_hoi INT NOT NULL,
    ma_sinh_vien INT NULL,
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

-- 18. Bảng YeuCauTroGiup (SupportRequests)
CREATE TABLE YeuCauTroGiup (
    ma_yeu_cau INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NULL,
    ma_phong INT NULL,
    ma_sinh_vien INT NOT NULL,
    danh_muc_su_co NVARCHAR(100) NOT NULL,      -- 'mat_mang', 'loi_may', 'thac_mac_de' (issue_type)
    tin_nhan_sos NVARCHAR(MAX) NOT NULL,
    trang_thai NVARCHAR(20) DEFAULT 'cho_xu_ly' NOT NULL, -- 'open', 'resolved', 'cho_xu_ly', 'da_xong'
    nguoi_giai_quyet INT NULL,
    thoi_gian_gui DATETIME2 DEFAULT GETDATE() NOT NULL,
    thoi_gian_giai_quyet DATETIME2 NULL,

    CONSTRAINT FK_YeuCauTroGiup_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT FK_YeuCauTroGiup_NguoiGiaiQuyet FOREIGN KEY (nguoi_giai_quyet) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_YeuCauTroGiup_Phien ON YeuCauTroGiup(ma_phien);
CREATE INDEX IDX_YeuCauTroGiup_Phong ON YeuCauTroGiup(ma_phong);
GO

-- 19. Bảng ViPhamGiamSat (Violations)
CREATE TABLE ViPhamGiamSat (
    ma_vi_pham INT IDENTITY(1,1) PRIMARY KEY,
    ma_phien INT NOT NULL,
    ma_phong INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    loai_vi_pham NVARCHAR(50) NOT NULL,
    muc_do_nghiem_trong NVARCHAR(20) DEFAULT 'warning' NOT NULL, -- 'low', 'medium', 'warning', 'high', 'critical'
    mo_ta NVARCHAR(500) NULL,
    do_tin_cay_ai DECIMAL(4,3) DEFAULT 1.000 NOT NULL,
    link_anh_bang_chung NVARCHAR(500) NULL,
    da_kiem_tra BIT DEFAULT 0 NOT NULL,         -- is_reviewed
    trang_thai_duyet NVARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'rejected'
    nguoi_duyet INT NULL,                       -- reviewed_by
    thoi_gian_duyet DATETIME2 NULL,             -- reviewed_at
    thoi_gian_phat_hien DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_ViPhamGiamSat_Phien FOREIGN KEY (ma_phien) 
        REFERENCES PhienLamBai(ma_phien) ON DELETE CASCADE,
    CONSTRAINT FK_ViPhamGiamSat_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong),
    CONSTRAINT FK_ViPhamGiamSat_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung)
);
GO
CREATE INDEX IDX_ViPham_Phong_TrangThai ON ViPhamGiamSat(ma_phong, trang_thai_duyet);
CREATE INDEX IDX_ViPham_Phien ON ViPhamGiamSat(ma_phien);
CREATE INDEX IDX_ViPham_SinhVien ON ViPhamGiamSat(ma_sinh_vien);
GO

-- 20. Bảng BaiNop (Submissions)
CREATE TABLE BaiNop (
    ma_bai_nop INT IDENTITY(1,1) PRIMARY KEY,
    ma_phong INT NOT NULL,
    ma_sinh_vien INT NOT NULL,
    ma_cau_hoi INT NOT NULL,
    ma_phien INT NULL,
    lan_nop INT DEFAULT 1 NOT NULL,             -- attempt_number
    ma_nguon_nop NVARCHAR(MAX) NOT NULL,        -- code_content
    ngon_ngu NVARCHAR(30) NOT NULL,             -- language
    trang_thai_cham NVARCHAR(30) DEFAULT 'pending' NOT NULL, -- 'pending', 'grading', 'completed', 'failed'
    tong_diem DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    thoi_gian_chay_toi_da_ms INT DEFAULT 0 NOT NULL,
    bo_nho_chay_toi_da_kb INT DEFAULT 0 NOT NULL,
    thoi_gian_nop DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_BaiNop_Phong FOREIGN KEY (ma_phong) 
        REFERENCES Phong(ma_phong),
    CONSTRAINT FK_BaiNop_SinhVien FOREIGN KEY (ma_sinh_vien) 
        REFERENCES NguoiDung(ma_nguoi_dung),
    CONSTRAINT FK_BaiNop_CauHoi FOREIGN KEY (ma_cau_hoi) 
        REFERENCES CauHoi(ma_cau_hoi)
);
GO
CREATE INDEX IDX_BaiNop_Phong_SinhVien ON BaiNop(ma_phong, ma_sinh_vien);
CREATE INDEX IDX_BaiNop_CauHoi ON BaiNop(ma_cau_hoi);
CREATE INDEX IDX_BaiNop_TrangThai ON BaiNop(trang_thai_cham);
GO

-- 21. Bảng KetQuaChamDiem (GradingResults)
CREATE TABLE KetQuaChamDiem (
    ma_ket_qua INT IDENTITY(1,1) PRIMARY KEY,
    ma_bai_nop INT NOT NULL,
    ma_test_case INT NOT NULL,
    la_chinh_xac BIT DEFAULT 0 NOT NULL,         -- is_passed
    ket_qua_thuc_te NVARCHAR(MAX) NULL,         -- actual_output
    thoi_gian_chay_ms INT DEFAULT 0 NOT NULL,   -- execution_time_ms
    bo_nho_su_dung_mb INT DEFAULT 0 NOT NULL,   -- memory_used_mb
    thong_bao_loi NVARCHAR(MAX) NULL,           -- error_message
    diem_dat_duoc DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    thoi_gian_cham DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_KetQuaChamDiem_BaiNop FOREIGN KEY (ma_bai_nop) 
        REFERENCES BaiNop(ma_bai_nop) ON DELETE CASCADE,
    CONSTRAINT FK_KetQuaChamDiem_TestCase FOREIGN KEY (ma_test_case) 
        REFERENCES BoKiemThu(ma_test_case)
);
GO
CREATE INDEX IDX_KetQuaCham_BaiNop ON KetQuaChamDiem(ma_bai_nop);
CREATE INDEX IDX_KetQuaCham_TestCase ON KetQuaChamDiem(ma_test_case);
GO

-- ============================================================================
-- VIEWS & STORED PROCEDURES
-- ============================================================================

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
    COUNT(DISTINCT CASE WHEN pl.trang_thai IN ('dang_lam', 'active') THEN pl.ma_sinh_vien END) AS sinh_vien_dang_lam,
    COUNT(DISTINCT CASE WHEN pl.trang_thai IN ('da_nop', 'completed') THEN pl.ma_sinh_vien END) AS sinh_vien_da_nop,
    COUNT(DISTINCT vp.ma_vi_pham) AS tong_vi_pham_ghi_nhan
FROM Phong p
JOIN NguoiDung u ON p.nguoi_tao = u.ma_nguoi_dung
LEFT JOIN PhienLamBai pl ON p.ma_phong = pl.ma_phong
LEFT JOIN ViPhamGiamSat vp ON p.ma_phong = vp.ma_phong
GROUP BY p.ma_phong, p.ma_phong_code, p.tieu_de, p.loai_phong, u.ho_va_ten, 
         p.gio_bat_dau, p.gio_ket_thuc, p.trang_thai;
GO

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

CREATE PROCEDURE sp_GetStudentViolationStats
    @room_id INT,
    @student_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        vp.loai_vi_pham AS violation_type,
        vp.trang_thai_duyet AS review_status,
        COUNT(*) AS violation_count,
        MIN(vp.thoi_gian_phat_hien) AS first_detected,
        MAX(vp.thoi_gian_phat_hien) AS last_detected
    FROM ViPhamGiamSat vp
    WHERE vp.ma_phong = @room_id 
      AND vp.ma_sinh_vien = @student_id
    GROUP BY vp.loai_vi_pham, vp.trang_thai_duyet
    ORDER BY violation_count DESC;
END;
GO

CREATE PROCEDURE sp_GetOnlineStudents
    @room_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.ma_nguoi_dung AS student_id,
        u.ma_dinh_danh AS student_code,
        u.ho_va_ten AS full_name,
        pl.ma_phien AS session_id,
        pl.thoi_gian_bat_dau AS started_at,
        DATEDIFF(MINUTE, pl.thoi_gian_bat_dau, GETDATE()) AS duration_minutes,
        (SELECT COUNT(*) FROM ViPhamGiamSat WHERE ma_phien = pl.ma_phien) AS violation_count,
        (SELECT COUNT(*) FROM ViPhamGiamSat WHERE ma_phien = pl.ma_phien AND trang_thai_duyet = 'pending') AS pending_violation_count
    FROM PhienLamBai pl
    JOIN NguoiDung u ON pl.ma_sinh_vien = u.ma_nguoi_dung
    WHERE pl.ma_phong = @room_id 
      AND pl.trang_thai IN ('active', 'dang_lam')
    ORDER BY pl.thoi_gian_bat_dau;
END;
GO

CREATE PROCEDURE sp_GetStudentExamResults
    @room_id INT,
    @student_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        q.ma_cau_hoi AS question_id,
        q.thu_tu_cau AS question_order,
        q.tieu_de AS question_title,
        q.diem_toi_da AS max_points,
        COALESCE(MAX(b.tong_diem), 0) AS student_score,
        COUNT(b.ma_bai_nop) AS attempt_count,
        CASE WHEN MAX(b.tong_diem) >= q.diem_toi_da THEN 1 ELSE 0 END AS is_passed
    FROM CauHoi q
    LEFT JOIN BaiNop b ON q.ma_cau_hoi = b.ma_cau_hoi 
                      AND b.ma_phong = @room_id 
                      AND b.ma_sinh_vien = @student_id
    WHERE q.ma_phong = @room_id
    GROUP BY q.ma_cau_hoi, q.thu_tu_cau, q.tieu_de, q.diem_toi_da
    ORDER BY q.thu_tu_cau;
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

-- Khởi tạo các tài khoản mặc định
-- Mật khẩu hash: 'admin123' cho admin/instructor/student, 'Password123!' cho pvlong
INSERT INTO NguoiDung (
    ten_dang_nhap, email, mat_khau_hash, ho_va_ten, 
    ma_dinh_danh, khoa_bo_mon, ma_vai_tro, dang_hoat_dong, yeu_cau_doi_mat_khau, trang_thai_gui_mail
) VALUES 
(
    'admin', 
    'admin@school.edu.vn', 
    '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
    N'Quản Trị Viên Hệ Thống', 
    'ADM001', 
    N'Phòng CNTT & Đào Tạo', 
    1, 1, 0, 'da_gui'
),
(
    'instructor', 
    'instructor@school.edu.vn', 
    '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
    N'Giảng Viên Hướng Dẫn', 
    'MSGV001', 
    N'Khoa Công Nghệ Thông Tin', 
    2, 1, 0, 'da_gui'
),
(
    'student', 
    'student@school.edu.vn', 
    '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
    N'Sinh Viên Nguyễn Văn A', 
    'SV2026001', 
    N'Kỹ Thuật Phần Mềm', 
    3, 1, 0, 'da_gui'
),
(
    'pvlong', 
    'pvlong@dtu.edu.vn', 
    '$2b$12$t/59jV7LxFjvjku/dRjkzO/NuiUXgNxE4rJnC8oboFt3wN1AxZcti', 
    N'Phạm Vũ Long', 
    'MSGV_PVL01', 
    N'Khoa CNTT - Đại học Duy Tân', 
    2, 1, 0, 'da_gui'
);
GO

PRINT N'====================================================================';
PRINT N'Đã khởi tạo thành công CSDL ExamSystem gồm 21 bảng tiếng Việt thuần chuẩn!';
PRINT N'====================================================================';
