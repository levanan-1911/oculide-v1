-- ============================================================================
-- Migration: 01_capstone1_schema_update.sql
-- Database: ExamSystem (Microsoft SQL Server / T-SQL)
-- Target: Capstone 1 (Loại bỏ trắc nghiệm MCQ, hoàn thiện tính năng Lab/Exam coding & AI Proctoring)
-- ============================================================================

USE ExamSystem;
GO

-- 1. LOẠI BỎ MULTIPLE_CHOICE KHỎI QUESTIONS TABLE
-- Xóa ràng buộc CHECK cũ của question_type nếu có và áp dụng ràng buộc mới
DECLARE @chk_name NVARCHAR(200);
SELECT @chk_name = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
WHERE cc.parent_object_id = OBJECT_ID('Questions') AND c.name = 'question_type';

IF @chk_name IS NOT NULL
BEGIN   
    EXEC('ALTER TABLE Questions DROP CONSTRAINT ' + @chk_name);
END
GO

-- Ràng buộc mới: chỉ cho phép 'coding' và 'essay' (bỏ multiple_choice cho Capstone 2)
ALTER TABLE Questions ADD CONSTRAINT chk_questions_type CHECK (question_type IN ('coding', 'essay'));
GO

-- Xóa bảng QuestionOptions nếu có tồn tại từ các bản dựng thử nghiệm
IF OBJECT_ID('QuestionOptions', 'U') IS NOT NULL
BEGIN
    DROP TABLE QuestionOptions;
END
GO

-- 2. CẬP NHẬT BẢNG VIOLATIONS (Quy trình: AI sinh Cảnh báo -> Giám thị kết luận)
-- Bổ sung cột review_status ('pending', 'confirmed', 'rejected')
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('Violations') AND name = 'review_status'
)
BEGIN
    ALTER TABLE Violations ADD review_status NVARCHAR(20) DEFAULT 'pending' NOT NULL;
END
GO

-- Thêm check constraint cho review_status
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('Violations') AND name = 'chk_violations_review_status'
)
BEGIN
    ALTER TABLE Violations ADD CONSTRAINT chk_violations_review_status 
        CHECK (review_status IN ('pending', 'confirmed', 'rejected'));
END
GO

-- 3. TẠO CÁC BẢNG CÒN THIẾU THEO SRS CAPSTONE 1

-- Bảng Classes: Quản lý lớp học sinh viên theo lớp/học phần
IF OBJECT_ID('Classes', 'U') IS NULL
BEGIN
    CREATE TABLE Classes (
        class_id INT IDENTITY(1,1) PRIMARY KEY,
        class_code NVARCHAR(50) UNIQUE NOT NULL,
        class_name NVARCHAR(150) NOT NULL,
        instructor_id INT NOT NULL,
        description NVARCHAR(500) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT fk_classes_instructor FOREIGN KEY (instructor_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION
    );
    CREATE INDEX idx_classes_instructor ON Classes(instructor_id);
END
GO

-- Bảng CodeDrafts: Tự động lưu nháp bài code định kỳ (Auto-save) phòng mất điện/mất mạng
IF OBJECT_ID('CodeDrafts', 'U') IS NULL
BEGIN
    CREATE TABLE CodeDrafts (
        draft_id INT IDENTITY(1,1) PRIMARY KEY,
        session_id INT NOT NULL,
        question_id INT NOT NULL,
        student_id INT NOT NULL,
        draft_code NVARCHAR(MAX) NOT NULL,
        language NVARCHAR(20) NOT NULL,
        last_saved_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT fk_codedrafts_session FOREIGN KEY (session_id) 
            REFERENCES Sessions(session_id) ON DELETE CASCADE,
        CONSTRAINT fk_codedrafts_question FOREIGN KEY (question_id) 
            REFERENCES Questions(question_id) ON DELETE NO ACTION,
        CONSTRAINT fk_codedrafts_student FOREIGN KEY (student_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT uq_session_question_draft UNIQUE (session_id, question_id)
    );
    CREATE INDEX idx_codedrafts_session ON CodeDrafts(session_id);
END
GO

-- Bảng DeviceChecks: Kiểm tra thiết bị (Webcam, Mic, Màn hình, Mạng) trước khi vào phòng
IF OBJECT_ID('DeviceChecks', 'U') IS NULL
BEGIN
    CREATE TABLE DeviceChecks (
        check_id INT IDENTITY(1,1) PRIMARY KEY,
        session_id INT NOT NULL,
        student_id INT NOT NULL,
        camera_status BIT DEFAULT 0,
        mic_status BIT DEFAULT 0,
        network_latency_ms INT NULL,
        os_info NVARCHAR(100) NULL,
        browser_info NVARCHAR(150) NULL,
        is_passed BIT DEFAULT 0,
        checked_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT fk_devicechecks_session FOREIGN KEY (session_id) 
            REFERENCES Sessions(session_id) ON DELETE CASCADE,
        CONSTRAINT fk_devicechecks_student FOREIGN KEY (student_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION
    );
    CREATE INDEX idx_devicechecks_session ON DeviceChecks(session_id);
END
GO

-- Bảng SupportRequests: Sinh viên gửi yêu cầu hỗ trợ khẩn cấp trong phòng thi/lab
IF OBJECT_ID('SupportRequests', 'U') IS NULL
BEGIN
    CREATE TABLE SupportRequests (
        request_id INT IDENTITY(1,1) PRIMARY KEY,
        room_id INT NOT NULL,
        student_id INT NOT NULL,
        session_id INT NULL,
        issue_type NVARCHAR(50) NOT NULL CHECK (issue_type IN ('technical', 'exam_question', 'permission', 'other')),
        message NVARCHAR(1000) NOT NULL,
        status NVARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
        resolved_by INT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        resolved_at DATETIME2 NULL,
        
        CONSTRAINT fk_support_room FOREIGN KEY (room_id) 
            REFERENCES Rooms(room_id) ON DELETE CASCADE,
        CONSTRAINT fk_support_student FOREIGN KEY (student_id) 
            REFERENCES Users(user_id) ON DELETE NO ACTION,
        CONSTRAINT fk_support_resolved_by FOREIGN KEY (resolved_by) 
            REFERENCES Users(user_id) ON DELETE NO ACTION
    );
    CREATE INDEX idx_support_room ON SupportRequests(room_id);
    CREATE INDEX idx_support_status ON SupportRequests(status);
END
GO

PRINT N'>>> Cập nhật database cho Capstone 1 hoàn tất thành công!';
GO
