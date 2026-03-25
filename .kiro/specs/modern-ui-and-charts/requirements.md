# Requirements Document

## Introduction

This feature modernizes the Investment Tracker's UI and adds data visualization charts. The goal is to bring the app's visual design closer to modern finance/investment apps (clean hero charts, card-based layouts, color-coded P&L indicators) while adding interactive charts for portfolio value over time, asset allocation breakdown, and individual asset performance. All chart data is derived from the existing transaction ledger and manually-entered market prices — no live price feeds are involved.

## Glossary

- **Dashboard**: The main HOME view showing the portfolio summary, asset groups, and charts.
- **Chart_Engine**: The module responsible for transforming transaction history and market price data into time-series and categorical data structures suitable for chart rendering.
- **Portfolio_Chart**: An area/line chart displaying total portfolio market value over time.
- **Allocation_Chart**: A donut/ring chart showing the percentage breakdown of portfolio value by asset type (Gold, ETF, Stock, Crypto).
- **Asset_Chart**: A line chart displaying an individual asset's value or cost-basis history over time.
- **PnL_Chart**: A bar or area chart showing unrealized profit/loss over time or by asset.
- **Time_Range_Selector**: A segmented control allowing the user to filter chart data by time window (1W, 1M, 3M, 6M, 1Y, ALL).
- **Chart_Library**: A third-party charting library (e.g., Recharts or Lightweight Charts) integrated into the project for rendering SVG/Canvas charts.
- **Hero_Section**: The prominent top area of the Dashboard displaying the total portfolio value and the primary Portfolio_Chart.
- **Glass_Surface**: A UI surface following the existing Liquid Glass design system (dark background, blur, translucent borders).

## Requirements

### Requirement 1: Charting Library Integration

**User Story:** As a developer, I want a lightweight charting library installed and configured, so that all chart components can render interactive, responsive visualizations.

#### Acceptance Criteria

1. THE project SHALL include a React-compatible charting library as a production dependency.
2. THE Chart_Library SHALL support line charts, area charts, bar charts, and donut/pie charts.
3. THE Chart_Library SHALL render responsive charts that adapt to the container width on both mobile and desktop viewports.
4. THE Chart_Library SHALL support custom color theming to match the existing Liquid Glass design system CSS variables.

### Requirement 2: Portfolio Value Over Time Chart

**User Story:** As an investor, I want to see a chart of my total portfolio value over time, so that I can visualize how my investments have grown or declined.

#### Acceptance Criteria

1. WHEN the Dashboard loads with at least one transaction, THE Portfolio_Chart SHALL display an area or line chart of total portfolio market value over time.
2. THE Chart_Engine SHALL compute portfolio value time-series data points by replaying the transaction ledger chronologically and applying the current market price for each asset at each transaction date.
3. WHEN no transactions exist, THE Portfolio_Chart SHALL display an empty state message instead of a blank chart.
4. THE Portfolio_Chart SHALL render inside the Hero_Section of the Dashboard, above the asset group listings.
5. THE Portfolio_Chart SHALL use the accent green color for positive overall trend and accent red color for negative overall trend.

### Requirement 3: Time Range Selector

**User Story:** As an investor, I want to filter chart data by time range, so that I can focus on recent performance or view the full history.

#### Acceptance Criteria

1. THE Time_Range_Selector SHALL provide the following options: 1W, 1M, 3M, 6M, 1Y, ALL.
2. WHEN the user selects a time range, THE Portfolio_Chart SHALL filter its displayed data points to only include dates within the selected range.
3. THE Time_Range_Selector SHALL default to the ALL option on initial load.
4. THE Time_Range_Selector SHALL be styled as a segmented control consistent with the existing `segmented-control` CSS class in the design system.

### Requirement 4: Asset Allocation Donut Chart

**User Story:** As an investor, I want to see a donut chart of my asset allocation, so that I can understand how my portfolio is distributed across asset types.

#### Acceptance Criteria

1. THE Allocation_Chart SHALL display a donut/ring chart showing the percentage of total portfolio market value held in each asset type (Gold, ETF, Stock, Crypto).
2. THE Allocation_Chart SHALL use the existing type-dot color scheme: yellow for Gold, indigo for ETF, cyan for Stock, orange for Crypto.
3. WHEN an asset type has zero market value, THE Allocation_Chart SHALL exclude that type from the chart.
4. THE Allocation_Chart SHALL display the total portfolio value in the center of the donut.
5. THE Allocation_Chart SHALL display a legend mapping each color to its asset type name and percentage.
6. THE Allocation_Chart SHALL appear on the Dashboard below the Hero_Section.

