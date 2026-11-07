import os
from typing import List
import pyodbc
from dotenv import load_dotenv

load_dotenv()

try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator

    class Settings(BaseSettings):
        APP_NAME: str = "Oculide Core API"
        APP_VERSION: str = "1.0.0"
        API_V1_PREFIX: str = "/api/v1"
        DEBUG: bool = True

        @field_validator("DEBUG", mode="before")
        @classmethod
        def parse_debug(cls, v):
            if isinstance(v, str):
                return v.strip().lower() in ("true", "1", "t", "yes", "y", "debug")
            return bool(v)

        DATABASE_DRIVER: str = "ODBC Driver 18 for SQL Server"
        DATABASE_SERVER: str = "localhost"
        DATABASE_NAME: str = "ExamSystem"
        DATABASE_USERNAME: str = "sa"
        DATABASE_PASSWORD: str = "YourStrong@Passw0rd"
        DATABASE_ENCRYPT: str = "yes"
        DATABASE_TRUST_SERVER: str = "yes"
        DATABASE_CONNECTION_TIMEOUT: int = 30

        JWT_SECRET_KEY: str = "oculide-secret-key-change-in-production-2026"
        JWT_ALGORITHM: str = "HS256"
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

        REDIS_HOST: str = "localhost"
        REDIS_PORT: int = 6379
        REDIS_PASSWORD: str = ""
        REDIS_DB: int = 0

        LIVEKIT_URL: str = "wss://oculide-exam-4eu7af2s.livekit.cloud"
        LIVEKIT_API_KEY: str = "devkey"
        LIVEKIT_API_SECRET: str = "secret"

        CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173,https://oculide.id.vn,https://api.oculide.id.vn"

        GOOGLE_CLIENT_ID: str = ""
        GOOGLE_CLIENT_SECRET: str = ""
        GITHUB_CLIENT_ID: str = ""
        GITHUB_CLIENT_SECRET: str = ""

        SANDBOX_MEM_LIMIT: str = "128m"
        SANDBOX_TIME_LIMIT_S: int = 10
        SANDBOX_NANO_CPUS: int = 500000000

        # SMTP & Email Settings (Brevo / Sendinblue Relay default)
        SMTP_HOST: str = "smtp-relay.brevo.com"
        SMTP_PORT: int = 587
        SMTP_USER: str = ""
        SMTP_PASSWORD: str = ""
        SMTP_FROM_NAME: str = "Hệ thống Khảo thí Oculide"
        SMTP_FROM_EMAIL: str = ""
        SMTP_TLS: bool = True
        FRONTEND_URL: str = "http://localhost:3000"

        class Config:
            env_file = ".env"
            case_sensitive = True
            extra = "allow"
except ImportError:
    from pydantic import BaseModel
    class Settings(BaseModel):
        APP_NAME: str = os.getenv("APP_NAME", "Oculide Core API")
        APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
        API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
        DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

        DATABASE_DRIVER: str = os.getenv("DATABASE_DRIVER", "ODBC Driver 18 for SQL Server")
        DATABASE_SERVER: str = os.getenv("DATABASE_SERVER", "localhost")
        DATABASE_NAME: str = os.getenv("DATABASE_NAME", "ExamSystem")
        DATABASE_USERNAME: str = os.getenv("DATABASE_USERNAME", "sa")
        DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD", "YourStrong@Passw0rd")
        DATABASE_ENCRYPT: str = os.getenv("DATABASE_ENCRYPT", "yes")
        DATABASE_TRUST_SERVER: str = os.getenv("DATABASE_TRUST_SERVER", "yes")
        DATABASE_CONNECTION_TIMEOUT: int = int(os.getenv("DATABASE_CONNECTION_TIMEOUT", "30"))

        JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "oculide-secret-key-change-in-production-2026")
        JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
        JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

        REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
        REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
        REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

        LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "wss://oculide-exam-4eu7af2s.livekit.cloud")
        LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "devkey")
        LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "secret")

        CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001,http://localhost:5173,https://oculide.id.vn,https://api.oculide.id.vn")

        GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
        GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
        GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
        GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

        SANDBOX_MEM_LIMIT: str = os.getenv("SANDBOX_MEM_LIMIT", "128m")
        SANDBOX_TIME_LIMIT_S: int = int(os.getenv("SANDBOX_TIME_LIMIT_S", "10"))
        SANDBOX_NANO_CPUS: int = int(os.getenv("SANDBOX_NANO_CPUS", "500000000"))

        # SMTP & Email Settings (Brevo / Sendinblue Relay default)
        SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp-relay.brevo.com")
        SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
        SMTP_USER: str = os.getenv("SMTP_USER", "")
        SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
        SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "Hệ thống Khảo thí Oculide")
        SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
        SMTP_TLS: bool = os.getenv("SMTP_TLS", "True").lower() == "true"
        FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

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
