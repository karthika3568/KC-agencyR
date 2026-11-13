@echo off
title KC Agency - PHP Backend Server (Port 8080)
echo ========================================================
echo Starting KC Agency PHP Backend on http://127.0.0.1:8080
echo ========================================================
cd /d "%~dp0backend"
php -S 127.0.0.1:8080 -t public public/index.php
pause
