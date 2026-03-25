# Design Document: Modern UI & Charts

## Overview

This feature adds interactive data visualization charts and modernizes the Investment Tracker's dashboard UI. The implementation introduces a chart data engine (pure functions in `chartEngine.ts`), integrates Recharts as the charting library, and refactors the hero section and asset cards for a polished finance-app aesthetic.

All chart data is derived from the existing transaction ledger and manually-entered market prices. No live price feeds are involved. The chart engine follows the same pure-function, zero-side-effect pattern established by `engine.ts`.

### Key Design Decisions

1. **Recharts** chosen over Lightweight Charts because it is React-native (composable JSX), supports all required chart types (line, area, bar, pie/donut), has built-in responsive containers, and works well with custom CSS theming. It also has zero-config tooltip/legend support.
2. **Chart data engine as a separate module** (`chartEngine.ts`) rather than extending `engine.ts`, to maintain single-responsibility and keep the existing inventory engine untouched.
3. **No new routing** — charts integrate into the existing `HOME` and `ASSET_DETAIL` views via the existing `ViewState` pattern in `App.tsx`.
4. **No new state management** — chart data is derived via `useMemo` from existing `transactions`, `assets`, and `portfolioPositions` state, consistent with the current architecture.

## Architecture

```mermaid
graph TD
    subgraph "Data Layer (existing)"
        TX[transactions: Transaction[]]
        AS[assets: Asset[]]
        ENG[engine.ts → InventoryState[]]
        POS[portfolioPositions: PortfolioPosition[]]
    end

    subgraph "Chart Data Engine (new)"
        CE[chartEngine.ts]
        CE_PV[computePortfolioTimeSeries]
        CE_AL[computeAllocationBreakdown]
        CE_AP[computeAssetTimeSeries]
        CE_PL[computePnlByAsset]
    end

    subgraph "Chart Components (new)"
        PC[PortfolioChart]
        AC[AllocationChart]
        ASC[AssetPerformanceChart]
        PLC[PnlBarChart]
        TRS[TimeRangeSelector]
        SPK[Sparkline]
    end

    subgraph "UI Components (modified)"
        HERO[HeroSection]
        CARDS[Asset Cards in App.tsx]
        DETAIL[Asset Detail in App.tsx]
    end

    TX --> CE
    AS --> CE
    ENG --> POS
    POS --> CE

    CE --> CE_PV
    CE --> CE_AL
    CE --> CE_AP
    CE --> CE_PL

    CE_PV --> PC
    CE_AL --> AC
    CE_AP --> ASC
    CE_PL --> PLC
    CE_AP --> SPK

    TRS --> PC
    TRS --> ASC

    PC --> HERO
    AC --> HERO
    PLC --> HERO
    SPK --> CARDS
    ASC --> DETAIL
    HERO --> App.tsx
```

### File Structure (new/modified files)

```
├── chartEngine.ts              # Pure functions: transaction data → chart-ready data
├── components/
│   ├── PortfolioChart.tsx      # Area chart for portfolio value over time
│   ├── AllocationChart.tsx     # Donut chart for asset type breakdown
│   ├── AssetPerformanceChart.tsx # Line chart for individual asset value + cost basis
│   ├── PnlBarChart.tsx         # Bar chart for P&L by asset
│   ├── TimeRangeSelector.tsx   # Segmented control for 1W/1M/3M/6M/1Y/ALL
│   ├── Sparkline.tsx           # Tiny inline chart for asset cards
│   ├── HeroSection.tsx         # Modernized hero with value display + portfolio chart
│   └── PortfolioDashboard.tsx  # (modified) integrate charts into dashboard layout
├── App.tsx                     # (modified) wire chart data, update hero + asset cards
├── types.ts                    # (modified) add chart data interfaces
```

## Components and Interfaces

### TimeRangeSelector

A stateless segmented control component.

```typescript
type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}
```

Uses the existing `.segmented-control` CSS class. Renders one button per range option.

### HeroSection

Replaces the current inline hero block in `App.tsx`. Combines the total value display, P&L badge, and the `PortfolioChart` into a single `glass-elevated` card.

```typescript
interface HeroSectionProps {
  totalValue: number;
  totalPnl: number;
  totalReturn: number;
  chartData: PortfolioTimeSeriesPoint[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}
```

### PortfolioChart

