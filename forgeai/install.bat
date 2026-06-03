@echo off
title Forge AI Desktop Installer

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Error: Node.js is not installed or not in PATH.
    echo Please install Node.js (v18 or higher) and try again.
    pause
    exit /b 1
)

:: Try launching the PowerShell GUI Installer
echo ===================================================
echo ⚡ Launching Forge AI Graphical Setup Wizard... ⚡
echo ===================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\install-gui.ps1"
if %errorlevel% equ 0 (
    exit /b 0
)

:: Fallback to CLI installation if GUI fails
echo ⚠️ Graphical Installer closed or could not be initialized.
echo Falling back to standard Command Line installer...
echo.

echo 📦 Running npm install...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Error: npm install failed.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo ⚙️ Running Forge AI Configuration Wizard... ⚙️
echo ===================================================
echo.
call node scripts/setup.js
if %errorlevel% neq 0 (
    echo ❌ Error: Configuration setup failed or was cancelled.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo 🔍 Verifying Environment Setup... 🔍
echo ===================================================
echo.
call node scripts/validate-env.js
if %errorlevel% neq 0 (
    echo ❌ Error: Environment validation failed.
    pause
    exit /b 1
)

:: Create Desktop shortcut as fallback in CLI installer as well
echo 🖥️ Creating Desktop Shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Forge AI.lnk')); $Shortcut.TargetPath = '%~dp0start.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Description = 'Launch Forge AI Salesforce Builder'; $Shortcut.Save()" >nul 2>&1

echo.
echo 🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉
echo.
echo A shortcut named "Forge AI" has been created on your Desktop.
echo You can run the application by double-clicking the shortcut or:
echo    start.bat
echo.
pause
