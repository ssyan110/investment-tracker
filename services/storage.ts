import { Asset, Transaction } from '../types';

// API base URL - will be set based on environment
const getApiUrl = (): string => {
  // Use configured URL if available
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/+$/, '');
  }

  // In production, prefer same-origin `/api` (works with reverse proxies / rewrites).
  if (import.meta.env.PROD) {
    return `${window.location.origin}/api`;
  }

  // Development default: current host + backend port for cross-device LAN testing.
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const port = 3000;
  return `${protocol}//${host}:${port}/api`;
};

export const API_URL = getApiUrl();
console.info('[api] Using API_URL:', API_URL);

// ===== LOCAL CACHE =====
// Cache data in localStorage so the app shows data instantly on open,
// even when the backend is cold-starting (Render free tier: 30-90s wake-up).

const CACHE_KEYS = {
  assets: 'it_cache_assets',
  transactions: 'it_cache_transactions',
  timestamp: 'it_cache_ts',
} as const;

const writeCache = (assets: Asset[], transactions: Transaction[]) => {
  try {
    localStorage.setItem(CACHE_KEYS.assets, JSON.stringify(assets));
    localStorage.setItem(CACHE_KEYS.transactions, JSON.stringify(transactions));
    localStorage.setItem(CACHE_KEYS.timestamp, String(Date.now()));
  } catch {
    // localStorage full or unavailable – non-critical
  }
};

export const readCache = (): { assets: Asset[]; transactions: Transaction[]; ts: number } | null => {
  try {
    const a = localStorage.getItem(CACHE_KEYS.assets);
    const t = localStorage.getItem(CACHE_KEYS.transactions);
    const ts = localStorage.getItem(CACHE_KEYS.timestamp);
    if (a && t) {
      return { assets: JSON.parse(a), transactions: JSON.parse(t), ts: ts ? Number(ts) : 0 };
    }
  } catch { /* ignore */ }
  return null;
};

export const clearCache = () => {
  try {
    localStorage.removeItem(CACHE_KEYS.assets);
    localStorage.removeItem(CACHE_KEYS.transactions);
    localStorage.removeItem(CACHE_KEYS.timestamp);
  } catch { /* ignore */ }
};

// ===== FETCH HELPERS =====

const fetchWithTimeout = async (
  url: string,
  options: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const DEFAULT_TIMEOUT_MS = 30000; // 30s to tolerate Render cold-starts

// ===== KEEP-ALIVE PING =====
// Fire a lightweight /health request ASAP to wake the backend.
// This runs in parallel with cache-read so the backend starts
// booting before we even need data.
export const pingBackend = () => {
  fetch(`${API_URL}/health`, { method: 'GET' }).catch(() => {});
};

// ===== COMBINED LOAD (single round-trip) =====

export const loadAll = async (): Promise<{ assets: Asset[]; transactions: Transaction[] } | null> => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/all`, undefined, DEFAULT_TIMEOUT_MS);
    if (!response.ok) throw new Error('Failed to fetch all data');
    const data = await response.json();
    const assets = convertAssets(data.assets || []);
    const transactions = convertTransactions(data.transactions || []);
    // Update cache on success
    writeCache(assets, transactions);
    console.log('✅ All data loaded from backend (single request)');
    return { assets, transactions };
  } catch (e) {
    console.error('Failed to load all data from backend, trying individual endpoints...', e);
    // Fallback to individual endpoints for backward compatibility
    try {
      const [assets, transactions] = await Promise.all([
        loadAssets(),
        loadTransactions()
      ]);
      if (assets && transactions) {
        writeCache(assets, transactions);
        return { assets, transactions };
      }
    } catch { /* fall through */ }
    return null;
  }
};

// ===== ASSETS =====

export const loadAssets = async (): Promise<Asset[] | null> => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/assets`, undefined, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertAssetToDb(asset))
    }, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/assets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertAssetToDb(asset))
    }, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/assets/${id}`, {
      method: 'DELETE'
    }, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/transactions`, undefined, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertTransactionToDb(transaction))
    }, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convertTransactionToDb(transaction))
    }, DEFAULT_TIMEOUT_MS);
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
    const response = await fetchWithTimeout(`${API_URL}/transactions/${id}`, {
      method: 'DELETE'
    }, DEFAULT_TIMEOUT_MS);
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
  clearCache();
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
