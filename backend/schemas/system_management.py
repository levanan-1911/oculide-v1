from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SystemSettingsModel(BaseModel):
    max_code_file_size_mb: int = Field(2, ge=1, le=20, description="Dung lượng file code tối đa (MB)")
    max_sandbox_workers: int = Field(4, ge=1, le=16, description="Số Sandbox Worker đồng thời tối đa")
    max_livekit_bitrate_kbps: int = Field(350, ge=100, le=1500, description="Băng thông Video tối đa mỗi luồng (kbps)")
    auto_cleanup_drafts_days: int = Field(30, ge=1, le=365, description="Số ngày tự động dọn dẹp bản nháp code")
    audit_log_retention_days: int = Field(90, ge=15, le=365, description="Số ngày lưu trữ nhật ký kiểm toán")
    allowed_email_domain: str = Field(
        "",
        description="Tên miền email cho phép do Admin cấu hình (để trống nếu cho phép mọi domain hợp lệ, hoặc nhập danh sách cách nhau bởi dấu phẩy e.g. @school.edu.vn, @dtu.edu.vn)"
    )
    max_login_attempts: int = Field(5, ge=3, le=20, description="Số lần đăng nhập sai tối đa trước khi khóa")
    jwt_token_expiry_minutes: int = Field(45, ge=15, le=1440, description="Thời hạn token phiên làm việc (phút)")
    maintenance_mode: bool = Field(False, description="Chế độ bảo trì hệ thống")
    maintenance_message: str = Field(
        "Hệ thống Oculide đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.",
        description="Thông báo hiển thị khi bảo trì"
    )
    backup_schedule_enabled: bool = Field(True, description="Bật tự động sao lưu theo lịch")
    backup_frequency: str = Field("daily", description="Tần suất sao lưu định kỳ: daily (hàng ngày), weekly (hàng tuần)")
    backup_time: str = Field("02:00", description="Khung giờ thực hiện sao lưu định kỳ (HH:MM)")
    backup_on_maintenance: bool = Field(True, description="Tự động sao lưu CSDL khi kích hoạt chế độ bảo trì")
    backup_retention_days: int = Field(30, ge=3, le=365, description="Thời gian lưu trữ bản sao lưu trước khi xóa (ngày)")
    backup_max_copies: int = Field(10, ge=2, le=50, description="Số lượng bản sao lưu tối đa được giữ lại")
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None

class PublicConfigResponse(BaseModel):
    maintenance_mode: bool
    maintenance_message: str
    allowed_email_domain: str

class BackupItemResponse(BaseModel):
    id: str
    filename: str
    size_mb: float
    created_at: str
    type: str  # 'manual' | 'auto'
    checksum: str

class BackupListResponse(BaseModel):
    total: int
    backups: List[BackupItemResponse]

class BackupCreateResponse(BaseModel):
    message: str
    backup: BackupItemResponse

class BackupCleanupResponse(BaseModel):
    message: str
    deleted_count: int
    freed_mb: float
    remaining_count: int

class DiskStorageInfo(BaseModel):
    total_gb: float
    used_gb: float
    free_gb: float
    used_percent: float

class StorageStatsResponse(BaseModel):
    submissions_count: int
    violations_count: int
    logs_count: int
    users_count: int
    counts: Dict[str, int]
    disk: DiskStorageInfo

