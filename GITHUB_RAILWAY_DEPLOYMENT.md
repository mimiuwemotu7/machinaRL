# GitHub to Railway Deployment Guide

## 🚀 **Step-by-Step GitHub to Railway Deployment**

### **Step 1: GitHub Repository Setup** ✅
- Repository: `https://github.com/mimiuwemotu7/machinaRL.git`
- Branch: `main`
- Status: ✅ Files committed and pushed

### **Step 2: Railway GitHub Integration**

#### **Option A: Via Railway Web Dashboard (Recommended)**

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app/dashboard
   - Or run: `railway open`

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository: `mimiuwemotu7/machinaRL`

3. **Configure Deployment:**
   - **Root Directory:** `/` (leave empty for root)
   - **Build Command:** `npm run build`
   - **Start Command:** `sh -c 'cd server && npm install && npm start'`
   - **Node Version:** 18.x

#### **Option B: Via Railway CLI**

```bash
# Link to GitHub repository
railway link --project MACHINARL

# Deploy from GitHub
railway up --detach
```

### **Step 3: Environment Variables**

Set these in Railway dashboard:

#### **Required:**
- `NODE_ENV=production`
- `PORT=3001` (Railway sets this automatically)

#### **Optional (if using Firebase):**
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

### **Step 4: Railway Configuration Files**

Your project already has these configured:
- ✅ `railway.json` - Railway deployment config
- ✅ `Dockerfile` - Docker configuration
- ✅ `Procfile` - Process configuration
- ✅ `.gitignore` - Git ignore rules

### **Step 5: Deployment Process**

1. **Railway will automatically:**
   - Clone your GitHub repository
   - Install dependencies (`npm install`)
   - Build React app (`npm run build`)
   - Install server dependencies (`cd server && npm install`)
   - Start the server (`npm start`)

2. **Health Check:**
   - Railway will check `/api/health` endpoint
   - Server should respond with status information

### **Step 6: Monitoring**

#### **View Logs:**
```bash
railway logs
```

#### **Check Status:**
```bash
railway status
```

#### **Open Dashboard:**
```bash
railway open
```

### **Step 7: Custom Domain (Optional)**

1. Go to Railway dashboard
2. Select your service
3. Go to "Settings" → "Domains"
4. Add your custom domain

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Build Failures:**
   - Check Node.js version (should be 18.x)
   - Verify all dependencies are in package.json
   - Check build logs in Railway dashboard

2. **Server Not Starting:**
   - Verify start command is correct
   - Check server logs
   - Ensure PORT environment variable is set

3. **Health Check Failures:**
   - Verify `/api/health` endpoint exists
   - Check server is listening on correct port

### **Debug Commands:**
```bash
# Check Railway status
railway status

# View deployment logs
railway logs

# Check environment variables
railway variables

# Connect to Railway shell
railway shell
```

## 📊 **Project Structure**

```
machinaRL/
├── src/                    # React frontend
├── server/                 # Node.js backend
├── public/                 # Static assets
├── build/                  # Built React app (created during build)
├── railway.json           # Railway configuration
├── Dockerfile             # Docker configuration
├── Procfile               # Process configuration
├── .gitignore             # Git ignore rules
└── package.json           # Dependencies and scripts
```

## 🎯 **Next Steps After Deployment**

1. **Test the deployment:**
   - Visit your Railway URL
   - Test all API endpoints
   - Verify React app loads correctly

2. **Set up monitoring:**
   - Check Railway logs regularly
   - Set up alerts if needed

3. **Optimize performance:**
   - Monitor resource usage
   - Optimize build process if needed

4. **Set up CI/CD:**
   - Railway will auto-deploy on GitHub pushes
   - Configure branch protection if needed

## 🚀 **Quick Deploy Commands**

```bash
# Push changes to GitHub
git add .
git commit -m "Update deployment configuration"
git push origin main

# Railway will automatically deploy from GitHub
# Check status
railway status

# View logs
railway logs
```

---

**Note:** Railway will automatically redeploy whenever you push changes to your GitHub repository's main branch.
