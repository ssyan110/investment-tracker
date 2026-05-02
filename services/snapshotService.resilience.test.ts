import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseHarness = vi.hoisted(() => {
  const state = {
    selectResult: { data: [], error: null, count: 0 },
    upsertResult: { error: null },
  };

  const makeBuilder = () => {
    const builder: any = {
      upsert: vi.fn(async () => state.upsertResult),
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      lte: vi.fn(() => builder),
      order: vi.fn(async () => state.selectResult),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(state.selectResult).then(resolve),
    };
    return builder;
  };

  return { state, makeBuilder };
});

vi.mock('./supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => supabaseHarness.makeBuilder()),
  },
}));

import { loadPortfolioSnapshots, upsertSnapshot } from './snapshotService';

const makeSupabaseError = () => ({
  code: 'PGRST205',
  message: "Could not find the table 'public.daily_snapshots' in the schema cache",
  details: null,
  hint: null,
});

describe('snapshotService resilience', () => {
  beforeEach(() => {
    supabaseHarness.state.selectResult = { data: [], error: null, count: 0 };
    supabaseHarness.state.upsertResult = { error: null };
  });

  it('returns an empty portfolio series when daily_snapshots table is missing', async () => {
    supabaseHarness.state.selectResult = {
      data: null,
      error: makeSupabaseError(),
      count: null,
    };

    await expect(loadPortfolioSnapshots('2026-01-01', '2026-12-31')).resolves.toEqual([]);
  });

  it('treats missing daily_snapshots table as a no-op during upsert', async () => {
    supabaseHarness.state.upsertResult = {
      error: makeSupabaseError(),
    };

    await expect(
      upsertSnapshot({
        assetId: 'asset-1',
        date: '2026-05-02',
        marketPrice: 100,
        units: 2,
        marketValue: 200,
        costBasis: 150,
      }),
    ).resolves.toBeUndefined();
  });

  it('recovers automatically once the daily_snapshots table becomes available later', async () => {
    supabaseHarness.state.selectResult = {
      data: null,
      error: makeSupabaseError(),
      count: null,
    };

    await expect(loadPortfolioSnapshots('2026-01-01', '2026-12-31')).resolves.toEqual([]);

    supabaseHarness.state.selectResult = {
      data: [
        {
          id: 'snap-1',
          asset_id: 'asset-1',
          date: '2026-05-02',
          market_price: 100,
          units: 2,
          market_value: 200,
          cost_basis: 150,
        },
      ],
      error: null,
      count: 1,
    };

    await expect(loadPortfolioSnapshots('2026-01-01', '2026-12-31')).resolves.toEqual([
      { date: '2026-05-02', value: 200 },
    ]);
  });
});
