@echo off
chcp 65001 >nul
title Oculide - Dung He Thong
color 0C

echo ==============================================================================
echo                 DUNG TOAN BO HE THONG OCULIDE
echo ==============================================================================
echo.

cd /d "%~dp0"

echo [*] Dang tat cac container Docker...
docker-compose stop

echo [*] Dang tat tien trinh Cloudflare Tunnel...
taskkill /f /im cloudflared.exe >nul 2>&1

echo.
echo [OK] He thong da duoc dung an toan de tiet kiem pin va RAM!
echo.
pause
