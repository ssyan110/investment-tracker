# DEPLOYMENT CHECKLIST

## Follow these steps in order:

### ✅ Step 1: Deploy Backend to Render (5 min)

Read: [RENDER_DEPLOY_STEP_BY_STEP.md](./RENDER_DEPLOY_STEP_BY_STEP.md)

**Checklist:**
- [ ] Opened render.com
- [ ] Signed up with GitHub
- [ ] Selected investment-tracker repo
- [ ] Filled in all settings correctly
- [ ] Added 3 environment variables:
  - [ ] VITE_SUPABASE_URL
  - [ ] VITE_SUPABASE_ANON_KEY
  - [ ] NODE_ENV
- [ ] Clicked "Create Web Service"
- [ ] Waited for "Live" ✅
- [ ] **Copied backend URL** (looks like: `https://investment-tracker-backend-xxxx.onrender.com`)

**Status when done:** Render shows "Live" with green checkmark ✅

---

### ✅ Step 2: Update Vercel with Backend URL (2 min)

Read: [VERCEL_UPDATE_STEP_BY_STEP.md](./VERCEL_UPDATE_STEP_BY_STEP.md)

**Checklist:**
- [ ] Opened vercel.com/dashboard
- [ ] Found investment-tracker project
- [ ] Went to Settings → Environment Variables
- [ ] Added VITE_API_URL with your Render URL:
  - [ ] URL format correct: `https://investment-tracker-backend-xxxx.onrender.com/api`
  - [ ] Includes `/api` at the end
  - [ ] Production environment checked
- [ ] Went to Deployments tab
- [ ] Clicked redeploy on latest deployment
- [ ] Waited for ✅ "Ready"

**Status when done:** Vercel shows latest deployment "Ready" ✅

---

### ✅ Step 3: Test Everything (1 min)

**Checklist:**
- [ ] Opened your Vercel app URL
- [ ] Hard refreshed (Cmd+Shift+R or Ctrl+Shift+F5)
- [ ] Opened developer console (F12)
- [ ] Checked console for "Data loaded from backend" ✅
- [ ] Saw portfolio data on page:
  - [ ] Assets displayed
  - [ ] No blank areas
  - [ ] No red errors

---

## Quick Links

**My Files:**
- [RENDER_DEPLOY_STEP_BY_STEP.md](./RENDER_DEPLOY_STEP_BY_STEP.md) - Detailed Render steps
- [VERCEL_UPDATE_STEP_BY_STEP.md](./VERCEL_UPDATE_STEP_BY_STEP.md) - Detailed Vercel steps

**External:**
- Render: https://render.com
- Vercel: https://vercel.com/dashboard
- Your App: https://investment-tracker-npm1r2w2x-ssyan110-gmailcoms-projects.vercel.app/

---

## Your Environment Variables

### Render Backend (3 variables)

```
VITE_SUPABASE_URL = https://dcewtbnmjcfpychrwwsp.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXd0Ym5tamNmcHljaHJ3d3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAzMTEsImV4cCI6MjA4NTY3NjMxMX0.jlcItIgwWYDX7_0op7leg9UbtpJIOUcMl7OQHx7pF-I
NODE_ENV = production
```

### Vercel Frontend (1 variable)

```
VITE_API_URL = https://investment-tracker-backend-xxxx.onrender.com/api
```
(Replace xxxx with your actual Render service name)

---

## Estimated Time
⏱️ Total: **~12 minutes**
- Render deployment: 5 min
- Vercel update: 2 min
- Testing: 1 min
- Waiting for deployments: ~4 min

---

## Done! 🎉

Your app is now:
✅ Live online
✅ Connected to backend
✅ Syncing data from Supabase
✅ Accessible from any device with internet

**Access it:**
```
https://investment-tracker-npm1r2w2x-ssyan110-gmailcoms-projects.vercel.app/
```
