# DEPLOY BACKEND NOW - 5 Minute Setup

## The Problem
Your frontend on Vercel is ready, but backend isn't deployed → API calls fail → no data loads.

## Solution: Deploy to Render (Free)

### 1. Go to Render
https://render.com

### 2. Click "New +" → "Web Service"

### 3. Select Repository
- Click "Deploy an existing repository"
- Find and select: `investment-tracker`
- Branch: `main`

### 4. Configure Service

**Basic Settings:**
```
Name: investment-tracker-backend
Environment: Node
Region: (closest to you)
```

**Build & Deploy:**
```
Build Command: npm install --prefix backend && npm --prefix backend run build
Start Command: npm --prefix backend start
```

**Select Plan: Free** ✅

### 5. Click "Advanced" and Add Environment Variables

Copy these exactly:

```
VITE_SUPABASE_URL
https://dcewtbnmjcfpychrwwsp.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXd0Ym5tamNmcHljaHJ3d3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAzMTEsImV4cCI6MjA4NTY3NjMxMX0.jlcItIgwWYDX7_0op7leg9UbtpJIOUcMl7OQHx7pF-I

NODE_ENV
production
```

### 6. Click "Create Web Service"

Wait 2-5 minutes for deployment...

### 7. When Done, Copy Your Backend URL
It will look like: `https://investment-tracker-backend-xxxx.onrender.com`

### 8. Update Vercel Environment Variable

Go to: https://vercel.com/dashboard
- Select your `investment-tracker` project
- Settings → Environment Variables
- Find or add: `VITE_API_URL`
- Set value to your Render URL: `https://investment-tracker-backend-xxxx.onrender.com/api`
- Save

### 9. Redeploy Frontend on Vercel
- Go to Deployments tab
- Click the three dots on latest deployment
- Click "Redeploy"
- Wait for ✅

### 10. Test
Open your Vercel app URL and refresh. Should load data now! ✅

---

**Total time: 5 minutes**
**All free tier**
**Your data persists on Supabase**
