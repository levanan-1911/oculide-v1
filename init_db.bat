@echo off
chcp 65001 >nul
title Oculide - Khoi tao Co So Du Lieu ExamSystem
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\init_db.ps1"
echo.
pause
