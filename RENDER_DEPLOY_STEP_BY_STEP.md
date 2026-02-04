# Deploy Backend to Render - STEP BY STEP

## Step 1: Go to Render.com

Open: https://render.com

Click **Sign Up** (top right)

## Step 2: Sign Up with GitHub

- Click **"Sign up with GitHub"**
- Click **"Authorize render"** when prompted
- Complete any GitHub authorization

## Step 3: Create Web Service

After login, you'll see dashboard. Click **"New +"** button (top right)

Select **"Web Service"**

## Step 4: Connect Repository

You'll see: **"Deploy an existing repository"**

- Make sure your GitHub is connected
- Look for: **investment-tracker** in the list
- Click it to select
- Click **"Connect"**

## Step 5: Configure Settings

Fill out the form with these values:

### Name
```
investment-tracker-backend
```

### Environment
```
Node
```

### Region
```
(Pick closest to your location)
```

### Branch
```
main
```

### Build Command
```
npm install --prefix backend && npm --prefix backend run build
```

### Start Command
```
npm --prefix backend start
```

### Instance Type / Plan
```
Free
```

## Step 6: Add Environment Variables

Scroll down, click **"Advanced"** (if collapsed)

You'll see **"Environment Variables"** section

Add these 3 variables. For each one:
1. Click **"Add Environment Variable"** button
2. Fill in Key and Value
3. Repeat for all 3

### Variable 1
**Key:**
```
VITE_SUPABASE_URL
```

**Value:**
```
https://dcewtbnmjcfpychrwwsp.supabase.co
```

### Variable 2
**Key:**
```
VITE_SUPABASE_ANON_KEY
```

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXd0Ym5tamNmcHljaHJ3d3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAzMTEsImV4cCI6MjA4NTY3NjMxMX0.jlcItIgwWYDX7_0op7leg9UbtpJIOUcMl7OQHx7pF-I
```

### Variable 3
**Key:**
```
NODE_ENV
```

**Value:**
```
production
```

## Step 7: Deploy!

Scroll to bottom, click **"Create Web Service"**

**Wait 2-5 minutes** ⏳

You'll see:
- "Building..." (yellow)
- "Deploying..." (blue)
- "Live" with ✅ (green) ← When you see this, backend is deployed!

## Step 8: Get Your Backend URL

When it shows "Live", look at the top of the page.

You'll see a URL like:
```
https://investment-tracker-backend-xxxx.onrender.com
```

**COPY THIS URL** - you'll need it next.

---

## Next: Update Vercel

Once backend shows "Live" ✅, go to Step 2.

But first, make sure you have your Render URL copied.
