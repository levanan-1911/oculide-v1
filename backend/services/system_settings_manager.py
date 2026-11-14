import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from schemas.system_management import SystemSettingsModel, PublicConfigResponse

logger = logging.getLogger("system_settings_manager")

SETTINGS_DIR = Path(__file__).resolve().parent.parent / "data"
SETTINGS_FILE = SETTINGS_DIR / "system_settings.json"

DEFAULT_SYSTEM_SETTINGS: Dict[str, Any] = {
    "max_code_file_size_mb": 2,
    "max_sandbox_workers": 4,
    "max_livekit_bitrate_kbps": 350,
    "auto_cleanup_drafts_days": 30,
    "audit_log_retention_days": 90,
    "allowed_email_domain": "@school.edu.vn",
    "max_login_attempts": 5,
    "jwt_token_expiry_minutes": 60,
    "maintenance_mode": False,
    "maintenance_message": "Hệ thống Oculide đang được bảo trì định kỳ bởi Trung tâm CNTT. Vui lòng quay lại sau ít phút.",
    "updated_at": None,
    "updated_by": None
}

class SystemSettingsManager:
    _cached_settings: Optional[SystemSettingsModel] = None

    @classmethod
    def _ensure_dir_and_file(cls) -> None:
        SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
        if not SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SYSTEM_SETTINGS, f, ensure_ascii=False, indent=2)

    @classmethod
    def get_settings(cls) -> SystemSettingsModel:
        if cls._cached_settings is not None:
            return cls._cached_settings

        cls._ensure_dir_and_file()
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            merged = {**DEFAULT_SYSTEM_SETTINGS, **data}
            cls._cached_settings = SystemSettingsModel(**merged)
        except Exception as e:
            logger.error(f"Lỗi khi đọc file cấu hình hệ thống: {e}. Sử dụng cấu hình mặc định.")
            cls._cached_settings = SystemSettingsModel(**DEFAULT_SYSTEM_SETTINGS)

        return cls._cached_settings

    @classmethod
    def update_settings(cls, new_data: Dict[str, Any], updated_by: str = "admin") -> SystemSettingsModel:
        cls._ensure_dir_and_file()
        current = cls.get_settings().model_dump()
        current.update(new_data)
        current["updated_at"] = datetime.now().isoformat()
        current["updated_by"] = updated_by

        validated = SystemSettingsModel(**current)

        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(validated.model_dump(), f, ensure_ascii=False, indent=2)

        cls._cached_settings = validated
        logger.info(f"Đã cập nhật cấu hình hệ thống bởi {updated_by}: {validated.model_dump()}")
        return validated

    @classmethod
    def reset_settings(cls, updated_by: str = "admin") -> SystemSettingsModel:
        cls._ensure_dir_and_file()
        reset_data = dict(DEFAULT_SYSTEM_SETTINGS)
        reset_data["updated_at"] = datetime.now().isoformat()
        reset_data["updated_by"] = updated_by

        validated = SystemSettingsModel(**reset_data)
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(validated.model_dump(), f, ensure_ascii=False, indent=2)

        cls._cached_settings = validated
        logger.info(f"Đã khôi phục cấu hình hệ thống về mặc định bởi {updated_by}")
        return validated

    @classmethod
    def get_public_config(cls) -> PublicConfigResponse:
        settings = cls.get_settings()
        return PublicConfigResponse(
            maintenance_mode=settings.maintenance_mode,
            maintenance_message=settings.maintenance_message,
            allowed_email_domain=settings.allowed_email_domain
        )
