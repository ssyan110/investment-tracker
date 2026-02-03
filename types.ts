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