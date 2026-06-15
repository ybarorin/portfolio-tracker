@echo off
chcp 65001 >nul
echo ========================================
echo    מתקין תלויות ומפעיל שרת...
echo ========================================
echo.

cd /d "%~dp0server"
echo [1/4] מתקין תלויות שרת...
call npm install
if errorlevel 1 (
    echo.
    echo שגיאה בהתקנת תלויות השרת!
    pause
    exit /b 1
)
echo השרת מותקן.

echo.
echo [2/4] מפעיל שרת ב-localhost:3001...
start "Portfolio SERVER" cmd /k "cd /d "%~dp0server" && echo השרת פועל... && npm run dev"

timeout /t 3 /nobreak >nul

cd /d "%~dp0client"
echo [3/4] מתקין תלויות קליינט...
call npm install
if errorlevel 1 (
    echo.
    echo שגיאה בהתקנת תלויות הקליינט!
    pause
    exit /b 1
)
echo הקליינט מותקן.

echo.
echo [4/4] מפעיל קליינט ב-localhost:5173...
start "Portfolio CLIENT" cmd /k "cd /d "%~dp0client" && echo הקליינט פועל... && npm run dev"

echo.
echo ממתין לטעינה...
timeout /t 12 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================
echo  האפליקציה פועלת!
echo  שרת: http://localhost:3001
echo  אפליקציה: http://localhost:5173
echo ========================================
echo.
pause
