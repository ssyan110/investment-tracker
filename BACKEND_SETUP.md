# Investment Tracker - Backend & Frontend Setup

This project uses:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)

## Project Structure

```
investment-tracker/
├── backend/              # Express server
│   ├── src/
│   │   ├── server.ts    # Main server entry
│   │   ├── routes.ts    # API endpoints
│   │   ├── db.ts        # Database operations
│   │   └── supabase.ts  # Supabase client
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── App.tsx              # React frontend
├── services/
│   ├── storage.ts       # API client (calls backend)
│   └── marketData.ts    # Market data service
├── components/          # React components
├── types.ts             # TypeScript types
├── package.json         # Frontend dependencies
└── vite.config.ts       # Vite configuration
```

## Setup Instructions

### 1. Backend Setup

```bash
# Install backend dependencies
cd backend
npm install

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env and add your Supabase URL and anon key
```

### 2. Supabase Setup

If you haven't already:

1. Go to https://supabase.com
2. Create a new project
3. Go to Project Settings → API
4. Copy your `Project URL` and `anon public` key

In Supabase SQL Editor, run:

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

### 3. Frontend Setup

```bash
# Install frontend dependencies
npm install

# Update .env.local
# For local development, set:
# VITE_API_URL=http://localhost:3000/api
```

## Running Locally

### Terminal 1 - Start Backend

```bash
cd backend
npm run dev
# Server will run on http://localhost:3000
```

### Terminal 2 - Start Frontend

```bash
npm run dev
# Frontend will run on http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Deploying to Production

### Backend (Vercel Serverless Functions)

Option 1: Use Vercel with backend folder
- Push to GitHub
- Vercel will auto-detect and deploy both frontend and backend
- Update VITE_API_URL to your deployed backend URL

Option 2: Separate Render/Railway/Heroku for backend
- Deploy backend separately
- Update Vercel env variable: `VITE_API_URL` to your backend URL

### Frontend (Vercel)

1. Go to https://vercel.com
2. Deploy your GitHub repo
3. Add environment variables in Vercel Settings:
   - `VITE_API_URL=https://your-backend-url.com/api`
4. Redeploy

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | Get all assets |
| POST | `/api/assets` | Create new asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |
| GET | `/api/transactions` | Get all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

## Features

- ✅ Manage multiple assets (stocks, ETFs, gold, crypto)
- ✅ Track all transactions (buy/sell)
- ✅ Calculate average cost basis
- ✅ Portfolio dashboard with P&L tracking
- ✅ Real-time market data (simulated)
- ✅ Persistent data with Supabase
- ✅ Full-stack TypeScript

## Importing CSV Data

If you have existing data:

1. Prepare CSV files with correct column names (see Supabase table structure)
2. Go to Supabase → Table Editor
3. Click "Insert" → "Insert from CSV"
4. Upload your CSV files

## Troubleshooting

**Backend connection error?**
- Make sure backend is running on port 3000
- Check `VITE_API_URL` in .env.local is correct
- Check browser console for error messages

**Supabase connection error?**
- Verify credentials in backend/.env
- Check Supabase project is active
- Verify tables exist in Supabase

**CORS errors?**
- CORS is enabled in backend Express server
- Check backend is running before frontend requests
