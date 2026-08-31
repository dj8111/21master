@echo off
title 21Master Local Server
echo ========================================================
echo   21Master - Local Web Server
echo ========================================================
echo.
echo [1/2] Opening browser at http://localhost:8080/ ...
start http://localhost:8080/
echo.
echo [2/2] Server running on http://localhost:8080/
echo (Please keep this window open while using 21Master)
echo ========================================================
python -m http.server 8080
if %errorlevel% neq 0 (
    py -m http.server 8080
)
pause
