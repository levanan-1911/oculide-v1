from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SystemSettingsModel(BaseModel):
    max_code_file_size_mb: int = Field(2, ge=1, le=20, description="Dung lượng file code tối đa (MB)")
    max_sandbox_workers: int = Field(4, ge=1, le=16, description="Số Sandbox Worker đồng thời tối đa")
    max_livekit_bitrate_kbps: int = Field(350, ge=100, le=1500, description="Băng thông Video tối đa mỗi luồng (kbps)")
    auto_cleanup_drafts_days: int = Field(30, ge=1, le=365, description="Số ngày tự động dọn dẹp bản nháp code")
    audit_log_retention_days: int = Field(90, ge=15, le=365, description="Số ngày lưu trữ nhật ký kiểm toán")
    allowed_email_domain: str = Field("@school.edu.vn", description="Tên miền email trường cho phép")
    max_login_attempts: int = Field(5, ge=3, le=20, description="Số lần đăng nhập sai tối đa trước khi khóa")
    jwt_token_expiry_minutes: int = Field(60, ge=15, le=1440, description="Thời hạn token phiên làm việc (phút)")
    maintenance_mode: bool = Field(False, description="Chế độ bảo trì hệ thống")
    maintenance_message: str = Field(
        "Hệ thống Oculide đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.",
        description="Thông báo hiển thị khi bảo trì"
    )
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

