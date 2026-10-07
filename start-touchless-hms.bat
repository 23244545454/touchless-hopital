@echo off
title Touchless HMS — Leap Motion Launcher
echo ======================================================
echo    Touchless Hospital Management System (Leap Motion)
echo ======================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Node.js detected! Starting local server on port 3000...
    start /B node server.js
    timeout /t 2 /nobreak >nul
    start http://localhost:3000/demo.html
    goto RUNNING
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Python detected! Starting local server on port 3000...
    start /B python -m http.server 3000
    timeout /t 2 /nobreak >nul
    start http://localhost:3000/demo.html
    goto RUNNING
)

echo [INFO] Opening directly in your default browser...
start demo.html

:RUNNING
echo.
echo ======================================================
echo Touchless HMS is now running!
echo.
echo LEAP MOTION CHECKLIST:
echo  1. Leap Motion software (Orion 4.1.0) installed
echo  2. Leap Motion LM-010 device plugged into USB
echo  3. "Allow Web Apps" checked in Leap Control Panel
echo ======================================================
echo.
pause
