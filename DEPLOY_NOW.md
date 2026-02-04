# 🚀 Quick Production Deployment

## Current Status
✅ Frontend deployed on Vercel  
❌ Backend not deployed (needs to be set up)

## To Get Your App Fully Online

### Step 1: Deploy Backend to Render (5 minutes)

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"** 
3. Connect GitHub & select your `investment-tracker` repo
4. Configure:
   - **Name:** `investment-tracker-backend`
   - **Build Command:** `npm install --prefix backend && npm --prefix backend run build`
   - **Start Command:** `npm --prefix backend start`
   - **Plan:** Free

5. Add Environment Variables:
   - `VITE_SUPABASE_URL` = (from your Supabase project Settings → API)
   - `VITE_SUPABASE_ANON_KEY` = (from your Supabase project Settings → API)
   - `NODE_ENV` = `production`

6. Click **"Create Web Service"** and wait for deployment ✅

### Step 2: Update Frontend URL (2 minutes)

1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add new variable:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://investment-tracker-backend-xxxx.onrender.com/api` (use your Render URL)

4. Go to **"Deployments"** → Click latest deployment's **"..."** → **"Redeploy"**

### Step 3: Test

Open your Vercel URL and refresh. You should see data loading! 📊

## Where to Find Your Supabase Credentials

1. Go to https://supabase.com
2. Open your project
3. Click **"Settings"** (gear icon)
4. Click **"API"**
5. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon public key** → `VITE_SUPABASE_ANON_KEY`

## Troubleshooting

### Backend shows error on first visit
- Render free tier spins down after 15 min inactivity
- First request takes 10-30 seconds to wake up
- This is normal, just wait and refresh

### Data still not loading
1. Check browser console (F12) for error messages
2. Visit your Render backend health: `https://investment-tracker-backend-xxx.onrender.com/health`
   - Should see: `{"status":"ok"}`
3. Check Render logs for errors

### How to find your Render backend URL
- Go to render.com dashboard
- Find your service
- URL is at the top of the page (copy it exactly)

## Complete Guide
See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed setup with screenshots.

---
**That's it! Your app will be fully online.** 🎉
