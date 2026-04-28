import { Asset, DailySnapshot, Transaction } from '../types';
import { round } from '../utils';
import { calculateInventoryState } from '../engine';
import { supabase } from './supabaseClient';

// ===== DB ↔ TS CONVERTERS (Task 2.1) =====

/** Convert a DB row (snake_case) to a DailySnapshot (camelCase) */
export const convertSnapshot = (row: any): DailySnapshot => ({
  id: row.id,
  assetId: row.asset_id,
  date: row.date,
  marketPrice: Number(row.market_price),
  units: Number(row.units),
  marketValue: Number(row.market_value),
  costBasis: Number(row.cost_basis),
});

/** Convert a DailySnapshot (camelCase) to DB format (snake_case) */
export const convertSnapshotToDb = (snapshot: Omit<DailySnapshot, 'id'> | DailySnapshot) => {
  const result: Record<string, any> = {
    asset_id: snapshot.assetId,
    date: snapshot.date,
    market_price: snapshot.marketPrice,
    units: snapshot.units,
    market_value: snapshot.marketValue,
    cost_basis: snapshot.costBasis,
  };
  if ('id' in snapshot && snapshot.id) {
    result.id = snapshot.id;
  }
  return result;
};

// ===== CRUD (Tasks 2.2–2.5) =====

/** Upsert a single snapshot (insert or update on conflict) */
export const upsertSnapshot = async (snapshot: Omit<DailySnapshot, 'id'>): Promise<void> => {
  const dbRow = convertSnapshotToDb(snapshot);
  const { error } = await supabase
    .from('daily_snapshots')
    .upsert([dbRow], { onConflict: 'asset_id,date' });

  if (error) {
    console.error('Failed to upsert snapshot', error);
    throw error;
  }
};

/** Upsert multiple snapshots in a single batch */
export const upsertSnapshotBatch = async (snapshots: Omit<DailySnapshot, 'id'>[]): Promise<void> => {
  if (snapshots.length === 0) return;

  const dbRows = snapshots.map(convertSnapshotToDb);
  const { error } = await supabase
    .from('daily_snapshots')
    .upsert(dbRows, { onConflict: 'asset_id,date' });

  if (error) {
    console.error('Failed to upsert snapshot batch', error);
    throw error;
  }
};

/** Load all snapshots for an asset within a date range */
export const loadAssetSnapshots = async (
  assetId: string,
  startDate: string,
  endDate: string
): Promise<DailySnapshot[]> => {
  const { data, error } = await supabase
    .from('daily_snapshots')
    .select('*')
    .eq('asset_id', assetId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load asset snapshots', error);
    throw error;
  }

  return (data || []).map(convertSnapshot);
};

/** Load aggregated portfolio snapshots (sum of marketValue per date) */
export const loadPortfolioSnapshots = async (
  startDate: string,
  endDate: string
): Promise<{ date: string; value: number }[]> => {
  const { data, error } = await supabase
    .from('daily_snapshots')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Failed to load portfolio snapshots', error);
    throw error;
  }

  const rows = (data || []).map(convertSnapshot);

  // Aggregate: sum marketValue per date
  const dateMap = new Map<string, number>();
  for (const snap of rows) {
    const current = dateMap.get(snap.date) || 0;
    dateMap.set(snap.date, round(current + snap.marketValue, 2));
  }

  // Convert to sorted array
  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
};

/** Delete all snapshots for an asset */
export const deleteAssetSnapshots = async (assetId: string): Promise<void> => {
  const { error } = await supabase
    .from('daily_snapshots')
    .delete()
    .eq('asset_id', assetId);

  if (error) {
    console.error('Failed to delete asset snapshots', error);
    throw error;
  }
};

// ===== SNAPSHOT CREATION (Task 3) =====

/** Create or update today's snapshot for a single asset */
export const createTodaySnapshot = async (
  asset: Asset,
  transactions: Transaction[]
): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Filter transactions for this asset
  const assetTransactions = transactions.filter((t) => t.assetId === asset.id);

  // Compute inventory state via the engine
  const history = calculateInventoryState(assetTransactions, asset);

  // Get units and costBasis from the last entry (current state)
  const lastEntry = history.length > 0 ? history[history.length - 1] : null;
  const units = lastEntry ? lastEntry.unitsAfter : 0;
  const costBasis = lastEntry ? lastEntry.inventoryValueAfter : 0;

  const marketPrice = asset.currentMarketPrice ?? 0;
  const marketValue = round(units * marketPrice, 2);

  await upsertSnapshot({
    assetId: asset.id,
    date: today,
    marketPrice,
    units,
    marketValue,
    costBasis,
  });
};

/** Create or update today's snapshots for all held assets */
export const createTodaySnapshotsForAll = async (
  assets: Asset[],
  transactions: Transaction[]
): Promise<void> => {
  for (const asset of assets) {
    // Compute units to check if asset is held
    const assetTransactions = transactions.filter((t) => t.assetId === asset.id);
    const history = calculateInventoryState(assetTransactions, asset);
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    const units = lastEntry ? lastEntry.unitsAfter : 0;

    if (units <= 0) continue;

    try {
      await createTodaySnapshot(asset, transactions);
    } catch (err) {
      console.error(`Failed to create snapshot for asset ${asset.id}:`, err);
      // Continue to next asset
    }
  }
};

// ===== BACKFILL HELPERS (Task 4) =====

/** Module-level flag to ensure backfill runs only once per session */
let hasRunBackfill = false;

