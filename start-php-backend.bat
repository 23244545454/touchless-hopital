@echo off
title Touchless HMS — PHP & MySQL Backend Launcher
echo ======================================================
echo    Touchless Hospital Management System (PHP Backend)
echo ======================================================
echo.

where php >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\xampp2\php\php.exe" (
        set "PATH=C:\xampp2\php;%PATH%"
    ) else if exist "C:\xampp\php\php.exe" (
        set "PATH=C:\xampp\php;%PATH%"
    )
)

echo [OK] Starting PHP REST API & Web Server on port 3000...
start /B php -S localhost:3000 router.php
timeout /t 2 /nobreak >nul
start http://localhost:3000/dashboard-patient.html

echo.
echo ======================================================
echo Touchless HMS PHP Server is now running on:
echo http://localhost:3000
echo.
echo Connected to:
echo  - PHP API Endpoints in /api/
echo  - MySQL / MariaDB via PDO (XAMPP phpMyAdmin)
echo ======================================================
echo.
pause
