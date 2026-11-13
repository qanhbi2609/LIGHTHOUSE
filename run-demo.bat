@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
set DEMO_ONLY=1
echo ===============================================
echo  LIGHTHOUSE - UC01-U11 - ban kiem thu localhost
 echo  Truy cap: http://localhost:3000
 echo  Dong cua so nay de tat server.
echo ===============================================
node server.js
pause
