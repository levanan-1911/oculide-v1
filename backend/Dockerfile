# ==============================================================================
# Dockerfile - Oculide Core API & Celery Grading Worker (Lean Image)
# Base: Python 3.11 Slim Bookworm + Microsoft ODBC Driver 18 + Docker CLI
# ==============================================================================

FROM python:3.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# 1. Cài đặt các công cụ hệ thống cần thiết và Microsoft ODBC Driver 18 cho SQL Server
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg2 \
    apt-transport-https \
    ca-certificates \
    gcc \
    g++ \
    unixodbc-dev \
    && mkdir -p /etc/apt/keyrings \
    # Thêm Microsoft Package Signing Key cho Debian 12
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/mssql-release.list \
    # Thêm Docker Official GPG Key để cài đặt docker-ce-cli (cho phép Celery điều khiển docker socket)
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
    msodbcsql18 \
    docker-ce-cli \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Cài đặt Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Sao chép mã nguồn backend
COPY . /app

# 4. Tạo thư mục lưu trữ tĩnh cho uploads và webcam snapshots
RUN mkdir -p /app/uploads/snapshots

EXPOSE 8000

# Khởi chạy FastAPI Server mặc định
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
