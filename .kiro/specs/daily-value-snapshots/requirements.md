# Requirements Document

## Introduction

The portfolio tracker currently generates chart data by replaying the transaction ledger and applying the *current* market price to all historical data points. This means charts only have data points on dates when transactions occurred, and all historical values are retroactively recalculated using today's price — producing misleading charts that don't reflect actual day-to-day value changes.

This feature introduces daily value snapshots: an end-of-day record of each asset's market price and the portfolio's computed value. These snapshots persist in Supabase and serve as the primary data source for all time-series charts, replacing the transaction-replay approach. Even on days with no transactions, the snapshot captures the asset's value based on its market price that day.

## Glossary

- **Snapshot**: A single record capturing one asset's end-of-day market price, units held, and computed market value for a specific date.
- **Snapshot_Service**: The module responsible for creating, storing, retrieving, and managing daily value snapshots.
- **Snapshot_Store**: The Supabase table (`daily_snapshots`) that persists snapshot records.
- **Chart_Engine**: The pure-function module (`chartEngine.ts`) that transforms raw data into chart-ready data structures.
- **Portfolio_Chart**: The area chart component (`PortfolioChart.tsx`) displaying total portfolio value over time.
- **Asset_Performance_Chart**: The line chart component (`AssetPerformanceChart.tsx`) displaying an individual asset's market value and cost basis over time.
- **Sparkline**: The mini inline chart component (`Sparkline.tsx`) showing recent value trend for an asset.
- **Snapshot_Trigger**: The mechanism that initiates snapshot creation — either user-initiated or automatic on app open.
- **Backfill**: The process of generating historical snapshots for dates between the earliest transaction and today where no snapshot exists.

## Requirements

### Requirement 1: Snapshot Data Model

**User Story:** As a developer, I want a well-defined snapshot data structure, so that daily values can be stored and queried consistently.

#### Acceptance Criteria

1. THE Snapshot SHALL contain the fields: `id`, `assetId`, `date` (ISO date string, date-only), `marketPrice`, `units`, `marketValue`, and `costBasis`.
2. THE Snapshot_Store SHALL enforce a unique constraint on the combination of `assetId` and `date` so that only one snapshot per asset per day exists.
3. WHEN a snapshot record is created, THE Snapshot_Service SHALL compute `marketValue` as `units * marketPrice` rounded to 2 decimal places.
4. WHEN a snapshot record is created, THE Snapshot_Service SHALL compute `costBasis` from the inventory state derived by the calculation engine for that asset as of that date.

### Requirement 2: Snapshot Creation on App Open

**User Story:** As a user, I want today's snapshot to be recorded automatically when I open the app, so that I don't have to remember to log values manually.

#### Acceptance Criteria

1. WHEN the app finishes loading assets and transactions from Supabase, THE Snapshot_Trigger SHALL check whether a snapshot exists for today's date for each asset that has units held greater than zero.
2. WHEN no snapshot exists for today's date for a given asset, THE Snapshot_Service SHALL create a snapshot using the asset's current market price and current units held.
3. WHEN a snapshot already exists for today's date for a given asset, THE Snapshot_Service SHALL update that snapshot with the latest market price and recomputed market value.
4. IF the snapshot creation or update fails for any asset, THEN THE Snapshot_Service SHALL log the error and continue processing remaining assets without blocking the app.

### Requirement 3: Snapshot Creation After Price Update

**User Story:** As a user, I want today's snapshot to refresh whenever I update an asset's market price, so that the chart reflects the latest price I entered.

#### Acceptance Criteria

1. WHEN a user manually updates an asset's market price, THE Snapshot_Trigger SHALL create or update today's snapshot for that asset with the new price.
2. WHEN prices are fetched automatically (via the auto-price-fetch feature), THE Snapshot_Trigger SHALL create or update today's snapshot for each asset whose price changed.

### Requirement 4: Historical Backfill

**User Story:** As a user, I want the app to fill in past daily values when I first enable this feature, so that my charts have historical data from day one.

#### Acceptance Criteria

1. WHEN the app detects that the Snapshot_Store contains fewer snapshot records than expected (i.e., the number of calendar days between the earliest transaction date and today), THE Snapshot_Service SHALL perform a backfill operation.
2. WHEN performing a backfill, THE Snapshot_Service SHALL iterate over each calendar day from the earliest transaction date to yesterday.
3. FOR EACH backfill date, THE Snapshot_Service SHALL compute units held and cost basis by replaying transactions up to and including that date using the calculation engine.
4. FOR EACH backfill date where no market price snapshot exists, THE Snapshot_Service SHALL use the most recent known market price for that asset as of that date (carry-forward logic).
5. IF no market price is available for an asset on a backfill date (no transactions and no prior price), THEN THE Snapshot_Service SHALL skip that date for that asset.
6. THE Snapshot_Service SHALL insert backfill snapshots in batches to avoid exceeding Supabase request limits.
7. THE Snapshot_Service SHALL execute the backfill operation only once per app session and only when the gap between existing snapshots and expected snapshots exceeds 1 day.

### Requirement 5: Snapshot Retrieval and Caching

