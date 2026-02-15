# Manual Price Entry - Performance Optimization

## Changes Made

All automatic live price fetching has been **disabled** to improve app loading performance. Prices must now be entered manually by users.

### Files Modified

#### 1. **App.tsx**
- ❌ Removed `useEffect` that automatically called `updateMarketPrices()` on app load
- ❌ Removed `handleFetchLivePrice()` function that fetched live prices for individual assets
- ❌ Removed "Fetch Live Price" button from the asset detail view
- ❌ Removed `isLoadingPrices` state and "Syncing Markets..." indicator
- ✅ Kept manual price input field for users to enter prices directly
- Updated price label to say "Manual Market Price" for clarity

#### 2. **services/marketData.ts**
- ❌ Removed all live price fetching functions:
  - `fetchTaiwanBankGoldPrice()` - No longer fetches gold prices from external APIs
  - `fetchCryptoPrice()` - No longer fetches crypto prices from CoinGecko
  - `fetchStockPrice()` - No longer fetches stock prices from Yahoo Finance
  - `fetchETFPrice()` - No longer fetches ETF prices from Yahoo Finance
- ✅ Kept placeholder functions for backward compatibility
- ✅ Added `updateManualPrice()` utility function

#### 3. **components/PortfolioDashboard.tsx**
- Updated header label from "LIVE UPDATE" to "MANUAL PRICE ENTRY"

## User Workflow

### How to Update Prices

1. Navigate to an asset's detail page
2. In the top section, you'll see the "Manual Market Price" input field
3. Enter the current price directly
4. The price is saved automatically
5. All portfolio calculations (P&L, returns, etc.) update instantly

### Benefits

✅ **Faster App Load** - No waiting for API calls on startup
✅ **More Reliable** - No dependency on external APIs (CoinGecko, Yahoo Finance, etc.)
✅ **Consistent** - Prices are exactly what you set them to be
✅ **Offline Compatible** - App works without internet for price lookups

### Tradeoff

Users now need to manually update prices instead of fetching them automatically. This is a deliberate choice for performance optimization.

## Removed Dependencies

The following external APIs are no longer called:
- CoinGecko API (cryptocurrencies)
- Yahoo Finance API (stocks, ETFs, Taiwan stocks)
- Taiwan Bank / metals.live APIs (gold prices)

## Notes

- All transaction history is preserved (immutable ledger)
- Inventory calculations remain accurate
- Portfolio P&L calculations are based on the prices you enter
- No data migration needed - existing prices remain intact
