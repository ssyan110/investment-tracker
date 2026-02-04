# Step 2: Update Vercel - AFTER Backend Deployed

**Do this after your backend shows "Live" on Render**

## Step 1: Go to Vercel Dashboard

Open: https://vercel.com/dashboard

## Step 2: Select Your Project

Look for: **investment-tracker** project

Click it

## Step 3: Go to Settings

Click **"Settings"** tab (top menu)

## Step 4: Add Environment Variable

In left sidebar, click **"Environment Variables"**

You should see a section to add variables.

### Add New Variable

Click **"Add New"** or **"New Environment Variable"**

Fill in:

**Name:**
```
VITE_API_URL
```

**Value:** (Use your Render backend URL from Step 1)
```
https://investment-tracker-backend-xxxx.onrender.com/api
```

*Replace `xxxx` with your actual Render service ID*

**Environments:** Make sure **Production** is checked ✅

Click **"Save"**

## Step 5: Redeploy Frontend

Go to **"Deployments"** tab (top menu)

Find the latest deployment (usually at top)

Click the **three dots** (...) on the right side

Click **"Redeploy"**

Wait for deployment to complete (should see ✅ "Ready")

---

## Step 3: Test It Works!

### Test 1: Open Your App

Go to your Vercel URL:
```
https://investment-tracker-npm1r2w2x-ssyan110-gmailcoms-projects.vercel.app/
```

### Test 2: Check Console

Press **F12** to open developer console

Go to **"Console"** tab

You should see:
```
✅ Data loaded from backend
```

### Test 3: Check Data

You should see:
- Portfolio dashboard with data
- Assets listed (Gold, ETF, Stock, etc.)
- No red error messages

---

## If Something's Wrong

### Error: "Still blank page"
1. Hard refresh: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+F5** (Windows)
2. Wait 30 seconds (Render might be waking up)
3. Refresh again

### Error: "Failed to load resource"
1. Check your VITE_API_URL is correct in Vercel settings
2. Make sure Render backend URL is exactly right
3. Add `/api` at the end of the Render URL

### Error: "Status 404"
1. Check Render backend is "Live" ✅
2. Go to: `https://your-render-url-here/health`
   - Should show: `{"status":"ok"}`
3. If not, Render deployment failed - check logs

### Check Render Logs
1. Go to render.com dashboard
2. Click your service
3. Click **"Logs"** tab
4. Look for errors

### Check Vercel Logs
1. Go to vercel.com dashboard
2. Click your project
3. Go to **"Deployments"** tab
4. Click your deployment
5. Scroll down to see build logs

---

## Success! 🎉

Your app should now:
- ✅ Load from Vercel frontend
- ✅ Connect to backend on Render
- ✅ Fetch data from Supabase
- ✅ Display your portfolio

Works on:
- 📱 Phone
- 💻 Desktop
- 📱 Tablet
- Any internet-connected device!
