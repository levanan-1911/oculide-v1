-- ============================================================================
-- DATABASE SCHEMA FOR OCULIDE - ONLINE EXAM & LAB MONITORING SYSTEM
-- Version: v3.0 (English Schema Migration - 22 Tables Standardized)
-- Database Engine: Microsoft SQL Server (T-SQL)
-- Database Name: ExamSystem
-- ============================================================================

USE master;
GO

-- 1. Khởi tạo CSDL an toàn: Chỉ tạo mới nếu chưa có (TUYỆT ĐỐI KHÔNG DROP DATABASE ĐỂ BẢO VỆ DỮ LIỆU)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ExamSystem')
BEGIN
    CREATE DATABASE ExamSystem;
    PRINT N'✅ Đã khởi tạo mới CSDL ExamSystem.';
END
ELSE
BEGIN
    PRINT N'ℹ️ CSDL ExamSystem đã tồn tại. Giữ nguyên CSDL và bảo lưu toàn bộ dữ liệu hiện có.';
END
GO

USE ExamSystem;
GO

-- ============================================================================
-- MODULE 1: AUTHENTICATION, ROLES, USERS & AUDIT LOGS
-- ============================================================================

-- 1. Table Roles
CREATE TABLE Roles (
    role_id INT IDENTITY(1,1) PRIMARY KEY,
    role_name NVARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'instructor', 'student'
    description NVARCHAR(255) NULL
);
GO

-- 2. Table Users
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(100) NOT NULL,
    identifier_code NVARCHAR(50) NULL,             -- Student ID (MSSV) / Instructor Code / Admin Code
    department NVARCHAR(150) NULL,                 -- Department / Faculty
    homeroom_class NVARCHAR(50) NULL,              -- Administrative / Homeroom class (e.g. SE1801, K28-KTPM1)
    academic_degree NVARCHAR(50) NULL,             -- Ph.D / Master / etc.
    phone_number NVARCHAR(20) NULL,
    avatar_url NVARCHAR(500) NULL,
    role_id INT NOT NULL,
    is_active BIT DEFAULT 1 NOT NULL,
    must_change_password BIT DEFAULT 0 NOT NULL,
    email_status NVARCHAR(20) DEFAULT 'unsent' NOT NULL,
    last_login DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
    updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Users_Roles FOREIGN KEY (role_id) 
        REFERENCES Roles(role_id),
    CONSTRAINT CHK_Users_EmailStatus CHECK (email_status IN ('unsent', 'sent', 'failed', 'chua_gui', 'da_gui', 'that_bai'))
);
GO
CREATE INDEX IDX_Users_Username ON Users(username);
CREATE INDEX IDX_Users_Email ON Users(email);
CREATE INDEX IDX_Users_IdentifierCode ON Users(identifier_code);
CREATE INDEX IDX_Users_HomeroomClass ON Users(homeroom_class);
CREATE INDEX IDX_Users_RoleId ON Users(role_id);
GO

-- 3. Table AuthTokens (Authentication, Refresh & LiveKit Tokens)
CREATE TABLE AuthTokens (
    token_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash NVARCHAR(MAX) NOT NULL,
    token_type NVARCHAR(50) NOT NULL,              -- 'refresh', 'reset_password', 'verify', 'livekit'
    room_id INT NULL,
    user_identity NVARCHAR(100) NULL,
    device_info NVARCHAR(255) NULL,
    expires_at DATETIME2 NOT NULL,
    is_used BIT DEFAULT 0 NOT NULL,
    is_revoked BIT DEFAULT 0 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_AuthTokens_Users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE CASCADE
);
GO
CREATE INDEX IDX_AuthTokens_UserId ON AuthTokens(user_id);
CREATE INDEX IDX_AuthTokens_TokenType ON AuthTokens(token_type);
GO

-- 4. Table SystemAuditLogs
CREATE TABLE SystemAuditLogs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    log_level NVARCHAR(20) NOT NULL,                  -- 'info', 'warning', 'critical', 'security', 'error', 'debug'
    action NVARCHAR(100) NOT NULL,                  -- module / action
    message NVARCHAR(MAX) NULL,                     -- log message
    ip_address NVARCHAR(45) NULL,
    details NVARCHAR(MAX) NULL,                     -- JSON metadata
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_SystemAuditLogs_Users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) ON DELETE SET NULL
);
GO
CREATE INDEX IDX_SystemAuditLogs_CreatedAt ON SystemAuditLogs(created_at DESC);
CREATE INDEX IDX_SystemAuditLogs_UserId ON SystemAuditLogs(user_id);
GO