/** Enumerate all calendar days (YYYY-MM-DD) from startDate to endDate inclusive */
export const enumerateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/** Return the most recent known market price (pricePerUnit) on or before targetDate, or null */
export const resolveCarryForwardPrice = (
  transactions: Transaction[],
  targetDate: string
): number | null => {
  let latestPrice: number | null = null;
  let latestDate = '';

  for (const tx of transactions) {
    if (tx.date <= targetDate && tx.date > latestDate) {
      latestDate = tx.date;
      latestPrice = tx.pricePerUnit;
    } else if (tx.date <= targetDate && tx.date === latestDate) {
      // Same date — use the latest transaction's price (last one wins)
      latestPrice = tx.pricePerUnit;
    }
  }

  return latestPrice;
};

/** Check if backfill is needed and execute if so */
export const backfillIfNeeded = async (
  assets: Asset[],
  transactions: Transaction[]
): Promise<void> => {
  if (hasRunBackfill) return;

  if (transactions.length === 0 || assets.length === 0) {
    hasRunBackfill = true;
    return;
  }

  // Find the earliest transaction date across all assets
  let earliestDate = transactions[0].date;
  for (const tx of transactions) {
    if (tx.date < earliestDate) {
      earliestDate = tx.date;
    }
  }

  // Compute yesterday's date
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // If earliest date is not before yesterday, no backfill needed
  if (earliestDate >= yesterdayStr) {
    hasRunBackfill = true;
    return;
  }

  // Compute expected number of days
  const dates = enumerateDateRange(earliestDate, yesterdayStr);
  const expectedDays = dates.length;

  // Load existing snapshot count to estimate gap
  const { count, error } = await supabase
    .from('daily_snapshots')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Failed to count existing snapshots', error);
    hasRunBackfill = true;
    return;
  }

  const existingCount = count ?? 0;
  // Expected total = expectedDays * number of assets (rough estimate)
  const expectedTotal = expectedDays * assets.length;
  const gap = expectedTotal - existingCount;

  if (gap <= 1) {
    hasRunBackfill = true;
    return;
  }

  // Perform backfill
  try {
    const batch: Omit<DailySnapshot, 'id'>[] = [];

    for (const asset of assets) {
      const assetTxs = transactions.filter((t) => t.assetId === asset.id);
      if (assetTxs.length === 0) continue;

      for (const date of dates) {
        // Resolve carry-forward price for this asset on this date
        const marketPrice = resolveCarryForwardPrice(assetTxs, date);
        if (marketPrice === null) continue; // No price available — skip (Req 4.5)

        // Filter transactions up to and including this date
        const txsUpToDate = assetTxs.filter((t) => t.date <= date);
        if (txsUpToDate.length === 0) continue;

        // Compute inventory state at this date
        const history = calculateInventoryState(txsUpToDate, asset);
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;
        const units = lastEntry ? lastEntry.unitsAfter : 0;
        const costBasis = lastEntry ? lastEntry.inventoryValueAfter : 0;

        if (units <= 0) continue;

        const marketValue = round(units * marketPrice, 2);

        batch.push({
          assetId: asset.id,
          date,
          marketPrice,
          units,
          marketValue,
          costBasis,
        });

        // Upsert in batches of 500
        if (batch.length >= 500) {
          await upsertSnapshotBatch(batch.splice(0, 500));
        }
      }
    }

    // Upsert remaining
    if (batch.length > 0) {
      await upsertSnapshotBatch(batch);
    }
  } catch (err) {
    console.error('Backfill failed:', err);
  }

  hasRunBackfill = true;
};

// ===== LOCAL CACHE (Task 2.6) =====

const SNAPSHOT_CACHE_KEY = 'it_cache_snapshots';

/** Read snapshots from localStorage cache */
export const readSnapshotCache = (): DailySnapshot[] | null => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as DailySnapshot[];
    }
  } catch { /* ignore corrupted cache */ }
  return null;
};

/** Write snapshots to localStorage cache */
export const writeSnapshotCache = (snapshots: DailySnapshot[]): void => {
  try {
    localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify(snapshots));
  } catch { /* localStorage full or unavailable – non-critical */ }
};

// ===== RECALCULATION (Task 5) =====

/** Recalculate snapshots for an asset from a given date onward */
export const recalculateSnapshots = async (
  asset: Asset,
  transactions: Transaction[],
  fromDate: string
): Promise<void> => {
  // Load existing snapshots from fromDate to far future
  const existing = await loadAssetSnapshots(asset.id, fromDate, '9999-12-31');
  if (existing.length === 0) return;

  // Filter transactions for this asset
  const assetTxs = transactions.filter((t) => t.assetId === asset.id);

  const updated: Omit<DailySnapshot, 'id'>[] = [];

  for (const snap of existing) {
    // Filter transactions on or before this snapshot's date
    const txsUpToDate = assetTxs.filter((t) => t.date <= snap.date);

    // Compute inventory state
    const history = calculateInventoryState(txsUpToDate, asset);
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    const units = lastEntry ? lastEntry.unitsAfter : 0;
    const costBasis = lastEntry ? lastEntry.inventoryValueAfter : 0;

    // Preserve original marketPrice, recompute marketValue
    const marketPrice = snap.marketPrice;
    const marketValue = round(units * marketPrice, 2);

    updated.push({
      assetId: asset.id,
      date: snap.date,
      marketPrice,
      units,
      marketValue,
      costBasis,
    });
  }

  if (updated.length > 0) {
    await upsertSnapshotBatch(updated);
  }
};

/** Clear snapshot cache for a specific asset */
export const clearAssetSnapshotCache = (assetId: string): void => {
  try {
    const cached = readSnapshotCache();
    if (cached) {
      const filtered = cached.filter((s) => s.assetId !== assetId);
      writeSnapshotCache(filtered);
    }
  } catch { /* ignore */ }
};