An area chart rendered with Recharts `<ResponsiveContainer>`, `<AreaChart>`, and `<Area>`. Stroke/fill color switches between `--accent-green` and `--accent-red` based on overall trend (first vs last data point).

```typescript
interface PortfolioChartProps {
  data: PortfolioTimeSeriesPoint[];
  height?: number; // default 200 mobile, 280 desktop
}
```

### AllocationChart

A donut chart using Recharts `<PieChart>` and `<Pie>` with `innerRadius`/`outerRadius`. Center label shows total portfolio value. Legend maps colors to asset type names and percentages.

```typescript
interface AllocationChartProps {
  data: AllocationDataPoint[];
  totalValue: number;
}
```

Color mapping:
- Gold → `var(--accent-yellow)` / `#FFD60A`
- ETF → `var(--accent-indigo)` / `#7D7AFF`
- Stock → `var(--accent-cyan)` / `#5AC8FA`
- Crypto → `var(--accent-orange)` / `#FF9F0A`

### AssetPerformanceChart

A dual-line chart showing market value and cost basis over time for a single asset. Uses Recharts `<LineChart>` with two `<Line>` elements.

```typescript
interface AssetPerformanceChartProps {
  data: AssetTimeSeriesPoint[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}
```

### PnlBarChart

A vertical bar chart using Recharts `<BarChart>` and `<Bar>`. Each bar is colored green (positive) or red (negative). Bars sorted descending by P&L value.

```typescript
interface PnlBarChartProps {
  data: PnlDataPoint[];
}
```

### Sparkline

A minimal inline SVG line chart (no axes, no labels) for asset cards. Uses Recharts `<LineChart>` with minimal config or a simple SVG polyline.

```typescript
interface SparklineProps {
  data: number[]; // recent value points
  positive: boolean; // green vs red stroke
  width?: number;
  height?: number;
}
```

### Chart Engine Functions

All functions are pure, stateless, and deterministic.

```typescript
// Portfolio value time series
function computePortfolioTimeSeries(
  transactions: Transaction[],
  assets: Asset[]
): PortfolioTimeSeriesPoint[];

// Asset allocation breakdown
function computeAllocationBreakdown(
  positions: PortfolioPosition[]
): AllocationDataPoint[];

// Single asset value + cost basis time series
function computeAssetTimeSeries(
  transactions: Transaction[],
  asset: Asset
): AssetTimeSeriesPoint[];

// P&L by asset for bar chart
function computePnlByAsset(
  positions: PortfolioPosition[]
): PnlDataPoint[];

// Filter time series by range
function filterByTimeRange<T extends { date: string }>(
  data: T[],
  range: TimeRange
): T[];

// Generate sparkline data from recent transactions
function computeSparklineData(
  transactions: Transaction[],
  asset: Asset,
  pointCount?: number // default 10
): number[];
```

## Data Models

New interfaces added to `types.ts`:

```typescript
/** A single point on the portfolio value time series */
export interface PortfolioTimeSeriesPoint {
  date: string;       // ISO date string
  value: number;      // total portfolio market value at this date
}

/** A slice of the allocation donut chart */
export interface AllocationDataPoint {
  type: AssetType;
  value: number;      // market value for this asset type
  percentage: number;  // 0-100
}

/** A single point on an individual asset's performance chart */
export interface AssetTimeSeriesPoint {
  date: string;       // ISO date string
  marketValue: number; // units * market price at this date
  costBasis: number;   // cumulative cost basis at this date
}

/** A single bar in the P&L bar chart */
export interface PnlDataPoint {
  symbol: string;
  name: string;
  pnl: number;        // unrealized P&L
  returnPct: number;   // return percentage
}
```

### Time Range Filtering

`filterByTimeRange` computes a cutoff date by subtracting the range duration from `Date.now()`:

| Range | Cutoff |
|-------|--------|
| 1W | 7 days ago |
| 1M | 30 days ago |
| 3M | 90 days ago |
| 6M | 180 days ago |
| 1Y | 365 days ago |
| ALL | no filter |

Points with `date >= cutoff` are included.


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Portfolio time series is chronologically ordered and reflects cumulative value

*For any* set of valid transactions and assets, `computePortfolioTimeSeries` should return data points sorted in ascending chronological order by date, and each point's `value` should equal the sum of (units held × market price) across all assets at that point in time.

**Validates: Requirements 2.2**

### Property 2: Time range filtering only includes dates within the selected range

