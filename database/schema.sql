-- =============================================
-- Database Schema for Oculide - Laboratory Monitoring & Online Exam System
-- SQL Server Compatible (T-SQL)
-- =============================================

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

-- =============================================
-- 1. USERS TABLE
-- Lưu trữ thông tin người dùng (Giảng viên, Sinh viên, Quản trị viên)
-- =============================================
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'student', 'admin')),
    student_id NVARCHAR(20) NULL, -- Mã sinh viên (chỉ dành cho student)
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    last_login DATETIME2 NULL
);
GO

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
GO

-- =============================================
-- 2. ROOMS TABLE (Đổi tên từ ExamRooms)
-- Lưu trữ thông tin phòng (phòng thi exam hoặc phòng học/lab classroom)
-- =============================================
CREATE TABLE Rooms (
    room_id INT IDENTITY(1,1) PRIMARY KEY,
    room_code NVARCHAR(20) UNIQUE NOT NULL,
    room_name NVARCHAR(100) NOT NULL,
    room_type NVARCHAR(20) NOT NULL DEFAULT 'exam' CHECK (room_type IN ('exam', 'classroom')),
    instructor_id INT NOT NULL,
    description NVARCHAR(500) NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2 NOT NULL,
    duration_minutes INT NOT NULL,
    max_attempts INT DEFAULT 1,
    is_active BIT DEFAULT 1,
    passcode NVARCHAR(50) NULL, -- Mã PIN / Mật khẩu tham gia phòng
    livekit_room_name NVARCHAR(100) NULL, -- Tên phòng LiveKit SFU phục vụ video streaming
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_rooms_instructor FOREIGN KEY (instructor_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE,
    CONSTRAINT chk_rooms_time CHECK (end_time > start_time)
);
GO

CREATE INDEX idx_rooms_instructor ON Rooms(instructor_id);
CREATE INDEX idx_rooms_code ON Rooms(room_code);
CREATE INDEX idx_rooms_active ON Rooms(is_active);
CREATE INDEX idx_rooms_type ON Rooms(room_type);
GO

-- =============================================
-- 3. QUESTIONS TABLE (Đổi tên từ ExamQuestions)
-- Lưu trữ ngân hàng câu hỏi/đề bài lập trình trong phòng
-- =============================================
CREATE TABLE Questions (
    question_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    question_order INT NOT NULL,
    question_title NVARCHAR(200) NOT NULL,
    question_description NVARCHAR(MAX) NOT NULL,
    question_type NVARCHAR(20) NOT NULL CHECK (question_type IN ('coding', 'multiple_choice', 'essay')),
    programming_language NVARCHAR(20) NULL, -- Python, Java, C++, etc.
    max_points DECIMAL(5,2) DEFAULT 10.00,
    time_limit_minutes INT NULL,
    memory_limit_mb INT NULL,
    is_active BIT DEFAULT 1,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_questions_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_questions_room ON Questions(room_id);
CREATE INDEX idx_questions_order ON Questions(room_id, question_order);
GO

-- =============================================
-- 4. TEST CASES TABLE
-- Lưu trữ các bộ test case tự động chấm bài cho câu hỏi coding
-- =============================================
CREATE TABLE TestCases (
    test_case_id INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT NOT NULL,
    input_data NVARCHAR(MAX) NOT NULL,
    expected_output NVARCHAR(MAX) NOT NULL,
    is_hidden BIT DEFAULT 0, -- 1: Test case ẩn (sinh viên không thấy), 0: Mẫu (public)
    points DECIMAL(5,2) DEFAULT 0.00,
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_testcases_question FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id) ON DELETE CASCADE
);
GO

CREATE INDEX idx_testcases_question ON TestCases(question_id);
GO

-- =============================================
-- 5. ENROLLMENTS TABLE (Đổi tên từ StudentEnrollments)
-- Danh sách sinh viên được phân bổ/ghi danh vào phòng thi hoặc phòng thực hành
-- =============================================
CREATE TABLE Enrollments (
    enrollment_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    enrolled_at DATETIME2 DEFAULT GETDATE(),
    enrolled_by INT NOT NULL, -- Giảng viên thêm sinh viên
    
    CONSTRAINT fk_enrollments_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_enrollments_by FOREIGN KEY (enrolled_by) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT uq_enrollment UNIQUE (room_id, student_id)
);
GO

CREATE INDEX idx_enrollments_room ON Enrollments(room_id);
CREATE INDEX idx_enrollments_student ON Enrollments(student_id);
GO

-- =============================================
-- 6. SUBMISSIONS TABLE (Đổi tên từ StudentSubmissions)
-- Lưu trữ các lượt nộp bài code của sinh viên
-- =============================================
CREATE TABLE Submissions (
    submission_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    question_id INT NOT NULL,
    attempt_number INT DEFAULT 1,
    code_content NVARCHAR(MAX) NOT NULL,
    language NVARCHAR(20) NOT NULL,
    submitted_at DATETIME2 DEFAULT GETDATE(),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'grading', 'completed', 'failed', 'saved')),
    
    CONSTRAINT fk_submissions_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_submissions_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_submissions_question FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_submissions_room_student ON Submissions(room_id, student_id);