-- ============================================================================
-- MODULE 2: ACADEMIC SEMESTERS, CLASSES & ENROLLMENTS
-- ============================================================================

-- 5. Table Semesters
CREATE TABLE Semesters (
    semester_code NVARCHAR(30) PRIMARY KEY,          -- e.g. 'HK1_2026_2027'
    semester_name NVARCHAR(100) NOT NULL,           -- e.g. 'HK1 2026–2027'
    academic_year NVARCHAR(20) NOT NULL,           -- e.g. '2026-2027'
    term_number INT NOT NULL,                      -- 1 (Fall), 2 (Spring), 3 (Summer)
    start_date DATE NULL,
    end_date DATE NULL,
    is_current BIT DEFAULT 0 NOT NULL,
    status NVARCHAR(20) DEFAULT 'active' NOT NULL,  -- 'active', 'closed', 'hoat_dong', 'da_dong'
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL
);
GO

-- 6. Table Classes
CREATE TABLE Classes (
    class_id INT IDENTITY(1,1) PRIMARY KEY,
    class_code NVARCHAR(50) UNIQUE NOT NULL,       -- e.g. 'CMU-CS 316 AIS', 'CS 202 D'
    class_name NVARCHAR(150) NOT NULL,
    course_code NVARCHAR(50) NULL,
    section_code NVARCHAR(50) NULL,
    semester_name NVARCHAR(50) NULL,
    instructor_id INT NOT NULL,
    description NVARCHAR(500) NULL,
    status NVARCHAR(50) DEFAULT 'open' NOT NULL,   -- 'open', 'closed', 'active', 'dang_mo', 'da_dong', 'Hoạt động', 'Đã kết thúc'
    start_date DATETIME2 NULL,
    end_date DATETIME2 NULL,
    total_sessions INT DEFAULT 15,
    credit_hours INT DEFAULT 3,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
    updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Classes_Instructors FOREIGN KEY (instructor_id) 
        REFERENCES Users(user_id),
    CONSTRAINT CHK_Classes_Status CHECK (status IN ('open', 'closed', 'active', 'dang_mo', 'da_dong', N'Hoạt động', N'Đang mở', N'Đã đóng', N'Đã kết thúc', N'Tạm dừng', N'Chưa bắt đầu', N'Chưa mở'))
);
GO
CREATE INDEX IDX_Classes_InstructorId ON Classes(instructor_id);
GO

-- 7. Table ClassEnrollments
CREATE TABLE ClassEnrollments (
    enrollment_id INT IDENTITY(1,1) PRIMARY KEY,
    class_id INT NULL,
    room_id INT NULL,
    student_id INT NOT NULL,
    enrolled_by INT NULL,
    status NVARCHAR(20) DEFAULT 'enrolled' NOT NULL, -- 'enrolled', 'dropped', 'completed', 'active', 'dang_hoc', 'da_rut', 'hoan_thanh'
    enrolled_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_ClassEnrollments_Classes FOREIGN KEY (class_id) 
        REFERENCES Classes(class_id) ON DELETE CASCADE,
    CONSTRAINT FK_ClassEnrollments_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id),
    CONSTRAINT FK_ClassEnrollments_EnrolledBy FOREIGN KEY (enrolled_by) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_ClassEnrollments_StudentId ON ClassEnrollments(student_id);
CREATE INDEX IDX_ClassEnrollments_ClassId ON ClassEnrollments(class_id);
CREATE INDEX IDX_ClassEnrollments_RoomId ON ClassEnrollments(room_id);
GO

-- ============================================================================
-- MODULE 3: QUESTIONS, TEST CASES & EXAM TEMPLATES
-- ============================================================================

