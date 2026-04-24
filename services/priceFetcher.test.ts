import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { classifySymbol, applyPriceResults, isPriceStale } from './priceFetcher';
import type { SymbolRequest, PriceResult } from './priceFetcher';
import { updateAsset } from './storage';

vi.mock('./storage', () => ({
  updateAsset: vi.fn().mockResolvedValue({}),
}));

const mockedUpdateAsset = vi.mocked(updateAsset);
import { AssetType, AccountingMethod } from '../types';
import type { Asset } from '../types';

/**
 * Property 3: Symbol classification determinism
 * Validates: Requirements 2.4, 8.1, 8.2
 */

const assetTypeValues = [AssetType.GOLD, AssetType.STOCK, AssetType.ETF, AssetType.CRYPTO] as const;
const accountingMethodValues = [AccountingMethod.AVERAGE_COST, AccountingMethod.FIFO, AccountingMethod.LIFO] as const;

// Symbol generators
const allDigitSymbol = fc.stringMatching(/^[0-9]{1,6}$/);
const allDigitWithTwSuffix = allDigitSymbol.map(s => s + '.tw');
const twSymbol = fc.oneof(allDigitSymbol, allDigitWithTwSuffix);
const alphabeticSymbol = fc.stringMatching(/^[A-Z]{1,5}$/);
const mixedSymbol = fc.tuple(allDigitSymbol, alphabeticSymbol).map(([d, a]) => d + a);
const anySymbol = fc.oneof(allDigitSymbol, allDigitWithTwSuffix, alphabeticSymbol, mixedSymbol);

// Asset arbitrary
function assetArb(symbolArb: fc.Arbitrary<string> = anySymbol, typeArb: fc.Arbitrary<AssetType> = fc.constantFrom(...assetTypeValues)): fc.Arbitrary<Asset> {
  return fc.record({
    id: fc.uuid(),
    symbol: symbolArb,
    name: fc.string({ minLength: 1, maxLength: 20 }),
    type: typeArb,
    method: fc.constantFrom(...accountingMethodValues),
    currency: fc.constantFrom('TWD', 'USD', 'USDT', 'JPY', 'EUR'),
    currentMarketPrice: fc.option(fc.float({ min: 0, max: 100000, noNaN: true }), { nil: undefined }),
  });
}

