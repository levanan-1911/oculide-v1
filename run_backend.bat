@echo off
chcp 65001 >nul
title Oculide - Backend Local Server (No Docker)

echo ===========================================================s===================
echo [Oculide] Khởi động Backend API chế độ Local (Không dùng Docker)
echo ==============================================================================

cd /d "%~dp0backend"

if not exist "venv\Scripts\activate.bat" (
    echo [Oculide] Chưa tìm thấy môi trường ảo venv. Đang tự động tạo...
    python -m venv venv
    if errorlevel 1 (
        echo [Lỗi] Không thể tạo virtualenv. Vui lòng kiểm tra cài đặt Python!
        pause
        exit /b 1
    )
    echo [Oculide] Đang cài đặt thư viện từ requirements.txt (chỉ cần làm 1 lần)...
    call venv\Scripts\activate.bat
    pip install --upgrade pip
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo.
echo [Oculide] Đang khởi chạy Uvicorn Server tại http://localhost:8000 ...
echo [Oculide] Tài liệu API Swagger: http://localhost:8000/docs
echo [Oculide] Nhấn Ctrl+C để dừng server.
echo ==============================================================================
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
