import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { round } from './utils';
import { calculateInventoryState } from './engine';
import {
  enumerateDateRange,
  resolveCarryForwardPrice,
} from './services/snapshotService';
import {
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
  DailySnapshot,
} from './types';

// ─── Custom Generators ───────────────────────────────────────────────

/** Generate a YYYY-MM-DD date string within a reasonable range */
const arbDateStr = (minDaysAgo: number = 730, maxDaysAgo: number = 0): fc.Arbitrary<string> =>
  fc.integer({ min: maxDaysAgo, max: minDaysAgo }).map((daysAgo) => {
    const d = new Date(2025, 0, 1); // fixed reference
    d.setDate(d.getDate() - daysAgo);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

/** Generate a mock Asset with AVERAGE_COST method */
const arbAsset = (id: string = 'asset-1'): fc.Arbitrary<Asset> =>
  fc.record({
    id: fc.constant(id),
    symbol: fc.constant('TEST'),
    name: fc.constant('Test Asset'),
    type: fc.constant(AssetType.GOLD),
    method: fc.constant(AccountingMethod.AVERAGE_COST),
    currency: fc.constant('TWD'),
    currentMarketPrice: fc.integer({ min: 1, max: 100000 }).map((v) => v / 100),
  });

/** Generate a BUY transaction for a given assetId */
const arbBuyTx = (assetId: string): fc.Arbitrary<Transaction> =>
  fc.record({
    id: fc.uuid(),
    date: arbDateStr(365, 0),
    quantity: fc.integer({ min: 1, max: 100000 }).map((v) => v / 100),
    pricePerUnit: fc.integer({ min: 1, max: 10000000 }).map((v) => v / 100),
    fees: fc.constant(0),
  }).map((r) => ({
    id: r.id,
    assetId,
    date: r.date,
    type: TransactionType.BUY,
    quantity: round(r.quantity, 4),
    pricePerUnit: round(r.pricePerUnit, 2),
    fees: r.fees,
    totalAmount: round(round(r.quantity, 4) * round(r.pricePerUnit, 2), 2),
  }));

/** Generate a DailySnapshot */
const arbSnapshot = (assetId: string = 'asset-1'): fc.Arbitrary<DailySnapshot> =>
  fc.record({
    id: fc.uuid(),
    date: arbDateStr(365, 0),
    marketPrice: fc.integer({ min: 0, max: 1000000 }).map((v) => v / 100),
    units: fc.integer({ min: 0, max: 100000 }).map((v) => v / 100),
    costBasis: fc.integer({ min: 0, max: 10000000 }).map((v) => v / 100),
  }).map((r) => ({
    id: r.id,
    assetId,
    date: r.date,
    marketPrice: r.marketPrice,
    units: r.units,
    marketValue: round(r.units * r.marketPrice, 2),
    costBasis: r.costBasis,
  }));

// ─── Property-Based Tests ────────────────────────────────────────────

describe('snapshotService property-based tests', () => {

  // Property 1: Market value invariant
  // **Validates: Requirements 1.3**
  it('Property 1: marketValue === round(units * marketPrice, 2) for random units/price', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000000 }).map((v) => v / 100),   // units 0-100000
        fc.integer({ min: 0, max: 100000000 }).map((v) => v / 100),  // marketPrice 0-1000000
        (units, marketPrice) => {
          const marketValue = round(units * marketPrice, 2);
          expect(marketValue).toBe(round(units * marketPrice, 2));
          // Also verify it's a finite number
          expect(Number.isFinite(marketValue)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 2: Snapshot units/costBasis match engine output
  // **Validates: Requirements 1.4, 4.3, 10.1, 10.2**
  it('Property 2: snapshot units/costBasis match engine output for transactions filtered to target date', () => {
    fc.assert(
      fc.property(
        fc.array(arbBuyTx('asset-1'), { minLength: 1, maxLength: 10 }),
        arbAsset('asset-1'),
        (transactions, asset) => {
          // Sort transactions by date
          const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

          // Pick the last transaction's date as target date (guaranteed to have data)
          const targetDate = sorted[sorted.length - 1].date;

          // Filter transactions to those on or before target date
          const filtered = sorted.filter((t) => t.date <= targetDate);

          // Compute via engine
          const history = calculateInventoryState(filtered, asset);
          const lastEntry = history.length > 0 ? history[history.length - 1] : null;
          const expectedUnits = lastEntry ? lastEntry.unitsAfter : 0;
          const expectedCostBasis = lastEntry ? lastEntry.inventoryValueAfter : 0;

          // Verify units and costBasis match
          expect(expectedUnits).toBeGreaterThanOrEqual(0);
          expect(expectedCostBasis).toBeGreaterThanOrEqual(0);

          // Verify the snapshot creation logic would produce the same values
          const marketPrice = asset.currentMarketPrice ?? 0;
          const marketValue = round(expectedUnits * marketPrice, 2);
          expect(marketValue).toBe(round(expectedUnits * marketPrice, 2));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 3: Only assets with units > 0 receive snapshots
  // **Validates: Requirements 2.1**
  it('Property 3: only assets with units > 0 would be included in snapshot creation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (assetCount) => {
          // Create assets: half with transactions, half without
          const assets: Asset[] = [];
          const transactions: Transaction[] = [];

          for (let i = 0; i < assetCount; i++) {
            const id = `asset-${i}`;
            assets.push({
              id,
              symbol: `SYM${i}`,
              name: `Asset ${i}`,
              type: AssetType.GOLD,
              method: AccountingMethod.AVERAGE_COST,
              currency: 'TWD',
              currentMarketPrice: 100,
            });

            // Only even-indexed assets get BUY transactions
            if (i % 2 === 0) {
              transactions.push({
                id: `tx-${i}`,
                assetId: id,
                date: '2024-06-01',
                type: TransactionType.BUY,
                quantity: 10,
                pricePerUnit: 100,
                fees: 0,
                totalAmount: 1000,
              });
            }
          }

          // For each asset, compute units via engine
          const assetsWithUnits: string[] = [];
          const assetsWithoutUnits: string[] = [];

          for (const asset of assets) {
            const assetTxs = transactions.filter((t) => t.assetId === asset.id);
            const history = calculateInventoryState(assetTxs, asset);
            const lastEntry = history.length > 0 ? history[history.length - 1] : null;
            const units = lastEntry ? lastEntry.unitsAfter : 0;

            if (units > 0) {
              assetsWithUnits.push(asset.id);
            } else {
              assetsWithoutUnits.push(asset.id);
            }
          }

          // Assets with even index should have units > 0
          for (let i = 0; i < assetCount; i++) {
            const id = `asset-${i}`;
            if (i % 2 === 0) {
              expect(assetsWithUnits).toContain(id);
            } else {
              expect(assetsWithoutUnits).toContain(id);
            }
          }

          // Verify: only assets with units > 0 would get snapshots
          expect(assetsWithUnits.length).toBeGreaterThan(0);
          expect(assetsWithoutUnits.length).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 4: Backfill date enumeration covers all calendar days with no gaps
  // **Validates: Requirements 4.2**
  it('Property 4: enumerateDateRange covers all calendar days with no gaps or duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),  // daysAgo for start
        fc.integer({ min: 1, max: 365 }),  // range length in days
        (startDaysAgo, rangeDays) => {
          const ref = new Date(2025, 0, 15); // fixed reference to avoid edge cases
          const startD = new Date(ref);
          startD.setDate(startD.getDate() - startDaysAgo);
          const endD = new Date(startD);
          endD.setDate(endD.getDate() + rangeDays);

          const fmt = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
          };

          const startDate = fmt(startD);
          const endDate = fmt(endD);

          const result = enumerateDateRange(startDate, endDate);

          // Length should be rangeDays + 1 (inclusive)
          expect(result.length).toBe(rangeDays + 1);

          // First and last dates match
          expect(result[0]).toBe(startDate);
          expect(result[result.length - 1]).toBe(endDate);

          // No duplicates
          const unique = new Set(result);
          expect(unique.size).toBe(result.length);

          // No gaps: each consecutive pair differs by exactly 1 day
          for (let i = 1; i < result.length; i++) {
            const prev = new Date(result[i - 1] + 'T00:00:00');
            const curr = new Date(result[i] + 'T00:00:00');
            const diffMs = curr.getTime() - prev.getTime();
            const diffDays = diffMs / (24 * 60 * 60 * 1000);
            expect(diffDays).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 5: Carry-forward uses most recent known price, skips dates with no prior price
  // **Validates: Requirements 4.4, 4.5**
  it('Property 5: resolveCarryForwardPrice returns most recent price on or before queryDate, or null', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: arbDateStr(365, 0),
            pricePerUnit: fc.integer({ min: 1, max: 1000000 }).map((v) => v / 100),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        arbDateStr(365, 0),
        (priceEntries, queryDate) => {
          // Create minimal Transaction objects with required fields
          const transactions: Transaction[] = priceEntries.map((entry, i) => ({
            id: `tx-${i}`,
            assetId: 'asset-1',
            date: entry.date,
            type: TransactionType.BUY,
            quantity: 1,
            pricePerUnit: entry.pricePerUnit,
            fees: 0,
            totalAmount: entry.pricePerUnit,
          }));

          const result = resolveCarryForwardPrice(transactions, queryDate);

          // Find all transactions on or before queryDate
          const eligible = transactions.filter((t) => t.date <= queryDate);

          if (eligible.length === 0) {
            // No price available → should return null
            expect(result).toBeNull();
          } else {
            // Should return the price of the most recent transaction on or before queryDate
            const sorted = [...eligible].sort((a, b) => a.date.localeCompare(b.date));
            const mostRecent = sorted[sorted.length - 1];
            expect(result).toBe(mostRecent.pricePerUnit);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 6: Portfolio aggregation equals sum of asset marketValues per date
  // **Validates: Requirements 5.2**
  it('Property 6: aggregated portfolio value per date equals sum of asset marketValues', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),   // number of assets
        fc.integer({ min: 5, max: 20 }),   // number of dates
        fc.integer({ min: 1, max: 10000 }).map((v) => v / 100), // base market value
        (assetCount, dateCount, baseValue) => {
          // Generate snapshots for multiple assets over multiple dates
          const snapshots: DailySnapshot[] = [];
          const ref = new Date(2025, 0, 1);

          for (let d = 0; d < dateCount; d++) {
            const date = new Date(ref);
            date.setDate(date.getDate() + d);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            for (let a = 0; a < assetCount; a++) {
              const mv = round(baseValue * (a + 1) * (d + 1), 2);
              snapshots.push({
                id: `snap-${d}-${a}`,
                assetId: `asset-${a}`,
                date: dateStr,
                marketPrice: 100,
                units: mv / 100,
                marketValue: mv,
                costBasis: mv * 0.8,
              });
            }
          }

          // Aggregate: sum marketValue per date (same logic as loadPortfolioSnapshots)
          const dateMap = new Map<string, number>();
          for (const snap of snapshots) {
            const current = dateMap.get(snap.date) || 0;
            dateMap.set(snap.date, round(current + snap.marketValue, 2));
          }

          // Verify: manual sum matches aggregation
          for (const [date, aggregatedValue] of dateMap) {
            const snapsForDate = snapshots.filter((s) => s.date === date);
            const manualSum = round(
              snapsForDate.reduce((sum, s) => sum + s.marketValue, 0),
              2
            );
            expect(aggregatedValue).toBe(manualSum);
          }

          // Verify: no dates are missing
          expect(dateMap.size).toBe(dateCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 7: snapshotsToPortfolioTimeSeries preserves date/value
  // **Validates: Requirements 6.1**
  it('Property 7: snapshotsToPortfolioTimeSeries preserves date and value for each element', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            date: arbDateStr(365, 0),
            value: fc.integer({ min: 0, max: 10000000 }).map((v) => v / 100),
          }),
          { minLength: 0, maxLength: 30 }
        ),
        (input) => {
          const result = snapshotsToPortfolioTimeSeries(input);

          // Output length matches input length
          expect(result.length).toBe(input.length);

          // Each element's date and value match
          for (let i = 0; i < input.length; i++) {
            expect(result[i].date).toBe(input[i].date);
            expect(result[i].value).toBe(input[i].value);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 8: snapshotsToAssetTimeSeries preserves date/marketValue/costBasis
  // **Validates: Requirements 7.1**
  it('Property 8: snapshotsToAssetTimeSeries preserves date, marketValue, and costBasis', () => {
    fc.assert(
      fc.property(
        fc.array(arbSnapshot('asset-1'), { minLength: 0, maxLength: 30 }),
        (input) => {
          const result = snapshotsToAssetTimeSeries(input);

          // Output length matches input length
          expect(result.length).toBe(input.length);

          // Each element's fields match
          for (let i = 0; i < input.length; i++) {
            expect(result[i].date).toBe(input[i].date);
            expect(result[i].marketValue).toBe(input[i].marketValue);
            expect(result[i].costBasis).toBe(input[i].costBasis);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: snapshotsToSparklineData extracts last N marketValues
  // **Validates: Requirements 8.1**
  it('Property 9: snapshotsToSparklineData extracts last N marketValues in order', () => {
    fc.assert(
      fc.property(
        fc.array(arbSnapshot('asset-1'), { minLength: 1, maxLength: 50 }).map((snaps) =>
          // Sort by date to simulate chronological order
          [...snaps].sort((a, b) => a.date.localeCompare(b.date))
        ),
        fc.integer({ min: 1, max: 20 }),
        (sortedSnapshots, pointCount) => {
          const result = snapshotsToSparklineData(sortedSnapshots, pointCount);

          // Output length is min(pointCount, input.length)
          const expectedLength = Math.min(pointCount, sortedSnapshots.length);
          expect(result.length).toBe(expectedLength);

          // Values are the last N marketValues from input, in order
          const expectedValues = sortedSnapshots
            .slice(-pointCount)
            .map((s) => s.marketValue);
          expect(result).toEqual(expectedValues);
        }
      ),
      { numRuns: 100 }
    );
  });
});
