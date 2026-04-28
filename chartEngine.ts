import {
  Transaction,
  TransactionType,
  Asset,
  PortfolioPosition,
  PortfolioTimeSeriesPoint,
  AllocationDataPoint,
  AssetTimeSeriesPoint,
  PnlDataPoint,
  TimeRange,
  DailySnapshot,
} from './types';
import { round } from './utils';

/**
 * Chart Data Engine
 * Pure functions. Stateless. Deterministic.
 * Transforms transaction ledger + market data into chart-ready data structures.
 */

/**
 * 3.1 — Replay transaction ledger chronologically, compute cumulative
 * portfolio value at each transaction date.
 * Always appends a "today" point so the chart extends to the present.
 */
export const computePortfolioTimeSeries = (
  transactions: Transaction[],
  assets: Asset[]
): PortfolioTimeSeriesPoint[] => {
  if (transactions.length === 0) return [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const assetMap = new Map<string, Asset>();
  for (const a of assets) assetMap.set(a.id, a);

  // Track units held per asset
  const holdings = new Map<string, number>();

  const points: PortfolioTimeSeriesPoint[] = [];

  for (const tx of sorted) {
    const current = holdings.get(tx.assetId) ?? 0;
    if (tx.type === TransactionType.BUY) {
      holdings.set(tx.assetId, round(current + tx.quantity, 4));
    } else {
      holdings.set(tx.assetId, round(current - tx.quantity, 4));
    }

    // Compute total portfolio value at this point
    let totalValue = 0;
    for (const [assetId, units] of holdings) {
      const asset = assetMap.get(assetId);
      const price = asset?.currentMarketPrice ?? 0;
      totalValue += units * price;
    }

    points.push({
      date: tx.date,
      value: round(totalValue, 2),
    });
  }

  // Append a "today" point with current portfolio value so the chart
  // always extends to the present date (important for time-range filtering)
  const today = new Date().toISOString();
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.date !== today) {
    points.push({ date: today, value: lastPoint.value });
  }

  return points;
};

/**
 * 3.2 — Filter time-series data by a time range.
 * Cutoff: 1W=7d, 1M=30d, 3M=90d, 6M=180d, 1Y=365d, ALL=no filter.
 * Unparseable dates are treated as epoch (filtered out by any range except ALL).
 */
export const filterByTimeRange = <T extends { date: string }>(
  data: T[],
  range: TimeRange
): T[] => {
  if (range === 'ALL') return data;

  const daysMap: Record<string, number> = {
    '1W': 7,
    '1M': 30,
    '3M': 90,
    '6M': 180,
    '1Y': 365,
  };

  const days = daysMap[range];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return data.filter((point) => {
    const parsed = new Date(point.date).getTime();
    const dateMs = Number.isNaN(parsed) ? 0 : parsed;
    return dateMs >= cutoff.getTime();
  });
};

/**
 * 3.3 — Group positions by asset type, sum market values.
 * Exclude types with zero value. Percentages sum to 100 (±0.1).
 * Returns empty array when total value is 0.
 */
export const computeAllocationBreakdown = (
  positions: PortfolioPosition[]
): AllocationDataPoint[] => {
  const typeValues = new Map<string, number>();

  for (const pos of positions) {
    const current = typeValues.get(pos.asset.type) ?? 0;
    typeValues.set(pos.asset.type, current + pos.marketValue);
  }

  // Filter out zero-value types
  const entries = [...typeValues.entries()].filter(([, v]) => v > 0);

  const totalValue = entries.reduce((sum, [, v]) => sum + v, 0);
  if (totalValue === 0) return [];

  const result: AllocationDataPoint[] = entries.map(([type, value]) => ({
    type: type as AllocationDataPoint['type'],
    value: Math.round(value * 100) / 100,
    percentage: Math.round((value / totalValue) * 10000) / 100,
  }));

  // Adjust percentages to sum to exactly 100
  const percentSum = result.reduce((s, r) => s + r.percentage, 0);
  if (result.length > 0 && Math.abs(percentSum - 100) > 0.001) {
    const diff = Math.round((100 - percentSum) * 100) / 100;
    const largest = result.reduce((max, r) =>
      r.percentage > max.percentage ? r : max
    );
    largest.percentage = Math.round((largest.percentage + diff) * 100) / 100;
  }

  return result;
};

