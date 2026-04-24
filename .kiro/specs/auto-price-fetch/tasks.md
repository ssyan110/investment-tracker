# Implementation Plan: Auto Price Fetch

## Overview

Implement automatic market price fetching for the Investment Tracker. The work proceeds bottom-up: database schema change → shared types → Supabase Edge Function (server-side proxy) → client-side PriceFetcher service → UI integration in App.tsx. Each task builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Extend Asset interface and DB converters for `lastPriceFetchedAt`
  - [x] 1.1 Add `lastPriceFetchedAt` field to Asset interface and update DB converters
    - Add `lastPriceFetchedAt?: string` (ISO 8601) to the `Asset` interface in `types.ts`
    - Update `convertAsset` in `services/storage.ts` to map `last_price_fetched_at` → `lastPriceFetchedAt`
    - Update `convertAssetToDb` in `services/storage.ts` to map `lastPriceFetchedAt` → `last_price_fetched_at`
    - Run the SQL migration on Supabase: `ALTER TABLE assets ADD COLUMN last_price_fetched_at timestamptz;`
    - _Requirements: 5.1, 6.2_

- [x] 2. Create the Supabase Edge Function `fetch-prices`
  - [x] 2.1 Scaffold the Edge Function and implement request validation
    - Create `supabase/functions/fetch-prices/index.ts` (Deno runtime)
    - Define `SymbolRequest`, `PriceResult`, `FetchPricesRequest`, `FetchPricesResponse` interfaces
    - Implement CORS headers and request body validation (return 400 for invalid input)
    - Set up a 10-second overall `AbortController` timeout
    - _Requirements: 1.1, 1.6, 1.7_

  - [x] 2.2 Implement TWSE price fetcher for Taiwan stocks/ETFs
    - Implement handler that calls TWSE MIS API (`mis.twse.com.tw/stock/api/getStockInfo.jsp`) with pipe-delimited stock codes (`tse_{symbol}.tw`)
    - Parse JSON response to extract current price
    - Return `PriceResult` with `currency: 'TWD'`
    - Handle API errors and timeouts, returning error entries for failed symbols
    - _Requirements: 1.2_

  - [x] 2.3 Implement BOT Gold Passbook price fetcher
    - Implement handler that fetches Bank of Taiwan gold passbook page (`rate.bot.com.tw/gold/passbook`)
    - Parse HTML to extract the selling price (本行賣出) in TWD per gram
    - Return `PriceResult` with `currency: 'TWD'`
    - Return error entry with "Bank of Taiwan data source unavailable" on parse failure
    - _Requirements: 1.3, 7.1, 7.2, 7.3_

  - [x] 2.4 Write property test for BOT gold HTML parsing
    - **Property 5: BOT gold price HTML parsing**
    - Generate HTML table variations with valid/invalid/missing selling price cells using `fast-check` arbitraries
    - Verify parser extracts a positive numeric TWD/gram value from valid HTML and returns an error for invalid HTML
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 2.5 Implement US stock price fetcher via Yahoo Finance
    - Implement handler that calls Yahoo Finance chart API (`query1.finance.yahoo.com/v8/finance/chart/{symbol}`)
    - Parse JSON response to extract current price
    - Return `PriceResult` with `currency: 'USD'`
    - Handle API errors and timeouts per symbol using `Promise.allSettled`
    - _Requirements: 1.4_

  - [x] 2.6 Implement crypto price fetcher via CoinGecko
    - Implement handler that calls CoinGecko `/api/v3/simple/price` with comma-joined IDs and `vs_currencies=usd`
    - Map response to `PriceResult` entries with `currency: 'USDT'`
    - Handle API errors, returning error entries for failed symbols
    - _Requirements: 1.5_

  - [x] 2.7 Wire up routing logic and parallel dispatch
    - Group incoming `symbols` by `type`
    - Dispatch each group to its handler in parallel using `Promise.allSettled`
    - Merge all results into a single `PriceResult[]` response, ensuring one entry per input symbol
    - _Requirements: 1.1, 1.6, 1.7_

