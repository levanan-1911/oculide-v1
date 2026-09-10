import os
from pydantic_settings import BaseSettings
from typing import List
import pyodbc

class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "Oculide Core API"
    APP_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database (SQL Server - ExamSystem)
    DATABASE_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DATABASE_SERVER: str = "localhost"
    DATABASE_NAME: str = "ExamSystem"
    DATABASE_USERNAME: str = "sa"
    DATABASE_PASSWORD: str = "YourStrong@Passw0rd"
    DATABASE_ENCRYPT: str = "yes"
    DATABASE_TRUST_SERVER: str = "yes"
    DATABASE_CONNECTION_TIMEOUT: int = 30

    # JWT Authentication
    JWT_SECRET_KEY: str = "oculide-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Redis Cache & Message Broker
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # LiveKit WebRTC SFU Streaming
    LIVEKIT_URL: str = "wss://oculide-exam-4eu7af2s.livekit.cloud"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret"

    # CORS Origins (Comma-separated)
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173,https://oculide.id.vn,https://api.oculide.id.vn"

    # OAuth2 Providers
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Docker Code Sandbox Limits
    SANDBOX_MEM_LIMIT: str = "128m"
    SANDBOX_TIME_LIMIT_S: int = 10
    SANDBOX_NANO_CPUS: int = 500000000

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()

def get_cors_origins() -> List[str]:
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

def get_db_connection():
    """
    Lấy kết nối từ SQLAlchemy QueuePool trong core.database.
    Giúp tái sử dụng kết nối TCP, giảm độ trễ và triệt tiêu socket exhaustion.
    """
    from core.database import get_db_connection as _get_pooled_conn
    return _get_pooled_conn()
