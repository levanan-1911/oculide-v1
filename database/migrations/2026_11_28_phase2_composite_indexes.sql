-- Phase 2 Stabilization: Composite Indexes for Hot Exam Queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_ExamSessions_RoomStudentStatus' AND object_id = OBJECT_ID('ExamSessions'))
    CREATE INDEX IDX_ExamSessions_RoomStudentStatus ON ExamSessions(room_id, student_id, status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Submissions_RoomQuestionStudentSubmitted' AND object_id = OBJECT_ID('Submissions'))
    CREATE INDEX IDX_Submissions_RoomQuestionStudentSubmitted ON Submissions(room_id, question_id, student_id, submitted_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_Violations_RoomReviewDetected' AND object_id = OBJECT_ID('Violations'))
    CREATE INDEX IDX_Violations_RoomReviewDetected ON Violations(room_id, review_status, detected_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_RoomMessages_RoomSentAt' AND object_id = OBJECT_ID('RoomMessages'))
    CREATE INDEX IDX_RoomMessages_RoomSentAt ON RoomMessages(room_id, sent_at DESC);
GO
