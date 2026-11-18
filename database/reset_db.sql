-- ============================================================================
-- OCULIDE - DATABASE HARD RESET SCRIPT
-- CẢNH BÁO: CHỈ CHẠY FILE NÀY KHI BẠN CHẮC CHẮN MUỐN XÓA TOÀN BỘ CSDL VÀ DỮ LIỆU CŨ!
-- File này tách biệt hoàn toàn khỏi schema.sql để tránh việc vô tình xóa mất dữ liệu.
-- ============================================================================

USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'ExamSystem')
BEGIN
    PRINT N'⚠️ Đang ngắt kết nối và xóa toàn bộ CSDL ExamSystem...';
    ALTER DATABASE ExamSystem SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE ExamSystem;
    PRINT N'✅ Đã xóa hoàn toàn CSDL ExamSystem. Bây giờ bạn có thể chạy lại init_db hoặc schema.sql để khởi tạo mới.';
END
ELSE
BEGIN
    PRINT N'ℹ️ CSDL ExamSystem chưa tồn tại.';
END
GO
