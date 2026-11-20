-- ============================================================================
-- OCULIDE - SAMPLE DATA SEED SCRIPT
-- Version: v3.0 (English Schema Standardized)
-- Database Engine: Microsoft SQL Server (T-SQL)
-- Database: ExamSystem
-- Default password for all seed accounts: admin123
-- Bcrypt Hash: $2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6
-- ============================================================================

USE ExamSystem;
GO

PRINT N'🚀 Seeding sample data for Oculide system...';
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 1. TABLE Roles
-- ────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'admin')
    INSERT INTO Roles (role_name, description) VALUES ('admin', N'Quản trị viên hệ thống toàn quyền');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'instructor')
    INSERT INTO Roles (role_name, description) VALUES ('instructor', N'Giảng viên phụ trách giảng dạy và tổ chức phòng');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'student')
    INSERT INTO Roles (role_name, description) VALUES ('student', N'Sinh viên tham gia thực hành và thi cử');
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TABLE Users
-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 Administrators
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'admin', 'admin@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Quản Trị Viên Hệ Thống', 'ADM001', N'Phòng Đào Tạo & Khảo Thí', 1, 1, 0, 'sent'
    );
END

-- 2.2 Instructors
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'nam.nv')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, academic_degree, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'nam.nv', 'nam.nv@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'TS. Nguyễn Văn Nam', 'MSGV001', N'Khoa Khoa Học Máy Tính', N'Tiến sĩ', '0905123456', 2, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'pvlong')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, academic_degree, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'pvlong', 'pvlong@dtu.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'ThS. Phạm Vũ Long', 'MSGV002', N'Khoa Công Nghệ Phần Mềm', N'Thạc sĩ', '0912345678', 2, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'instructor')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, academic_degree, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'instructor', 'instructor@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'ThS. Trần Thị Mai', 'MSGV003', N'Khoa An Toàn Thông Tin', N'Thạc sĩ', '0987654321', 2, 1, 0, 'sent'
    );
END

-- 2.3 Students
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'student')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'student', 'student@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Nguyễn Văn An', '20110001', N'Khoa Công Nghệ Thông Tin', '0345678901', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'phamvanlong')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'phamvanlong', 'phamvanlong050505@gmail.com', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Phạm Văn Long', '2222222222', N'Khoa Công Nghệ Thông Tin', '0988776655', 1, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'sv_bich')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'sv_bich', 'bich.tran@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Trần Thị Bích', '20110002', N'Khoa Công Nghệ Thông Tin', '0345678902', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'sv_cuong')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'sv_cuong', 'cuong.le@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Lê Văn Cường', '20110003', N'Khoa Khoa Học Máy Tính', '0345678903', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'sv_dung')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'sv_dung', 'dung.hoang@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Hoàng Tiến Dũng', '20110004', N'Khoa An Toàn Thông Tin', '0345678904', 3, 1, 0, 'sent'
    );
END

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'sv_yen')
BEGIN
    INSERT INTO Users (
        username, email, password_hash, full_name, 
        identifier_code, department, phone_number, role_id, is_active, must_change_password, email_status
    ) VALUES (
        'sv_yen', 'yen.vu@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', 
        N'Vũ Hải Yến', '20110005', N'Khoa Công Nghệ Phần Mềm', '0345678905', 3, 1, 0, 'sent'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 2.1. TABLE Semesters
-- ────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HK1_2026_2027')
BEGIN
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status)
    VALUES ('HK1_2026_2027', N'HK1 2026–2027', '2026-2027', 1, '2026-09-01', '2027-01-15', 1, 'active');
END

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HK2_2026_2027')
BEGIN
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status)
    VALUES ('HK2_2026_2027', N'HK2 2026–2027', '2026-2027', 2, '2027-02-01', '2027-06-15', 0, 'active');
END

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HKT_2026_2027')
BEGIN
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status)
    VALUES ('HKT_2026_2027', N'HKT 2026–2027', '2026-2027', 3, '2027-06-20', '2027-08-15', 0, 'active');
END

IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HKT_2025_2026')
BEGIN
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status)
    VALUES ('HKT_2025_2026', N'HKT 2025–2026', '2025-2026', 3, '2026-06-20', '2026-08-15', 0, 'closed');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 3. TABLE Classes
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @id_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');
DECLARE @id_long INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'pvlong');

IF NOT EXISTS (SELECT 1 FROM Classes WHERE class_code = 'CS404_2026')
BEGIN
    INSERT INTO Classes (class_code, class_name, course_code, semester_name, instructor_id, description, status)
    VALUES ('CS404_2026', N'Lập trình nâng cao - Nhóm 01', 'CS404', N'HK1 2026–2027', @id_nam, N'Học phần lập trình cấu trúc dữ liệu nâng cao, thuật toán tối ưu C++ & Python', 'open');
END

IF NOT EXISTS (SELECT 1 FROM Classes WHERE class_code = 'SE301_2026')
BEGIN
    INSERT INTO Classes (class_code, class_name, course_code, semester_name, instructor_id, description, status)
    VALUES ('SE301_2026', N'Kiến trúc Công nghệ Phần mềm', 'SE301', N'HK1 2026–2027', @id_long, N'Phát triển ứng dụng hướng dịch vụ, microservices và kiểm thử tự động', 'open');
END

IF NOT EXISTS (SELECT 1 FROM Classes WHERE class_code = 'CMU-CS 316 AIS')
BEGIN
    INSERT INTO Classes (class_code, class_name, course_code, section_code, semester_name, instructor_id, description, status)
    VALUES ('CMU-CS 316 AIS', N'Fundamentals of Computing 2', 'CMU-CS 316', 'AIS', N'HK1 2026–2027', @id_long, N'Lớp học phần thực hành lập trình chuyên sâu CMU', 'open');
END

IF NOT EXISTS (SELECT 1 FROM Classes WHERE class_code = 'IT202_2026')
BEGIN
    INSERT INTO Classes (class_code, class_name, course_code, semester_name, instructor_id, description, status)
    VALUES ('IT202_2026', N'Cơ sở dữ liệu & Hệ quản trị SQL Server', 'IT202', N'HK1 2026–2027', @id_nam, N'Thiết kế CSDL quan hệ, tối ưu hóa câu truy vấn T-SQL và Indexing', 'open');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 4. TABLE ClassEnrollments
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @cls_cs INT = (SELECT TOP 1 class_id FROM Classes WHERE class_code = 'CS404_2026');
DECLARE @cls_se INT = (SELECT TOP 1 class_id FROM Classes WHERE class_code = 'SE301_2026');
DECLARE @gv_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');

-- Enroll 5 students into CS404
INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status)
SELECT @cls_cs, u.user_id, @gv_nam, 'enrolled'
FROM Users u
WHERE u.role_id = 3 
  AND NOT EXISTS (SELECT 1 FROM ClassEnrollments WHERE class_id = @cls_cs AND student_id = u.user_id);

-- Enroll 3 students into SE301
INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status)
SELECT @cls_se, u.user_id, @gv_nam, 'enrolled'
FROM Users u
WHERE u.username IN ('student', 'sv_bich', 'sv_cuong')
  AND NOT EXISTS (SELECT 1 FROM ClassEnrollments WHERE class_id = @cls_se AND student_id = u.user_id);

-- Enroll students into CMU-CS 316 AIS and IT202_2026
DECLARE @cls_cmu INT = (SELECT TOP 1 class_id FROM Classes WHERE class_code = 'CMU-CS 316 AIS');
DECLARE @cls_it INT = (SELECT TOP 1 class_id FROM Classes WHERE class_code = 'IT202_2026');
DECLARE @admin_id INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'admin');

IF @cls_cmu IS NOT NULL
BEGIN
    INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status)
    SELECT @cls_cmu, u.user_id, @admin_id, 'enrolled'
    FROM Users u
    WHERE u.role_id = 3
      AND NOT EXISTS (SELECT 1 FROM ClassEnrollments WHERE class_id = @cls_cmu AND student_id = u.user_id);
END

