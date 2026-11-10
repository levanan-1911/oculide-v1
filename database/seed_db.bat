@echo off
chcp 65001 >nul
echo ==============================================================================
echo                 OCULIDE V1 - TỰ ĐỘNG XẢ CSDL VÀ DỮ LIỆU MẪU
echo ==============================================================================

set TARGET=%1
if "%TARGET%"=="" (
    echo Chọn môi trường bạn muốn xả CSDL:
    echo   [1] Chỉ xả vào SSMS (SQL Server trên máy thật Windows)
    echo   [2] Chỉ xả vào Docker Container (exam-sqlserver)
    echo   [3] Xả SONG SONG vào CẢ HAI (Đồng bộ SSMS + Docker)
    echo.
    set /p CHOICE="Nhập lựa chọn của bạn [1, 2 hoặc 3]: "
    if "%CHOICE%"=="1" set TARGET=ssms
    if "%CHOICE%"=="2" set TARGET=docker
    if "%CHOICE%"=="3" set TARGET=all
)

if "%TARGET%"=="" set TARGET=ssms

echo.
echo Đang thực hiện xả CSDL cho môi trường: [%TARGET%]...
echo.

if exist "..\backend\venv\Scripts\python.exe" (
    "..\backend\venv\Scripts\python.exe" "%~dp0init_db.py" --target %TARGET%
) else if exist "backend\venv\Scripts\python.exe" (
    "backend\venv\Scripts\python.exe" "%~dp0init_db.py" --target %TARGET%
) else (
    python "%~dp0init_db.py" --target %TARGET%
)

echo.
echo ==============================================================================
pause
