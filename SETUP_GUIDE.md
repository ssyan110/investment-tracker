# Investment Tracker - Complete Setup Guide

Your project has been completely restructured with a professional backend! Here's how to get it running:

## 🎯 What Changed?

✅ **Old Way**: React + localStorage (unreliable, device-specific)
✅ **New Way**: React frontend + Express backend + Supabase database (professional, scalable)

**Benefits:**
- Data persists in real database (not just browser)
- Works across all devices/browsers
- Automatic backups
- Professional architecture
- Easy to deploy

---

## 📋 Step-by-Step Setup

### Step 1: Backend Dependencies (Already Done ✓)

```bash
cd backend
npm install  # Already completed!
```

### Step 2: Backend Environment Variables

The backend needs Supabase credentials. These should already be in `backend/.env`:

```
VITE_SUPABASE_URL=https://dcewtbnmjcfpychrwwsp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_fUQ7VBEuxLoLg-juuegq1Q_72VTBBaT
```

**Verify the .env file exists:**
```bash
cat backend/.env
```

If it's empty or missing, copy from your Supabase project:
1. Go to https://supabase.com
2. Open your project
3. Settings → API
4. Copy Project URL and anon public key
5. Paste into backend/.env

### Step 3: Supabase Database Tables

Run this SQL in your Supabase project (SQL Editor):

```sql
-- Create assets table
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  currency TEXT NOT NULL,
  current_market_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  fees DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_asset_id ON transactions(asset_id);
```

### Step 4: Frontend Environment Variables

Your frontend .env.local should have:

```
VITE_API_URL=http://localhost:3000/api
```

**Verify it:**
```bash
cat .env.local
```

---

## 🚀 Running Locally

**Open TWO terminals:**

### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ Server running on port 3000
```

### Terminal 2 - Frontend

```bash
npm run dev
```

You should see:
```
✅ Local:   http://localhost:5173/
```

**Open http://localhost:5173 in your browser** ✅

---

## ✨ What You Can Do Now

1. **Add Assets**: Click "Home" → Select asset type (ETF, Stock, etc.) → Add asset
2. **Add Transactions**: Click asset → "New Transaction" → Fill details
3. **View Portfolio**: Dashboard shows all holdings
4. **Data Syncs Automatically**: All saves go to Supabase

---

## 📊 Testing the Backend Connection

In your browser:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Add a transaction in the app
4. You should see requests to `localhost:3000/api/transactions`
5. **Status 201** = Success ✓

---

## 🌐 Deploying to Production

### Option A: Deploy Everything to Vercel (Recommended)

```bash
# Push to GitHub (already done)
git push

# Then on Vercel:
# 1. Go to vercel.com/dashboard
# 2. Import your GitHub repo
# 3. Vercel auto-detects frontend + backend
# 4. Add Environment Variable:
#    - Name: VITE_API_URL
#    - Value: https://your-deployment-url.vercel.app/api
# 5. Deploy!
```

### Option B: Separate Hosting

**Backend on Render/Railway/Heroku:**
```bash
# Deploy backend separately
# Get your backend URL: https://your-backend.render.com
```

**Frontend on Vercel:**
- Add env variable: `VITE_API_URL=https://your-backend.render.com/api`

---

## 🔧 Project Structure

```
investment-tracker/
├── backend/                    # Express server
│   ├── src/
│   │   ├── server.ts          # Main server
│   │   ├── routes.ts          # API endpoints
│   │   ├── db.ts              # Database queries
│   │   └── supabase.ts        # Supabase client
│   ├── package.json
│   ├── .env                   # Supabase credentials
│   └── tsconfig.json
│
├── services/
│   └── storage.ts             # API client (calls backend)
│
├── App.tsx                    # Main React app
├── components/                # React components
├── package.json               # Frontend deps
├── .env.local                 # Backend API URL
└── BACKEND_SETUP.md           # Detailed docs
```

---

## ❓ Troubleshooting

**Error: "Failed to load assets from backend"**
- Is backend running? Check Terminal 1
- Is backend on port 3000? 
- Is `VITE_API_URL` correct in .env.local?

**Error: "Can't connect to Supabase"**
- Check backend/.env has correct credentials
- Verify tables exist in Supabase
- Check Supabase project is active

**Nothing shows up in the app**
- App starts with **zero data** (no seed data)
- Click "+" to add first asset
- Data is stored in Supabase, not browser

**Building fails**
- Delete node_modules: `rm -rf node_modules backend/node_modules`
- Reinstall: `npm install && cd backend && npm install`

---

## 📝 API Endpoints

| Method | Endpoint | Returns |
|--------|----------|---------|
| GET | `/api/assets` | Array of all assets |
| POST | `/api/assets` | Create new asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/transactions` | Array of all transactions |
| POST | `/api/transactions` | Create new transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

---

## 💾 Importing Your CSV Data

If you have assets.csv and transactions.csv:

1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Select "assets" table
4. Click "Insert" → "Insert from CSV"
5. Upload assets.csv
6. Repeat for transactions.csv
7. Refresh your app - data loads!

---

## 🎉 Success Checklist

- [ ] Backend running on http://localhost:3000
- [ ] Frontend running on http://localhost:5173
- [ ] Can add new asset
- [ ] Can add new transaction
- [ ] Data appears in Supabase table
- [ ] No console errors

---

## 📞 Next Steps

1. **Try it locally** - Follow the "Running Locally" section above
2. **Import data** - Use CSV import if you have existing data
3. **Deploy** - Follow "Deploying to Production" when ready
4. **Customize** - Modify components as needed

---

**Questions?** Check BACKEND_SETUP.md for more details!