IF @cls_it IS NOT NULL
BEGIN
    INSERT INTO ClassEnrollments (class_id, student_id, enrolled_by, status)
    SELECT @cls_it, u.user_id, @admin_id, 'enrolled'
    FROM Users u
    WHERE u.role_id = 3
      AND NOT EXISTS (SELECT 1 FROM ClassEnrollments WHERE class_id = @cls_it AND student_id = u.user_id);
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 5. TABLE Rooms
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @gv_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');
DECLARE @cls_cs INT = (SELECT TOP 1 class_id FROM Classes WHERE class_code = 'CS404_2026');

IF NOT EXISTS (SELECT 1 FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404')
BEGIN
    INSERT INTO Rooms (
        room_code, room_name, room_type, session_type, creator_id, description,
        start_time, end_time, duration_minutes, max_attempts, 
        passcode, class_id, proctoring_config, is_active, status
    ) VALUES (
        'EXAM_FINAL_CS404', N'Thi Cuối Kỳ: Lập Trình Thuật Toán & Cấu Trúc Dữ Liệu', 'exam', 'FINAL', @gv_nam,
        N'Kỳ thi chính thức kết thúc học phần CS404. Giám sát AI toàn thời gian qua camera và chia sẻ màn hình.',
        DATEADD(hour, -1, GETDATE()), DATEADD(hour, 2, GETDATE()), 90, 5,
        '123456', @cls_cs, 
        N'{"webcam_required": true, "screen_share_required": true, "audio_required": true, "block_tab_switch": true, "max_violations": 5}',
        1, 'in_progress'
    );
END

IF NOT EXISTS (SELECT 1 FROM Rooms WHERE room_code = 'LAB_PRACTICE_01')
BEGIN
    INSERT INTO Rooms (
        room_code, room_name, room_type, session_type, creator_id, description,
        start_time, end_time, duration_minutes, max_attempts, 
        passcode, class_id, proctoring_config, is_active, status
    ) VALUES (
        'LAB_PRACTICE_01', N'Thực Hành Lab 05: Đệ Quy và Quy Hoạch Động', 'practice', 'LAB', @gv_nam,
        N'Phòng thực hành tự do không tính điểm thi, hỗ trợ chạy thử mã nguồn và chấm điểm tự động tức thì.',
        DATEADD(day, -1, GETDATE()), DATEADD(day, 7, GETDATE()), 120, 20,
        '654321', @cls_cs, 
        N'{"webcam_required": false, "screen_share_required": false}',
        1, 'in_progress'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 6. TABLE RoomProctors
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');
DECLARE @gv_long INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'pvlong');

IF NOT EXISTS (SELECT 1 FROM RoomProctors WHERE room_id = @rm_exam AND instructor_id = @gv_nam)
    INSERT INTO RoomProctors (room_id, instructor_id, proctor_role) VALUES (@rm_exam, @gv_nam, N'lead_instructor');
IF NOT EXISTS (SELECT 1 FROM RoomProctors WHERE room_id = @rm_exam AND instructor_id = @gv_long)
    INSERT INTO RoomProctors (room_id, instructor_id, proctor_role) VALUES (@rm_exam, @gv_long, N'proctor');
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 7. TABLE Questions
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');

-- Question 1: Two Sum
IF NOT EXISTS (SELECT 1 FROM Questions WHERE problem_code = 'TWO_SUM')
BEGIN
    INSERT INTO Questions (
        problem_code, room_id, question_order, title, content, question_type, difficulty, 
        time_limit_ms, memory_limit_mb, allowed_languages, max_points, author_id, is_active
    ) VALUES (
        'TWO_SUM', @rm_exam, 1, 
        N'Tìm Cặp Số Có Tổng Bằng Target (Two Sum)',
        N'Cho một mảng số nguyên nums và một số nguyên target. Hãy tìm chỉ số của hai số sao cho tổng của chúng bằng target.\n\nĐầu vào:\n- Dòng 1: Số nguyên N và target cách nhau bởi dấu cách.\n- Dòng 2: N số nguyên của mảng nums.\n\nĐầu ra:\n- In ra hai chỉ số cách nhau bởi dấu cách (theo thứ tự tăng dần).',
        'coding', 'easy', 1000, 128, 'python,cpp,java', 4.0, @gv_nam, 1
    );
END

-- Question 2: Palindrome Number
IF NOT EXISTS (SELECT 1 FROM Questions WHERE problem_code = 'PALINDROME_NUM')
BEGIN
    INSERT INTO Questions (
        problem_code, room_id, question_order, title, content, question_type, difficulty, 
        time_limit_ms, memory_limit_mb, allowed_languages, max_points, author_id, is_active
    ) VALUES (
        'PALINDROME_NUM', @rm_exam, 2, 
        N'Kiểm Tra Số Đối Xứng (Palindrome Number)',
        N'Cho một số nguyên x. Trả về YES nếu x là một số đối xứng, ngược lại trả về NO.\n\nVí dụ:\n- 121 -> YES\n- -121 -> NO\n- 10 -> NO',
        'coding', 'easy', 1000, 128, 'python,cpp,java', 3.0, @gv_nam, 1
    );
END

-- Question 3: Essay Proctoring
IF NOT EXISTS (SELECT 1 FROM Questions WHERE problem_code = 'ESSAY_PROCTORING')
BEGIN
    INSERT INTO Questions (
        problem_code, room_id, question_order, title, content, question_type, difficulty, 
        time_limit_ms, memory_limit_mb, allowed_languages, max_points, author_id, is_active
    ) VALUES (
        'ESSAY_PROCTORING', @rm_exam, 3, 
        N'Phân Tích Kiến Trúc Hệ Thống Giám Sát Trực Tuyến AI',
        N'Trình bày nguyên lý hoạt động của kiến trúc WebSocket kết hợp SFU (LiveKit) và hàng đợi Celery trong việc xử lý giám sát đa luồng thời gian thực. Đánh giá giải pháp chống gian lận khi thí sinh chuyển tab hoặc mất kết nối mạng.',
        'essay', 'medium', 0, 0, 'text', 3.0, @gv_nam, 1
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 8. TABLE TestCases
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @q_two_sum INT = (SELECT TOP 1 question_id FROM Questions WHERE problem_code = 'TWO_SUM');
DECLARE @q_palin INT = (SELECT TOP 1 question_id FROM Questions WHERE problem_code = 'PALINDROME_NUM');

IF @q_two_sum IS NOT NULL AND NOT EXISTS (SELECT 1 FROM TestCases WHERE question_id = @q_two_sum)
BEGIN
    -- Public sample test cases
    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_two_sum, '4 9' + CHAR(10) + '2 7 11 15', '0 1', 1, 0, 1.0);

    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_two_sum, '3 6' + CHAR(10) + '3 2 4', '1 2', 1, 0, 1.0);

    -- Hidden test cases
    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_two_sum, '5 10' + CHAR(10) + '1 3 5 5 9', '2 3', 0, 1, 1.0);

    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_two_sum, '6 20' + CHAR(10) + '2 4 8 12 16 19', '2 3', 0, 1, 1.0);