-- 8. Table Questions
CREATE TABLE Questions (
    question_id INT IDENTITY(1,1) PRIMARY KEY,
    problem_code NVARCHAR(50) NULL,                 -- e.g. 'TWO_SUM'
    room_id INT NULL,
    question_order INT DEFAULT 1 NOT NULL,
    title NVARCHAR(200) NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    question_type NVARCHAR(50) DEFAULT 'coding' NOT NULL, -- 'coding', 'multiple_choice', 'essay'
    difficulty NVARCHAR(20) DEFAULT 'medium' NOT NULL,    -- 'easy', 'medium', 'hard'
    time_limit_ms INT DEFAULT 1000 NOT NULL,
    memory_limit_mb INT DEFAULT 256 NOT NULL,
    allowed_languages NVARCHAR(100) DEFAULT 'c,cpp,python,java' NOT NULL,
    max_points DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
    author_id INT NULL,
    is_active BIT DEFAULT 1 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
    updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Questions_Authors FOREIGN KEY (author_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_Questions_RoomId ON Questions(room_id);
CREATE INDEX IDX_Questions_AuthorId ON Questions(author_id);
GO

-- 9. Table TestCases
CREATE TABLE TestCases (
    test_case_id INT IDENTITY(1,1) PRIMARY KEY,
    question_id INT NOT NULL,
    input_data NVARCHAR(MAX) NOT NULL,
    expected_output NVARCHAR(MAX) NOT NULL,
    is_sample BIT DEFAULT 0 NOT NULL,
    is_hidden BIT DEFAULT 0 NOT NULL,
    points DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_TestCases_Questions FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id) ON DELETE CASCADE
);
GO
CREATE INDEX IDX_TestCases_QuestionId ON TestCases(question_id);
GO

-- 10. Table ExamTemplates
CREATE TABLE ExamTemplates (
    template_id INT IDENTITY(1,1) PRIMARY KEY,
    template_code NVARCHAR(50) UNIQUE NOT NULL,      -- e.g. 'DE_LAB_01', 'THI_CUOIKY_CS101'
    title NVARCHAR(200) NOT NULL,
    template_type NVARCHAR(50) NOT NULL,             -- 'lab', 'exam', 'final_exam', 'midterm_exam', 'practice'
    duration_minutes INT NOT NULL,
    total_points DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_ExamTemplates_Creators FOREIGN KEY (created_by) 
        REFERENCES Users(user_id),
    CONSTRAINT CHK_ExamTemplates_Type CHECK (template_type IN ('lab', 'exam', 'practice', 'final', 'final_exam', 'midterm', 'midterm_exam', 'homework'))
);
GO
CREATE INDEX IDX_ExamTemplates_CreatedBy ON ExamTemplates(created_by);
GO

-- 11. Table TemplateQuestions
CREATE TABLE TemplateQuestions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    template_id INT NOT NULL,
    question_id INT NOT NULL,
    question_order INT DEFAULT 1 NOT NULL,
    points DECIMAL(5,2) NOT NULL,

    CONSTRAINT FK_TemplateQuestions_Templates FOREIGN KEY (template_id) 
        REFERENCES ExamTemplates(template_id) ON DELETE CASCADE,
    CONSTRAINT FK_TemplateQuestions_Questions FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id),
    CONSTRAINT UQ_Template_Question UNIQUE (template_id, question_id)
);
GO
CREATE INDEX IDX_TemplateQuestions_TemplateId ON TemplateQuestions(template_id);
GO

-- ============================================================================
-- MODULE 4: ROOMS (EXAMS & LABS), PROCTORS & MESSAGES
-- ============================================================================

-- 12. Table Rooms
CREATE TABLE Rooms (
    room_id INT IDENTITY(1,1) PRIMARY KEY,
    room_code NVARCHAR(50) UNIQUE NOT NULL,          -- Room PIN / Code (e.g. 'EXAM_FINAL_CS404')
    room_name NVARCHAR(200) NOT NULL,
    room_type NVARCHAR(20) NOT NULL,                 -- 'lab', 'exam', 'practice', 'classroom'
    session_type NVARCHAR(20) NULL,                  -- 'LAB', 'MIDTERM', 'FINAL'
    creator_id INT NOT NULL,                         -- Instructor who created the room
    description NVARCHAR(500) NULL,
    start_time DATETIME2 NOT NULL,
    end_time DATETIME2 NOT NULL,
    duration_minutes INT DEFAULT 60 NOT NULL,
    max_attempts INT DEFAULT 10 NOT NULL,
    passcode NVARCHAR(50) NULL,
    livekit_room_name NVARCHAR(100) NULL,
    class_id INT NULL,
    template_id INT NULL,
    proctoring_config NVARCHAR(MAX) NULL,            -- JSON configuration for AI monitoring
    is_active BIT DEFAULT 1 NOT NULL,
    status NVARCHAR(20) DEFAULT 'scheduled' NOT NULL, -- 'scheduled', 'in_progress', 'completed', 'chua_mo', 'dang_dien_ra', 'da_dong'
    created_at DATETIME2 DEFAULT GETDATE() NOT NULL,
    updated_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Rooms_Classes FOREIGN KEY (class_id) 
        REFERENCES Classes(class_id),
    CONSTRAINT FK_Rooms_Templates FOREIGN KEY (template_id) 
        REFERENCES ExamTemplates(template_id),
    CONSTRAINT FK_Rooms_Creators FOREIGN KEY (creator_id) 
        REFERENCES Users(user_id),
    CONSTRAINT CHK_Rooms_SessionType CHECK (session_type IS NULL OR session_type IN ('LAB', 'MIDTERM', 'FINAL'))
);
GO
CREATE INDEX IDX_Rooms_RoomCode ON Rooms(room_code);
CREATE INDEX IDX_Rooms_CreatorId ON Rooms(creator_id);
CREATE INDEX IDX_Rooms_ClassId ON Rooms(class_id);
GO

