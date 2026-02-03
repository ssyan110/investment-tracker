# Local Testing Guide

## Prerequisites

- Backend and frontend dependencies installed
- Supabase database tables created
- `.env` file in backend/ with Supabase credentials

## Step 1: Start the Backend

```bash
cd backend
npm run build  # Compile TypeScript
node dist/server.js  # Start the server
```

You should see: `✅ Server running on port 3000`

## Step 2: Start the Frontend (in another terminal)

```bash
npm run dev
```

You should see: `Local: http://localhost:5173/`

## Step 3: Test the App

1. Open http://localhost:5173 in your browser
2. Try creating an asset:
   - Click "Add New Asset"
   - Enter: Symbol=GOLD, Name=Gold Bullion, Currency=USD, Method=Avg Cost
   - Click "Create Asset"

3. Check DevTools Network tab:
   - You should see a `POST /api/assets` request
   - Status should be `201` (created)
   - Response should show the new asset with an `id`

4. Create a transaction:
   - Click on the asset
   - Go to "Ledger" tab
   - Add a transaction

5. Check the Network tab again:
   - `POST /api/transactions` should be `201`

## Troubleshooting

### Backend won't start
- Check that `.env` file exists in `backend/` folder
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Make sure port 3000 is not in use: `lsof -i :3000`

### Network errors when creating assets
- Check if backend is running on port 3000
- Check browser console for errors
- Verify `VITE_API_URL` in `.env.local` is set correctly
- For local development, should be: `VITE_API_URL=http://localhost:3000/api`

### Assets not saving
- Check Supabase project is active
- Verify tables exist in Supabase (assets, transactions)
- Check backend logs for SQL errors

### CORS errors
- Backend has CORS enabled by default
- If using different ports, may need to adjust `.env`

## After Local Testing Works

1. Create tables in Supabase if not exists:
```sql
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  method TEXT NOT NULL,
  currency TEXT NOT NULL,
  current_market_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
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
```

2. Test a few transactions to make sure data persists

3. When ready for production:
   - Deploy backend (Render, Railway, Vercel)
   - Update `VITE_API_URL` in Vercel environment variables
   - Redeploy frontend

## Quick Commands

```bash
# Terminal 1: Backend
cd backend && npm run build && node dist/server.js

# Terminal 2: Frontend  
npm run dev

# Test API endpoint
curl http://localhost:3000/health
```