END

IF @q_palin IS NOT NULL AND NOT EXISTS (SELECT 1 FROM TestCases WHERE question_id = @q_palin)
BEGIN
    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_palin, '121', 'YES', 1, 0, 1.0);

    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_palin, '-121', 'NO', 1, 0, 1.0);

    INSERT INTO TestCases (question_id, input_data, expected_output, is_sample, is_hidden, points)
    VALUES (@q_palin, '12321', 'YES', 0, 1, 1.0);
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 9. TABLE ExamSessions
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');
DECLARE @sv2 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'sv_bich');

IF NOT EXISTS (SELECT 1 FROM ExamSessions WHERE room_id = @rm_exam AND student_id = @sv1)
BEGIN
    INSERT INTO ExamSessions (
        room_id, student_id, ip_address, user_agent, browser_fingerprint, 
        status, extra_time_minutes, start_time
    ) VALUES (
        @rm_exam, @sv1, '127.0.0.1', 'Chrome 122.0 Windows 11', 'fp_student_01_win11',
        'active', 0, DATEADD(minute, -30, GETDATE())
    );
END

IF NOT EXISTS (SELECT 1 FROM ExamSessions WHERE room_id = @rm_exam AND student_id = @sv2)
BEGIN
    INSERT INTO ExamSessions (
        room_id, student_id, ip_address, user_agent, browser_fingerprint, 
        status, extra_time_minutes, start_time
    ) VALUES (
        @rm_exam, @sv2, '192.168.1.15', 'Edge 121.0 Windows 10', 'fp_student_02_win10',
        'active', 0, DATEADD(minute, -25, GETDATE())
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 10. TABLE DeviceChecks
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @sess1 INT = (SELECT TOP 1 session_id FROM ExamSessions WHERE browser_fingerprint = 'fp_student_01_win11');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');

IF @sess1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM DeviceChecks WHERE session_id = @sess1)
BEGIN
    INSERT INTO DeviceChecks (
        session_id, student_id, camera_status, mic_status, 
        network_latency_ms, os_info, browser_info, is_passed
    ) VALUES (
        @sess1, @sv1, 1, 1, 18, 'Windows 11 Home 64-bit', 'Google Chrome 122', 1
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 11. TABLE CodeDrafts & Submissions
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @sess1 INT = (SELECT TOP 1 session_id FROM ExamSessions WHERE browser_fingerprint = 'fp_student_01_win11');
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');
DECLARE @q_two_sum INT = (SELECT TOP 1 question_id FROM Questions WHERE problem_code = 'TWO_SUM');

-- Auto-saved draft
IF @sess1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM CodeDrafts WHERE session_id = @sess1 AND question_id = @q_two_sum)
BEGIN
    INSERT INTO CodeDrafts (session_id, question_id, student_id, programming_language, code_content)
    VALUES (
        @sess1, @q_two_sum, @sv1, 'python',
        'def two_sum():\n    n, target = map(int, input().split())\n    nums = list(map(int, input().split()))\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            print(lookup[diff], i)\n            return\n        lookup[num] = i\n\ntwo_sum()'
    );
