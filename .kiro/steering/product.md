# Product Overview

Investment Tracker is a single-page portfolio management app for tracking multi-asset investments (Gold, ETF, Stock, Crypto). It uses an average-cost accounting engine to compute inventory state, realized P&L, and unrealized P&L from an immutable transaction ledger.

## Core Concepts

- **Assets**: Defined by symbol, type, accounting method (Average Cost / FIFO / LIFO), and currency. Market prices are entered manually (no live feeds).
- **Transaction Ledger**: Immutable record of BUY/SELL transactions. Each transaction stores quantity, price per unit, fees, and a computed `totalAmount`.
- **Inventory State**: Derived from the ledger by the calculation engine. Tracks units held, average cost, book value, and realized P&L after each transaction.
- **Portfolio Positions**: Combines inventory state with current market price to show unrealized P&L and return percentage.

## Key Behaviors

- Data persists in Supabase. localStorage serves as a read-through cache for instant load.
- The calculation engine (`engine.ts`) is pure, stateless, and deterministic — no side effects.
- A "golden test" runs on startup (via `useMemo`) to validate engine correctness.
- Data import/export uses JSON files for backup and restore.
- Default currency is TWD. Supported currencies: TWD, USD, USDT, JPY, EUR.
