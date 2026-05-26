@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "c:\Users\Navi\Downloads\mykiranam.in-main\mykiranam.in-main"

echo [STARTING BACKEND]
start /B "" cmd /c "cd backend && npm run dev > backend.log 2>&1"

echo [STARTING FRONTEND]
start /B "" cmd /c "cd frontend && npm run dev > frontend.log 2>&1"

echo [DONE]
