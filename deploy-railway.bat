@echo off
echo 🚀 Starting Railway deployment process...

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Railway CLI not found. Please install it first:
    echo npm install -g @railway/cli
    pause
    exit /b 1
)

REM Check if user is logged in
railway whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo 🔐 Please log in to Railway first:
    echo railway login
    pause
    exit /b 1
)

echo 📦 Building React app...
call npm run build

echo 📦 Installing server dependencies...
call npm run server:install

echo 🚀 Deploying to Railway...
call railway up

echo ✅ Deployment complete!
echo 🌐 Your app should be available at the Railway URL
pause