### Requirement 5: Individual Asset Performance Chart

**User Story:** As an investor, I want to see a chart of each asset's value history when I view its detail page, so that I can track its performance over time.

#### Acceptance Criteria

1. WHEN the user navigates to the ASSET_DETAIL view, THE Asset_Chart SHALL display a line chart of that asset's market value over time, derived from its transaction history and current market price.
2. THE Asset_Chart SHALL also display the cost basis line overlaid on the same chart for comparison.
3. WHEN the asset has fewer than two transactions, THE Asset_Chart SHALL display a minimal chart with available data points or an informational message.
4. THE Asset_Chart SHALL appear in the Overview tab of the ASSET_DETAIL view, above the existing summary cards.
5. THE Asset_Chart SHALL include a Time_Range_Selector with the same options as the Portfolio_Chart.

### Requirement 6: P&L Performance Bar Chart

**User Story:** As an investor, I want to see a bar chart comparing unrealized P&L across my assets, so that I can quickly identify my best and worst performers.

#### Acceptance Criteria

1. THE PnL_Chart SHALL display a horizontal or vertical bar chart showing unrealized P&L for each asset that has a non-zero position.
2. THE PnL_Chart SHALL color bars green for positive P&L and red for negative P&L.
3. THE PnL_Chart SHALL sort assets by P&L value in descending order (best performers first).
4. THE PnL_Chart SHALL display the asset symbol as the label for each bar.
5. THE PnL_Chart SHALL appear on the Dashboard, after the Allocation_Chart.
6. WHEN all positions have zero unrealized P&L, THE PnL_Chart SHALL display an informational empty state.

### Requirement 7: Chart Data Engine

**User Story:** As a developer, I want a pure function module that computes chart-ready data from the transaction ledger, so that chart components receive clean, pre-processed data.

#### Acceptance Criteria

1. THE Chart_Engine SHALL be a pure module with zero side effects, consistent with the existing `engine.ts` pattern.
2. THE Chart_Engine SHALL export a function that accepts an array of transactions, an array of assets, and returns time-series data points for the portfolio value chart.
3. THE Chart_Engine SHALL export a function that accepts portfolio positions and returns allocation breakdown data (type, value, percentage).
4. THE Chart_Engine SHALL export a function that accepts transactions for a single asset and the asset definition, and returns time-series data points for that asset's value and cost-basis history.
5. FOR ALL valid transaction sets, computing chart data then serializing to JSON then deserializing SHALL produce an equivalent data structure (round-trip property).

### Requirement 8: Modernized Hero Section

**User Story:** As an investor, I want the portfolio summary area to look like a modern finance app with a large value display and integrated chart, so that the app feels polished and professional.

#### Acceptance Criteria

1. THE Hero_Section SHALL display the total portfolio value in a large, prominent font at the top of the Dashboard.
2. THE Hero_Section SHALL display the total unrealized P&L amount and return percentage directly below the total value.
3. THE Hero_Section SHALL integrate the Portfolio_Chart directly below the value display, within the same Glass_Surface card.
4. THE Hero_Section SHALL use a gradient accent on the P&L badge consistent with the existing badge-green and badge-red classes.
5. THE Hero_Section SHALL animate in using the existing `animate-slide-up` CSS animation on initial load.

### Requirement 9: Modernized Asset Cards

**User Story:** As an investor, I want the asset list cards to have a cleaner, more information-dense layout with subtle visual improvements, so that scanning my holdings is faster and more pleasant.

#### Acceptance Criteria

1. THE asset cards in the HOME view SHALL display a mini sparkline or trend indicator showing recent value direction for each asset.
2. THE asset cards SHALL display the asset symbol, name, market value, units held, and P&L percentage in a compact layout.
3. THE asset cards SHALL use the existing Glass_Surface styling with smooth hover/active state transitions.
4. WHEN the user taps an asset card, THE Dashboard SHALL navigate to the ASSET_DETAIL view with the existing `animate-slide-up` transition.

### Requirement 10: Responsive Chart Layout

**User Story:** As an investor using a mobile device, I want charts to be touch-friendly and properly sized, so that I can interact with them on small screens.

#### Acceptance Criteria

1. THE Portfolio_Chart SHALL render at a minimum height of 200px on mobile viewports and 280px on desktop viewports.
2. THE Allocation_Chart SHALL render at a size that fits within a single-column mobile layout without horizontal scrolling.
3. WHILE the viewport width is below 640px, THE chart tooltips SHALL appear above the touch point to avoid being obscured by the user's finger.
4. THE charts SHALL support touch gestures for viewing data point details (tap to show tooltip).
