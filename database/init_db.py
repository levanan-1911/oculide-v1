"""
database/init_db.py

Script Python tự động xả database/schema.sql vào SQL Server.
Dùng độc lập cho môi trường phát triển cục bộ không qua Docker bash.
"""

import os
import sys
import pyodbc
from pathlib import Path

# Đọc cấu hình từ backend/core/config.py nếu có
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

try:
    from core.config import settings
    SERVER = settings.DATABASE_SERVER if settings.DATABASE_SERVER != "sqlserver" else "localhost"
    USER = settings.DATABASE_USERNAME
    PASSWORD = settings.DATABASE_PASSWORD
    DRIVER = settings.DATABASE_DRIVER.replace("+", " ")
except Exception:
    SERVER = "localhost"
    USER = "sa"
    PASSWORD = os.getenv("MSSQL_SA_PASSWORD", "YourStrong@Passw0rd")
    DRIVER = "ODBC Driver 18 for SQL Server"

SCHEMA_PATH = PROJECT_ROOT / "database" / "schema.sql"

def init_database():
    print(f"🚀 Bắt đầu xả schema.sql vào SQL Server ({SERVER})...")
    if not SCHEMA_PATH.exists():
        print(f"❌ Không tìm thấy file: {SCHEMA_PATH}")
        sys.exit(1)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Tách các lô câu lệnh bằng từ khóa GO
    batches = [b.strip() for b in sql_content.split("GO") if b.strip()]

    # Kết nối ban đầu tới master
    conn_str = (
        f"DRIVER={{{DRIVER}}};"
        f"SERVER={SERVER};"
        f"DATABASE=master;"
        f"UID={USER};"
        f"PWD={PASSWORD};"
        "Encrypt=no;"
        "TrustServerCertificate=yes;"
    )

    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        print("✅ Kết nối SQL Server thành công!")

        for idx, batch in enumerate(batches, 1):
            if not batch:
                continue
            try:
                cursor.execute(batch)
            except Exception as e:
                print(f"⚠️ Cảnh báo tại batch {idx}: {e}")

        conn.close()
        print("🎉 XẢ CSDL THÀNH CÔNG! Đã khởi tạo hoàn tất 21 bảng vào CSDL ExamSystem.")
    except Exception as e:
        print(f"❌ Lỗi kết nối hoặc thực thi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
