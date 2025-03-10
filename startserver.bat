@echo off
cd /d "C:\path\to\your\project" 
start "" cmd /k "npm start"
timeout /t 5 >nul
start http://localhost:3000/