@echo off
cd /d "%~dp0"
echo Starting Vite React Frontend for AI Chat With PDF...
cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)
npm run dev
pause
