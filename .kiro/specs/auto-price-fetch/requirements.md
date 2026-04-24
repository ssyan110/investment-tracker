# Requirements Document

## Introduction

The auto-price-fetch feature enables the Investment Tracker app to automatically retrieve current market prices for all tracked assets instead of requiring manual price entry. The feature covers four asset categories: Taiwan stocks/ETFs (TWSE), Bank of Taiwan Gold Passbook (台灣銀行黃金存摺), US stocks, and cryptocurrencies. Because the app is a browser SPA with no backend server, price fetching is routed through Supabase Edge Functions to avoid CORS restrictions and to keep API keys out of client code.

## Glossary

- **Price_Fetcher**: The client-side service module responsible for requesting market prices from the Price_Proxy and updating asset records.
- **Price_Proxy**: A set of Supabase Edge Functions that act as server-side proxies, calling external price APIs and returning normalized price data to the browser client.
- **TWSE**: Taiwan Stock Exchange, the primary exchange for Taiwan-listed stocks and ETFs.
- **BOT_Gold**: Bank of Taiwan Gold Passbook (台灣銀行黃金存摺), a gold savings product whose buy/sell prices are published by Bank of Taiwan.
- **Asset**: A tracked investment item defined by symbol, name, type, currency, and currentMarketPrice (as defined in `types.ts`).
- **Batch_Update**: A single operation that fetches and applies prices for multiple assets at once.
- **Price_Result**: A normalized response object containing the asset symbol, fetched price, currency, and timestamp.
- **Stale_Price_Indicator**: A visual element in the UI that signals when a displayed price has not been refreshed recently.

## Requirements

### Requirement 1: Supabase Edge Function Price Proxy

**User Story:** As a developer, I want price API calls to be proxied through Supabase Edge Functions, so that CORS restrictions are avoided and API keys are not exposed in client-side code.

#### Acceptance Criteria

1. THE Price_Proxy SHALL expose a single Edge Function endpoint that accepts an array of asset symbols and their types, and returns an array of Price_Result objects.
2. WHEN the Price_Proxy receives a request with asset type STOCK or ETF and a numeric Taiwan symbol (e.g. "2330", "0050"), THE Price_Proxy SHALL fetch the current price from a TWSE-compatible data source and return the price in TWD.
3. WHEN the Price_Proxy receives a request with asset type GOLD, THE Price_Proxy SHALL fetch the current Bank of Taiwan Gold Passbook selling price (賣出價格) in TWD per gram.
4. WHEN the Price_Proxy receives a request with asset type STOCK and a non-numeric US symbol (e.g. "AAPL", "GOOGL"), THE Price_Proxy SHALL fetch the current price in USD.
5. WHEN the Price_Proxy receives a request with asset type CRYPTO, THE Price_Proxy SHALL fetch the current price in USDT.
6. IF an external API call fails or times out, THEN THE Price_Proxy SHALL return a partial result containing successful prices and an error entry for each failed symbol with a descriptive error message.
7. THE Price_Proxy SHALL respond within 10 seconds for a batch of up to 50 symbols.

### Requirement 2: Client-Side Price Fetch Service

**User Story:** As a developer, I want a dedicated service module in the browser app that calls the Price_Proxy and updates asset prices, so that price fetching logic is encapsulated and reusable.

#### Acceptance Criteria

1. THE Price_Fetcher SHALL accept an array of Asset objects and return an array of Price_Result objects by calling the Price_Proxy endpoint.
2. WHEN the Price_Fetcher receives Price_Result objects, THE Price_Fetcher SHALL call updateAsset for each asset whose price was successfully fetched, writing the new currentMarketPrice to Supabase.
3. IF the Price_Proxy returns an error entry for a symbol, THEN THE Price_Fetcher SHALL skip that asset and include the symbol in a list of failed updates.
4. THE Price_Fetcher SHALL categorize assets by type and currency to determine which symbols are Taiwan stocks/ETFs, which are US stocks, which are GOLD, and which are CRYPTO before sending the request to the Price_Proxy.
5. WHEN the Price_Fetcher completes a Batch_Update, THE Price_Fetcher SHALL return a summary containing the count of successfully updated assets and the list of failed symbols.

### Requirement 3: Fetch All Prices User Action

**User Story:** As a user, I want a single button to fetch all current market prices for every asset in my portfolio, so that I do not have to update each price manually.

#### Acceptance Criteria