END

-- Completed official submission (Score: 4.0/4.0)
IF @sess1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Submissions WHERE session_id = @sess1 AND question_id = @q_two_sum)
BEGIN
    INSERT INTO Submissions (
        room_id, student_id, question_id, session_id, attempt_number, 
        code_content, programming_language, grading_status, total_score, execution_time_ms, memory_used_kb
    ) VALUES (
        @rm_exam, @sv1, @q_two_sum, @sess1, 1,
        'def two_sum():\n    n, target = map(int, input().split())\n    nums = list(map(int, input().split()))\n    lookup = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in lookup:\n            print(lookup[diff], i)\n            return\n        lookup[num] = i\n\ntwo_sum()',
        'python', 'completed', 4.0, 45, 14200
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 12. TABLE Violations & Snapshots
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @sess1 INT = (SELECT TOP 1 session_id FROM ExamSessions WHERE browser_fingerprint = 'fp_student_01_win11');
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');

IF @sess1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Violations WHERE session_id = @sess1)
BEGIN
    INSERT INTO Violations (
        session_id, room_id, student_id, violation_type, severity, 
        description, ai_confidence, evidence_url, is_reviewed, review_status
    ) VALUES (
        @sess1, @rm_exam, @sv1, 'tab_switch', 'medium', 
        N'Thí sinh rời khỏi tab thi sang ứng dụng khác (phát hiện qua Page Visibility API)', 0.95, 
        '/uploads/snapshots/sample_tab_switch.jpg', 0, 'pending'
    );

    INSERT INTO Violations (
        session_id, room_id, student_id, violation_type, severity, 
        description, ai_confidence, evidence_url, is_reviewed, review_status
    ) VALUES (
        @sess1, @rm_exam, @sv1, 'multiple_faces', 'high', 
        N'Phát hiện 2 khuôn mặt đồng thời xuất hiện trong khung hình webcam', 0.88, 
        '/uploads/snapshots/sample_multi_faces.jpg', 0, 'pending'
    );
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 13. TABLE RoomMessages
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @gv_nam INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'nam.nv');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');

