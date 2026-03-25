# Implementation Plan: Modern UI & Charts

## Overview

Incrementally add Recharts-based data visualizations and a modernized hero section to the Investment Tracker. The plan starts with infrastructure (dependencies, types, test setup), builds the pure chart data engine with property tests, then layers in chart components and UI integration. Each step builds on the previous and ends with full wiring into App.tsx.

## Tasks

- [x] 1. Install dependencies and configure test runner
  - Install `recharts` as a production dependency
  - Install `vitest` and `fast-check` as dev dependencies
  - Add `"test": "vitest --run"` script to `package.json`
  - Create a minimal `vitest.config.ts` if needed (Vite-native, should work with existing `vite.config.ts`)
  - _Requirements: 1.1, 1.2_

- [x] 2. Add chart data model interfaces to types.ts
  - Add `PortfolioTimeSeriesPoint` interface (`date: string`, `value: number`)
  - Add `AllocationDataPoint` interface (`type: AssetType`, `value: number`, `percentage: number`)
  - Add `AssetTimeSeriesPoint` interface (`date: string`, `marketValue: number`, `costBasis: number`)
  - Add `PnlDataPoint` interface (`symbol: string`, `name: string`, `pnl: number`, `returnPct: number`)
  - Add `TimeRange` type alias (`'1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'`)
  - _Requirements: 7.2, 7.3, 7.4_

- [ ] 3. Implement chartEngine.ts — pure chart data functions
  - [x] 3.1 Implement `computePortfolioTimeSeries(transactions, assets)` → `PortfolioTimeSeriesPoint[]`
    - Replay transaction ledger chronologically, compute cumulative portfolio value at each transaction date
    - Return empty array when no transactions exist
    - _Requirements: 2.2, 7.2_

  - [x] 3.2 Implement `filterByTimeRange(data, range)` → filtered array
    - Compute cutoff date based on range (1W=7d, 1M=30d, 3M=90d, 6M=180d, 1Y=365d, ALL=no filter)
    - Return only points with `date >= cutoff`
    - Treat unparseable dates as epoch (filtered out by any range except ALL)
    - _Requirements: 3.1, 3.2_

  - [x] 3.3 Implement `computeAllocationBreakdown(positions)` → `AllocationDataPoint[]`
    - Group positions by asset type, sum market values
    - Exclude types with zero value; percentages must sum to 100 (±0.1)
    - Return empty array when total value is 0
    - _Requirements: 4.1, 4.3, 7.3_

  - [x] 3.4 Implement `computeAssetTimeSeries(transactions, asset)` → `AssetTimeSeriesPoint[]`
    - Replay transactions for a single asset, compute market value and cost basis at each date
    - Return chronologically sorted points
    - _Requirements: 5.1, 5.2, 7.4_

  - [x] 3.5 Implement `computePnlByAsset(positions)` → `PnlDataPoint[]`
    - Include only positions with units > 0
    - Sort descending by pnl value
    - Each point has non-empty symbol
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 3.6 Implement `computeSparklineData(transactions, asset, pointCount?)` → `number[]`
    - Return array of recent value points (default 10)
    - All values finite and ≥ 0, length between 1 and pointCount
    - _Requirements: 9.1_

- [x] 4. Checkpoint — Verify chart engine compiles and basic logic works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Write property-based tests for chartEngine.ts
  - [x] 5.1 Write property test: Portfolio time series chronological order and cumulative value
    - **Property 1: Portfolio time series is chronologically ordered and reflects cumulative value**
    - Create `arbTransaction` and `arbAsset` generators for valid test data
    - Verify output is sorted ascending by date, each value ≥ 0
    - **Validates: Requirements 2.2**

  - [x] 5.2 Write property test: Time range filtering correctness
    - **Property 2: Time range filtering only includes dates within the selected range**
    - Create `arbTimeRange` generator
    - Verify all returned dates ≥ cutoff; ALL returns full array
    - **Validates: Requirements 3.2**

  - [x] 5.3 Write property test: Allocation breakdown excludes zeros and sums to 100
    - **Property 3: Allocation breakdown excludes zero-value types and percentages sum to 100**
    - Create `arbPortfolioPosition` generator
    - Verify no zero-value types in output; percentages sum to 100 ±0.1
    - **Validates: Requirements 4.1, 4.3**

  - [x] 5.4 Write property test: Asset time series chronological order with both fields
    - **Property 4: Asset time series is chronologically ordered with both value and cost basis**
    - Verify ascending date order, marketValue ≥ 0, costBasis ≥ 0
    - **Validates: Requirements 5.1, 5.2**

  - [x] 5.5 Write property test: P&L data non-zero positions sorted descending
    - **Property 5: P&L data includes only non-zero positions, sorted descending, with symbols**
    - Verify only units > 0 included, descending pnl order, non-empty symbols
    - **Validates: Requirements 6.1, 6.3, 6.4**

  - [x] 5.6 Write property test: Chart data JSON round-trip
    - **Property 6: Chart data JSON round-trip**
    - Verify `JSON.parse(JSON.stringify(result))` deeply equals original
    - **Validates: Requirements 7.5**

  - [x] 5.7 Write property test: Sparkline bounded numeric array
    - **Property 7: Sparkline data returns bounded numeric array**
    - Verify length 1..pointCount, all elements finite and ≥ 0
    - **Validates: Requirements 9.1**

