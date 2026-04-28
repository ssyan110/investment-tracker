# Tasks: Daily Value Snapshots

## Task 1: Database Schema and Types
- [x] 1.1 Add `DailySnapshot` interface to `types.ts` with fields: `id`, `assetId`, `date`, `marketPrice`, `units`, `marketValue`, `costBasis`
- [x] 1.2 Create SQL migration script for `daily_snapshots` table with columns, unique constraint on `(asset_id, date)`, and indexes on `asset_id` and `date`

## Task 2: Snapshot Service — CRUD and Cache
- [x] 2.1 Create `services/snapshotService.ts` with DB↔TS converters (`convertSnapshot`, `convertSnapshotToDb`) following the `storage.ts` pattern
- [x] 2.2 Implement `upsertSnapshot` and `upsertSnapshotBatch` functions using Supabase upsert with `onConflict: 'asset_id,date'`
- [x] 2.3 Implement `loadAssetSnapshots(assetId, startDate, endDate)` to query snapshots for a single asset within a date range
- [x] 2.4 Implement `loadPortfolioSnapshots(startDate, endDate)` to query and aggregate snapshots (sum of `market_value` per date) across all assets
- [x] 2.5 Implement `deleteAssetSnapshots(assetId)` to delete all snapshots for an asset
- [x] 2.6 Implement localStorage cache functions: `readSnapshotCache`, `writeSnapshotCache`, `clearAssetSnapshotCache` using cache key `it_cache_snapshots`

## Task 3: Snapshot Creation Logic
- [x] 3.1 Implement `createTodaySnapshot(asset, transactions)` that computes units/costBasis via `calculateInventoryState`, computes `marketValue = round(units * marketPrice, 2)`, and upserts the snapshot
- [x] 3.2 Implement `createTodaySnapshotsForAll(assets, transactions)` that filters to assets with units > 0 and calls `createTodaySnapshot` for each, with per-asset error handling (log and continue)

## Task 4: Historical Backfill
- [x] 4.1 Implement date range enumeration helper: given a start date and end date, return an array of all calendar days (YYYY-MM-DD strings) in that range
- [x] 4.2 Implement carry-forward price resolution: given an asset's transactions and a target date, return the most recent known market price on or before that date (from transaction prices)
- [x] 4.3 Implement `backfillIfNeeded(assets, transactions)` that checks existing snapshot count vs expected days, generates backfill snapshots using engine + carry-forward pricing, and upserts in batches of 500; runs only once per session and only when gap > 1 day

## Task 5: Snapshot Recalculation
- [x] 5.1 Implement `recalculateSnapshots(asset, transactions, fromDate)` that loads existing snapshots from `fromDate` onward, recomputes `units`, `costBasis`, and `marketValue` (preserving `marketPrice`), and upserts the updated snapshots

## Task 6: Chart Engine Additions
- [x] 6.1 Implement `snapshotsToPortfolioTimeSeries(snapshots)` that maps `{ date, value }[]` to `PortfolioTimeSeriesPoint[]`
- [x] 6.2 Implement `snapshotsToAssetTimeSeries(snapshots)` that maps `DailySnapshot[]` to `AssetTimeSeriesPoint[]` with `marketValue` and `costBasis` fields
- [x] 6.3 Implement `snapshotsToSparklineData(snapshots, pointCount)` that extracts the last N `marketValue` entries as `number[]`

## Task 7: App.tsx Integration — Snapshot Trigger
- [x] 7.1 Add snapshot state (`snapshots`, `isBackfilling`, `hasRunSnapshotInit` ref) to App.tsx
- [x] 7.2 Add snapshot initialization effect: after data loads, read cache → create today's snapshots → backfill if needed → refresh from Supabase
- [x] 7.3 Wire price update handlers (`handleSavePrice`, `handleFetchAllPrices`, `handleFetchSinglePrice`) to call `createTodaySnapshot` after price changes
- [x] 7.4 Wire transaction CRUD handlers (`handleAddTransaction`, `handleUpdateTransaction`, `handleDeleteTransaction`) to call `recalculateSnapshots` asynchronously after transaction changes

## Task 8: Chart Data Source Migration
- [x] 8.1 Replace `computePortfolioTimeSeries` usage in App.tsx with snapshot-based `snapshotsToPortfolioTimeSeries` + `loadPortfolioSnapshots`
- [x] 8.2 Replace `computeAssetTimeSeries` usage in App.tsx with snapshot-based `snapshotsToAssetTimeSeries` + `loadAssetSnapshots`
- [x] 8.3 Replace `computeSparklineData` usage in App.tsx with snapshot-based `snapshotsToSparklineData`

## Task 9: Asset Deletion Cleanup
- [x] 9.1 Wire `handleDeleteAsset` in App.tsx to call `deleteAssetSnapshots` and `clearAssetSnapshotCache` after asset deletion, with error handling (log and continue)

## Task 10: Property-Based Tests
- [x] 10.1 Write property test: market value invariant — `marketValue === round(units * marketPrice, 2)` for random units/price (Property 1)
  - [x] 🧪 PBT: Property 1 — Market value invariant
- [x] 10.2 Write property test: snapshot units/costBasis match engine output for transactions filtered to target date (Property 2)
  - [x] 🧪 PBT: Property 2 — Snapshot matches engine
- [x] 10.3 Write property test: only assets with units > 0 receive snapshots (Property 3)
  - [x] 🧪 PBT: Property 3 — Only held assets
- [x] 10.4 Write property test: backfill date enumeration covers all calendar days with no gaps (Property 4)
  - [x] 🧪 PBT: Property 4 — Date range completeness
- [x] 10.5 Write property test: carry-forward uses most recent known price, skips dates with no prior price (Property 5)
  - [x] 🧪 PBT: Property 5 — Carry-forward pricing
- [x] 10.6 Write property test: portfolio aggregation equals sum of asset marketValues per date (Property 6)
  - [x] 🧪 PBT: Property 6 — Portfolio aggregation
- [x] 10.7 Write property test: snapshotsToPortfolioTimeSeries preserves date/value (Property 7)
  - [x] 🧪 PBT: Property 7 — Portfolio time series mapping
- [x] 10.8 Write property test: snapshotsToAssetTimeSeries preserves date/marketValue/costBasis (Property 8)
  - [x] 🧪 PBT: Property 8 — Asset time series mapping
- [x] 10.9 Write property test: snapshotsToSparklineData extracts last N marketValues (Property 9)
  - [x] 🧪 PBT: Property 9 — Sparkline extraction
