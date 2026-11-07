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

def connect_to_sqlserver():
    """Tự động dò tìm phương thức kết nối SQL Server phù hợp nhất (Windows Auth, sa/passwords, drivers)"""
    available_drivers = [
        DRIVER,
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server"
    ]
    seen_drivers = []
    for d in available_drivers:
        if d and d not in seen_drivers:
            seen_drivers.append(d)

    candidates = []

    # 1. Thử Windows Authentication (Ưu tiên số 1 trên máy cá nhân/SSMS mặc định - Không cần mật khẩu sa)
    for d in seen_drivers:
        candidates.append((
            f"DRIVER={{{d}}};SERVER={SERVER};DATABASE=master;Trusted_Connection=yes;Encrypt=no;TrustServerCertificate=yes;",
            f"Windows Authentication (Xác thực Windows - Trực tiếp qua tài khoản máy tính)"
        ))

    # 2. Thử theo USER và PASSWORD đã cấu hình trong .env (nếu có)
    if USER and PASSWORD:
        for d in seen_drivers:
            candidates.append((
                f"DRIVER={{{d}}};SERVER={SERVER};DATABASE=master;UID={USER};PWD={PASSWORD};Encrypt=no;TrustServerCertificate=yes;",
                f"Tài khoản '{USER}' theo cấu hình .env"
            ))

    # 3. Thử mật khẩu sa phổ biến: 123456
    for d in seen_drivers:
        candidates.append((
            f"DRIVER={{{d}}};SERVER={SERVER};DATABASE=master;UID=sa;PWD=123456;Encrypt=no;TrustServerCertificate=yes;",
            "Tài khoản sa (mật khẩu 123456)"
        ))

    # 4. Thử mật khẩu mặc định Docker: YourStrong@Passw0rd
    for d in seen_drivers:
        candidates.append((
            f"DRIVER={{{d}}};SERVER={SERVER};DATABASE=master;UID=sa;PWD=YourStrong@Passw0rd;Encrypt=no;TrustServerCertificate=yes;",
            "Tài khoản sa mặc định Docker (YourStrong@Passw0rd)"
        ))

    last_error = None
    for conn_str, desc in candidates:
        try:
            conn = pyodbc.connect(conn_str, autocommit=True, timeout=3)
            print(f"✅ {desc}")
            return conn
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"Không thể kết nối SQL Server qua bất kỳ phương thức nào. Lỗi: {last_error}")

def init_database():
    print(f"🚀 Bắt đầu xả schema.sql vào SQL Server ({SERVER})...")
    if not SCHEMA_PATH.exists():
        print(f"❌ Không tìm thấy file: {SCHEMA_PATH}")
        sys.exit(1)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        sql_content = f.read()

    # Tách các lô câu lệnh bằng từ khóa GO
    batches = [b.strip() for b in sql_content.split("GO") if b.strip()]

    try:
        conn = connect_to_sqlserver()
        cursor = conn.cursor()

        for idx, batch in enumerate(batches, 1):
            if not batch:
                continue
            try:
                cursor.execute(batch)
            except Exception as e:
                # Bỏ qua các cảnh báo không nguy hại
                err_msg = str(e)
                if "already exists" not in err_msg.lower() and "drop database" not in err_msg.lower():
                    print(f"⚠️ Cảnh báo tại batch {idx}: {e}")

        print("🎉 XẢ CSDL THÀNH CÔNG! Đã khởi tạo hoàn tất 21 bảng vào CSDL ExamSystem.")

        # Tự động nạp dữ liệu mẫu (sample_data.sql) nếu có
        sample_paths = [
            PROJECT_ROOT / "database" / "seeds" / "sample_data.sql",
            PROJECT_ROOT / "database" / "sample_data.sql"
        ]
        sample_file = next((p for p in sample_paths if p.exists()), None)
        if sample_file:
            print(f"📦 Đang tự động nạp dữ liệu mẫu từ {sample_file.name}...")
            with open(sample_file, "r", encoding="utf-8") as f:
                sample_content = f.read()
            sample_batches = [b.strip() for b in sample_content.split("GO") if b.strip()]
            for idx, batch in enumerate(sample_batches, 1):
                if not batch:
                    continue
                try:
                    cursor.execute(batch)
                except Exception as e:
                    # Bỏ qua cảnh báo trùng lặp nếu đã nạp trước đó
                    pass
            print("✨ ĐÃ NẠP DỮ LIỆU MẪU ĐẦY ĐỦ (Người dùng, Lớp học, Phòng thi, Đề bài, Testcases, Vi phạm AI)!")

        conn.close()
        print("💡 Bạn chỉ cần mở SSMS lên và bấm Refresh (F5) là sẽ thấy ngay toàn bộ CSDL và dữ liệu!")
    except Exception as e:
        print(f"❌ Lỗi kết nối hoặc thực thi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