- [x] 6. Implement TimeRangeSelector component
  - Create `components/TimeRangeSelector.tsx`
  - Stateless segmented control with options: 1W, 1M, 3M, 6M, 1Y, ALL
  - Use existing `.segmented-control` CSS class
  - Props: `value: TimeRange`, `onChange: (range: TimeRange) => void`
  - Named export pattern
  - _Requirements: 3.1, 3.3, 3.4_

- [ ] 7. Implement chart components
  - [x] 7.1 Implement `PortfolioChart` component
    - Create `components/PortfolioChart.tsx`
    - Recharts `ResponsiveContainer` + `AreaChart` + `Area`
    - Green stroke/fill for positive trend, red for negative (compare first vs last point)
    - Height: 200px mobile, 280px desktop
    - Empty state message when data is empty
    - _Requirements: 2.1, 2.3, 2.5, 10.1_

  - [x] 7.2 Implement `AllocationChart` component
    - Create `components/AllocationChart.tsx`
    - Recharts `PieChart` + `Pie` with innerRadius/outerRadius (donut)
    - Center label shows total portfolio value
    - Color mapping: Gold→#FFD60A, ETF→#7D7AFF, Stock→#5AC8FA, Crypto→#FF9F0A
    - Legend with type names and percentages
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 10.2_

  - [x] 7.3 Implement `AssetPerformanceChart` component
    - Create `components/AssetPerformanceChart.tsx`
    - Recharts `LineChart` with two `Line` elements (market value + cost basis)
    - Includes embedded `TimeRangeSelector`
    - Informational message when fewer than 2 data points
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 7.4 Implement `PnlBarChart` component
    - Create `components/PnlBarChart.tsx`
    - Recharts `BarChart` + `Bar`, bars colored green (positive) or red (negative)
    - Asset symbol as bar label
    - Empty state when no data
    - _Requirements: 6.1, 6.2, 6.4, 6.6_

  - [x] 7.5 Implement `Sparkline` component
    - Create `components/Sparkline.tsx`
    - Minimal inline chart using Recharts `LineChart` (no axes, no labels)
    - Props: `data: number[]`, `positive: boolean`, `width?`, `height?`
    - Green stroke for positive, red for negative
    - _Requirements: 9.1_

- [x] 8. Implement HeroSection component
  - Create `components/HeroSection.tsx`
  - Large total value display + P&L badge + return percentage
  - Embed `PortfolioChart` and `TimeRangeSelector` within the same `glass-elevated` card
  - Use `animate-slide-up` CSS animation on mount
  - Use existing `badge-green` / `badge-red` classes for P&L
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Checkpoint — Verify all components compile and render in isolation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integrate charts into PortfolioDashboard.tsx
  - Import `AllocationChart` and `PnlBarChart`
  - Add allocation chart below the existing summary section
  - Add P&L bar chart below the allocation chart
  - Pass computed chart data via props
  - _Requirements: 4.6, 6.5_

- [ ] 11. Wire everything into App.tsx
  - [x] 11.1 Add chart data computation with useMemo
    - Import chart engine functions
    - Compute `portfolioTimeSeries`, `allocationData`, `pnlData`, `sparklineData` via `useMemo`
    - Add `selectedRange` state (`TimeRange`, default `'ALL'`)
    - Apply `filterByTimeRange` to time series based on selected range
    - _Requirements: 3.3, 7.1, 7.2, 7.3_

  - [x] 11.2 Replace inline hero block with HeroSection component
    - Remove the existing inline hero `<div className="glass-elevated p-5">` block
    - Render `<HeroSection>` with totalValue, totalPnl, totalReturn, chartData, selectedRange, onRangeChange
    - _Requirements: 2.4, 8.1, 8.3_

  - [x] 11.3 Add sparklines to asset cards in HOME view
    - Compute sparkline data for each asset
    - Render `<Sparkline>` inside each asset card with trend direction
    - _Requirements: 9.1, 9.2_

  - [x] 11.4 Add AssetPerformanceChart to ASSET_DETAIL view
    - Compute asset time series for the selected asset
    - Add `assetRange` state for per-asset time range
    - Render `<AssetPerformanceChart>` above existing summary cards in the detail view
    - _Requirements: 5.1, 5.4, 5.5_

  - [x] 11.5 Pass chart data to PortfolioDashboard
    - Pass `allocationData`, `pnlData`, and `totalValue` as props to `PortfolioDashboard`
    - _Requirements: 4.6, 6.5_

- [x] 12. Responsive and touch-friendly chart adjustments
  - Ensure chart tooltips render above touch point on mobile (viewport < 640px)
  - Verify `ResponsiveContainer` fills parent width without horizontal scroll
  - Confirm touch tap shows tooltip on data points
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 13. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All chart data is derived via `useMemo` — no new state management needed
