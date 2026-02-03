# Investment Tracker

A professional-grade personal investment tracking system with double-entry style validation and strict inventory accounting.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Supabase account with credentials

### Development Setup

**1. Clone and Install Dependencies**
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

**2. Configure Environment Variables**

Create `backend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**3. Start Development Servers**

Terminal 1 - Backend (port 3000):
```bash
cd backend && npm run build && node dist/server.js
```

Terminal 2 - Frontend (port 5173):
```bash
npm run dev
```

**4. Open Browser**
```
http://localhost:5173
```

## 📁 Project Structure

```
investment-tracker/
├── backend/                 # Express.js backend
│   ├── src/
│   │   ├── server.ts       # Express server
│   │   ├── supabase.ts     # Supabase client
│   │   ├── db.ts           # Database queries
│   │   └── routes.ts       # API endpoints
│   ├── .env                # Supabase credentials
│   └── package.json        # Backend dependencies
│
├── components/             # React components
│   ├── AddAssetForm.tsx
│   ├── TransactionForm.tsx
│   ├── PortfolioDashboard.tsx
│   ├── LedgerTable.tsx
│   ├── InventoryTable.tsx
│   └── DataManagement.tsx
│
├── services/               # API & data services
│   ├── storage.ts          # Backend API client
│   └── marketData.ts       # Market price updates
│
├── App.tsx                 # Main application
├── engine.ts               # Calculation engine
├── types.ts                # TypeScript types
├── utils.ts                # Utility functions
└── vite.config.ts          # Vite configuration
```

## 🔌 API Endpoints

### Assets
- `GET /api/assets` - List all assets
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

## 📊 Database Schema

### Assets Table
```sql
id (TEXT PRIMARY KEY)
symbol (TEXT)
name (TEXT)
type (TEXT)
method (TEXT)
currency (TEXT)
current_market_price (DECIMAL)
created_at (TIMESTAMP)
```

### Transactions Table
```sql
id (TEXT PRIMARY KEY)
asset_id (TEXT FOREIGN KEY)
date (TEXT)
type (TEXT)
quantity (DECIMAL)
price_per_unit (DECIMAL)
fees (DECIMAL)
total_amount (DECIMAL)
created_at (TIMESTAMP)
```

## 🛠️ Build & Deploy

### Production Build
```bash
# Frontend
npm run build

# Backend
cd backend && npm run build
```

### Deploy to Vercel (Frontend)
```bash
# Push to GitHub
git add .
git commit -m "Your message"
git push

# Vercel auto-deploys on push
```

### Deploy Backend
Choose one:
- **Render.com** - Free tier available
- **Railway.app** - Easy Postgres integration
- **Heroku** - Classic option

Set environment variables on your hosting platform with Supabase credentials.

## 🔧 Available Scripts

**Frontend:**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

**Backend:**
```bash
cd backend
npm run build    # Compile TypeScript to JavaScript
node dist/server.js  # Start server
```

## 📝 Features

✅ Multi-asset portfolio tracking  
✅ Transaction management (buy/sell/dividend/split)  
✅ Inventory accounting (FIFO, LIFO, Average Cost)  
✅ Real-time market price updates  
✅ Dashboard with portfolio summary  
✅ Ledger view for transaction history  
✅ Inventory tracking per asset  
✅ Double-entry validation  

## 🔒 Security Notes

- Backend `.env` file is in `.gitignore` - never committed to repo
- Supabase credentials are server-side only
- Frontend API calls go through backend proxy
- Use RLS (Row Level Security) in Supabase for production

## 📞 Troubleshooting

**Backend won't start:**
- Check `backend/.env` exists with valid Supabase credentials
- Verify Supabase tables exist (assets, transactions)
- Check port 3000 is not in use

**Frontend can't connect to backend:**
- Ensure backend is running on port 3000
- Check `VITE_API_URL` in `.env.local` is `http://localhost:3000/api`
- Check browser console for CORS errors

**Data not saving:**
- Check Supabase connection in backend console
- Verify database tables exist
- Check API response status in Network tab (should be 201 for POST)

## 📄 Documentation

- **QUICK_REFERENCE.md** - Copy-paste commands and quick tips
- **LOCAL_TESTING.md** - Step-by-step testing guide

## 📦 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Package Manager:** npm

## 📄 License

MIT