-- 13. Table RoomProctors
CREATE TABLE RoomProctors (
    id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    instructor_id INT NOT NULL,
    proctor_role NVARCHAR(50) DEFAULT 'proctor' NOT NULL, -- 'lead_instructor', 'teaching_assistant', 'proctor', 'giam_thi'

    CONSTRAINT FK_RoomProctors_Rooms FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT FK_RoomProctors_Users FOREIGN KEY (instructor_id) 
        REFERENCES Users(user_id),
    CONSTRAINT UQ_Room_Proctor UNIQUE (room_id, instructor_id)
);
GO
CREATE INDEX IDX_RoomProctors_RoomId ON RoomProctors(room_id);
GO

-- 14. Table RoomMessages
CREATE TABLE RoomMessages (
    message_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NULL,                            -- NULL for public/broadcast messages
    message_type NVARCHAR(30) DEFAULT 'chat' NOT NULL, -- 'chat', 'broadcast', 'direct', 'warning', 'text'
    is_private BIT DEFAULT 0 NOT NULL,
    content NVARCHAR(MAX) NOT NULL,
    sent_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_RoomMessages_Rooms FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT FK_RoomMessages_Sender FOREIGN KEY (sender_id) 
        REFERENCES Users(user_id),
    CONSTRAINT FK_RoomMessages_Receiver FOREIGN KEY (receiver_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_RoomMessages_RoomId ON RoomMessages(room_id);
CREATE INDEX IDX_RoomMessages_SenderId ON RoomMessages(sender_id);
GO

-- ============================================================================
-- MODULE 5: SESSIONS, AI MONITORING, SUBMISSIONS & GRADING
-- ============================================================================

-- 15. Table ExamSessions
CREATE TABLE ExamSessions (
    session_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    ip_address NVARCHAR(45) NULL,
    user_agent NVARCHAR(255) NULL,
    browser_fingerprint NVARCHAR(255) NULL,
    status NVARCHAR(20) DEFAULT 'active' NOT NULL,   -- 'active', 'submitted', 'locked', 'completed', 'doing', 'dang_lam', 'da_nop', 'bi_khoa'
    extra_time_minutes INT DEFAULT 0 NOT NULL,
    livekit_identity NVARCHAR(100) NULL,
    start_time DATETIME2 DEFAULT GETDATE() NOT NULL,
    submitted_at DATETIME2 NULL,
    end_time DATETIME2 NULL,

    CONSTRAINT FK_ExamSessions_Rooms FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id),
    CONSTRAINT FK_ExamSessions_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_ExamSessions_RoomId ON ExamSessions(room_id);
CREATE INDEX IDX_ExamSessions_StudentId ON ExamSessions(student_id);
CREATE INDEX IDX_ExamSessions_Status ON ExamSessions(status);
GO

-- 16. Table DeviceChecks
CREATE TABLE DeviceChecks (
    check_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    camera_status BIT DEFAULT 0 NOT NULL,
    mic_status BIT DEFAULT 0 NOT NULL,
    network_latency_ms INT DEFAULT 0 NOT NULL,
    os_info NVARCHAR(100) NULL,
    browser_info NVARCHAR(100) NULL,
    is_passed BIT DEFAULT 0 NOT NULL,
    checked_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_DeviceChecks_Sessions FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT FK_DeviceChecks_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_DeviceChecks_SessionId ON DeviceChecks(session_id);
GO

-- 17. Table Snapshots
CREATE TABLE Snapshots (
    snapshot_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    student_id INT NOT NULL,
    image_url NVARCHAR(500) NOT NULL,
    has_face BIT DEFAULT 1 NOT NULL,
    face_count INT DEFAULT 1 NOT NULL,
    looking_at_screen BIT DEFAULT 1 NOT NULL,
    confidence_score DECIMAL(4,3) DEFAULT 1.000 NOT NULL,
    captured_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Snapshots_Sessions FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT FK_Snapshots_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_Snapshots_Session_CapturedAt ON Snapshots(session_id, captured_at DESC);
GO

-- 18. Table CodeDrafts
CREATE TABLE CodeDrafts (
    draft_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    question_id INT NOT NULL,
    student_id INT NULL,
    programming_language NVARCHAR(30) NOT NULL,
    code_content NVARCHAR(MAX) NOT NULL,
    last_saved_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_CodeDrafts_Sessions FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT FK_CodeDrafts_Questions FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id),
    CONSTRAINT UQ_Session_Question_Draft UNIQUE (session_id, question_id)
);
GO
CREATE INDEX IDX_CodeDrafts_SessionId ON CodeDrafts(session_id);
GO

-- 19. Table SupportRequests
CREATE TABLE SupportRequests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NULL,
    room_id INT NULL,
    student_id INT NOT NULL,
    issue_type NVARCHAR(100) NOT NULL,              -- 'network', 'machine', 'question_query', etc.
    sos_message NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'open' NOT NULL,     -- 'open', 'resolved', 'closed', 'cho_xu_ly', 'da_xong'
    resolved_by INT NULL,
    sent_at DATETIME2 DEFAULT GETDATE() NOT NULL,
    resolved_at DATETIME2 NULL,

    CONSTRAINT FK_SupportRequests_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id),
    CONSTRAINT FK_SupportRequests_ResolvedBy FOREIGN KEY (resolved_by) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_SupportRequests_SessionId ON SupportRequests(session_id);
CREATE INDEX IDX_SupportRequests_RoomId ON SupportRequests(room_id);
GO

-- 20. Table Violations
CREATE TABLE Violations (
    violation_id INT IDENTITY(1,1) PRIMARY KEY,
    session_id INT NOT NULL,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    violation_type NVARCHAR(50) NOT NULL,
    severity NVARCHAR(20) DEFAULT 'warning' NOT NULL, -- 'low', 'medium', 'warning', 'high', 'critical'
    description NVARCHAR(500) NULL,
    ai_confidence DECIMAL(4,3) DEFAULT 1.000 NOT NULL,
    evidence_url NVARCHAR(500) NULL,
    is_reviewed BIT DEFAULT 0 NOT NULL,
    review_status NVARCHAR(20) DEFAULT 'pending' NOT NULL, -- 'pending', 'confirmed', 'rejected'
    reviewed_by INT NULL,
    reviewed_at DATETIME2 NULL,
    detected_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Violations_Sessions FOREIGN KEY (session_id) 
        REFERENCES ExamSessions(session_id) ON DELETE CASCADE,
    CONSTRAINT FK_Violations_Rooms FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id),
    CONSTRAINT FK_Violations_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id)
);
GO
CREATE INDEX IDX_Violations_Room_Review ON Violations(room_id, review_status);
CREATE INDEX IDX_Violations_SessionId ON Violations(session_id);
CREATE INDEX IDX_Violations_StudentId ON Violations(student_id);
GO

