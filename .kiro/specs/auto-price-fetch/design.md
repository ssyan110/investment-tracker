# Design Document: Auto Price Fetch

## Overview

This feature adds automatic market price fetching to the Investment Tracker SPA. Currently, users must manually edit the `currentMarketPrice` field for each asset. This design introduces a Supabase Edge Function that acts as a server-side proxy to external price APIs, and a client-side service that orchestrates batch and single-asset price updates.

The architecture follows the existing pattern: browser SPA → Supabase. The Edge Function handles CORS avoidance, API key isolation, and data source routing. The client-side `PriceFetcher` service categorizes assets, calls the proxy, and writes updated prices back via the existing `updateAsset()` flow.

### Key Design Decisions

1. **Single Edge Function endpoint** — One function (`fetch-prices`) handles all asset types. It receives a typed array of symbol requests and fans out to the appropriate data sources internally. This minimizes cold starts and simplifies client logic.

2. **Data source selection**:
   - **Taiwan stocks/ETFs**: TWSE MIS API (`mis.twse.com.tw/stock/api/getStockInfo.jsp`) — free, no auth, returns real-time quotes in JSON.
   - **Bank of Taiwan Gold Passbook**: HTML scraping of `rate.bot.com.tw/gold/passbook` — no public JSON API exists; the Edge Function parses the HTML table to extract the selling price (本行賣出) in TWD/gram.
   - **US stocks**: Yahoo Finance unofficial v8 quote API (`query1.finance.yahoo.com/v8/finance/chart/{symbol}`) — free, no auth required for basic quotes.
   - **Crypto**: CoinGecko free API (`api.coingecko.com/api/v3/simple/price`) — free tier, no auth for basic price queries, supports USDT denomination.

3. **Staleness tracking via `lastPriceFetchedAt`** — A new field on the Asset interface tracks when the price was last auto-fetched. This drives the stale price indicator (>24h) without requiring a separate table.

4. **Partial failure tolerance** — The proxy returns successful results alongside error entries. The client skips failed symbols and reports them to the user.

## Architecture

```mermaid
flowchart LR
    subgraph Browser SPA
        A[App.tsx] --> B[PriceFetcher Service]
        B --> C[supabaseClient.ts]
    end

    subgraph Supabase
        C -->|invoke| D[Edge Function: fetch-prices]
        D --> E[TWSE API]
        D --> F[BOT Gold Page]
        D --> G[Yahoo Finance API]
        D --> H[CoinGecko API]
    end

    D -->|Price_Result[]| C
    B -->|updateAsset| I[(Supabase DB)]
```

### Request Flow

1. User taps "Fetch Prices" → `App.tsx` calls `PriceFetcher.fetchAllPrices(assets)`
2. `PriceFetcher` categorizes assets by type/symbol pattern into groups: `TW_STOCK`, `US_STOCK`, `GOLD`, `CRYPTO`
3. `PriceFetcher` invokes the Edge Function via `supabase.functions.invoke('fetch-prices', { body: { symbols } })`
4. Edge Function fans out to external APIs in parallel, collects results
5. Edge Function returns `PriceResult[]` (successes + errors)
6. `PriceFetcher` calls `updateAsset()` for each successful result, updating `currentMarketPrice` and `lastPriceFetchedAt`
7. `PriceFetcher` returns a summary: `{ updated: number, failed: string[] }`

## Components and Interfaces

### 1. Supabase Edge Function: `fetch-prices`

**Location**: `supabase/functions/fetch-prices/index.ts`

**Runtime**: Deno (Supabase Edge Functions)

**Request body**:
```typescript
interface FetchPricesRequest {
  symbols: SymbolRequest[];
}

interface SymbolRequest {
  symbol: string;
  type: 'TW_STOCK' | 'US_STOCK' | 'GOLD' | 'CRYPTO';
}
```

**Response body**:
```typescript
interface FetchPricesResponse {
  results: PriceResult[];
}

interface PriceResult {
  symbol: string;
  price: number | null;
  currency: string;
  timestamp: string; // ISO 8601
  error?: string;    // present when price is null
}
```