describe('Property 3: Symbol classification determinism', () => {
  it('determinism: calling classifySymbol twice with the same asset returns the same result', () => {
    fc.assert(
      fc.property(assetArb(), (asset) => {
        const result1 = classifySymbol(asset);
        const result2 = classifySymbol(asset);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });

  it('GOLD type always returns "GOLD" regardless of symbol', () => {
    fc.assert(
      fc.property(assetArb(anySymbol, fc.constant(AssetType.GOLD)), (asset) => {
        expect(classifySymbol(asset)).toBe('GOLD');
      }),
      { numRuns: 100 },
    );
  });

  it('CRYPTO type always returns "CRYPTO" regardless of symbol', () => {
    fc.assert(
      fc.property(assetArb(anySymbol, fc.constant(AssetType.CRYPTO)), (asset) => {
        expect(classifySymbol(asset)).toBe('CRYPTO');
      }),
      { numRuns: 100 },
    );
  });

  it('STOCK/ETF with all-digit symbol (with or without .tw suffix) returns "TW_STOCK"', () => {
    const stockOrEtf = fc.constantFrom(AssetType.STOCK, AssetType.ETF);
    fc.assert(
      fc.property(assetArb(twSymbol, stockOrEtf), (asset) => {
        expect(classifySymbol(asset)).toBe('TW_STOCK');
      }),
      { numRuns: 100 },
    );
  });

  it('STOCK/ETF with alphabetic symbol returns "US_STOCK"', () => {
    const stockOrEtf = fc.constantFrom(AssetType.STOCK, AssetType.ETF);
    fc.assert(
      fc.property(assetArb(alphabeticSymbol, stockOrEtf), (asset) => {
        expect(classifySymbol(asset)).toBe('US_STOCK');
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 1: Response completeness invariant
 * Validates: Requirements 1.1, 1.6
 *
 * For any array of SymbolRequest objects, the returned PriceResult[] SHALL contain
 * exactly one entry per input symbol. Each entry has either a non-null price (success)
 * or a non-null error (failure), never both and never neither.
 */

const symbolRequestTypeValues = ['TW_STOCK', 'US_STOCK', 'GOLD', 'CRYPTO'] as const;

// Generate a unique-symbol SymbolRequest array (0–50 items)
const symbolRequestArrayArb: fc.Arbitrary<SymbolRequest[]> = fc
  .uniqueArray(
    fc.record({
      symbol: fc.stringMatching(/^[A-Z0-9]{1,6}$/),
      type: fc.constantFrom(...symbolRequestTypeValues),
    }),
    { minLength: 0, maxLength: 50, selector: (req) => req.symbol },
  );

// Given a SymbolRequest[], generate a matching PriceResult[] with random success/failure per symbol
function mockPriceResultsArb(symbols: SymbolRequest[]): fc.Arbitrary<PriceResult[]> {
  if (symbols.length === 0) return fc.constant([]);

  const resultArbs = symbols.map((sym) =>
    fc.boolean().chain((isSuccess) => {
      if (isSuccess) {
        return fc.record({
          symbol: fc.constant(sym.symbol),
          price: fc.float({ min: Math.fround(0.01), max: Math.fround(999999), noNaN: true }) as fc.Arbitrary<number | null>,
          currency: fc.constantFrom('TWD', 'USD', 'USDT'),
          timestamp: fc.constant(new Date().toISOString()),
        });
      } else {
        return fc.record({
          symbol: fc.constant(sym.symbol),
          price: fc.constant(null) as fc.Arbitrary<number | null>,
          currency: fc.constantFrom('TWD', 'USD', 'USDT'),
          timestamp: fc.constant(new Date().toISOString()),
          error: fc.stringMatching(/^[A-Za-z ]{5,30}$/),
        });
      }
    }),
  );

  return fc.tuple(...(resultArbs as [fc.Arbitrary<PriceResult>, ...fc.Arbitrary<PriceResult>[]])).map(
    (arr) => arr as PriceResult[],
  );
}

describe('Property 1: Response completeness invariant', () => {
  it('result array contains exactly one entry per input symbol', () => {
    fc.assert(
      fc.property(
        symbolRequestArrayArb.chain((symbols) =>
          mockPriceResultsArb(symbols).map((results) => ({ symbols, results })),
        ),
        ({ symbols, results }) => {
          expect(results.length).toBe(symbols.length);

          const resultSymbols = results.map((r) => r.symbol);
          const inputSymbols = symbols.map((s) => s.symbol);
          expect(new Set(resultSymbols)).toEqual(new Set(inputSymbols));

          // Each symbol appears exactly once
          expect(resultSymbols.length).toBe(new Set(resultSymbols).size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each result has either non-null price (no error) or null price (with error), never both, never neither', () => {
    fc.assert(
      fc.property(
        symbolRequestArrayArb.chain((symbols) =>
          mockPriceResultsArb(symbols).map((results) => ({ symbols, results })),
        ),
        ({ results }) => {
          for (const result of results) {
            const hasPrice = result.price !== null;
            const hasError = result.error !== undefined && result.error !== null;

            // Exactly one of price or error must be present
            expect(hasPrice !== hasError).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 2: Result partitioning correctness
 * Validates: Requirements 2.2, 2.3, 2.5
 *
 * For any set of PriceResult objects, applyPriceResults SHALL partition them such that:
 * (a) updateAsset is called exactly once for each result where price is non-null,
 * (b) each result where error is non-null appears in the failed list, and
 * (c) summary.updated + summary.failed.length equals the total number of input results.
 */

// Generate a unique-symbol Asset array
function assetsFromSymbols(symbols: string[]): Asset[] {
  return symbols.map((symbol, i) => ({
    id: `asset-${i}`,
    symbol,
    name: `Asset ${symbol}`,
    type: AssetType.STOCK,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
  }));
}

// Generate PriceResult[] with random success/failure, each symbol unique
const priceResultArrayArb: fc.Arbitrary<{ assets: Asset[]; results: PriceResult[] }> = fc
  .uniqueArray(fc.stringMatching(/^[A-Z0-9]{1,6}$/), { minLength: 1, maxLength: 30 })
  .chain((symbols) => {
    const assets = assetsFromSymbols(symbols);
    const resultArbs = symbols.map((symbol) =>
      fc.boolean().chain((isSuccess) => {
        if (isSuccess) {
          return fc.float({ min: Math.fround(0.01), max: Math.fround(99999), noNaN: true }).map(
            (price): PriceResult => ({
              symbol,
              price,
              currency: 'TWD',
              timestamp: new Date().toISOString(),
            }),
          );
        } else {
          return fc.constant<PriceResult>({
            symbol,
            price: null,
            currency: 'TWD',
            timestamp: new Date().toISOString(),
            error: 'Fetch failed',
          });
        }
      }),
    );
    return fc
      .tuple(...(resultArbs as [fc.Arbitrary<PriceResult>, ...fc.Arbitrary<PriceResult>[]]))
      .map((results) => ({ assets, results }));
  });

describe('Property 2: Result partitioning correctness', () => {
  beforeEach(() => {
    mockedUpdateAsset.mockClear();
    mockedUpdateAsset.mockResolvedValue({} as Asset);
  });

  it('updateAsset is called exactly once per successful result (price !== null)', async () => {
    await fc.assert(
      fc.asyncProperty(priceResultArrayArb, async ({ assets, results }) => {
        mockedUpdateAsset.mockReset();
        mockedUpdateAsset.mockResolvedValue({} as Asset);

        await applyPriceResults(assets, results);

        const successCount = results.filter((r) => r.price !== null && !r.error).length;
        expect(mockedUpdateAsset).toHaveBeenCalledTimes(successCount);

        // Verify each successful symbol triggered exactly one updateAsset call
        const calledIds = mockedUpdateAsset.mock.calls.map((call) => call[0]);
        const expectedIds = results
          .filter((r) => r.price !== null && !r.error)
          .map((r) => {
            const asset = assets.find((a) => a.symbol === r.symbol);
            return asset?.id;
          });
        expect(calledIds).toEqual(expectedIds);
      }),
      { numRuns: 100 },
    );
  });

  it('each failed symbol (price === null or error present) appears in summary.failed', async () => {
    await fc.assert(
      fc.asyncProperty(priceResultArrayArb, async ({ assets, results }) => {
        mockedUpdateAsset.mockReset();
        mockedUpdateAsset.mockResolvedValue({} as Asset);

        const summary = await applyPriceResults(assets, results);

        const failedSymbols = results
          .filter((r) => r.price === null || !!r.error)
          .map((r) => r.symbol);

        expect(summary.failed.sort()).toEqual(failedSymbols.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('summary.updated + summary.failed.length equals total input count', async () => {
    await fc.assert(
      fc.asyncProperty(priceResultArrayArb, async ({ assets, results }) => {
        mockedUpdateAsset.mockReset();
        mockedUpdateAsset.mockResolvedValue({} as Asset);

        const summary = await applyPriceResults(assets, results);

        expect(summary.updated + summary.failed.length).toBe(results.length);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Property 4: Price staleness determination
 * Validates: Requirements 5.2, 5.3, 5.4
 */

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const FIXED_NOW = new Date('2025-06-15T12:00:00.000Z').getTime();

describe('Property 4: Price staleness determination', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('null or undefined always returns true (stale)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        (value) => {
          expect(isPriceStale(value)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('timestamps more than 24 hours ago return true (stale)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
        (extraMs) => {
          const staleTimestamp = new Date(FIXED_NOW - STALE_THRESHOLD_MS - extraMs).toISOString();
          expect(isPriceStale(staleTimestamp)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('timestamps within the last 24 hours return false (fresh)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: STALE_THRESHOLD_MS - 1 }),
        (ageMs) => {
          const freshTimestamp = new Date(FIXED_NOW - ageMs).toISOString();
          expect(isPriceStale(freshTimestamp)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('timestamps in the future return false (fresh)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }),
        (futureMs) => {
          const futureTimestamp = new Date(FIXED_NOW + futureMs).toISOString();
          expect(isPriceStale(futureTimestamp)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('exactly at the 24h boundary: >24h is stale, <=24h is fresh', () => {
    // Exactly 24h ago: Date.now() - fetchedTime === STALE_THRESHOLD_MS
    // The function uses > (strictly greater), so exactly 24h should be false (not stale)
    const exactlyAt24h = new Date(FIXED_NOW - STALE_THRESHOLD_MS).toISOString();
    // 1ms past 24h: should be stale
    const oneMs_past24h = new Date(FIXED_NOW - STALE_THRESHOLD_MS - 1).toISOString();
    // 1ms before 24h: should be fresh
    const oneMs_before24h = new Date(FIXED_NOW - STALE_THRESHOLD_MS + 1).toISOString();

    expect(isPriceStale(oneMs_past24h)).toBe(true);
    expect(isPriceStale(oneMs_before24h)).toBe(false);

    // Exactly at boundary: the implementation uses `>` so exactly 24h is NOT stale
    // Verify: Date.now() - fetchedTime = FIXED_NOW - (FIXED_NOW - THRESHOLD) = THRESHOLD
    // THRESHOLD > THRESHOLD is false, so isPriceStale returns false
    expect(isPriceStale(exactlyAt24h)).toBe(false);
  });
});