1. THE App SHALL display a "Fetch Prices" button in the home view header area, visible on both mobile and desktop layouts.
2. WHEN the user taps the "Fetch Prices" button, THE App SHALL invoke the Price_Fetcher with all assets in the portfolio.
3. WHILE a Batch_Update is in progress, THE App SHALL display a loading indicator on the "Fetch Prices" button and disable the button to prevent duplicate requests.
4. WHEN a Batch_Update completes successfully with all assets updated, THE App SHALL display a success toast showing the number of prices updated.
5. WHEN a Batch_Update completes with partial failures, THE App SHALL display a warning toast listing the symbols that failed to update.
6. IF a Batch_Update fails entirely (e.g. network error), THEN THE App SHALL display an error toast with a descriptive message.
7. WHEN prices are updated via Batch_Update, THE App SHALL recalculate all portfolio positions (marketValue, unrealizedPnl, returnPercentage) using the new currentMarketPrice values.

### Requirement 4: Single Asset Price Fetch

**User Story:** As a user, I want to fetch the latest price for a single asset from its detail view, so that I can quickly refresh one asset without updating the entire portfolio.

#### Acceptance Criteria

1. THE App SHALL display a "Refresh Price" button in the asset detail view next to the current market price display.
2. WHEN the user taps the "Refresh Price" button, THE App SHALL invoke the Price_Fetcher with only the selected asset.
3. WHILE a single-asset price fetch is in progress, THE App SHALL display a loading indicator on the "Refresh Price" button.
4. WHEN a single-asset price fetch completes successfully, THE App SHALL update the displayed market price and show a success toast.
5. IF a single-asset price fetch fails, THEN THE App SHALL display an error toast with the failure reason and retain the previous market price.

### Requirement 5: Price Staleness Indicator

**User Story:** As a user, I want to see when my asset prices are outdated, so that I know when to refresh them.

#### Acceptance Criteria

1. THE App SHALL track the timestamp of the last successful price fetch for each asset.
2. WHEN an asset's last price fetch timestamp is older than 24 hours, THE App SHALL display a Stale_Price_Indicator next to that asset's market price in both the home view and the asset detail view.
3. WHEN an asset has never had an automatic price fetch (currentMarketPrice was set manually or is zero), THE App SHALL display the Stale_Price_Indicator.
4. WHEN a successful price fetch updates an asset's price, THE App SHALL remove the Stale_Price_Indicator for that asset.

### Requirement 6: Manual Price Override Preservation

**User Story:** As a user, I want to still be able to manually edit any asset's price after an automatic fetch, so that I can correct prices or enter values for assets that automatic fetch does not support.

#### Acceptance Criteria

1. THE App SHALL retain the existing inline price editing functionality for all assets regardless of whether automatic price fetching is available.
2. WHEN the user manually edits a price, THE App SHALL update the currentMarketPrice and the last-fetched timestamp to the current time.
3. WHEN the user manually edits a price, THE App SHALL treat the manual value as the current price until the next automatic or manual fetch overwrites the value.

### Requirement 7: Gold Price Source Specificity

**User Story:** As a user tracking 台灣銀行黃金存摺, I want the app to fetch the Bank of Taiwan Gold Passbook selling price specifically, so that the price matches the product I am invested in.

#### Acceptance Criteria

1. WHEN fetching gold prices, THE Price_Proxy SHALL retrieve the Bank of Taiwan Gold Passbook (黃金存摺) selling price (賣出價格/本行賣出) in TWD per gram.
2. THE Price_Proxy SHALL parse the Bank of Taiwan gold price page or API to extract the selling price as a numeric value.
3. IF the Bank of Taiwan gold price source is unavailable or returns unparseable data, THEN THE Price_Proxy SHALL return an error entry for the GOLD symbol with a message indicating the data source is unavailable.

### Requirement 8: Taiwan Stock Symbol Detection

**User Story:** As a developer, I want the system to automatically distinguish Taiwan stock symbols from US stock symbols, so that the correct data source is queried for each asset.

#### Acceptance Criteria

1. WHEN an asset has type STOCK or ETF, THE Price_Fetcher SHALL classify the symbol as a Taiwan stock if the symbol consists entirely of digits (e.g. "2330", "0050", "00878").
2. WHEN an asset has type STOCK or ETF, THE Price_Fetcher SHALL classify the symbol as a US stock if the symbol contains alphabetic characters (e.g. "AAPL", "GOOGL").
3. THE Price_Fetcher SHALL route Taiwan stock symbols to the TWSE data source and US stock symbols to the US stock data source via the Price_Proxy.
