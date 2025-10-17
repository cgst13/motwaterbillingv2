@echo off
echo ========================================
echo Water Billing System - GitHub Pages Deployment
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully
echo.

echo Step 2: Building production version...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build completed successfully
echo.

echo Step 3: Deploying to GitHub Pages...
call npm run deploy
if errorlevel 1 (
    echo ERROR: Deployment failed
    pause
    exit /b 1
)
echo.
echo ========================================
echo ✓ DEPLOYMENT SUCCESSFUL!
echo ========================================
echo.
echo Your app will be live at:
echo https://cgst13.github.io/motwaterbillingv2
echo.
echo It may take 2-3 minutes to become available.
echo.
pause
