@echo off
echo ========================================
echo    תיק השקעות - הרצת האפליקציה
echo ========================================
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo שגיאה: Node.js לא מותקן!
    echo הורד מ: https://nodejs.org
    pause
    exit /b 1
)

echo Node.js נמצא. מתחיל...
echo.

REM Start server in new window
start "Portfolio SERVER" cmd /k "cd /d "%~dp0server" && echo מתקין תלויות שרת... && npm install && echo. && echo השרת מופעל בhttp://localhost:3001 && npm run dev"

REM Wait 3 seconds then start client
timeout /t 3 /nobreak >nul

REM Start client in new window
start "Portfolio CLIENT" cmd /k "cd /d "%~dp0client" && echo מתקין תלויות קליינט... && npm install && echo. && echo הקליינט מופעל בhttp://localhost:5173 && npm run dev"

REM Wait for client to start then open browser
timeout /t 15 /nobreak >nul
start http://localhost:5173

echo.
echo האפליקציה אמורה להיפתח בדפדפן תוך כמה שניות.
echo אם לא נפתחה - גש ידנית ל: http://localhost:5173
echo.