/**
 * 3.4 — Replay transactions for a single asset, compute market value
 * and cost basis at each date. Chronologically sorted.
 */
export const computeAssetTimeSeries = (
  transactions: Transaction[],
  asset: Asset
): AssetTimeSeriesPoint[] => {
  const filtered = transactions.filter((t) => t.assetId === asset.id);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const price = asset.currentMarketPrice ?? 0;
  let units = 0;
  let totalCost = 0;
  let avgCost = 0;

  const points: AssetTimeSeriesPoint[] = [];

  for (const tx of sorted) {
    if (tx.type === TransactionType.BUY) {
      totalCost = round(totalCost + tx.totalAmount, 2);
      units = round(units + tx.quantity, 4);
      avgCost = units > 0 ? round(totalCost / units, 4) : 0;
    } else {
      units = round(units - tx.quantity, 4);
      totalCost = round(avgCost * units, 2);
    }

    points.push({
      date: tx.date,
      marketValue: round(units * price, 2),
      costBasis: round(avgCost * units, 2),
    });
  }

  return points;
};

/**
 * 3.5 — Include only positions with units > 0.
 * Sort descending by pnl value. Each point has non-empty symbol.
 */
export const computePnlByAsset = (
  positions: PortfolioPosition[]
): PnlDataPoint[] => {
  return positions
    .filter((p) => p.units > 0)
    .map((p) => ({
      symbol: p.asset.symbol,
      name: p.asset.name,
      pnl: round(p.unrealizedPnl, 2),
      returnPct: round(p.returnPercentage, 2),
    }))
    .sort((a, b) => b.pnl - a.pnl);
};

/**
 * 3.6 — Return array of recent value points for sparkline rendering.
 * Default pointCount = 10. All values finite and >= 0.
 * Length between 1 and pointCount. Empty array if no transactions for this asset.
 */
export const computeSparklineData = (
  transactions: Transaction[],
  asset: Asset,
  pointCount: number = 10
): number[] => {
  const filtered = transactions.filter((t) => t.assetId === asset.id);
  if (filtered.length === 0) return [];

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const price = asset.currentMarketPrice ?? 0;
  let units = 0;

  const values: number[] = [];

  for (const tx of sorted) {
    if (tx.type === TransactionType.BUY) {
      units = round(units + tx.quantity, 4);
    } else {
      units = round(units - tx.quantity, 4);
    }
    values.push(round(Math.max(0, units * price), 2));
  }

  // Take the most recent `pointCount` values
  return values.slice(-pointCount);
};

/**
 * 6.1 — Convert portfolio-level snapshots to PortfolioTimeSeriesPoint[].
 * Each input element's date and value map directly to the output.
 * Order is preserved.
 */
export const snapshotsToPortfolioTimeSeries = (
  snapshots: { date: string; value: number }[]
): PortfolioTimeSeriesPoint[] => {
  return snapshots.map((s) => ({ date: s.date, value: s.value }));
};

/**
 * 6.2 — Convert asset-level snapshots to AssetTimeSeriesPoint[].
 * Each input element's date, marketValue, and costBasis map directly.
 * Order is preserved.
 */
export const snapshotsToAssetTimeSeries = (
  snapshots: DailySnapshot[]
): AssetTimeSeriesPoint[] => {
  return snapshots.map((s) => ({
    date: s.date,
    marketValue: s.marketValue,
    costBasis: s.costBasis,
  }));
};

/**
 * 6.3 — Extract the last N marketValue entries from snapshots as number[].
 * Default pointCount = 30. Returns values in chronological order.
 */
export const snapshotsToSparklineData = (
  snapshots: DailySnapshot[],
  pointCount: number = 30
): number[] => {
  return snapshots.slice(-pointCount).map((s) => s.marketValue);
};
