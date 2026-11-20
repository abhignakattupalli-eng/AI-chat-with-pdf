@echo off
cd /d "%~dp0"
echo Starting FastAPI Backend for AI Chat With PDF...
if exist "venv\Scripts\python.exe" (
    cd backend
    "..\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo Virtual environment not found. Creating one...
    python -m venv venv
    venv\Scripts\pip.exe install -r backend\requirements.txt
    cd backend
    "..\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause
