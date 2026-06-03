@echo off
title Forge AI Runner
echo ===================================================
echo ⚡ Starting Forge AI... ⚡
echo ===================================================
echo.

:: Check if .env.local exists
if not exist .env.local (
    echo ⚠️ Configuration file (.env.local) not found.
    echo Running installation first...
    echo.
    call install.bat
    exit /b %errorlevel%
)

:: Validate environment configuration
call node scripts/validate-env.js
if %errorlevel% neq 0 (
    echo ❌ Validation failed. Please fix your .env.local or re-run setup.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting the development server...
echo 🌍 Opening Forge AI in your default browser at http://localhost:3000
echo.

:: Launch the browser in parallel after a 3-second delay to let Next.js boot
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start Next.js dev server
call npm run dev
