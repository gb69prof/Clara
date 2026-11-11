@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js non trovato. Occorre Node.js 22.13 o successivo.
  pause
  exit /b 1
)
echo Clara bis - archivio locale persistente
echo Apri nel browser: http://127.0.0.1:4177/
echo Tieni aperta questa finestra mentre usi Clara bis.
start "" "http://127.0.0.1:4177/"
node scripts\local-server.mjs
if errorlevel 1 pause