-- 21. Table Submissions
CREATE TABLE Submissions (
    submission_id INT IDENTITY(1,1) PRIMARY KEY,
    room_id INT NOT NULL,
    student_id INT NOT NULL,
    question_id INT NOT NULL,
    session_id INT NULL,
    attempt_number INT DEFAULT 1 NOT NULL,
    code_content NVARCHAR(MAX) NOT NULL,
    programming_language NVARCHAR(30) NOT NULL,
    grading_status NVARCHAR(30) DEFAULT 'pending' NOT NULL, -- 'pending', 'grading', 'completed', 'failed'
    total_score DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    execution_time_ms INT DEFAULT 0 NOT NULL,
    memory_used_kb INT DEFAULT 0 NOT NULL,
    submitted_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_Submissions_Rooms FOREIGN KEY (room_id) 
        REFERENCES Rooms(room_id),
    CONSTRAINT FK_Submissions_Students FOREIGN KEY (student_id) 
        REFERENCES Users(user_id),
    CONSTRAINT FK_Submissions_Questions FOREIGN KEY (question_id) 
        REFERENCES Questions(question_id)
);
GO
CREATE INDEX IDX_Submissions_Room_Student ON Submissions(room_id, student_id);
CREATE INDEX IDX_Submissions_QuestionId ON Submissions(question_id);
CREATE INDEX IDX_Submissions_GradingStatus ON Submissions(grading_status);
GO

