# Step-by-Step: Make Your App Fully Online

## Your Current Setup

```
❌ Frontend on Vercel (deployed)
    └─ trying to connect to ❌ Backend (NOT deployed)
        └─ trying to connect to Supabase
```

## What You Need to Do

### Option A: Using Render (Recommended, Free, Easy)

#### 1. Create Render Account
- Go to https://render.com
- Sign up with GitHub
- Authorize access to your GitHub repos

#### 2. Deploy Backend
1. From Render dashboard: **"New +"** → **"Web Service"**
2. Select **"Deploy an existing repository"** 
3. Choose `investment-tracker` repo
4. Fill form:
   ```
   Name: investment-tracker-backend
   Environment: Node
   Region: (pick closest to you)
   Branch: main
   Build Command: npm install --prefix backend && npm --prefix backend run build
   Start Command: npm --prefix backend start
   ```

5. Click **"Advanced"** and add environment variables:
   ```
   Key: VITE_SUPABASE_URL
   Value: https://dcewtbnmjcfpychrwwsp.supabase.co
   
   Key: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXd0Ym5tamNmcHljaHJ3d3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAzMTEsImV4cCI6MjA4NTY3NjMxMX0.jlcItIgwWYDX7_0op7leg9UbtpJIOUcMl7OQHx7pF-I
   
   Key: NODE_ENV
   Value: production
   ```

6. Click **"Create Web Service"** and wait for ✅

7. **COPY YOUR BACKEND URL** (looks like: `https://investment-tracker-backend-xxxx.onrender.com`)

#### 3. Update Vercel
1. Go to your Vercel project: https://vercel.com/dashboard
2. Find your `investment-tracker` project
3. Click **"Settings"** → **"Environment Variables"**
4. Add variable:
   ```
   Name: VITE_API_URL
   Value: https://investment-tracker-backend-xxxx.onrender.com/api
   ```
   (Replace `xxxx` with your actual Render service name)

5. Go to **"Deployments"** tab
6. Find latest deployment, click **"..."** → **"Redeploy"**
7. Wait for ✅

#### 4. Verify
- Wait 30 seconds for Render to start
- Open your Vercel URL
- Browser console should show: **"Data loaded from backend"** ✅
- Portfolio should show your assets ✅

## Done! 🎉

Your app is now:
- ✅ Accessible from any device online
- ✅ Connected to Supabase database
- ✅ Fully functional

## If It Doesn't Work

### Test Backend
Open this URL in browser (replace xxxx with your Render service name):
```
https://investment-tracker-backend-xxxx.onrender.com/health
```
Should show: `{"status":"ok"}`

### Test API
```
https://investment-tracker-backend-xxxx.onrender.com/api/assets
```
Should show your assets as JSON (not an error)

### Check Logs
1. Go to Render dashboard
2. Click your service
3. Go to **"Logs"** tab
4. Look for errors

### Check Vercel
1. Go to Vercel dashboard
2. Click your project
3. Go to **"Deployments"** tab
4. Click latest deployment
5. Look at build logs for errors

## Important Notes

⚠️ **Render Free Tier:**
- Service takes 10-30 seconds to wake up after 15 min inactivity
- This is normal - it's free
- Your data is always saved on Supabase
- Just refresh if it's slow

✅ **Your Data:**
- Stored in Supabase (persists forever)
- No data loss on redeploy
- Accessible from any backend instance

✅ **CORS:**
- Backend allows all origins (safe for this use case)
- Supabase handles authentication

---

Questions? Check the full guide: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
