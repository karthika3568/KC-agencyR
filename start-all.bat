@echo off
echo ========================================================
echo Starting KC Agency POS (Backend + Frontend)
echo ========================================================
start "KC Agency - Backend (8080)" cmd /k "cd /d %~dp0backend && php -S 127.0.0.1:8080 -t public public/index.php"
start "KC Agency - Frontend (5173)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Backend and Frontend have been launched in separate windows.