-- 22. Table GradingResults
CREATE TABLE GradingResults (
    result_id INT IDENTITY(1,1) PRIMARY KEY,
    submission_id INT NOT NULL,
    test_case_id INT NOT NULL,
    is_passed BIT DEFAULT 0 NOT NULL,
    actual_output NVARCHAR(MAX) NULL,
    execution_time_ms INT DEFAULT 0 NOT NULL,
    memory_used_mb INT DEFAULT 0 NOT NULL,
    error_message NVARCHAR(MAX) NULL,
    score_awarded DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    graded_at DATETIME2 DEFAULT GETDATE() NOT NULL,

    CONSTRAINT FK_GradingResults_Submissions FOREIGN KEY (submission_id) 
        REFERENCES Submissions(submission_id) ON DELETE CASCADE,
    CONSTRAINT FK_GradingResults_TestCases FOREIGN KEY (test_case_id) 
        REFERENCES TestCases(test_case_id)
);
GO
CREATE INDEX IDX_GradingResults_SubmissionId ON GradingResults(submission_id);
CREATE INDEX IDX_GradingResults_TestCaseId ON GradingResults(test_case_id);
GO

-- ============================================================================
-- VIEWS & STORED PROCEDURES
-- ============================================================================

CREATE VIEW vw_RoomOverview AS
SELECT 
    r.room_id,
    r.room_code,
    r.room_name,
    r.room_type,
    u.full_name AS instructor_name,
    r.start_time,
    r.end_time,
    r.status,
    COUNT(DISTINCT s.session_id) AS total_students_joined,
    COUNT(DISTINCT CASE WHEN s.status IN ('active', 'doing', 'dang_lam') THEN s.student_id END) AS active_students,
    COUNT(DISTINCT CASE WHEN s.status IN ('submitted', 'completed', 'da_nop') THEN s.student_id END) AS submitted_students,
    COUNT(DISTINCT v.violation_id) AS total_violations_recorded
FROM Rooms r
JOIN Users u ON r.creator_id = u.user_id
LEFT JOIN ExamSessions s ON r.room_id = s.room_id
LEFT JOIN Violations v ON r.room_id = v.room_id
GROUP BY r.room_id, r.room_code, r.room_name, r.room_type, u.full_name, 
         r.start_time, r.end_time, r.status;
GO

CREATE VIEW vw_ViolationReport AS
SELECT 
    r.room_id,
    r.room_code,
    r.room_name,
    u.user_id,
    u.identifier_code AS student_code,
    u.full_name AS student_name,
    v.violation_id,
    v.violation_type,
    v.ai_confidence,
    v.evidence_url,
    v.review_status,
    v.detected_at
FROM Violations v
JOIN Rooms r ON v.room_id = r.room_id
JOIN Users u ON v.student_id = u.user_id;
GO

CREATE PROCEDURE sp_GetStudentViolationStats
    @room_id INT,
    @student_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        v.violation_type,
        v.review_status,
        COUNT(*) AS violation_count,
        MIN(v.detected_at) AS first_detected,
        MAX(v.detected_at) AS last_detected
    FROM Violations v
    WHERE v.room_id = @room_id 
      AND v.student_id = @student_id
    GROUP BY v.violation_type, v.review_status
    ORDER BY violation_count DESC;
END;
GO

CREATE PROCEDURE sp_GetOnlineStudents
    @room_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        u.user_id AS student_id,
        u.identifier_code AS student_code,
        u.full_name,
        s.session_id,
        s.start_time AS started_at,
        DATEDIFF(MINUTE, s.start_time, GETDATE()) AS duration_minutes,
        (SELECT COUNT(*) FROM Violations WHERE session_id = s.session_id) AS violation_count,
        (SELECT COUNT(*) FROM Violations WHERE session_id = s.session_id AND review_status = 'pending') AS pending_violation_count
    FROM ExamSessions s
    JOIN Users u ON s.student_id = u.user_id
    WHERE s.room_id = @room_id 
      AND s.status IN ('active', 'doing', 'dang_lam')
    ORDER BY s.start_time;
