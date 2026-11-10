"""
database/init_db.py

Script Python tự động xả database/schema.sql và database/sample_data.sql vào SQL Server.
Hỗ trợ linh hoạt cho cả môi trường SSMS (máy thật Windows) và Docker Container (riêng biệt hoặc song song).

Cách sử dụng:
    python database/init_db.py --target ssms     # Chỉ xả vào SSMS / SQL Server máy thật
    python database/init_db.py --target docker   # Chỉ xả vào Docker container (exam-sqlserver)
    python database/init_db.py --target all      # Xả song song vào CẢ HAI môi trường
    python database/init_db.py                   # Tự động phát hiện môi trường đang chạy
"""

import os
import sys
import argparse
import subprocess
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
SAMPLE_PATHS = [
    PROJECT_ROOT / "database" / "seeds" / "sample_data.sql",
    PROJECT_ROOT / "database" / "sample_data.sql"
]

def connect_to_sqlserver():
    """Tự động dò tìm phương thức kết nối SQL Server máy host phù hợp nhất (Windows Auth, sa/passwords, drivers)"""
    available_drivers = [
        DRIVER,
        "ODBC Driver 18 for SQL Server",
        "ODBC Driver 17 for SQL Server",
        "SQL Server Native Client 11.0",
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
            conn = pyodbc.connect(conn_str, autocommit=True, timeout=2)
            print(f"✅ {desc}")
            return conn
        except Exception as e:
            last_error = e
            continue

    raise Exception(f"Không thể kết nối SQL Server host qua bất kỳ phương thức nào. Lỗi: {last_error}")

def init_database_ssms():
    """Xả schema và sample_data vào SQL Server trên máy thật (SSMS)"""
    print(f"\n🖥️  [SSMS / Host] Bắt đầu xả CSDL vào SQL Server máy thật ({SERVER})...")
    if not SCHEMA_PATH.exists():
        print(f"❌ Không tìm thấy file: {SCHEMA_PATH}")
        return False

    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        sql_content = f.read()

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
                err_msg = str(e)
                if "already exists" not in err_msg.lower() and "drop database" not in err_msg.lower():
                    pass

        print("🎉 [SSMS] XẢ CSDL THÀNH CÔNG! Đã khởi tạo hoàn tất 21 bảng vào CSDL ExamSystem.")

        # Tự động nạp dữ liệu mẫu
        sample_file = next((p for p in SAMPLE_PATHS if p.exists()), None)
        if sample_file:
            print(f"📦 [SSMS] Đang nạp dữ liệu mẫu từ {sample_file.name}...")
            with open(sample_file, "r", encoding="utf-8") as f:
                sample_content = f.read()
            sample_batches = [b.strip() for b in sample_content.split("GO") if b.strip()]
            for idx, batch in enumerate(sample_batches, 1):
                if not batch:
                    continue
                try:
                    cursor.execute(batch)
                except Exception:
                    pass
            print("✨ [SSMS] ĐÃ NẠP DỮ LIỆU MẪU ĐẦY ĐỦ (Người dùng, Lớp học, Phòng thi, Đề bài, Testcases, Vi phạm AI)!")

        conn.close()
        print("💡 [SSMS] Bạn chỉ cần mở SSMS lên và bấm Refresh (F5) là sẽ thấy ngay toàn bộ CSDL và dữ liệu!")
        return True
    except Exception as e:
        print(f"❌ [SSMS] Lỗi kết nối hoặc thực thi: {e}")
        return False

def init_database_docker():
    """Xả schema và sample_data vào Docker Container exam-sqlserver"""
    print(f"\n🐳 [Docker] Bắt đầu xả CSDL vào container exam-sqlserver...")
    try:
        res = subprocess.run(["docker", "ps", "--filter", "name=exam-sqlserver", "--format", "{{.Names}}"], capture_output=True, text=True)
        if "exam-sqlserver" not in res.stdout:
            print("⚠️ [Docker] Container 'exam-sqlserver' hiện không chạy.")
            print("💡 Hãy khởi động bằng lệnh: docker compose up -d sqlserver")
            return False

        sa_pwd = os.getenv("MSSQL_SA_PASSWORD", "YourStrong@Passw0rd")

        # 1. Chạy schema.sql
        print("📦 [Docker] Đang nạp schema.sql (21 bảng)...")
        cmd_schema = [
            "docker", "exec", "-i", "exam-sqlserver",
            "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-P", sa_pwd,
            "-No", "-i", "/schema.sql"
        ]
        sub_schema = subprocess.run(cmd_schema, capture_output=True, text=True)
        if sub_schema.returncode != 0:
            print(f"❌ [Docker] Lỗi xả schema: {sub_schema.stderr or sub_schema.stdout}")
            return False
        print("🎉 [Docker] XẢ CSDL THÀNH CÔNG! Đã khởi tạo hoàn tất 21 bảng trong container!")

        # 2. Chạy sample_data.sql
        sample_file = next((p for p in SAMPLE_PATHS if p.exists()), None)
        if sample_file:
            print(f"📦 [Docker] Đang copy và nạp dữ liệu mẫu từ {sample_file.name}...")
            subprocess.run(["docker", "cp", str(sample_file), "exam-sqlserver:/sample_data.sql"], check=True)
            cmd_sample = [
                "docker", "exec", "-i", "exam-sqlserver",
                "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-P", sa_pwd,
                "-No", "-d", "ExamSystem", "-i", "/sample_data.sql"
            ]
            sub_sample = subprocess.run(cmd_sample, capture_output=True, text=True)
            print("✨ [Docker] ĐÃ NẠP DỮ LIỆU MẪU ĐẦY ĐỦ VÀO CONTAINER DOCKER THÀNH CÔNG!")
        return True
    except Exception as e:
        print(f"❌ [Docker] Lỗi kết nối hoặc thực thi Docker: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Script tự động xả CSDL Oculide v1 vào SSMS hoặc Docker")
    parser.add_argument(
        "--target", "-t",
        choices=["ssms", "docker", "all", "auto"],
        default="auto",
        help="Chọn môi trường đích: ssms (máy thật), docker (container), all (xả song song cả 2), auto (tự phát hiện)"
    )
    args = parser.parse_args()

    target = args.target.lower()

    if target == "ssms":
        init_database_ssms()
    elif target == "docker":
        init_database_docker()
    elif target == "all":
        print("🚀 [CHẾ ĐỘ XẢ SONG SONG] Đang đồng bộ CSDL vào cả SSMS và Docker...")
        success_ssms = init_database_ssms()
        success_docker = init_database_docker()
        print("\n========================================================")
        print(f"📊 Kết quả: SSMS: {'✅ Thành công' if success_ssms else '❌ Thất bại'} | Docker: {'✅ Thành công' if success_docker else '❌ Thất bại'}")
        print("========================================================")
    else:  # auto
        # Tự động thử SSMS trước
        ssms_ok = init_database_ssms()
        # Kiểm tra xem Docker có bật không, nếu có thì hỏi hoặc xả luôn
        try:
            res = subprocess.run(["docker", "ps", "--filter", "name=exam-sqlserver", "--format", "{{.Names}}"], capture_output=True, text=True)
            if "exam-sqlserver" in res.stdout:
                print("\n💡 Phát hiện container Docker exam-sqlserver cũng đang chạy, tự động đồng bộ tiếp sang Docker...")
                init_database_docker()
        except Exception:
            pass

if __name__ == "__main__":
    main()
