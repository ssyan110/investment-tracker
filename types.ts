// 3. Core Data Architecture

export enum AssetType {
  GOLD = 'GOLD',
  STOCK = 'STOCK',
  ETF = 'ETF',
  CRYPTO = 'CRYPTO',
}

export enum TransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  // TRANSFER = 'TRANSFER', // Out of scope for MVP
}

export enum AccountingMethod {
  AVERAGE_COST = 'AVERAGE_COST',
  FIFO = 'FIFO',
  LIFO = 'LIFO',
}

// 3.3 Asset Definition
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  method: AccountingMethod;
  currency: string;
  currentMarketPrice?: number; // External input
  lastPriceFetchedAt?: string; // ISO 8601 timestamp of last price fetch
}

// 3.1 Transaction Ledger (Immutable)
export interface Transaction {
  id: string;
  assetId: string;
  date: string; // ISO Date
  type: TransactionType;
  quantity: number; // Always positive
  pricePerUnit: number;
  fees: number;
  totalAmount: number; // Calculated at input time: (qty * price) + fees for BUY, (qty * price) - fees for SELL
  note?: string;
}

// 3.2 Inventory State Table (Derived)
export interface InventoryState {
  transactionId: string;
  date: string;
  // State AFTER transaction
  unitsBefore: number;
  unitsAfter: number;
  avgCostBefore: number;
  avgCostAfter: number;
  inventoryValueBefore: number;
  inventoryValueAfter: number; // Book Value / Cost Basis
  realizedPnl: number; // Only for SELL
}

export interface PortfolioPosition {
  asset: Asset;
  units: number;
  avgCost: number;
  investmentAmount: number; // Book Value (A)
  marketPrice: number;
  marketValue: number; // (B)
  unrealizedPnl: number; // B - A
  returnPercentage: number; // (B - A) / A
}

// Chart Data Models

/** A single point on the portfolio value time series */
export interface PortfolioTimeSeriesPoint {
  date: string;
  value: number;
}

/** A slice of the allocation donut chart */
export interface AllocationDataPoint {
  type: AssetType;
  value: number;
  percentage: number;
}

/** A single point on an individual asset's performance chart */
export interface AssetTimeSeriesPoint {
  date: string;
  marketValue: number;
  costBasis: number;
}

/** A single bar in the P&L bar chart */
export interface PnlDataPoint {
  symbol: string;
  name: string;
  pnl: number;
  returnPct: number;
}

/** Time range options for chart filtering */
export type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

/** A daily value snapshot recording an asset's price, units, and value at end of day */
export interface DailySnapshot {
  id: string;
  assetId: string;
  date: string;        // ISO date string (YYYY-MM-DD)
  marketPrice: number;
  units: number;
  marketValue: number;  // units * marketPrice, rounded to 2dp
  costBasis: number;
}
