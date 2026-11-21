USE ExamSystem;
GO

IF COL_LENGTH('dbo.Classes', 'start_date') IS NULL
    ALTER TABLE dbo.Classes ADD start_date DATETIME2 NULL;
GO

IF COL_LENGTH('dbo.Classes', 'end_date') IS NULL
    ALTER TABLE dbo.Classes ADD end_date DATETIME2 NULL;
GO

IF COL_LENGTH('dbo.Classes', 'total_sessions') IS NULL
    ALTER TABLE dbo.Classes ADD total_sessions INT NULL;
GO

IF COL_LENGTH('dbo.Classes', 'credit_hours') IS NULL
    ALTER TABLE dbo.Classes ADD credit_hours INT NULL;
GO

UPDATE dbo.Classes SET total_sessions = 15 WHERE total_sessions IS NULL;
UPDATE dbo.Classes SET credit_hours = 3 WHERE credit_hours IS NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Classes')
      AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('dbo.Classes'), 'total_sessions', 'ColumnId')
)
    ALTER TABLE dbo.Classes
    ADD CONSTRAINT DF_Classes_TotalSessions DEFAULT (15) FOR total_sessions;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Classes')
      AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('dbo.Classes'), 'credit_hours', 'ColumnId')
)
    ALTER TABLE dbo.Classes
    ADD CONSTRAINT DF_Classes_CreditHours DEFAULT (3) FOR credit_hours;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CHK_Classes_Status'
      AND parent_object_id = OBJECT_ID('dbo.Classes')
)
    ALTER TABLE dbo.Classes DROP CONSTRAINT CHK_Classes_Status;
GO

ALTER TABLE dbo.Classes
ADD CONSTRAINT CHK_Classes_Status
CHECK (status IN ('open', 'closed', 'active', 'dang_mo', 'da_dong', N'Hoạt động', N'Đang mở', N'Đã đóng', N'Đã kết thúc', N'Tạm dừng', N'Chưa bắt đầu', N'Chưa mở'));
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CHK_ExamTemplates_Type'
      AND parent_object_id = OBJECT_ID('dbo.ExamTemplates')
)
    ALTER TABLE dbo.ExamTemplates DROP CONSTRAINT CHK_ExamTemplates_Type;
GO

ALTER TABLE dbo.ExamTemplates
ADD CONSTRAINT CHK_ExamTemplates_Type
CHECK (template_type IN ('lab', 'exam', 'practice', 'final', 'final_exam', 'midterm', 'midterm_exam', 'homework'));
GO

IF COL_LENGTH('dbo.Rooms', 'session_type') IS NULL
BEGIN
    ALTER TABLE dbo.Rooms ADD session_type NVARCHAR(20) NULL;
END
GO

UPDATE r
SET session_type = CASE
    WHEN LOWER(r.room_type) IN ('lab', 'practice') THEN 'LAB'
    WHEN LOWER(r.room_type) = 'exam'
         AND LOWER(COALESCE(t.template_type, '')) IN ('final', 'final_exam') THEN 'FINAL'
    WHEN LOWER(r.room_type) = 'exam'
         AND LOWER(COALESCE(t.template_type, '')) IN ('midterm', 'midterm_exam') THEN 'MIDTERM'
    WHEN LOWER(r.room_type) = 'exam'
         AND (LOWER(r.room_name) LIKE N'%cuối kỳ%' OR LOWER(r.room_name) LIKE N'%kết thúc%') THEN 'FINAL'
    WHEN LOWER(r.room_type) = 'exam' THEN 'MIDTERM'
    ELSE NULL
END
FROM dbo.Rooms r
LEFT JOIN dbo.ExamTemplates t ON t.template_id = r.template_id
WHERE r.session_type IS NULL;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CHK_Rooms_SessionType'
      AND parent_object_id = OBJECT_ID('dbo.Rooms')
)
BEGIN
    ALTER TABLE dbo.Rooms
    ADD CONSTRAINT CHK_Rooms_SessionType
    CHECK (session_type IS NULL OR session_type IN ('LAB', 'MIDTERM', 'FINAL'));
END
GO
