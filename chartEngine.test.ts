import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  computePortfolioTimeSeries,
  filterByTimeRange,
  computeAllocationBreakdown,
  computeAssetTimeSeries,
  computePnlByAsset,
  computeSparklineData,
  snapshotsToPortfolioTimeSeries,
  snapshotsToAssetTimeSeries,
  snapshotsToSparklineData,
} from './chartEngine';
import {
  Transaction,
  TransactionType,
  Asset,
  AssetType,
  AccountingMethod,
  PortfolioPosition,
  TimeRange,
  DailySnapshot,
} from './types';
import { round } from './utils';

// ─── Custom Generators ───────────────────────────────────────────────

const ASSET_IDS = ['asset-1', 'asset-2', 'asset-3', 'asset-4', 'asset-5'];
const CURRENCIES = ['TWD', 'USD', 'EUR', 'JPY', 'USDT'];
const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;

const arbAssetType = fc.constantFrom(
  AssetType.GOLD,
  AssetType.STOCK,
  AssetType.ETF,
  AssetType.CRYPTO
);

const arbAccountingMethod = fc.constantFrom(
  AccountingMethod.AVERAGE_COST,
  AccountingMethod.FIFO,
  AccountingMethod.LIFO
);

const arbTimeRange: fc.Arbitrary<TimeRange> = fc.constantFrom(
  '1W' as TimeRange,
  '1M' as TimeRange,
  '3M' as TimeRange,
  '6M' as TimeRange,
  '1Y' as TimeRange,
  'ALL' as TimeRange
);

const arbRecentIsoDate = fc
  .integer({ min: Date.now() - TWO_YEARS_MS, max: Date.now() })
  .map((ms) => new Date(ms).toISOString());

/** Generate a safe positive double by mapping from integer cents to avoid subnormals/NaN */
const arbPrice = (max: number = 10000) =>
  fc.integer({ min: 0, max: max * 100 }).map((cents) => cents / 100);

const arbAsset: fc.Arbitrary<Asset> = fc.record({
  id: fc.constantFrom(...ASSET_IDS),
  symbol: fc
    .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
      minLength: 1,
      maxLength: 5,
    })
    .map((chars) => chars.join('')),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  type: arbAssetType,
  method: arbAccountingMethod,
  currency: fc.constantFrom(...CURRENCIES),
  currentMarketPrice: arbPrice(10000),
});

/**
 * Generate a BUY transaction for a given assetId.
 * totalAmount = round(quantity * pricePerUnit + fees, 2)
 */
const arbBuyTransaction = (assetId: string): fc.Arbitrary<Transaction> =>
  fc
    .record({
      id: fc.uuid(),
      date: arbRecentIsoDate,
      quantity: fc.integer({ min: 1, max: 100000 }).map((v) => v / 100),
      pricePerUnit: fc.integer({ min: 1, max: 10000000 }).map((v) => v / 100),
      fees: fc.integer({ min: 0, max: 50000 }).map((v) => v / 100),
    })
    .map((r) => ({
      id: r.id,
      assetId,
      date: r.date,
      type: TransactionType.BUY,
      quantity: round(r.quantity, 4),
      pricePerUnit: round(r.pricePerUnit, 2),
      fees: round(r.fees, 2),
      totalAmount: round(
        round(r.quantity, 4) * round(r.pricePerUnit, 2) + round(r.fees, 2),
        2
      ),
    }));

/**
 * Generate a valid Transaction (BUY only for safety — avoids negative inventory).
 */
const arbTransaction: fc.Arbitrary<Transaction> = fc
  .constantFrom(...ASSET_IDS)
  .chain((assetId) => arbBuyTransaction(assetId));

/**
 * Generate a PortfolioPosition with units > 0 derived from an asset.
 */
const arbPortfolioPosition: fc.Arbitrary<PortfolioPosition> = arbAsset.chain(
  (asset) =>
    fc
      .record({
        units: fc.integer({ min: 1, max: 10000 }).map((v) => v / 100),
        avgCost: fc.integer({ min: 1, max: 1000000 }).map((v) => v / 100),
      })
      .map((r) => {
        const units = round(r.units, 4);
        const avgCost = round(r.avgCost, 4);
        const investmentAmount = round(units * avgCost, 2);
        const marketPrice = asset.currentMarketPrice ?? 0;
        const marketValue = round(units * marketPrice, 2);
        const unrealizedPnl = round(marketValue - investmentAmount, 2);
        const returnPercentage =
          investmentAmount > 0
            ? round(((marketValue - investmentAmount) / investmentAmount) * 100, 2)
            : 0;
        return {
          asset,
          units,
          avgCost,
          investmentAmount,
          marketPrice,
          marketValue,
          unrealizedPnl,
          returnPercentage,
        };
      })
);

// ─── Property Tests ──────────────────────────────────────────────────

