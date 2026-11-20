@echo off
cd /d "%~dp0"
echo Starting FastAPI Backend for AI Chat With PDF...
"..\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
