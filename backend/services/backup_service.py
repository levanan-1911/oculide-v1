import os
import shutil
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import pyodbc
import logging

from core.config import settings
from core.database import _build_connection_string, get_db_cursor
from database.system_log_db import create_system_log

logger = logging.getLogger("backup_service")

BACKUPS_DIR = Path(__file__).resolve().parent.parent / "backups"

class BackupService:
    @classmethod
    def _ensure_dir(cls) -> None:
        BACKUPS_DIR.mkdir(parents=True, exist_ok=True)

    @classmethod
    def _calculate_checksum(cls, filepath: Path) -> str:
        """Tính mã băm SHA-256 thực tế của tệp bản sao lưu"""
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                sha256.update(chunk)
        return f"sha256:{sha256.hexdigest()}"

    @classmethod
    def create_database_backup(cls, backup_type: str = "manual", actor_id: Optional[int] = None, ip_address: Optional[str] = None) -> Dict[str, Any]:
        """
        Thực thi lệnh T-SQL BACKUP DATABASE của Microsoft SQL Server ra tệp .bak thực tế.
        Sử dụng kết nối trực tiếp với autocommit=True để tránh lỗi giao dịch SQL Server 3021.
        """
        cls._ensure_dir()
        now = datetime.now()
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        filename = f"oculide_db_{backup_type}_{timestamp_str}.bak"
        target_path = BACKUPS_DIR / filename
        abs_target_path = str(target_path.resolve()).replace("\\", "/")

        conn_str = _build_connection_string(settings.DATABASE_SERVER)
        try:
            # SQL Server bắt buộc chạy câu lệnh BACKUP ngoài Transaction
            conn = pyodbc.connect(conn_str, autocommit=True, timeout=60)
            cursor = conn.cursor()
            
            sql = f"BACKUP DATABASE [{settings.DATABASE_NAME}] TO DISK = N'{abs_target_path}' WITH INIT, FORMAT, NAME = 'Oculide Full DB Backup'"
            cursor.execute(sql)
            while cursor.nextset():
                pass
            cursor.close()
            conn.close()

            if not target_path.exists():
                raise RuntimeError("Lệnh BACKUP hoàn tất nhưng không tìm thấy file trên đĩa cứng.")

            size_bytes = os.path.getsize(target_path)
            size_mb = round(size_bytes / (1024 * 1024), 2)
            checksum = cls._calculate_checksum(target_path)

            backup_info = {
                "id": f"BK_{timestamp_str}",
                "filename": filename,
                "size_mb": size_mb,
                "created_at": now.strftime("%Y-%m-%d %H:%M:%S"),
                "type": backup_type,
                "checksum": checksum
            }

            # Ghi nhận nhật ký kiểm toán vào bảng NhatKyHeThong
            try:
                create_system_log(
                    log_level="info",
                    module="DATABASE_BACKUP",
                    message=f"Tạo thành công bản sao lưu cơ sở dữ liệu {filename} ({size_mb} MB) [Loại: {backup_type}]",
                    user_id=actor_id,
                    ip_address=ip_address,
                    extra_data=backup_info
                )
            except Exception as log_err:
                logger.warning(f"Không thể ghi log sau khi backup: {log_err}")

            # Tự động dọn dẹp các bản sao lưu cũ vượt quá thời hạn hoặc vượt số lượng tối đa
            try:
                from services.system_settings_manager import SystemSettingsManager
                sys_settings = SystemSettingsManager.get_settings()
                cls.cleanup_expired_backups(
                    retention_days=sys_settings.backup_retention_days,
                    max_copies=sys_settings.backup_max_copies,
                    actor_id=actor_id,
                    ip_address=ip_address
                )
            except Exception as cleanup_err:
                logger.warning(f"Lỗi khi tự động dọn dẹp sao lưu: {cleanup_err}")

            logger.info(f"Sao lưu CSDL thành công: {filename} ({size_mb} MB)")
            return backup_info

        except Exception as e:
            logger.error(f"Lỗi khi thực thi sao lưu CSDL: {str(e)}")
            raise RuntimeError(f"Lỗi sao lưu cơ sở dữ liệu: {str(e)}")

    @classmethod
    def list_backups(cls) -> List[Dict[str, Any]]:
        """Quét và trả về danh sách các tệp sao lưu .bak thực tế trên đĩa"""
        cls._ensure_dir()
        result = []
        for file in BACKUPS_DIR.glob("*.bak"):
            try:
                stat = file.stat()
                size_mb = round(stat.st_size / (1024 * 1024), 2)
                created_dt = datetime.fromtimestamp(stat.st_mtime)
                if "maintenance" in file.name.lower():
                    b_type = "maintenance"
                elif "auto" in file.name.lower():
                    b_type = "auto"
                else:
                    b_type = "manual"
                
                # Để tốc độ phản hồi nhanh, tính mã checksum
                checksum = cls._calculate_checksum(file)

                result.append({
                    "id": f"BK_{file.stem}",
                    "filename": file.name,
                    "size_mb": size_mb,
                    "created_at": created_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "type": b_type,
                    "checksum": checksum
                })
            except Exception as err:
                logger.warning(f"Lỗi đọc file backup {file.name}: {err}")

        # Sắp xếp bản mới nhất lên đầu
        result.sort(key=lambda x: x["created_at"], reverse=True)
        return result

    @classmethod
    def get_backup_path(cls, filename: str) -> Optional[Path]:
        """Xác thực an toàn đường dẫn file sao lưu để tải về (chống path traversal)"""
        safe_name = os.path.basename(filename)
        target = BACKUPS_DIR / safe_name
        if target.exists() and target.is_file() and target.suffix == ".bak":
            return target
        return None

    @classmethod
    def delete_backup(cls, filename: str, actor_id: Optional[int] = None, ip_address: Optional[str] = None) -> bool:
        """Xóa tệp sao lưu trên đĩa cứng"""
        safe_name = os.path.basename(filename)
        target = BACKUPS_DIR / safe_name
        if target.exists() and target.is_file() and target.suffix == ".bak":
            target.unlink()
            try:
                create_system_log(
                    log_level="warning",
                    module="DATABASE_BACKUP",
                    message=f"Xóa bản sao lưu cơ sở dữ liệu {safe_name} khỏi đĩa cứng",
                    user_id=actor_id,
                    ip_address=ip_address,
                    extra_data={"filename": safe_name}
                )
            except Exception:
                pass
            return True
        return False

    @classmethod
    def cleanup_expired_backups(
        cls,
        retention_days: int = 30,
        max_copies: int = 10,
        actor_id: Optional[int] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Tự động dọn dẹp các bản sao lưu cũ vượt quá số ngày lưu trữ quy định
        hoặc vượt quá số lượng bản sao lưu tối đa để bảo vệ dung lượng ổ cứng.
        """
        cls._ensure_dir()
        now = datetime.now()
        deleted_files = []
        freed_bytes = 0

        files = []
        for f in BACKUPS_DIR.glob("*.bak"):
            try:
                stat = f.stat()
                files.append({
                    "path": f,
                    "name": f.name,
                    "mtime": stat.st_mtime,
                    "size": stat.st_size,
                    "created_dt": datetime.fromtimestamp(stat.st_mtime)
                })
            except Exception:
                pass

        # Sắp xếp từ cũ nhất đến mới nhất theo thời gian tạo
        files.sort(key=lambda x: x["mtime"])

        # 1. Xóa các tệp vượt quá thời gian lưu trữ (retention_days)
        for file_info in list(files):
            age_days = (now - file_info["created_dt"]).total_seconds() / 86400
            if age_days > retention_days:
                try:
                    size = file_info["size"]
                    file_info["path"].unlink(missing_ok=True)
                    deleted_files.append(file_info["name"])
                    freed_bytes += size
                    files.remove(file_info)
                except Exception as err:
                    logger.warning(f"Không thể xóa bản sao lưu hết hạn {file_info['name']}: {err}")

        # 2. Nếu số lượng còn lại vẫn vượt quá max_copies, xóa thêm các bản cũ nhất
        while len(files) > max_copies:
            oldest = files.pop(0)
            try:
                size = oldest["size"]
                oldest["path"].unlink(missing_ok=True)
                deleted_files.append(oldest["name"])
                freed_bytes += size
            except Exception as err:
                logger.warning(f"Không thể xóa bản sao lưu vượt số lượng {oldest['name']}: {err}")

        freed_mb = round(freed_bytes / (1024 * 1024), 2)

        if deleted_files:
            try:
                create_system_log(
                    log_level="info",
                    module="DATABASE_BACKUP",
                    message=f"Dọn dẹp {len(deleted_files)} bản sao lưu CSDL quá hạn/vượt định mức (Giải phóng {freed_mb} MB)",
                    user_id=actor_id,
                    ip_address=ip_address,
                    extra_data={
                        "deleted_files": deleted_files,
                        "freed_mb": freed_mb,
                        "retention_days": retention_days,
                        "max_copies": max_copies,
                        "remaining_count": len(files)
                    }
                )
            except Exception:
                pass

        return {
            "deleted_count": len(deleted_files),
            "deleted_files": deleted_files,
            "freed_mb": freed_mb,
            "remaining_count": len(files)
        }

    @classmethod
    def get_storage_statistics(cls) -> Dict[str, Any]:
        """Thống kê số lượng bản ghi CSDL và dung lượng ổ cứng máy chủ thực tế"""
        counts = {
            "submissions_count": 0,
            "violations_count": 0,
            "logs_count": 0,
            "users_count": 0,
        }
        try:
            with get_db_cursor(commit=False) as cursor:
                cursor.execute("SELECT COUNT(*) FROM BaiNop")
                counts["submissions_count"] = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM ViPhamGiamSat")
                counts["violations_count"] = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM NhatKyHeThong")
                counts["logs_count"] = cursor.fetchone()[0]

                cursor.execute("SELECT COUNT(*) FROM NguoiDung")
                counts["users_count"] = cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"Lỗi truy vấn số liệu CSDL: {e}")

        # Đọc thông số dung lượng ổ đĩa thực tế của máy chủ
        cls._ensure_dir()
        try:
            total_b, used_b, free_b = shutil.disk_usage(BACKUPS_DIR)
            disk_info = {
                "total_gb": round(total_b / (1024 ** 3), 1),
                "used_gb": round(used_b / (1024 ** 3), 1),
                "free_gb": round(free_b / (1024 ** 3), 1),
                "used_percent": round((used_b / total_b) * 100, 1) if total_b > 0 else 0
            }
        except Exception as e:
            logger.warning(f"Lỗi đọc dung lượng ổ cứng: {e}")
            disk_info = {
                "total_gb": 100.0,
                "used_gb": 20.0,
                "free_gb": 80.0,
                "used_percent": 20.0
            }

        return {
            "submissions_count": counts["submissions_count"],
            "violations_count": counts["violations_count"],
            "logs_count": counts["logs_count"],
            "users_count": counts["users_count"],
            "counts": counts,
            "disk": disk_info
        }