describe('chartEngine property-based tests', () => {
  // Feature: modern-ui-and-charts, Property 1: Portfolio time series is chronologically ordered and reflects cumulative value
  // **Validates: Requirements 2.2**
  it('Property 1: Portfolio time series is chronologically ordered and reflects cumulative value', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransaction, { minLength: 1, maxLength: 30 }),
        fc.array(arbAsset, { minLength: 1, maxLength: 5 }),
        (transactions, assets) => {
          const result = computePortfolioTimeSeries(transactions, assets);

          // Sorted ascending by date
          for (let i = 1; i < result.length; i++) {
            expect(
              new Date(result[i].date).getTime()
            ).toBeGreaterThanOrEqual(new Date(result[i - 1].date).getTime());
          }

          // Each value >= 0
          for (const point of result) {
            expect(point.value).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 2: Time range filtering only includes dates within the selected range
  // **Validates: Requirements 3.2**
  it('Property 2: Time range filtering only includes dates within the selected range', () => {
    const arbDataPoint = fc.record({
      date: arbRecentIsoDate,
      value: fc.integer({ min: 0, max: 100000000 }).map((v) => v / 100),
    });

    const daysMap: Record<string, number> = {
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
    };

    fc.assert(
      fc.property(
        fc.array(arbDataPoint, { minLength: 0, maxLength: 30 }),
        arbTimeRange,
        (data, range) => {
          const result = filterByTimeRange(data, range);

          if (range === 'ALL') {
            // ALL returns full array
            expect(result).toEqual(data);
          } else {
            const days = daysMap[range];
            const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            // All returned dates >= cutoff
            for (const point of result) {
              const parsed = new Date(point.date).getTime();
              const dateMs = Number.isNaN(parsed) ? 0 : parsed;
              expect(dateMs).toBeGreaterThanOrEqual(cutoff.getTime());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 3: Allocation breakdown excludes zero-value types and percentages sum to 100
  // **Validates: Requirements 4.1, 4.3**
  it('Property 3: Allocation breakdown excludes zero-value types and percentages sum to 100', () => {
    fc.assert(
      fc.property(
        fc.array(arbPortfolioPosition, { minLength: 0, maxLength: 20 }),
        (positions) => {
          const result = computeAllocationBreakdown(positions);

          // No zero-value types in output
          for (const point of result) {
            expect(point.value).toBeGreaterThan(0);
          }

          // Percentages sum to 100 ±0.1 (when result is non-empty)
          if (result.length > 0) {
            const sum = result.reduce((s, r) => s + r.percentage, 0);
            expect(sum).toBeCloseTo(100, 0);
            expect(Math.abs(sum - 100)).toBeLessThanOrEqual(0.1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 4: Asset time series is chronologically ordered with both value and cost basis
  // **Validates: Requirements 5.1, 5.2**
  it('Property 4: Asset time series is chronologically ordered with both value and cost basis', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransaction, { minLength: 1, maxLength: 30 }),
        arbAsset,
        (transactions, asset) => {
          // Ensure at least some transactions match the asset
          const txForAsset = transactions.map((tx) => ({
            ...tx,
            assetId: asset.id,
          }));
          const result = computeAssetTimeSeries(txForAsset, asset);

          // Ascending date order
          for (let i = 1; i < result.length; i++) {
            expect(
              new Date(result[i].date).getTime()
            ).toBeGreaterThanOrEqual(new Date(result[i - 1].date).getTime());
          }

          // marketValue >= 0 and costBasis >= 0
          for (const point of result) {
            expect(point.marketValue).toBeGreaterThanOrEqual(0);
            expect(point.costBasis).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 5: P&L data includes only non-zero positions, sorted descending, with symbols
  // **Validates: Requirements 6.1, 6.3, 6.4**
  it('Property 5: P&L data includes only non-zero positions, sorted descending, with symbols', () => {
    fc.assert(
      fc.property(
        fc.array(arbPortfolioPosition, { minLength: 0, maxLength: 20 }),
        (positions) => {
          const result = computePnlByAsset(positions);

          // Only units > 0 included (all generated positions have units > 0,
          // but verify the function filters correctly)
          const nonZeroPositions = positions.filter((p) => p.units > 0);
          expect(result.length).toBeLessThanOrEqual(nonZeroPositions.length);

          // Descending pnl order
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].pnl).toBeGreaterThanOrEqual(result[i].pnl);
          }

          // Non-empty symbols
          for (const point of result) {
            expect(point.symbol.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 6: Chart data JSON round-trip
  // **Validates: Requirements 7.5**
  it('Property 6: Chart data JSON round-trip', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransaction, { minLength: 1, maxLength: 30 }),
        fc.array(arbAsset, { minLength: 1, maxLength: 5 }),
        (transactions, assets) => {
          const result = computePortfolioTimeSeries(transactions, assets);
          const roundTripped = JSON.parse(JSON.stringify(result));
          expect(roundTripped).toEqual(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: modern-ui-and-charts, Property 7: Sparkline data returns bounded numeric array
  // **Validates: Requirements 9.1**
  it('Property 7: Sparkline data returns bounded numeric array', () => {
    fc.assert(
      fc.property(
        fc.array(arbTransaction, { minLength: 1, maxLength: 30 }),
        arbAsset,
        fc.integer({ min: 1, max: 20 }),
        (transactions, asset, pointCount) => {
          // Ensure at least some transactions match the asset
          const txForAsset = transactions.map((tx) => ({
            ...tx,
            assetId: asset.id,
          }));
          const result = computeSparklineData(txForAsset, asset, pointCount);

          // Length between 0 and pointCount (0 if no matching transactions)
          expect(result.length).toBeGreaterThanOrEqual(0);
          expect(result.length).toBeLessThanOrEqual(pointCount);

          // If we forced transactions to match, we should have results
          if (txForAsset.length > 0) {
            expect(result.length).toBeGreaterThan(0);
          }

          // All elements are finite and >= 0
          for (const val of result) {
            expect(Number.isFinite(val)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Unit Tests for Snapshot-Based Chart Functions ───────────────────

describe('snapshotsToPortfolioTimeSeries', () => {
  it('maps date and value from each snapshot', () => {
    const input = [
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1050 },
    ];
    const result = snapshotsToPortfolioTimeSeries(input);
    expect(result).toEqual([
      { date: '2024-01-01', value: 1000 },
      { date: '2024-01-02', value: 1050 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(snapshotsToPortfolioTimeSeries([])).toEqual([]);
  });

  it('preserves order', () => {
    const input = [
      { date: '2024-03-01', value: 300 },
      { date: '2024-01-01', value: 100 },
    ];
    const result = snapshotsToPortfolioTimeSeries(input);
    expect(result[0].date).toBe('2024-03-01');
    expect(result[1].date).toBe('2024-01-01');
  });
});

describe('snapshotsToAssetTimeSeries', () => {
  const makeSnapshot = (overrides: Partial<DailySnapshot> = {}): DailySnapshot => ({
    id: 'snap-1',
    assetId: 'asset-1',
    date: '2024-01-01',
    marketPrice: 100,
    units: 10,
    marketValue: 1000,
    costBasis: 800,
    ...overrides,
  });

  it('maps date, marketValue, and costBasis from each snapshot', () => {
    const input = [
      makeSnapshot({ date: '2024-01-01', marketValue: 1000, costBasis: 800 }),
      makeSnapshot({ date: '2024-01-02', marketValue: 1100, costBasis: 800 }),
    ];
    const result = snapshotsToAssetTimeSeries(input);
    expect(result).toEqual([
      { date: '2024-01-01', marketValue: 1000, costBasis: 800 },
      { date: '2024-01-02', marketValue: 1100, costBasis: 800 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(snapshotsToAssetTimeSeries([])).toEqual([]);
  });

  it('excludes id, assetId, marketPrice, and units from output', () => {
    const result = snapshotsToAssetTimeSeries([makeSnapshot()]);
    const keys = Object.keys(result[0]);
    expect(keys).toEqual(['date', 'marketValue', 'costBasis']);
  });
});

describe('snapshotsToSparklineData', () => {
  const makeSnapshot = (date: string, marketValue: number): DailySnapshot => ({
    id: `snap-${date}`,
    assetId: 'asset-1',
    date,
    marketPrice: 100,
    units: marketValue / 100,
    marketValue,
    costBasis: 500,
  });

  it('extracts last N marketValue entries', () => {
    const input = [
      makeSnapshot('2024-01-01', 100),
      makeSnapshot('2024-01-02', 200),
      makeSnapshot('2024-01-03', 300),
      makeSnapshot('2024-01-04', 400),
      makeSnapshot('2024-01-05', 500),
    ];
    expect(snapshotsToSparklineData(input, 3)).toEqual([300, 400, 500]);
  });

  it('returns all values when pointCount exceeds length', () => {
    const input = [
      makeSnapshot('2024-01-01', 100),
      makeSnapshot('2024-01-02', 200),
    ];
    expect(snapshotsToSparklineData(input, 10)).toEqual([100, 200]);
  });

  it('defaults to 30 points', () => {
    const input = Array.from({ length: 50 }, (_, i) =>
      makeSnapshot(`2024-01-${String(i + 1).padStart(2, '0')}`, (i + 1) * 10)
    );
    const result = snapshotsToSparklineData(input);
    expect(result.length).toBe(30);
    expect(result[0]).toBe(210); // 21st item
    expect(result[29]).toBe(500); // 50th item
  });

  it('returns empty array for empty input', () => {
    expect(snapshotsToSparklineData([])).toEqual([]);
  });
});