*For any* time series of data points and any selected time range, `filterByTimeRange` should return only points whose `date` is greater than or equal to the computed cutoff date for that range. For the `ALL` range, all points should be returned unchanged.

**Validates: Requirements 3.2**

### Property 3: Allocation breakdown excludes zero-value types and percentages sum to 100

*For any* set of portfolio positions, `computeAllocationBreakdown` should exclude asset types with zero total market value, and the `percentage` fields of all returned data points should sum to 100 (within floating-point tolerance of ±0.1).

**Validates: Requirements 4.1, 4.3**

### Property 4: Asset time series is chronologically ordered with both value and cost basis

*For any* asset with at least one transaction, `computeAssetTimeSeries` should return data points sorted in ascending chronological order, where every point contains a defined `marketValue` (≥ 0) and a defined `costBasis` (≥ 0).

**Validates: Requirements 5.1, 5.2**

### Property 5: P&L data includes only non-zero positions, sorted descending, with symbols

*For any* set of portfolio positions, `computePnlByAsset` should return only positions where units > 0, sorted in descending order by `pnl` value, and each data point should contain a non-empty `symbol` string matching the corresponding asset.

**Validates: Requirements 6.1, 6.3, 6.4**

### Property 6: Chart data JSON round-trip

*For any* valid set of transactions and assets, computing chart data via `computePortfolioTimeSeries` then serializing the result to JSON via `JSON.stringify` then deserializing via `JSON.parse` should produce a data structure deeply equal to the original output.

**Validates: Requirements 7.5**

### Property 7: Sparkline data returns bounded numeric array

*For any* asset with transactions, `computeSparklineData` should return an array of numbers with length between 1 and `pointCount` (default 10), where every element is a finite number ≥ 0.

**Validates: Requirements 9.1**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No transactions exist | `computePortfolioTimeSeries` returns `[]`. Chart components render an empty state message. |
| Asset has no transactions | `computeAssetTimeSeries` returns `[]`. `AssetPerformanceChart` shows informational message. |
| Asset has zero market price | Value computed as 0. Charts display 0-value points rather than omitting them. |
| All positions have zero P&L | `computePnlByAsset` returns `[]`. `PnlBarChart` renders empty state. |
| All positions have zero units | `computePnlByAsset` returns `[]`. `computeAllocationBreakdown` returns `[]`. |
| Invalid/malformed date in transaction | `filterByTimeRange` treats unparseable dates as epoch (1970). They will be filtered out by any range except ALL. |
| Recharts fails to render (e.g., SSR) | Charts are wrapped in error boundaries that fall back to the existing numeric-only display. |
| Division by zero in percentage calc | `computeAllocationBreakdown` returns `[]` when total value is 0. |

## Testing Strategy

### Property-Based Testing

**Library**: [fast-check](https://github.com/dubzzz/fast-check) — the standard property-based testing library for TypeScript/JavaScript. It provides built-in arbitraries for primitives, arrays, and objects, plus combinators for building custom generators.

**Test Runner**: [Vitest](https://vitest.dev/) — Vite-native test runner, zero-config with the existing Vite setup.

**Installation**:
```bash
npm install -D vitest fast-check
```

**Configuration**: Add to `package.json` scripts:
```json
"test": "vitest --run"
```

Each correctness property from the design document maps to exactly one property-based test. Each test runs a minimum of 100 iterations.

Each test is tagged with a comment in the format:
```
// Feature: modern-ui-and-charts, Property {N}: {property title}
```

**Custom Generators** needed:
- `arbTransaction`: generates valid `Transaction` objects with realistic dates, positive quantities, and valid asset IDs
- `arbAsset`: generates valid `Asset` objects with random types, symbols, and market prices
- `arbPortfolioPosition`: generates valid `PortfolioPosition` objects derived from assets
- `arbTimeRange`: picks uniformly from `['1W', '1M', '3M', '6M', '1Y', 'ALL']`

### Unit Tests

Unit tests complement property tests by covering:
- Specific examples with known expected outputs (e.g., 2 BUY transactions → expected time series)
- Edge cases: empty transactions, single transaction, asset with 0 market price
- Empty state rendering for each chart component
- Time range selector defaults to ALL
- Correct color selection (green/red) based on trend direction

### Test File Structure

```
├── chartEngine.test.ts    # Property tests + unit tests for all chart engine functions
```

All 7 correctness properties are tested in `chartEngine.test.ts` as property-based tests using fast-check. Unit tests for specific examples and edge cases live in the same file.
