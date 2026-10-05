@echo off
title Touchless HMS — Leap Motion Launcher
echo ======================================================
echo    Touchless Hospital Management System (Leap Motion)
echo ======================================================
echo.
echo Starting local web server on http://localhost:3000 ...
start /B node server.js
timeout /t 2 /nobreak >nul
echo Opening Touchless HMS in your default browser...
start http://localhost:3000/demo.html
echo.
echo Server is running! Keep this window open while using the system.
echo Press Ctrl+C to stop the server.
echo.
pause