**Internal routing logic**:
- Groups `symbols` by `type`
- Fetches each group in parallel using `Promise.allSettled`
- TW_STOCK: calls TWSE MIS API with pipe-delimited stock codes (`tse_{symbol}.tw`)
- GOLD: fetches and parses Bank of Taiwan gold passbook page
- US_STOCK: calls Yahoo Finance chart API per symbol (batched with `Promise.allSettled`)
- CRYPTO: calls CoinGecko `/simple/price` with comma-joined IDs, `vs_currencies=usd` (mapped to USDT)

**Timeout**: 10-second overall timeout via `AbortController`

### 2. Client-Side Price Fetcher Service

**Location**: `services/priceFetcher.ts`

```typescript
// Symbol classification
function classifySymbol(asset: Asset): SymbolRequest['type']

// Main entry points
async function fetchAllPrices(assets: Asset[]): Promise<PriceFetchSummary>
async function fetchSinglePrice(asset: Asset): Promise<PriceResult>

// Internal
async function invokePriceProxy(symbols: SymbolRequest[]): Promise<PriceResult[]>
async function applyPriceResults(assets: Asset[], results: PriceResult[]): Promise<PriceFetchSummary>
```

**`classifySymbol` logic**:
- `asset.type === GOLD` → `'GOLD'`
- `asset.type === CRYPTO` → `'CRYPTO'`
- `asset.type === STOCK || asset.type === ETF`:
  - `/^\d+$/.test(asset.symbol)` → `'TW_STOCK'`
  - otherwise → `'US_STOCK'`

### 3. UI Changes in App.tsx

- **Home view header**: Add "Fetch Prices" button with loading spinner state
- **Asset detail view**: Add "Refresh Price" icon button next to the market price display
- **Stale indicator**: Small warning dot/icon next to prices older than 24 hours or never fetched
- New state variables: `isFetchingPrices`, `fetchingPriceAssetId`

### 4. Asset Interface Extension

The `Asset` interface in `types.ts` gains one optional field:

```typescript
export interface Asset {
  // ... existing fields
  lastPriceFetchedAt?: string; // ISO 8601 timestamp
}
```

The Supabase `assets` table needs a corresponding `last_price_fetched_at` column (type: `timestamptz`, nullable).

## Data Models

### PriceResult (shared between Edge Function and client)

| Field     | Type            | Description                                    |
|-----------|-----------------|------------------------------------------------|
| symbol    | string          | Asset symbol as sent in the request            |
| price     | number \| null  | Fetched price, null on failure                 |
| currency  | string          | Currency code (TWD, USD, USDT)                 |
| timestamp | string          | ISO 8601 time of the price data                |
| error     | string?         | Error message when price is null               |

### SymbolRequest

| Field  | Type   | Description                                      |
|--------|--------|--------------------------------------------------|
| symbol | string | Ticker symbol (e.g. "2330", "AAPL", "BTC", "AU") |
| type   | string | One of: TW_STOCK, US_STOCK, GOLD, CRYPTO         |

### PriceFetchSummary

| Field   | Type     | Description                          |
|---------|----------|--------------------------------------|
| updated | number   | Count of successfully updated assets |
| failed  | string[] | Symbols that failed to fetch         |

### Database Schema Change

```sql
ALTER TABLE assets ADD COLUMN last_price_fetched_at timestamptz;
```

The `storage.ts` converters need updating:
- `convertAsset`: map `last_price_fetched_at` → `lastPriceFetchedAt`
- `convertAssetToDb`: map `lastPriceFetchedAt` → `last_price_fetched_at`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Response completeness invariant

*For any* array of `SymbolRequest` objects sent to the Price Proxy (or the `PriceFetcher` service), the returned `PriceResult[]` SHALL contain exactly one entry per input symbol — regardless of whether individual external API calls succeed or fail. Each entry has either a non-null `price` (success) or a non-null `error` (failure), never both and never neither.

**Validates: Requirements 1.1, 1.6**

### Property 2: Result partitioning correctness

*For any* set of `PriceResult` objects returned from the Price Proxy, the `PriceFetcher` SHALL partition them such that: (a) `updateAsset` is called exactly once for each result where `price` is non-null, (b) each result where `error` is non-null appears in the `failed` list, and (c) `summary.updated + summary.failed.length` equals the total number of input assets.

**Validates: Requirements 2.2, 2.3, 2.5**

### Property 3: Symbol classification determinism