CREATE INDEX idx_submissions_status ON Submissions(status);
CREATE INDEX idx_submissions_question ON Submissions(question_id);
GO

-- =============================================
-- 7. GRADING RESULTS TABLE
-- Lưu trữ chi tiết kết quả chạy qua từng test case của một lần nộp bài
-- =============================================
CREATE TABLE GradingResults (
    result_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    test_case_id INT NOT NULL,
    is_passed BIT DEFAULT 0,
    actual_output NVARCHAR(MAX) NULL,
    execution_time_ms DECIMAL(10,2) NULL,
    memory_used_mb DECIMAL(10,2) NULL,
    error_message NVARCHAR(MAX) NULL,
    graded_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_grading_submission FOREIGN KEY (submission_id) 
        REFERENCES Submissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT fk_grading_testcase FOREIGN KEY (test_case_id) 
        REFERENCES TestCases(test_case_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_grading_submission ON GradingResults(submission_id);
GO

-- =============================================
-- 8. SESSIONS TABLE (Đổi tên từ ExamSessions)
-- Quản lý phiên tham gia (làm bài thi / học thực hành) của sinh viên trong phòng
-- =============================================
CREATE TABLE Sessions (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    started_at DATETIME2 DEFAULT GETDATE(),
    ended_at DATETIME2 NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(500) NULL,
    browser_fingerprint NVARCHAR(100) NULL,
    status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated', 'abandoned')),
    
    CONSTRAINT fk_sessions_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_sessions_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_sessions_room_student ON Sessions(room_id, student_id);
CREATE INDEX idx_sessions_status ON Sessions(status);
GO

-- =============================================
-- 9. VIOLATIONS TABLE (Đổi tên từ ViolationLogs)
-- Lưu trữ các sự kiện gian lận/bất thường do AI Proctoring hoặc Browser phát hiện
-- =============================================
CREATE TABLE Violations (
    violation_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    violation_type NVARCHAR(50) NOT NULL CHECK (violation_type IN (
        'tab_switch', 'copy_paste', 'no_face_detected', 
        'multiple_faces', 'phone_detected', 'suspicious_object',
        'fullscreen_exit', 'camera_blocked', 'time_exceeded',
        'inactive_30s', 'multiple_people'
    )),
    severity NVARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description NVARCHAR(500) NULL,
    snapshot_url NVARCHAR(500) NULL, -- URL ảnh chụp webcam khi phát hiện vi phạm
    detected_at DATETIME2 DEFAULT GETDATE(),
    is_reviewed BIT DEFAULT 0,
    reviewed_by INT NULL,
    reviewed_at DATETIME2 NULL,
    
    CONSTRAINT fk_violations_session FOREIGN KEY (session_id) 
        REFERENCES Sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_violations_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_violations_reviewer FOREIGN KEY (reviewed_by) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_violations_session ON Violations(session_id);
CREATE INDEX idx_violations_student ON Violations(student_id);
CREATE INDEX idx_violations_type ON Violations(violation_type);
CREATE INDEX idx_violations_severity ON Violations(severity);
CREATE INDEX idx_violations_reviewed ON Violations(is_reviewed);
GO

-- =============================================
-- 10. SNAPSHOTS TABLE (Đổi tên từ WebcamSnapshots)
-- Lưu trữ ảnh chụp webcam định kỳ của sinh viên trong phiên thi
-- =============================================
CREATE TABLE Snapshots (
    snapshot_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    face_detected BIT DEFAULT 0,
    face_count INT DEFAULT 0,
    looking_at_screen BIT DEFAULT 1,
    confidence_score DECIMAL(5,2) NULL,
    captured_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_snapshots_session FOREIGN KEY (session_id) 
        REFERENCES Sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT fk_snapshots_student FOREIGN KEY (student_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_snapshots_session ON Snapshots(session_id);
CREATE INDEX idx_snapshots_captured ON Snapshots(captured_at);
GO

-- =============================================
-- 11. MESSAGES TABLE (Đổi tên từ ChatMessages)
-- Lưu trữ tin nhắn chat realtime trong phòng (cả phòng hoặc riêng tư với Giám thị)
-- =============================================
CREATE TABLE Messages (
    message_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_content NVARCHAR(1000) NOT NULL,
    message_type NVARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'announcement')),
    is_private BIT DEFAULT 0,
    recipient_id INT NULL, -- Nếu là tin nhắn riêng với cá nhân cụ thể
    sent_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION,
    CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_messages_room ON Messages(room_id);
CREATE INDEX idx_messages_sender ON Messages(sender_id);
CREATE INDEX idx_messages_sent ON Messages(sent_at);
GO

-- =============================================
-- 12. SYSTEM LOGS TABLE
-- Nhật ký hệ thống chung phục vụ giám sát, audit và phát hiện lỗi
-- =============================================
CREATE TABLE SystemLogs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    log_level NVARCHAR(20) NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
    module NVARCHAR(50) NOT NULL, -- API, WebSocket, AI, Grader, etc.
    message NVARCHAR(MAX) NOT NULL,
    user_id INT NULL,
    extra_data NVARCHAR(MAX) NULL, -- JSON data
    created_at DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE SET NULL
);
GO

CREATE INDEX idx_logs_level ON SystemLogs(log_level);
CREATE INDEX idx_logs_module ON SystemLogs(module);
CREATE INDEX idx_logs_created ON SystemLogs(created_at);
GO

-- =============================================
-- 13. LIVEKIT TOKENS TABLE
-- Lưu trữ token xác thực LiveKit SFU cho video streaming của sinh viên và giám thị
-- =============================================
CREATE TABLE LiveKitTokens (
    token_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    token NVARCHAR(500) NOT NULL,
    participant_identity NVARCHAR(100) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    is_revoked BIT DEFAULT 0,
    
    CONSTRAINT fk_livekit_room FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_livekit_user FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE NO ACTION
);
GO

CREATE INDEX idx_livekit_room_user ON LiveKitTokens(room_id, user_id);
CREATE INDEX idx_livekit_expires ON LiveKitTokens(expires_at);
GO

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Lấy thống kê vi phạm của sinh viên trong phòng
CREATE PROCEDURE sp_GetStudentViolationStats
    @room_id INT,
    @student_id INT
AS
BEGIN
    SELECT 
        v.violation_type,
        v.severity,
        COUNT(*) as violation_count,
        MIN(v.detected_at) as first_occurrence,
        MAX(v.detected_at) as last_occurrence
    FROM Violations v
    JOIN Sessions s ON v.session_id = s.session_id
    WHERE s.room_id = @room_id 
        AND v.student_id = @student_id
    GROUP BY v.violation_type, v.severity
    ORDER BY v.severity DESC, violation_count DESC;
END;
GO

-- Lấy kết quả thi tổng hợp của sinh viên theo từng câu hỏi
CREATE PROCEDURE sp_GetStudentExamResults
    @room_id INT,
    @student_id INT
AS
BEGIN
    SELECT 
        q.question_id,
        q.question_title,
        q.max_points,
        s.submission_id,
        s.submitted_at,
        s.status,
        SUM(CASE WHEN gr.is_passed = 1 THEN tc.points ELSE 0 END) as earned_points,
        AVG(gr.execution_time_ms) as avg_execution_time
    FROM Questions q
    LEFT JOIN Submissions s ON q.question_id = s.question_id AND s.student_id = @student_id
    LEFT JOIN GradingResults gr ON s.submission_id = gr.submission_id
    LEFT JOIN TestCases tc ON gr.test_case_id = tc.test_case_id
    WHERE q.room_id = @room_id
    GROUP BY q.question_id, q.question_title, q.max_points, q.question_order, s.submission_id, s.submitted_at, s.status
    ORDER BY q.question_order;
END;
GO

-- Lấy danh sách sinh viên đang online trong phòng
CREATE PROCEDURE sp_GetOnlineStudents
    @room_id INT
AS
BEGIN
    SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.student_id,
        s.session_id,
        s.started_at,
        DATEDIFF(MINUTE, s.started_at, GETDATE()) as duration_minutes,
        (SELECT COUNT(*) FROM Violations WHERE session_id = s.session_id) as violation_count
    FROM Sessions s
    JOIN Users u ON s.student_id = u.user_id
    WHERE s.room_id = @room_id 
        AND s.status = 'active'
    ORDER BY s.started_at;
END;
GO

-- =============================================
-- VIEWS
-- =============================================

-- View: Tổng quan phòng học / phòng thi
CREATE VIEW vw_RoomOverview AS
SELECT 
    r.room_id,
    r.room_code,
    r.room_name,
    r.room_type,
    u.full_name as instructor_name,
    r.start_time,
    r.end_time,
    r.duration_minutes,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.student_id END) as active_students,
    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.student_id END) as completed_students,
    COUNT(DISTINCT q.question_id) as total_questions
FROM Rooms r
JOIN Users u ON r.instructor_id = u.user_id
LEFT JOIN Enrollments e ON r.room_id = e.room_id
LEFT JOIN Sessions s ON r.room_id = s.room_id
LEFT JOIN Questions q ON r.room_id = q.room_id
GROUP BY r.room_id, r.room_code, r.room_name, r.room_type, u.full_name, 
         r.start_time, r.end_time, r.duration_minutes;
GO

-- View: Báo cáo vi phạm theo phòng
CREATE VIEW vw_ViolationReport AS
SELECT 
    r.room_id,
    r.room_code,
    r.room_name,
    u.user_id,
    u.username,
    u.full_name,
    u.student_id,
    v.violation_type,
    v.severity,
    COUNT(*) as violation_count,
    MAX(v.detected_at) as last_violation
FROM Violations v
JOIN Sessions s ON v.session_id = s.session_id
JOIN Rooms r ON s.room_id = r.room_id
JOIN Users u ON v.student_id = u.user_id
GROUP BY r.room_id, r.room_code, r.room_name, 
         u.user_id, u.username, u.full_name, u.student_id,
         v.violation_type, v.severity;
GO

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Cập nhật updated_at khi User được sửa
CREATE TRIGGER tr_Users_UpdateTimestamp
ON Users
AFTER UPDATE
AS
BEGIN
    UPDATE Users
    SET updated_at = GETDATE()
    WHERE user_id IN (SELECT user_id FROM inserted);
END;
GO

-- Trigger: Cập nhật updated_at khi Room được sửa
CREATE TRIGGER tr_Rooms_UpdateTimestamp
ON Rooms
AFTER UPDATE
AS
BEGIN
    UPDATE Rooms
    SET updated_at = GETDATE()
    WHERE room_id IN (SELECT room_id FROM inserted);
END;
GO

-- Trigger: Cập nhật updated_at khi Question được sửa
CREATE TRIGGER tr_Questions_UpdateTimestamp
ON Questions
AFTER UPDATE
AS
BEGIN
    UPDATE Questions
    SET updated_at = GETDATE()
    WHERE question_id IN (SELECT question_id FROM inserted);
END;
GO

-- =============================================
-- SAMPLE DATA (ADMIN MẶC ĐỊNH)
-- =============================================

-- Mật khẩu mặc định: admin123
INSERT INTO Users (username, password_hash, email, full_name, role, is_active)
VALUES ('admin', '$2b$12$3xFcAp4PtCwrrLxqWEzZU.iT6.ap4CQe0QNczI6Dt/HHBR.BkcskS', 'admin@exam.com', 'System Admin', 'admin', 1);
GO

PRINT 'Oculide Database Schema created successfully with standardized tables!';
GO