**User Story:** As a user, I want charts to load quickly using cached snapshot data, so that I don't wait for a database round-trip every time.

#### Acceptance Criteria

1. THE Snapshot_Service SHALL provide a function to load all snapshots for a given asset within a date range from the Snapshot_Store.
2. THE Snapshot_Service SHALL provide a function to load aggregated portfolio-level snapshots (sum of all asset market values per date) within a date range.
3. WHEN snapshots are loaded from Supabase, THE Snapshot_Service SHALL write them to localStorage cache using a dedicated cache key.
4. WHEN the app opens, THE Snapshot_Service SHALL serve snapshot data from localStorage cache immediately, then refresh from Supabase in the background.
5. IF the Supabase fetch fails, THEN THE Snapshot_Service SHALL continue serving cached snapshot data and log the error.

### Requirement 6: Portfolio Chart Integration

**User Story:** As a user, I want the portfolio value chart to show realistic daily values instead of only transaction-date values, so that I can see how my portfolio actually performed over time.

#### Acceptance Criteria

1. THE Chart_Engine SHALL provide a new function that converts portfolio-level snapshots into `PortfolioTimeSeriesPoint[]` format.
2. THE Portfolio_Chart SHALL render data sourced from daily snapshots instead of the transaction-replay computation.
3. WHEN the selected time range is applied, THE Chart_Engine SHALL filter snapshot-based data points using the existing `filterByTimeRange` function.
4. WHEN fewer than 2 snapshot data points exist for the selected range, THE Portfolio_Chart SHALL display the existing "Not enough data" placeholder.

### Requirement 7: Asset Performance Chart Integration

**User Story:** As a user, I want each asset's performance chart to show daily market value and cost basis, so that I can see how an individual asset's value changed day by day.

#### Acceptance Criteria

1. THE Chart_Engine SHALL provide a new function that converts asset-level snapshots into `AssetTimeSeriesPoint[]` format (with `marketValue` and `costBasis` fields).
2. THE Asset_Performance_Chart SHALL render data sourced from daily snapshots instead of the transaction-replay computation.
3. WHEN the selected time range is applied, THE Chart_Engine SHALL filter asset snapshot data using the existing `filterByTimeRange` function.

### Requirement 8: Sparkline Integration

**User Story:** As a user, I want the sparkline mini-charts to reflect actual daily value changes, so that the trend indicator on each asset is meaningful.

#### Acceptance Criteria

1. THE Chart_Engine SHALL provide a new function that converts the most recent N asset-level snapshots into a `number[]` array of market values for sparkline rendering.
2. THE Sparkline component SHALL receive data derived from daily snapshots instead of the transaction-replay computation.
3. WHEN fewer than 2 snapshot data points exist for an asset, THE Sparkline component SHALL render nothing (existing behavior preserved).

### Requirement 9: Snapshot Cleanup on Asset Deletion

**User Story:** As a user, I want snapshot data to be removed when I delete an asset, so that orphaned records don't accumulate in the database.

#### Acceptance Criteria

1. WHEN a user deletes an asset, THE Snapshot_Service SHALL delete all snapshot records associated with that asset's ID from the Snapshot_Store.
2. WHEN a user deletes an asset, THE Snapshot_Service SHALL remove the corresponding snapshot data from the localStorage cache.
3. IF the snapshot deletion fails, THEN THE Snapshot_Service SHALL log the error without blocking the asset deletion.

### Requirement 10: Snapshot Recalculation After Transaction Changes

**User Story:** As a user, I want snapshots to stay accurate when I add, edit, or delete transactions, so that historical chart data reflects the corrected ledger.

#### Acceptance Criteria

1. WHEN a user adds, edits, or deletes a transaction, THE Snapshot_Service SHALL recalculate the `units`, `costBasis`, and `marketValue` fields for all snapshots of the affected asset from the transaction date onward.
2. THE Snapshot_Service SHALL preserve the original `marketPrice` in each snapshot during recalculation (only derived fields change).
3. THE Snapshot_Service SHALL perform the recalculation asynchronously without blocking the UI.
4. IF the recalculation fails, THEN THE Snapshot_Service SHALL log the error and mark the affected asset's snapshots as potentially stale.

### Requirement 11: Supabase Schema

**User Story:** As a developer, I want a clear database schema for the snapshot table, so that the storage layer can be set up correctly.

#### Acceptance Criteria

1. THE Snapshot_Store SHALL be a Supabase table named `daily_snapshots` with columns: `id` (uuid, primary key), `asset_id` (text, foreign key to assets), `date` (date), `market_price` (numeric), `units` (numeric), `market_value` (numeric), `cost_basis` (numeric).
2. THE Snapshot_Store SHALL have a unique index on `(asset_id, date)`.
3. THE Snapshot_Store SHALL have an index on `asset_id` for efficient per-asset queries.
4. THE Snapshot_Store SHALL have an index on `date` for efficient date-range queries.
5. WHEN the `daily_snapshots` table does not exist, THE application SHALL provide a SQL migration script that creates the table with all required columns, constraints, and indexes.