IF @rm_exam IS NOT NULL AND NOT EXISTS (SELECT 1 FROM RoomMessages WHERE room_id = @rm_exam)
BEGIN
    INSERT INTO RoomMessages (room_id, sender_id, message_type, is_private, content)
    VALUES (@rm_exam, @gv_nam, 'broadcast', 0, N'Chào các em, đề thi đã được kích hoạt. Chúc các em làm bài tốt!');

    INSERT INTO RoomMessages (room_id, sender_id, receiver_id, message_type, is_private, content)
    VALUES (@rm_exam, @sv1, @gv_nam, 'direct', 1, N'Thầy ơi cho em hỏi câu 1 giới hạn thời gian tính bằng giây hay mili giây ạ?');

    INSERT INTO RoomMessages (room_id, sender_id, receiver_id, message_type, is_private, content)
    VALUES (@rm_exam, @gv_nam, @sv1, 'direct', 1, N'Thời gian chạy tối đa là 1.0 giây (1000ms) em nhé.');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 14. TABLE SupportRequests
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @sess1 INT = (SELECT TOP 1 session_id FROM ExamSessions WHERE browser_fingerprint = 'fp_student_01_win11');
DECLARE @rm_exam INT = (SELECT TOP 1 room_id FROM Rooms WHERE room_code = 'EXAM_FINAL_CS404');
DECLARE @sv1 INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'student');

IF @sess1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM SupportRequests WHERE session_id = @sess1)
BEGIN
    INSERT INTO SupportRequests (session_id, room_id, student_id, issue_type, sos_message, status)
    VALUES (@sess1, @rm_exam, @sv1, 'camera_frozen', N'Camera của em bị chớp tắt, em xin phép khởi động lại trình duyệt ạ', 'resolved');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 15. TABLE SystemAuditLogs
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @id_admin INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'admin');

IF NOT EXISTS (SELECT 1 FROM SystemAuditLogs)
BEGIN
    INSERT INTO SystemAuditLogs (user_id, log_level, action, message, ip_address)
    VALUES (@id_admin, 'INFO', N'Khởi tạo hệ thống', N'Khởi tạo thành công cơ sở dữ liệu và cấu hình hệ thống Oculide', '127.0.0.1');

    INSERT INTO SystemAuditLogs (user_id, log_level, action, message, ip_address)
    VALUES (@id_admin, 'INFO', N'Đăng nhập', N'Quản trị viên đăng nhập vào hệ thống', '127.0.0.1');

    INSERT INTO SystemAuditLogs (user_id, log_level, action, message, ip_address)
    VALUES (@id_admin, 'INFO', N'Tạo phòng thi', N'Giảng viên Nguyễn Văn Nam tạo phòng thi EXAM_FINAL_CS404', '127.0.0.1');
END
GO

-- ────────────────────────────────────────────────────────────────────────────
-- 16. TABLE ExamTemplates (Standard Exam & Lab Templates)
-- ────────────────────────────────────────────────────────────────────────────
DECLARE @id_admin INT = (SELECT TOP 1 user_id FROM Users WHERE username = 'admin');

IF NOT EXISTS (SELECT 1 FROM ExamTemplates WHERE template_code = 'FINAL_CS404_2026')
BEGIN
    INSERT INTO ExamTemplates (template_code, title, template_type, duration_minutes, total_points, created_by)
    VALUES 
    ('FINAL_CS404_2026', N'Đề thi Kết thúc học phần: Cấu trúc Dữ liệu & Giải thuật nâng cao', 'final_exam', 90, 10.0, @id_admin),
    ('FINAL_CS202_2026', N'Đề thi Kết thúc học phần: Lập trình Hướng đối tượng Java/C++', 'final_exam', 90, 10.0, @id_admin),
    ('FINAL_CS316_2026', N'Đề thi Kết thúc học phần: Cơ sở Dữ liệu & Hệ thống thông tin', 'final_exam', 75, 10.0, @id_admin),
    ('FINAL_SE301_2026', N'Đề thi Thực hành: Kỹ thuật phần mềm & Kiểm thử tự động', 'final_exam', 120, 10.0, @id_admin);
END
GO

PRINT N'🎉 SAMPLE DATA SEEDED SUCCESSFULLY! All 22 tables populated in ExamSystem.';
GO
