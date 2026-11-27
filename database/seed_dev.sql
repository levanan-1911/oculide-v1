-- ============================================================================
-- DEVELOPMENT SEED DATA ONLY (DO NOT RUN IN PRODUCTION)
-- Default core accounts (Admin, Instructor, Student) with fixed dev password hash.
-- ============================================================================

-- Password hash for 'admin123': $2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('admin', 'admin@dtu.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Quản Trị Viên Hệ Thống', 'ADM001', N'Phòng CNTT & Đào Tạo', 1, 1, 0, 'sent');
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'instructor')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('instructor', 'instructor@dtu.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Giảng Viên Hướng Dẫn', 'GV001', N'Khoa Công Nghệ Thông Tin', 2, 1, 0, 'sent');
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'student')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('student', 'student@dtu.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Sinh Viên Nguyễn Văn A', 'SV001', N'K28 - Kỹ Thuật Phần Mềm', 3, 1, 0, 'sent');
GO
