import { Asset, Transaction } from '../types';

// API base URL - will be set based on environment
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ===== ASSETS =====

export const loadAssets = async (): Promise<Asset[] | null> => {
  try {
    const response = await fetch(`${API_URL}/assets`);
    if (!response.ok) throw new Error('Failed to fetch assets');
    const data = await response.json();
    console.log("Assets loaded from backend");
    return convertAssets(data);
  } catch (e) {
    console.error("Failed to load assets from backend", e);
    return null;
  }
};

export const saveAssets = async (assets: Asset[]) => {
  // Note: Individual save operations happen on add/edit
  // This is called for persistence but API handles it
  console.log("Assets persistence handled by API");
};

export const createAsset = async (asset: Omit<Asset, 'id'>): Promise<Asset> => {
  try {
    const response = await fetch(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertAssetToDb(asset))
    });
    if (!response.ok) throw new Error('Failed to create asset');
    const data = await response.json();
    console.log("Asset created");
    return convertAsset(data);
  } catch (e) {
    console.error("Failed to create asset", e);
    throw e;
  }
};

export const updateAsset = async (id: string, asset: Partial<Asset>): Promise<Asset> => {
  try {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertAssetToDb(asset))
    });
    if (!response.ok) throw new Error('Failed to update asset');
    const data = await response.json();
    console.log("Asset updated");
    return convertAsset(data);
  } catch (e) {
    console.error("Failed to update asset", e);
    throw e;
  }
};

export const deleteAsset = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/assets/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete asset');
    console.log("Asset deleted");
  } catch (e) {
    console.error("Failed to delete asset", e);
    throw e;
  }
};

// ===== TRANSACTIONS =====

export const loadTransactions = async (): Promise<Transaction[] | null> => {
  try {
    const response = await fetch(`${API_URL}/transactions`);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    const data = await response.json();
    console.log("Transactions loaded from backend");
    return convertTransactions(data);
  } catch (e) {
    console.error("Failed to load transactions from backend", e);
    return null;
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  // Note: Individual save operations happen on add/edit
  // This is called for persistence but API handles it
  console.log("Transactions persistence handled by API");
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  try {
    const response = await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertTransactionToDb(transaction))
    });
    if (!response.ok) throw new Error('Failed to create transaction');
    const data = await response.json();
    console.log("Transaction created");
    return convertTransaction(data);
  } catch (e) {
    console.error("Failed to create transaction", e);
    throw e;
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertTransactionToDb(transaction))
    });
    if (!response.ok) throw new Error('Failed to update transaction');
    const data = await response.json();
    console.log("Transaction updated");
    return convertTransaction(data);
  } catch (e) {
    console.error("Failed to update transaction", e);
    throw e;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/transactions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete transaction');
    console.log("Transaction deleted");
  } catch (e) {
    console.error("Failed to delete transaction", e);
    throw e;
  }
};

// ===== VERSION =====

export const loadDataVersion = (): number => {
  return 0;
};

export const saveDataVersion = (version: number) => {
  // No longer needed with backend
};

export const clearData = async () => {
  // Clear is handled by manual deletion
};

// ===== HELPERS =====

// Convert from DB format (snake_case) to TS format (camelCase)
const convertAsset = (dbAsset: any): Asset => ({
  id: dbAsset.id,
  symbol: dbAsset.symbol,
  name: dbAsset.name,
  type: dbAsset.type,
  method: dbAsset.method,
  currency: dbAsset.currency,
  currentMarketPrice: dbAsset.current_market_price
});

const convertAssets = (dbAssets: any[]): Asset[] => dbAssets.map(convertAsset);

// Convert from TS format (camelCase) to DB format (snake_case)
const convertAssetToDb = (asset: any) => ({
  symbol: asset.symbol,
  name: asset.name,
  type: asset.type,
  method: asset.method,
  currency: asset.currency,
  current_market_price: asset.currentMarketPrice
});

// Convert from DB format (snake_case) to TS format (camelCase)
const convertTransaction = (dbTransaction: any): Transaction => ({
  id: dbTransaction.id,
  assetId: dbTransaction.asset_id,
  date: dbTransaction.date,
  type: dbTransaction.type,
  quantity: dbTransaction.quantity,
  pricePerUnit: dbTransaction.price_per_unit,
  fees: dbTransaction.fees,
  totalAmount: dbTransaction.total_amount
});

const convertTransactions = (dbTransactions: any[]): Transaction[] => dbTransactions.map(convertTransaction);

// Convert from TS format (camelCase) to DB format (snake_case)
const convertTransactionToDb = (transaction: any) => ({
  asset_id: transaction.assetId,
  date: transaction.date,
  type: transaction.type,
  quantity: transaction.quantity,
  price_per_unit: transaction.pricePerUnit,
  fees: transaction.fees,
  total_amount: transaction.totalAmount
});