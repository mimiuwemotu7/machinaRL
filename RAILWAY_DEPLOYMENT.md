# Railway Deployment Guide for 3D Viewer

This guide will help you deploy your 3D Viewer application to Railway successfully.

## 🚀 Quick Start

### Prerequisites
1. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

### Option 1: Automated Deployment (Recommended)
Run the deployment script:

**Windows:**
```bash
deploy-railway.bat
```

**Linux/Mac:**
```bash
chmod +x deploy-railway.sh
./deploy-railway.sh
```

### Option 2: Manual Deployment
1. **Build the React app:**
   ```bash
   npm run build
   ```

2. **Install server dependencies:**
   ```bash
   npm run server:install
   ```

3. **Deploy to Railway:**
   ```bash
   railway up
   ```

## 🔧 Configuration Files Created

### 1. `railway.json`
- Configures Railway deployment settings
- Sets health check endpoint
- Configures restart policies

### 2. `nixpacks.toml`
- Defines build phases for Railway
- Installs both frontend and backend dependencies
- Builds React app and starts server

### 3. `Procfile`
- Alternative deployment configuration
- Specifies web process command

## 🌐 Environment Variables

Set these in your Railway dashboard:

### Required Variables:
- `NODE_ENV=production`
- `PORT=3001` (Railway will set this automatically)

### Firebase Configuration (if using Firebase):
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### AI Configuration (optional):
- `AI_INTERVAL_MS=5000`
- `AI_MAX_MESSAGES=100`

## 🏗️ Project Structure

```
3d-viewer/
├── src/                    # React frontend
├── server/                 # Node.js backend
├── build/                  # Built React app (created during build)
├── railway.json           # Railway configuration
├── nixpacks.toml          # Build configuration
├── Procfile               # Process configuration
└── deploy-railway.*       # Deployment scripts
```

## 🔍 Troubleshooting

### Common Issues:

1. **Timeout Error:**
   - The server now has proper health checks
   - Build process is optimized
   - Dependencies are properly installed

2. **Build Failures:**
   - Ensure all dependencies are in package.json
   - Check Node.js version compatibility (>=18.0.0)

3. **Server Not Starting:**
   - Check Railway logs: `railway logs`
   - Verify environment variables are set
   - Ensure PORT is not hardcoded

### Debug Commands:
```bash
# Check Railway status
railway status

# View logs
railway logs

# Check environment variables
railway variables

# Connect to Railway shell
railway shell
```

## 📊 Monitoring

### Health Check Endpoint:
- `GET /api/health` - Server health status
- `GET /api/ai/status` - AI engine status

### Logs:
- View real-time logs in Railway dashboard
- Use `railway logs` for command-line monitoring

## 🚀 Production Features

### Optimizations Applied:
1. **Static File Serving**: React build served by Express
2. **CORS Configuration**: Proper CORS for production
3. **Error Handling**: Comprehensive error middleware
4. **Health Checks**: Railway health check endpoint
5. **Build Optimization**: Efficient build process

### Performance:
- React app is pre-built and served statically
- Server handles API routes and static files
- Optimized for Railway's infrastructure

## 🔄 Updates and Redeployment

To update your deployment:
1. Make your changes
2. Run `railway up` again
3. Railway will automatically rebuild and redeploy

## 📞 Support

If you encounter issues:
1. Check Railway logs first
2. Verify all environment variables
3. Ensure all dependencies are properly installed
4. Check the health check endpoint

## 🎯 Next Steps

After successful deployment:
1. Test all API endpoints
2. Verify React app loads correctly
3. Test AI functionality
4. Monitor performance and logs
5. Set up custom domain (optional)

---

**Note**: This deployment configuration is optimized for Railway's platform and should resolve the timeout issues you were experiencing.