*For any* `Asset` object, `classifySymbol` SHALL return:
- `'GOLD'` when `asset.type === GOLD`
- `'CRYPTO'` when `asset.type === CRYPTO`
- `'TW_STOCK'` when `asset.type` is `STOCK` or `ETF` and `asset.symbol` matches `/^\d+$/`
- `'US_STOCK'` when `asset.type` is `STOCK` or `ETF` and `asset.symbol` contains at least one alphabetic character

The classification is a pure function of `(asset.type, asset.symbol)` and SHALL be deterministic.

**Validates: Requirements 2.4, 8.1, 8.2**

### Property 4: Price staleness determination

*For any* `lastPriceFetchedAt` value (including `null` or `undefined`), the staleness check SHALL return `true` (stale) if and only if the value is null/undefined OR the timestamp is more than 24 hours before the current time. A timestamp within the last 24 hours SHALL always return `false` (fresh).

**Validates: Requirements 5.2, 5.3, 5.4**

### Property 5: BOT gold price HTML parsing

*For any* HTML string that contains a Bank of Taiwan gold passbook price table with a valid numeric selling price (本行賣出), the parser SHALL extract a positive numeric value in TWD per gram. For any HTML string that does not contain a parseable selling price, the parser SHALL return an error.

**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### Edge Function Errors

| Scenario | Handling |
|----------|----------|
| External API timeout (>8s per source) | `AbortController` cancels the request; return error entry for affected symbols |
| External API returns non-200 | Catch and return error entry with HTTP status in message |
| HTML parsing fails (BOT gold) | Return error entry: "Bank of Taiwan data source unavailable" |
| Invalid request body | Return 400 with descriptive validation error |
| Overall function timeout (10s) | Deno runtime kills the function; client receives network error |

### Client-Side Errors

| Scenario | Handling |
|----------|----------|
| Edge Function invocation fails (network) | Show error toast: "Failed to fetch prices. Check your connection." |
| Partial failures in batch | Show warning toast listing failed symbols; update successful ones |
| All symbols fail | Show error toast: "Could not fetch any prices." |
| `updateAsset` fails for a symbol | Include in failed list; continue with remaining symbols |
| User double-taps fetch button | Button is disabled during fetch via `isFetchingPrices` state |

### Retry Strategy

No automatic retry is implemented in v1. The user can manually retry by tapping the button again. This keeps the implementation simple and avoids unexpected API rate limiting.

## Testing Strategy

### Unit Tests (Example-Based)

Unit tests cover specific UI interactions and integration points:

- **Fetch Prices button**: renders in home view, triggers `fetchAllPrices`, shows loading state, displays correct toast on success/partial failure/error
- **Refresh Price button**: renders in asset detail, triggers `fetchSinglePrice`, shows loading state
- **Manual price edit**: still works, updates `lastPriceFetchedAt`
- **Portfolio recalculation**: positions update after price fetch

### Property-Based Tests

Property-based tests validate the core logic using `fast-check` (TypeScript PBT library). Each test runs a minimum of 100 iterations.

| Property | What it tests | Generator strategy |
|----------|--------------|-------------------|
| Property 1: Response completeness | Edge Function always returns one result per input | Random arrays of SymbolRequest (0-50 items), mocked external APIs with random success/failure |
| Property 2: Result partitioning | Client correctly splits results into updated/failed | Random PriceResult arrays with mixed null/non-null prices |
| Property 3: Symbol classification | `classifySymbol` is deterministic and correct | Random Asset objects with varied types and symbol patterns (digits, alpha, mixed) |
| Property 4: Price staleness | Staleness check respects 24h threshold | Random timestamps (past, future, null, exactly 24h boundary) |
| Property 5: BOT gold parsing | Parser extracts numeric price from valid HTML | Generated HTML table variations with valid/invalid/missing price cells |

### Integration Tests

Integration tests verify end-to-end behavior with mocked external APIs:

- Edge Function correctly routes TW symbols to TWSE API
- Edge Function correctly routes US symbols to Yahoo Finance
- Edge Function correctly routes GOLD to BOT scraper
- Edge Function correctly routes CRYPTO to CoinGecko
- Edge Function handles mixed-type batch requests
- 10-second timeout is respected for large batches
