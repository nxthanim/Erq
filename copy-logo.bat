@echo off
echo Copying high-resolution-color-logo.png to client\public\...
copy "C:\Users\Nathanim\Documents\gebeya\high-resolution-color-logo.png" "C:\Users\Nathanim\Documents\gebeya\client\public\high-resolution-color-logo.png"
if %errorlevel% equ 0 (
    echo ✅ Logo copied successfully!
) else (
    echo ❌ Failed to copy. Trying Node.js method...
    echo.
    echo Run this command instead:
    echo   node scripts\copy-logo.js
)
pause
