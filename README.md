# Investment Tracker

A stunning, professional-grade personal investment tracking system featuring an **iOS 26 Liquid Glass** dark mode aesthetic. Designed for mobile-first responsiveness with double-entry style validation and strict inventory accounting.

![Investment Tracker Preview](https://github.com/ssyan110/investment-tracker/assets/preview) *(Add your own screenshot here)*

## ✨ Features

- **📱 Mobile-First Liquid Glass UI:** Beautiful iOS-style frosted glass cards, seamless animations, and dark mode optimizations.
- **🚀 Serverless Architecture:** Lightning-fast direct database queries via Supabase Edge Network. Zero cold-starts.
- **🌍 Multi-Asset Tracking:** Manage Gold, ETFs, Stocks, and Crypto all in one unified dashboard.
- **📊 Advanced Accounting:** Rigorous inventory tracking supporting FIFO, LIFO, and Average Cost methods.
- **📈 Portfolio Dashboard:** Real-time calculation of Total Value, Unrealized PnL, and ROI percentages.
- **📔 Immutable Ledger:** Double-entry validation for every buy, sell, and fee transaction.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A [Supabase](https://supabase.com/) account and project

### Development Setup

**1. Clone and Install Dependencies**
```bash
git clone https://github.com/ssyan110/investment-tracker.git
cd investment-tracker
npm install
```

**2. Configure Environment Variables**
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**3. Setup Supabase Database**
Ensure your Supabase project has the following tables created (`assets` and `transactions`). 
*Note: Ensure Row Level Security (RLS) policies are appropriately configured to allow your app to read/write data.*

**4. Start Development Server**
```bash
npm run dev
```

**5. Open Browser**
Navigate to `http://localhost:5173`

---

## 📁 Project Structure

```
investment-tracker/
├── components/             # React UI Components
│   ├── AddAssetForm.tsx    # Glass modal for new assets
│   ├── DataManagement.tsx  # JSON Export/Import tools
│   ├── InventoryTable.tsx  # Audit trail UI
│   ├── LedgerTable.tsx     # Transaction history UI
│   ├── PortfolioDashboard.tsx # Main summary cards
│   └── TransactionForm.tsx # Glass transaction input
│
├── services/               
│   ├── storage.ts          # Core Supabase Data API functions
│   └── supabaseClient.ts   # Supabase client initializer
│
├── App.tsx                 # Main application & routing logic
├── engine.ts               # Core accounting & math engine
├── index.css               # Liquid Glass design system & tokens
├── types.ts                # TypeScript interfaces
├── utils.ts                # Formatting utilities
└── vite.config.ts          # Vite configuration
```

---

## 🛠️ Build & Deploy

### Production Build
```bash
npm run build
```

### Deploy to Vercel
This project is optimized for zero-config deployment on Vercel.

1. Push your code to GitHub.
2. Import the repository in your Vercel dashboard.
3. Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the **Environment Variables** section in Vercel.
4. Deploy!

---

## 📦 Tech Stack

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Design System:** Custom iOS 26 Liquid Glass CSS (`index.css`)
- **Database / Backend:** Supabase (PostgreSQL, Data API)
- **Deployment:** Vercel

---

## 📄 License

MIT