- [x] 3. Checkpoint
  - Ensure the Edge Function compiles and handles all four data sources. Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement client-side PriceFetcher service
  - [x] 4.1 Create `services/priceFetcher.ts` with symbol classification and proxy invocation
    - Implement `classifySymbol(asset: Asset): SymbolRequest['type']` — GOLD → `'GOLD'`, CRYPTO → `'CRYPTO'`, numeric STOCK/ETF → `'TW_STOCK'`, alphabetic STOCK/ETF → `'US_STOCK'`
    - Implement `invokePriceProxy(symbols: SymbolRequest[]): Promise<PriceResult[]>` using `supabase.functions.invoke('fetch-prices', { body: { symbols } })`
    - Define `PriceFetchSummary` type: `{ updated: number; failed: string[] }`
    - _Requirements: 2.1, 2.4, 8.1, 8.2, 8.3_

  - [x] 4.2 Write property test for symbol classification
    - **Property 3: Symbol classification determinism**
    - Generate random `Asset` objects with varied types (GOLD, CRYPTO, STOCK, ETF) and symbol patterns (all-digit, alphabetic, mixed) using `fast-check`
    - Verify `classifySymbol` is a pure function of `(asset.type, asset.symbol)` and returns the correct category
    - **Validates: Requirements 2.4, 8.1, 8.2**

  - [x] 4.3 Implement `applyPriceResults` and main entry points
    - Implement `applyPriceResults(assets: Asset[], results: PriceResult[]): Promise<PriceFetchSummary>` — calls `updateAsset` for each successful result (setting `currentMarketPrice` and `lastPriceFetchedAt`), collects failed symbols
    - Implement `fetchAllPrices(assets: Asset[]): Promise<PriceFetchSummary>` — classifies all assets, invokes proxy, applies results
    - Implement `fetchSinglePrice(asset: Asset): Promise<PriceResult>` — classifies one asset, invokes proxy, applies result
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 4.4 Write property test for response completeness
    - **Property 1: Response completeness invariant**
    - Generate random arrays of `SymbolRequest` (0–50 items) and mock `PriceResult[]` with random success/failure
    - Verify the result array contains exactly one entry per input symbol, each with either non-null `price` or non-null `error` (never both, never neither)
    - **Validates: Requirements 1.1, 1.6**

  - [x] 4.5 Write property test for result partitioning
    - **Property 2: Result partitioning correctness**
    - Generate random `PriceResult[]` arrays with mixed null/non-null prices
    - Verify `applyPriceResults` calls `updateAsset` exactly once per successful result, includes each error in `failed`, and `summary.updated + summary.failed.length` equals total input count
    - **Validates: Requirements 2.2, 2.3, 2.5**

- [x] 5. Checkpoint
  - Ensure PriceFetcher service compiles and all property tests pass. Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement staleness helper and its property test
  - [x] 6.1 Create `isPriceStale` utility function
    - Add a function (in `services/priceFetcher.ts` or `utils.ts`) that returns `true` if `lastPriceFetchedAt` is null/undefined or older than 24 hours, `false` otherwise
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 6.2 Write property test for price staleness
    - **Property 4: Price staleness determination**
    - Generate random timestamps (past, future, null, undefined, exactly 24h boundary) using `fast-check`
    - Verify `isPriceStale` returns `true` iff value is null/undefined or >24h old, `false` otherwise
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 7. Integrate UI: "Fetch Prices" button and "Refresh Price" button
  - [x] 7.1 Add "Fetch Prices" button to home view header in App.tsx
    - Add `isFetchingPrices` state variable
    - Render a "Fetch Prices" button in the header (next to existing refresh button), visible on both mobile and desktop
    - On click: set `isFetchingPrices = true`, call `fetchAllPrices(assets)`, update `assets` state with new prices, show success/warning/error toast based on result, set `isFetchingPrices = false`
    - Disable button and show spinner while `isFetchingPrices` is true
    - After successful fetch, recalculate portfolio positions (already automatic via `useMemo` on `assets`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 7.2 Add "Refresh Price" button to asset detail view in App.tsx
    - Add `fetchingPriceAssetId` state variable
    - Render a refresh icon button next to the market price display in the asset detail view
    - On click: set `fetchingPriceAssetId`, call `fetchSinglePrice(asset)`, update the single asset in state, show toast, clear `fetchingPriceAssetId`
    - Show spinner on the button while fetching
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Add stale price indicator to home view and asset detail view
    - Use `isPriceStale(asset.lastPriceFetchedAt)` to conditionally render a small warning dot/icon next to asset prices
    - Show indicator in both the home asset list and the asset detail price display
    - Remove indicator when a successful fetch updates the asset
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 7.4 Update manual price edit to set `lastPriceFetchedAt`
    - In `handleSavePrice`, include `lastPriceFetchedAt: new Date().toISOString()` in the `updateAsset` call
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Final checkpoint
  - Ensure all tests pass, the Edge Function is deployable, and the UI renders correctly. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use `fast-check` (already installed) and validate the 5 correctness properties from the design
- The Edge Function runs in Deno (Supabase Edge Functions runtime) — use Deno-compatible APIs
- All client-side code is TypeScript with React 18
