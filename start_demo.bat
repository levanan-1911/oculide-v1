@echo off
chcp 65001 >nul
title Oculide - Khoi Dong He Thong Bao Cao & Demo
color 0A

echo ==============================================================================
echo       OCULIDE - HE THONG KHAO THI & GIAM SAT THI TRUC TUYEN BANG AI
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Kiem tra Docker Desktop
echo [*] 1/3. Dang kiem tra Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo [CANH BAO] Docker Desktop chua duoc bat hoac chua san sang!
    echo Vui long mo ung dung Docker Desktop tren Windows va doi bieu tuong ca voi chuyen xanh, sau do chay lai file nay.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker Desktop dang hoat dong tot.

:: 2. Khoi dong toan bo Container Docker
echo.
echo [*] 2/3. Dang khoi dong cac Container Docker (Database, Redis, Backend, Workers, Frontend)...
docker-compose up -d
if errorlevel 1 (
    echo [LOI] Khong the khoi dong Docker Compose. Vui long kiem tra log.
    pause
    exit /b 1
)
echo [OK] Toan bo 6/6 container Docker da duoc khoi dong.

:: 3. Kiem tra va chay Cloudflare Tunnel
echo.
echo [*] 3/3. Dang kiem tra Cloudflare Tunnel (https://oculide.id.vn)...
tasklist /fi "imagename eq cloudflared.exe" | findstr /i "cloudflared.exe" >nul
if errorlevel 1 (
    echo [*] Dang khoi chay Cloudflare Tunnel trong tien trinh ngam...
    start /min "Cloudflare Tunnel (oculide.id.vn)" "D:\Oculide\cloudflared.exe" tunnel run oculide-tunnel
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Cloudflare Tunnel da dang chay san.
)

:: 4. Thong tin tai khoan demo
echo.
echo ==============================================================================
echo                     HE THONG DA SAN SANG DE BAO CAO!
echo ==============================================================================
echo  - Ten mien chinh thuc (HTTPS):  https://oculide.id.vn
echo  - API & Swagger Docs:            https://api.oculide.id.vn/docs
echo  - Du phong noi bo (Offline):     http://localhost:3000
echo.
echo  --- TAI KHOAN DANG NHAP DEMO (Mat khau tat ca deu la: admin123) ---
echo   [1] Quan tri vien (Admin):       username: admin       (MK: admin123)
echo   [2] Giang vien (Instructor):     username: instructor  (MK: admin123)
echo   [3] Sinh vien (Student):         username: student     (MK: admin123)
echo   [4] Sinh vien 2 (Student 2):     username: levanan13   (MK: admin123)
echo ==============================================================================
echo.
echo Dang tu dong mo trinh duyet den https://oculide.id.vn ...
start https://oculide.id.vn
echo.
echo Nhan phim bat ky de dong cua so nay (He thong van tiep tuc chay trong Docker ngam).
pause >nul
