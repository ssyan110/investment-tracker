# Investment Tracker

A mobile-first portfolio management app for tracking multi-asset investments (Gold, ETF, Stock, Crypto). Uses an average-cost accounting engine to compute inventory state, realized P&L, and unrealized P&L from an immutable transaction ledger.

Built with an iOS "Liquid Glass" dark mode design system.

## Features

- Multi-asset tracking: Gold, ETFs, Stocks, Crypto
- Average Cost accounting engine (pure, stateless, deterministic)
- Immutable transaction ledger with BUY/SELL operations
- Portfolio dashboard with unrealized P&L and return %
- Tap-to-edit market prices (manual entry, no live feeds)
- Transaction notes
- Pull-to-refresh gesture (mobile)
- FAB quick-trade bottom sheet from any screen
- Swipe-to-edit/delete transactions (mobile), inline buttons (desktop)
- Glass-styled confirmation modals and toast notifications
- Desktop sidebar layout with asset tree navigation
- Asset search across all types
- Keyboard shortcuts: N (new trade), Esc (close modals)
- Sync status indicator (cached vs live)
- JSON export/import for backup and restore
- localStorage read-through cache for instant load
- Multi-currency support: TWD, USD, USDT, JPY, EUR

## Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project with `assets` and `transactions` tables

### Setup

```bash
git clone https://github.com/ssyan110/investment-tracker.git
cd investment-tracker
npm install
```

Create `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start dev server:
```bash
npm run dev
```

Open `http://localhost:5173`

## Project Structure

```
├── index.html              # Entry HTML (loads Tailwind CDN)
├── index.tsx               # React root mount
├── index.css               # Liquid Glass design system (CSS variables, animations)
├── App.tsx                 # Root component — state, handlers, view routing
├── types.ts                # TypeScript types and enums
├── engine.ts               # Pure average-cost calculation engine
├── utils.ts                # Formatting helpers (currency, units, rounding)
├── components/
│   ├── AddAssetForm.tsx    # Modal form for creating new assets
│   ├── ConfirmModal.tsx    # Glass-styled confirmation dialog
│   ├── DataManagement.tsx  # Export/Import/Reset controls
│   ├── InventoryTable.tsx  # Audit trail view of inventory state
│   ├── LedgerTable.tsx     # Transaction list with swipe-to-edit/delete
│   ├── PortfolioDashboard.tsx # Summary cards + holdings
│   ├── Toast.tsx           # Toast notification system
│   └── TransactionForm.tsx # BUY/SELL form with note field
├── services/
│   ├── supabaseClient.ts   # Supabase client init
│   └── storage.ts          # CRUD + localStorage cache layer
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Tech Stack

- React 18, TypeScript (strict), Vite 5
- Tailwind CSS (CDN) + custom Liquid Glass CSS
- Supabase (PostgreSQL via `@supabase/supabase-js`)

## Build

```bash
npm run build     # Production build
npm run preview   # Preview production build
```

## License

MIT