END;
GO

CREATE PROCEDURE sp_GetStudentExamResults
    @room_id INT,
    @student_id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        q.question_id,
        q.question_order,
        q.title AS question_title,
        q.max_points,
        COALESCE(MAX(sub.total_score), 0) AS student_score,
        COUNT(sub.submission_id) AS attempt_count,
        CASE WHEN MAX(sub.total_score) >= q.max_points THEN 1 ELSE 0 END AS is_passed
    FROM Questions q
    LEFT JOIN Submissions sub ON q.question_id = sub.question_id 
                             AND sub.room_id = @room_id 
                             AND sub.student_id = @student_id
    WHERE q.room_id = @room_id
    GROUP BY q.question_id, q.question_order, q.title, q.max_points
    ORDER BY q.question_order;
END;
GO

-- ============================================================================
-- INITIAL SEED DATA (CORE ROLES, USERS, SEMESTERS)
-- ============================================================================

-- Roles
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'admin')
    INSERT INTO Roles (role_name, description) VALUES ('admin', N'Quản trị viên hệ thống toàn quyền');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'instructor')
    INSERT INTO Roles (role_name, description) VALUES ('instructor', N'Giảng viên phụ trách giảng dạy và tổ chức phòng');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'student')
    INSERT INTO Roles (role_name, description) VALUES ('student', N'Sinh viên tham gia thực hành và thi cử');
GO

-- Default accounts
-- Password hash for 'admin123': $2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6
-- Password hash for 'Password123!': $2b$12$t/59jV7LxFjvjku/dRjkzO/NuiUXgNxE4rJnC8oboFt3wN1AxZcti
IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('admin', 'admin@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Quản Trị Viên Hệ Thống', 'ADM001', N'Phòng CNTT & Đào Tạo', 1, 1, 0, 'sent');

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'instructor')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('instructor', 'instructor@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Giảng Viên Hướng Dẫn', 'MSGV001', N'Khoa Công Nghệ Thông Tin', 2, 1, 0, 'sent');

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'student')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('student', 'student@school.edu.vn', '$2b$12$sB/mUfUZ/jOoujQ8dXsj.eGGb/AvJZg5olAry3orOhKOOkcH31QV6', N'Sinh Viên Nguyễn Văn A', 'SV2026001', N'Kỹ Thuật Phần Mềm', 3, 1, 0, 'sent');

IF NOT EXISTS (SELECT 1 FROM Users WHERE username = 'pvlong')
    INSERT INTO Users (username, email, password_hash, full_name, identifier_code, department, role_id, is_active, must_change_password, email_status)
    VALUES ('pvlong', 'pvlong@dtu.edu.vn', '$2b$12$t/59jV7LxFjvjku/dRjkzO/NuiUXgNxE4rJnC8oboFt3wN1AxZcti', N'Phạm Vũ Long', 'MSGV_PVL01', N'Khoa CNTT - Đại học Duy Tân', 2, 1, 0, 'sent');
GO

-- Standard Semesters
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HK1_2026_2027')
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status) VALUES
    ('HK1_2026_2027', N'HK1 2026–2027', '2026-2027', 1, '2026-09-01', '2027-01-15', 1, 'active');
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HK2_2026_2027')
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status) VALUES
    ('HK2_2026_2027', N'HK2 2026–2027', '2026-2027', 2, '2027-02-01', '2027-06-15', 0, 'active');
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HKT_2026_2027')
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status) VALUES
    ('HKT_2026_2027', N'HKT 2026–2027', '2026-2027', 3, '2027-06-20', '2027-08-15', 0, 'active');
IF NOT EXISTS (SELECT 1 FROM Semesters WHERE semester_code = 'HKT_2025_2026')
    INSERT INTO Semesters (semester_code, semester_name, academic_year, term_number, start_date, end_date, is_current, status) VALUES
    ('HKT_2025_2026', N'HKT 2025–2026', '2025-2026', 3, '2026-06-20', '2026-08-15', 0, 'closed');
GO

PRINT N'====================================================================';
PRINT N'ExamSystem schema (22 tables, English standard) created successfully!';
PRINT N'====================================================================';
