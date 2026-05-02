import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.hoisted(() => vi.fn());
const updateAssetMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('./storage', () => ({
  updateAsset: updateAssetMock,
}));

import { fetchAllPrices, fetchSinglePrice } from './priceFetcher';
import { AccountingMethod, AssetType } from '../types';
import type { Asset } from '../types';

const asset: Asset = {
  id: 'asset-1',
  symbol: '2330.tw',
  name: 'TSMC',
  type: AssetType.STOCK,
  method: AccountingMethod.AVERAGE_COST,
  currency: 'TWD',
};

const originalApiUrl = import.meta.env.VITE_API_URL;

describe('HTTP price API fallback', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    updateAssetMock.mockClear();
  });

  afterEach(() => {
    import.meta.env.VITE_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it('uses VITE_API_URL when configured and maps TW stock symbols back to the original asset symbol', async () => {
    import.meta.env.VITE_API_URL = 'http://localhost:3000/api';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            symbol: '2330',
            price: 912,
            currency: 'TWD',
            timestamp: '2026-05-02T10:00:00.000Z',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchSinglePrice(asset);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/prices',
      expect.objectContaining({ method: 'POST' }),
    );

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(requestInit.body))).toEqual({
      symbols: [{ symbol: '2330', type: 'TW_STOCK' }],
    });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      symbol: '2330.tw',
      price: 912,
      currency: 'TWD',
      timestamp: '2026-05-02T10:00:00.000Z',
    });
    expect(updateAssetMock).toHaveBeenCalledWith('asset-1', {
      currentMarketPrice: 912,
      lastPriceFetchedAt: '2026-05-02T10:00:00.000Z',
    });
  });

  it('falls back to Supabase Edge Functions when no HTTP API URL is configured', async () => {
    import.meta.env.VITE_API_URL = '';
    vi.stubGlobal('fetch', vi.fn());
    invokeMock.mockResolvedValue({
      data: {
        results: [
          {
            symbol: 'AAPL',
            price: 185.42,
            currency: 'USD',
            timestamp: '2026-05-02T11:00:00.000Z',
          },
        ],
      },
      error: null,
    });

    const result = await fetchSinglePrice({
      ...asset,
      symbol: 'AAPL',
      currency: 'USD',
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      symbol: 'AAPL',
      price: 185.42,
      currency: 'USD',
      timestamp: '2026-05-02T11:00:00.000Z',
    });
  });

  it('maps common crypto tickers to CoinGecko ids so BTC and ETH prices resolve', async () => {
    import.meta.env.VITE_API_URL = '';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bitcoin: { usd: 78181 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchSinglePrice({
      ...asset,
      symbol: 'BTC',
      type: AssetType.CRYPTO,
      currency: 'USDT',
    });

    expect(invokeMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    );
    expect(result).toEqual({
      symbol: 'BTC',
      price: 78181,
      currency: 'USDT',
      timestamp: expect.any(String),
    });
  });

  it('returns a structured error result when the upstream omits a requested symbol', async () => {
    import.meta.env.VITE_API_URL = '';
    vi.stubGlobal('fetch', vi.fn());
    invokeMock.mockResolvedValue({
      data: { results: [] },
      error: null,
    });

    const result = await fetchSinglePrice({
      ...asset,
      symbol: 'AAPL',
      currency: 'USD',
    });

    expect(result).toEqual({
      symbol: 'AAPL',
      price: null,
      currency: 'USD',
      timestamp: expect.any(String),
      error: 'No price data returned for AAPL',
    });
  });

  it('preserves distinct TW symbols that normalize to the same upstream ticker', async () => {
    import.meta.env.VITE_API_URL = 'http://localhost:3000/api';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            symbol: '2330',
            price: 910,
            currency: 'TWD',
            timestamp: '2026-05-02T12:00:00.000Z',
          },
          {
            symbol: '2330',
            price: 911,
            currency: 'TWD',
            timestamp: '2026-05-02T12:00:01.000Z',
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const summary = await fetchAllPrices([
      asset,
      {
        ...asset,
        id: 'asset-2',
        symbol: '2330',
        name: 'TSMC Local',
      },
    ]);

    expect(summary).toEqual({ updated: 2, failed: [] });
    expect(updateAssetMock).toHaveBeenNthCalledWith(1, 'asset-1', {
      currentMarketPrice: 910,
      lastPriceFetchedAt: '2026-05-02T12:00:00.000Z',
    });
    expect(updateAssetMock).toHaveBeenNthCalledWith(2, 'asset-2', {
      currentMarketPrice: 911,
      lastPriceFetchedAt: '2026-05-02T12:00:01.000Z',
    });
  });

  it('falls back to direct TWSE fetching when the local API and Edge Function are unavailable', async () => {
    import.meta.env.VITE_API_URL = 'http://localhost:3000/api';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stat: 'OK',
          data: [
            ['115/04/01', '2,010,969', '132,078,877', '65.70', '65.95', '65.20', '65.80', '0.15', '1,358'],
            ['115/04/30', '4,888,888', '345,555,555', '70.10', '71.10', '69.80', '70.95', '0.55', '2,468'],
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Failed to send a request to the Edge Function'),
    });

    const result = await fetchSinglePrice({
      ...asset,
      symbol: '00646',
      name: 'Yuanta S&P 500 ETF',
      type: AssetType.ETF,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json'),
    );
    expect(result).toEqual({
      symbol: '00646',
      price: 70.95,
      currency: 'TWD',
      timestamp: expect.any(String),
    });
  });

  it('retries the previous TWSE month when the current month has no trading data yet', async () => {
    import.meta.env.VITE_API_URL = 'http://localhost:3000/api';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stat: '很抱歉，沒有符合條件的資料!',
          data: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          stat: 'OK',
          data: [
            ['115/04/30', '4,888,888', '345,555,555', '70.10', '71.10', '69.80', '70.95', '0.55', '2,468'],
          ],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Failed to send a request to the Edge Function'),
    });

    const result = await fetchSinglePrice({
      ...asset,
      symbol: '00646',
      name: 'Yuanta S&P 500 ETF',
      type: AssetType.ETF,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json'),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json'),
    );
    expect(result).toEqual({
      symbol: '00646',
      price: 70.95,
      currency: 'TWD',
      timestamp: expect.any(String),
    });
  });
});
