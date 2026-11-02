@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "Màn Sao Server" /min cmd /k "cd /d ""%~dp0"" && npx --yes http-server . -p 4173 -c-1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/"
exit
