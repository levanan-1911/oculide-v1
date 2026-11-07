#!/bin/bash
# ==============================================================================
# database/init-db.sh
#
# Tự động xả CSDL ExamSystem (21 bảng chuẩn hóa ERD v2) khi khởi chạy container SQL Server.
# ==============================================================================

echo "[init-db] ========================================================"
echo "[init-db] Đang khởi động tiến trình giám sát và khởi tạo CSDL..."

# 1. Chờ SQL Server sẵn sàng tiếp nhận kết nối (tối đa 60 giây)
echo "[init-db] Đang chờ SQL Server sẵn sàng tiếp nhận kết nối..."
IS_READY=0
for i in $(seq 1 30); do
    if /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -No -Q "SELECT 1" > /dev/null 2>&1; then
        echo "[init-db] SQL Server đã sẵn sàng! (lần thử $i/30)"
        IS_READY=1
        break
    fi
    echo "[init-db]   Lần thử $i/30 — chưa sẵn sàng, chờ 2s..."
    sleep 2
done

if [ $IS_READY -eq 0 ]; then
    echo "[init-db] LỖI: SQL Server không phản hồi sau 60 giây. Hủy bỏ khởi tạo."
    exit 1
fi

# 2. Chờ SQL Server hoàn tất quá trình phục hồi (recovery) của toàn bộ CSDL
echo "[init-db] Đang chờ SQL Server hoàn tất phục hồi các CSDL..."
for i in $(seq 1 20); do
    RECOVERY_PENDING=$(/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -No -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE state_desc != 'ONLINE'" 2>/dev/null | tr -d '[:space:]')
    if [ "$RECOVERY_PENDING" = "0" ] || [ -z "$RECOVERY_PENDING" ]; then
        break
    fi
    sleep 2
done

# Dọn dẹp file .mdf/.ldf mồ côi nếu CSDL ExamSystem không tồn tại trong danh mục hệ thống
DB_EXISTS=$(/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -No -h -1 -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = 'ExamSystem'" 2>/dev/null | tr -d '[:space:]')
if [ "$DB_EXISTS" = "0" ]; then
    rm -f /var/opt/mssql/data/ExamSystem.mdf /var/opt/mssql/data/ExamSystem_log.ldf
fi

# 3. Kiểm tra xem CSDL ExamSystem và bảng VaiTro (21 bảng mới) đã có chưa
CHECK_TABLE=$(/opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${SA_PASSWORD}" \
    -No -d ExamSystem -h -1 \
    -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.tables WHERE name = 'VaiTro'" 2>/dev/null | tr -d '[:space:]')

if [ "$CHECK_TABLE" = "1" ] && [ "$INIT_DB_FORCE" != "1" ]; then
    echo "[init-db] CSDL ExamSystem và bảng VaiTro đã tồn tại — bỏ qua khởi tạo lại."
    echo "[init-db] (Nếu muốn xả lại CSDL từ đầu, đặt biến môi trường INIT_DB_FORCE=1 hoặc xóa volume docker)."
    echo "[init-db] ========================================================"
    exit 0
fi

# 4. Tự động xả schema.sql
echo "[init-db] Bắt đầu xả schema.sql (21 bảng chuẩn hóa ERD v2) vào SQL Server..."
/opt/mssql-tools18/bin/sqlcmd \
    -S localhost -U sa -P "${SA_PASSWORD}" \
    -No \
    -i /schema.sql \
    -o /var/opt/mssql/schema_init.log

if [ $? -eq 0 ]; then
    touch /var/opt/mssql/.schema_initialized
    echo "[init-db] XẢ CSDL THÀNH CÔNG! Đã khởi tạo đầy đủ 21 bảng vào ExamSystem."
    echo "[init-db] Nhật ký chi tiết lưu tại /var/opt/mssql/schema_init.log"
    echo "[init-db] ========================================================"
    cat /var/opt/mssql/schema_init.log
else
    echo "[init-db] LỖI: Quá trình xả schema.sql thất bại! Xem chi tiết lỗi bên dưới:"
    echo "[init-db] ========================================================"
    cat /var/opt/mssql/schema_init.log
    exit 1
fi
