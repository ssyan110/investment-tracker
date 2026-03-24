# Investment Tracker

A personal portfolio tracker for Gold, ETFs, Stocks, and Crypto. Record BUY/SELL transactions, track average cost, and see realized & unrealized P&L — all from a clean mobile-first UI with an iOS "Liquid Glass" dark mode design.

Data is stored in Supabase (PostgreSQL). The app loads instantly from a localStorage cache and syncs with the database in the background.

## Screenshots

> _Add your own screenshots here._

## What It Does

- Track multiple asset types in one place (Gold, ETF, Stock, Crypto)
- Record BUY and SELL transactions with quantity, price, fees, and optional notes
- Automatically compute average cost, book value, and realized P&L per transaction
- View unrealized P&L and return % based on manually entered market prices
- Export and import all data as JSON for backup
- Works offline with cached data; syncs when online

## How It Works

Every transaction is stored in an immutable ledger. A pure calculation engine replays the ledger to derive inventory state (units held, average cost, book value, realized P&L) for each asset. The portfolio view combines this with the current market price you enter to show unrealized gains.

Only the Average Cost accounting method is supported.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- A [Supabase](https://supabase.com/) account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/ssyan110/investment-tracker.git
cd investment-tracker
npm install
```

### 2. Create the Supabase tables

In your Supabase project, go to the SQL Editor and run:

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,          -- GOLD, ETF, STOCK, CRYPTO
  method TEXT NOT NULL,        -- AVERAGE_COST
  currency TEXT NOT NULL,      -- TWD, USD, USDT, JPY, EUR
  current_market_price NUMERIC DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  date TEXT NOT NULL,          -- ISO date string (YYYY-MM-DD)
  type TEXT NOT NULL,          -- BUY, SELL
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  fees NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  note TEXT
);
```

> Make sure Row Level Security (RLS) is either disabled on these tables or you have policies that allow read/write access for the `anon` role.

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in your Supabase dashboard under **Settings → API**.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **Add an asset** — On the home screen, expand a type group (e.g. ETF) and tap "+ Add ETF". Enter the symbol, name, and currency.
2. **Record a transaction** — Tap the ＋ button (bottom-right) or open an asset and use the trade form. Enter date, quantity, price per unit, and fees.
3. **Update market price** — Open an asset, tap the current price to edit it, then save. This is used to calculate unrealized P&L.
4. **View your portfolio** — The home screen shows total portfolio value and P&L. Tap any asset to see its dashboard, transaction ledger, and inventory audit trail.
5. **Export / Import** — Use the Data Management section on the home screen to export all data as JSON or import from a backup file.

### Mobile

- Pull down to refresh data from Supabase
- Swipe left on a transaction to reveal edit/delete actions
- Use the floating ＋ button to quickly add a trade from any screen

### Desktop

- A sidebar shows all assets grouped by type for quick navigation
- Click any asset in the sidebar to jump directly to it
- Keyboard shortcuts: `N` to open new trade, `Esc` to close modals

## Supported Currencies

TWD, USD, USDT, JPY, EUR

Each asset has its own currency. The portfolio summary aggregates values across currencies (no FX conversion).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript (strict mode) |
| Styling | Tailwind CSS (CDN) + custom CSS variables |
| Build | Vite 5 |
| Database | Supabase (PostgreSQL) |
| Caching | localStorage (read-through cache) |

## Project Structure

```
├── App.tsx                 # Root component — all state and handlers
├── engine.ts               # Pure average-cost calculation engine
├── types.ts                # TypeScript interfaces and enums
├── utils.ts                # Formatting helpers
├── index.css               # Liquid Glass design system
├── components/
│   ├── AddAssetForm.tsx    # New asset modal
│   ├── ConfirmModal.tsx    # Confirmation dialog
│   ├── DataManagement.tsx  # Export / Import / Reset
│   ├── InventoryTable.tsx  # Inventory audit trail
│   ├── LedgerTable.tsx     # Transaction ledger
│   ├── PortfolioDashboard.tsx  # Summary cards
│   ├── Toast.tsx           # Toast notifications
│   └── TransactionForm.tsx # BUY/SELL form
├── services/
│   ├── storage.ts          # Supabase CRUD + cache layer
│   └── supabaseClient.ts   # Supabase client init
```

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Deploy to any static hosting (Vercel, Netlify, GitHub Pages, etc.). Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables in your hosting provider.

## License

MIT
