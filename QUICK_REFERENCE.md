# Quick Reference Card

## 🚀 Start Development (Copy & Paste)

### Terminal 1 - Backend
```bash
cd backend && npm run dev
```

### Terminal 2 - Frontend
```bash
npm run dev
```

### Open Browser
```
http://localhost:5173
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `backend/src/server.ts` | Express entry point |
| `backend/src/routes.ts` | All API endpoints |
| `backend/src/db.ts` | Database queries |
| `backend/.env` | Supabase credentials |
| `services/storage.ts` | API client |
| `App.tsx` | Main React app |
| `.env.local` | Backend API URL |

---

## 🔧 Common Commands

```bash
# Install dependencies
npm install
cd backend && npm install

# Start development
npm run dev              # Frontend on 5173
cd backend && npm run dev    # Backend on 3000

# Build for production
npm run build           # Frontend
cd backend && npm run build  # Backend

# Run production build
cd backend && npm start
```

---

## 🌐 API Endpoints

```
POST   /api/assets           Create asset
GET    /api/assets           List all assets
PUT    /api/assets/:id       Update asset
DELETE /api/assets/:id       Delete asset

POST   /api/transactions           Create transaction
GET    /api/transactions           List all transactions
PUT    /api/transactions/:id       Update transaction
DELETE /api/transactions/:id       Delete transaction
```

---

## 📊 Database Schema Quick Look

**Assets:**
- id, symbol, name, type, method, currency, current_market_price

**Transactions:**
- id, asset_id, date, type, quantity, price_per_unit, fees, total_amount

---

## ✅ Checklist Before Production

- [ ] Backend running locally without errors
- [ ] Frontend can add/edit/delete assets
- [ ] Frontend can add/edit/delete transactions
- [ ] Supabase tables created and populated
- [ ] `backend/.env` has correct Supabase credentials
- [ ] `.env.local` has correct API URL
- [ ] No console errors
- [ ] Network tab shows successful API requests

---

## 🐛 Debug Checklist

Problem | Solution
--------|----------
Backend won't start | Check port 3000 is free, check .env file
API 404 errors | Is backend running? Check `VITE_API_URL`
Data not showing | Is Supabase connected? Check backend/.env
Supabase errors | Verify tables exist, check credentials

---

## 📝 Environment Variables

### `.env.local` (Frontend)
```
VITE_API_URL=http://localhost:3000/api
```

### `backend/.env` (Backend)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 📚 Documentation Files

1. **SETUP_GUIDE.md** - Complete setup instructions
2. **BACKEND_SETUP.md** - Backend architecture
3. **PROJECT_REWRITE_SUMMARY.md** - What changed
4. **This file** - Quick reference

---

## 🚀 Deploy Commands

```bash
# Push to GitHub
git add -A
git commit -m "Your message"
git push

# Vercel auto-deploys on push!
```

---

**Need help?** Read the full docs in SETUP_GUIDE.md
