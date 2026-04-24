import { Asset, Transaction } from '../types';
import { supabase } from './supabaseClient';

export const API_URL = 'Supabase Edge Network';
console.info('[api] Using direct Supabase connection');

// ===== LOCAL CACHE =====
// Cache data in localStorage so the app shows data instantly on open

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

// ===== KEEP-ALIVE PING =====
export const pingBackend = () => {
  // No-op since we don't have a Render backend to wake up anymore.
};

// ===== COMBINED LOAD (single round-trip) =====

export const loadAll = async (): Promise<{ assets: Asset[]; transactions: Transaction[] } | null> => {
  try {
    // Fetch directly from Supabase in parallel
    const [assetsResponse, transactionsResponse] = await Promise.all([
      supabase.from('assets').select('*'),
      supabase.from('transactions').select('*').order('date', { ascending: false })
    ]);

    if (assetsResponse.error) throw assetsResponse.error;
    if (transactionsResponse.error) throw transactionsResponse.error;

    const assets = convertAssets(assetsResponse.data || []);
    const transactions = convertTransactions(transactionsResponse.data || []);

    // Update cache on success
    writeCache(assets, transactions);
    console.log('✅ All data loaded directly from Supabase');
    return { assets, transactions };
  } catch (e) {
    console.error('Failed to load data from Supabase', e);
    // Fallback logic
    return null;
  }
};

// ===== ASSETS =====

export const loadAssets = async (): Promise<Asset[] | null> => {
  try {
    const { data, error } = await supabase.from('assets').select('*');
    if (error) throw error;
    console.log("Assets loaded from backend");
    return convertAssets(data);
  } catch (e) {
    console.error("Failed to load assets from backend", e);
    return null;
  }
};

export const saveAssets = async (assets: Asset[]) => {
  console.log("Assets persistence handled by API");
};

export const createAsset = async (asset: Omit<Asset, 'id'>): Promise<Asset> => {
  try {
    const id = `asset-${Date.now()}`;
    const dbAsset = { id, ...convertAssetToDb(asset) };

    const { data, error } = await supabase
      .from('assets')
      .insert([dbAsset])
      .select()
      .single();

    if (error) throw error;
    console.log("Asset created");
    return convertAsset(data);
  } catch (e) {
    console.error("Failed to create asset", e);
    throw e;
  }
};

export const updateAsset = async (id: string, asset: Partial<Asset>): Promise<Asset> => {
  try {
    const updates = convertAssetToDb(asset);

    const { data, error } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log("Asset updated");
    return convertAsset(data);
  } catch (e) {
    console.error("Failed to update asset", e);
    throw e;
  }
};

export const deleteAsset = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log("Asset deleted");
  } catch (e) {
    console.error("Failed to delete asset", e);
    throw e;
  }
};

// ===== TRANSACTIONS =====

export const loadTransactions = async (): Promise<Transaction[] | null> => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    console.log("Transactions loaded from backend");
    return convertTransactions(data);
  } catch (e) {
    console.error("Failed to load transactions from backend", e);
    return null;
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  console.log("Transactions persistence handled by API");
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  try {
    const id = `tx-${Date.now()}`;
    const dbTx = { id, ...convertTransactionToDb(transaction) };

    const { data, error } = await supabase
      .from('transactions')
      .insert([dbTx])
      .select()
      .single();

    if (error) throw error;
    console.log("Transaction created");
    return convertTransaction(data);
  } catch (e) {
    console.error("Failed to create transaction", e);
    throw e;
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Transaction>): Promise<Transaction> => {
  try {
    const updates = convertTransactionToDb(transaction);

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log("Transaction updated");
    return convertTransaction(data);
  } catch (e) {
    console.error("Failed to update transaction", e);
    throw e;
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
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
  // No longer needed
};

export const clearData = async () => {
  clearCache();
};

// ===== HELPERS =====

// SQL migration required for auto-price-fetch feature:
//   ALTER TABLE assets ADD COLUMN last_price_fetched_at timestamptz;

// Convert from DB format (snake_case) to TS format (camelCase)
const convertAsset = (dbAsset: any): Asset => ({
  id: dbAsset.id,
  symbol: dbAsset.symbol,
  name: dbAsset.name,
  type: dbAsset.type,
  method: dbAsset.method,
  currency: dbAsset.currency,
  currentMarketPrice: dbAsset.current_market_price,
  lastPriceFetchedAt: dbAsset.last_price_fetched_at ?? undefined
});

const convertAssets = (dbAssets: any[]): Asset[] => dbAssets.map(convertAsset);

const convertAssetToDb = (asset: any) => {
  const result: Record<string, any> = {};
  if (asset.symbol !== undefined) result.symbol = asset.symbol;
  if (asset.name !== undefined) result.name = asset.name;
  if (asset.type !== undefined) result.type = asset.type;
  if (asset.method !== undefined) result.method = asset.method;
  if (asset.currency !== undefined) result.currency = asset.currency;
  if (asset.currentMarketPrice !== undefined) result.current_market_price = asset.currentMarketPrice;
  // last_price_fetched_at: only include if the DB column exists.
  // If the migration hasn't been run yet, omitting this avoids a 400 error.
  // Uncomment after running: ALTER TABLE assets ADD COLUMN last_price_fetched_at timestamptz;
  // if (asset.lastPriceFetchedAt !== undefined) result.last_price_fetched_at = asset.lastPriceFetchedAt;
  return result;
};

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

const convertTransactionToDb = (transaction: any) => ({
  asset_id: transaction.assetId,
  date: transaction.date,
  type: transaction.type,
  quantity: transaction.quantity,
  price_per_unit: transaction.pricePerUnit,
  fees: transaction.fees,
  total_amount: transaction.totalAmount
});
