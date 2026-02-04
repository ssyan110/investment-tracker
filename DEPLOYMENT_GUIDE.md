# DEPLOYMENT GUIDE: Complete Online Setup

This guide walks you through deploying both the frontend and backend to production for full online access.

## Overview

```
Your Device
    │
    ├─► Vercel Frontend (https://investment-tracker-...)
    │       │
    │       └─► Render Backend (https://...-backend.onrender.com)
    │            │
    │            └─► Supabase Database
    │
└─► Phone/Tablet
        │
        └─► Vercel Frontend (same URL)
             │
             └─► Render Backend (same URL)
```

## Step 1: Deploy Backend to Render

### 1.1 Create a Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub for easier deployment
- Authorize Render to access your GitHub

### 1.2 Connect Your Repository
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select **"Deploy an existing repository"**
3. Connect your GitHub account if not already done
4. Select your `investment-tracker` repository
5. Choose the `main` branch

### 1.3 Configure the Service
Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `investment-tracker-backend` |
| **Environment** | `Node` |
| **Region** | Choose closest to you |
| **Branch** | `main` |
| **Build Command** | `npm install --prefix backend && npm --prefix backend run build` |
| **Start Command** | `npm --prefix backend start` |
| **Plan** | `Free` |

### 1.4 Add Environment Variables
Click **"Advanced"** and add your Supabase credentials:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `NODE_ENV` | `production` |

**Where to find these:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Click **"Settings"** → **"API"**
4. Copy the **"Project URL"** and **"Anon Public Key"**

### 1.5 Deploy
Click **"Create Web Service"**

Render will start deploying. Wait for the ✅ status (usually 2-5 minutes).

**When done, you'll get a URL like:** `https://investment-tracker-backend-xxxx.onrender.com`

## Step 2: Update Frontend for Production

### 2.1 Add Environment Variable to Vercel
1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add a new variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://investment-tracker-backend-xxxx.onrender.com/api` |

**Use the actual URL from your Render deployment** (replace `xxxx` with your service name)

### 2.2 Redeploy Frontend
1. In Vercel, go to **"Deployments"**
2. Click the three dots on the latest deployment
3. Select **"Redeploy"**

Wait for it to complete.

## Step 3: Verify Everything Works

### Test 1: Backend Health Check
Open in browser:
```
https://investment-tracker-backend-xxxx.onrender.com/health
```

Should return:
```json
{"status":"ok"}
```

### Test 2: Fetch Assets from Backend
```
https://investment-tracker-backend-xxxx.onrender.com/api/assets
```

Should return JSON array of your assets (not an error page).

### Test 3: Frontend Loading Data
1. Open your Vercel URL
2. Open browser console (F12)
3. You should see: **"Data loaded from backend"**
4. Portfolio should display data

## Troubleshooting

### Issue: "Failed to load resource: 503" from Vercel
**Cause:** Render backend might be starting up (free tier spins down after 15 min inactivity)  
**Fix:** Wait 30 seconds and refresh. Render will wake up.

### Issue: "Cannot reach backend" error
**Check:**
```bash
# Test if URL is correct
curl https://investment-tracker-backend-xxxx.onrender.com/health

# Check environment variable was set
# Go to Vercel Settings → Environment Variables → verify VITE_API_URL
```

### Issue: Data still not loading
1. Hard refresh frontend (Cmd+Shift+R or Ctrl+Shift+F5)
2. Check browser console for actual error message
3. Verify Supabase credentials in Render settings
4. Check Render logs: Dashboard → Your Service → Logs

### Issue: CORS Error
This should be fixed, but if you see CORS errors:
1. Go to Render dashboard
2. Find your service
3. Redeploy (the service auto-restarts)

## Environment Variables Reference

### Frontend (Vercel)
```
VITE_API_URL=https://investment-tracker-backend-xxxx.onrender.com/api
```

### Backend (Render)
```
VITE_SUPABASE_URL=https://dcewtbnmjcfpychrwwsp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
NODE_ENV=production
```

## Important Notes

⚠️ **Render Free Tier:**
- Service spins down after 15 minutes of inactivity
- First request after inactivity takes 10-30 seconds
- If you want always-on, upgrade to paid tier
- For development, free tier is fine

✅ **Supabase:**
- Free tier works great for this app
- Data persists across deployments
- Same database used by all deployments

✅ **Vercel:**
- Frontend deployments are instant
- Always-on (no spin-down)
- Free tier supports your needs

## Making Changes

### Update Backend Code
```bash
# Make changes in backend/src/
git add .
git commit -m "Update backend"
git push origin main
```
Render automatically redeploys.

### Update Frontend Code
```bash
# Make changes in frontend files
git add .
git commit -m "Update frontend"
git push origin main
```
Vercel automatically redeploys.

## Security Notes

🔒 **Your Supabase Anon Key:**
- Safe to be in public (client-side) code
- It only allows specific operations you configure
- Private key stays only on backend
- Add Row-Level Security policies in Supabase for production

🔒 **CORS:**
- Backend allows all origins in development
- For production, update CORS in `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: ['https://investment-tracker-xxx.vercel.app'],
}));
```

## Getting Help

If something isn't working:
1. Check Render logs (Dashboard → Service → Logs)
2. Check Vercel logs (Dashboard → Deployments → Logs)
3. Check browser console (F12)
4. Verify environment variables are set correctly
5. Test health endpoints manually

---

**Your app is now live! 🚀**

Access it from any device at:
```
https://investment-tracker-npm1r2w2x-ssyan110-gmailcoms-projects.vercel.app/
```
