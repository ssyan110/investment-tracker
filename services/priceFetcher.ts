import { Asset, AssetType } from '../types';
import { supabase } from './supabaseClient';
import { updateAsset } from './storage';

export interface SymbolRequest {
  symbol: string;
  type: 'TW_STOCK' | 'US_STOCK' | 'GOLD' | 'CRYPTO';
}

export interface PriceResult {
  symbol: string;
  price: number | null;
  currency: string;
  timestamp: string;
  error?: string;
}

export interface PriceFetchSummary {
  updated: number;
  failed: string[];
}

/** Strip .tw / .TW suffix and return the bare symbol for TWSE lookup */
export function stripTwSuffix(symbol: string): string {
  return symbol.replace(/\.tw$/i, '');
}

/** Returns true if the symbol looks Taiwanese (all digits, optionally with .tw suffix) */
function isTaiwanSymbol(symbol: string): boolean {
  return /^\d+(?:\.tw)?$/i.test(symbol);
}

export function classifySymbol(asset: Asset): SymbolRequest['type'] {
  if (asset.type === AssetType.GOLD) return 'GOLD';
  if (asset.type === AssetType.CRYPTO) return 'CRYPTO';
  if (asset.type === AssetType.STOCK || asset.type === AssetType.ETF) {
    return isTaiwanSymbol(asset.symbol) ? 'TW_STOCK' : 'US_STOCK';
  }
  return 'US_STOCK';
}

function errorResult(symbol: string, currency: string, message: string): PriceResult {
  return { symbol, price: null, currency, timestamp: new Date().toISOString(), error: message };
}

// ── Taiwan Stocks: TWSE exchangeReport API (has CORS) ───────────────────────

async function fetchTwsePrices(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  // Fetch sequentially with small delay to avoid TWSE rate limiting
  const results: PriceResult[] = [];
  for (const s of symbols) {
    try {
      const stockNo = stripTwSuffix(s.symbol);
      const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${stockNo}`;
      console.log(`[price] Fetching TWSE ${stockNo}…`);
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`[price] TWSE ${stockNo} HTTP ${res.status}`);
        results.push(errorResult(s.symbol, 'TWD', `TWSE HTTP ${res.status}`));
        continue;
      }
      const data = await res.json();
      if (data.stat !== 'OK' || !data.data?.length) {
        console.warn(`[price] TWSE ${stockNo} no data, stat=${data.stat}`);
        results.push(errorResult(s.symbol, 'TWD', `No data for ${s.symbol}`));
        continue;
      }
      const lastRow = data.data[data.data.length - 1];
      const priceStr = lastRow[6]?.replace(/,/g, '');
      const price = parseFloat(priceStr);
      if (isNaN(price) || price <= 0) {
        results.push(errorResult(s.symbol, 'TWD', `Invalid price for ${s.symbol}`));
        continue;
      }
      console.log(`[price] TWSE ${stockNo} = ${price} TWD`);
      results.push({ symbol: s.symbol, price, currency: 'TWD', timestamp: new Date().toISOString() });
      // Small delay between requests to be polite to TWSE
      if (symbols.length > 1) await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.warn(`[price] TWSE ${s.symbol} error:`, err);
      results.push(errorResult(s.symbol, 'TWD', err instanceof Error ? err.message : 'TWSE fetch failed'));
    }
  }
  return results;
}

// ── Crypto: CoinGecko API (has CORS) ────────────────────────────────────────

async function fetchCryptoPrices(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];
  const ids = symbols.map(s => s.symbol.toLowerCase()).join(',');
  try {
    console.log(`[price] Fetching CoinGecko: ${ids}`);
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (!res.ok) {
      console.warn(`[price] CoinGecko HTTP ${res.status}`);
      return symbols.map(s => errorResult(s.symbol, 'USDT', `CoinGecko HTTP ${res.status}`));
    }
    const data: Record<string, { usd?: number }> = await res.json();
    console.log('[price] CoinGecko response:', data);
    const now = new Date().toISOString();
    return symbols.map(s => {
      const entry = data[s.symbol.toLowerCase()];
      return entry?.usd != null
        ? { symbol: s.symbol, price: entry.usd, currency: 'USDT', timestamp: now }
        : errorResult(s.symbol, 'USDT', `No price data for ${s.symbol}`);
    });
  } catch (err) {
    console.warn('[price] CoinGecko error:', err);
    return symbols.map(s => errorResult(s.symbol, 'USDT', err instanceof Error ? err.message : 'CoinGecko fetch failed'));
  }
}

// ── US Stocks & Gold: via Supabase Edge Function (server-side proxy) ────────

async function fetchViaEdgeFunction(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];
  try {
    const { data, error } = await supabase.functions.invoke('fetch-prices', {
      body: { symbols },
    });
    if (error) throw error;
    return (data?.results as PriceResult[]) ?? symbols.map(s => errorResult(s.symbol, 'USD', 'No response'));
  } catch {
    // Edge Function not deployed or unreachable — return clear error
    return symbols.map(s =>
      errorResult(s.symbol, s.type === 'GOLD' ? 'TWD' : 'USD', 'Edge Function unavailable. Deploy fetch-prices to enable.')
    );
  }
}

// ── Main dispatch ───────────────────────────────────────────────────────────

async function fetchPrices(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  const groups: Record<string, SymbolRequest[]> = { TW_STOCK: [], US_STOCK: [], GOLD: [], CRYPTO: [] };
  for (const sym of symbols) groups[sym.type].push(sym);

  // Direct client-side calls for CORS-friendly APIs
  // Edge Function proxy for APIs that block CORS
  const [tw, crypto, proxy] = await Promise.allSettled([
    fetchTwsePrices(groups.TW_STOCK),
    fetchCryptoPrices(groups.CRYPTO),
    fetchViaEdgeFunction([...groups.US_STOCK, ...groups.GOLD]),
  ]);

  const results: PriceResult[] = [];
  if (tw.status === 'fulfilled') results.push(...tw.value);
  else groups.TW_STOCK.forEach(s => results.push(errorResult(s.symbol, 'TWD', 'Fetch failed')));

  if (crypto.status === 'fulfilled') results.push(...crypto.value);
  else groups.CRYPTO.forEach(s => results.push(errorResult(s.symbol, 'USDT', 'Fetch failed')));

  if (proxy.status === 'fulfilled') results.push(...proxy.value);
  else [...groups.US_STOCK, ...groups.GOLD].forEach(s =>
    results.push(errorResult(s.symbol, s.type === 'GOLD' ? 'TWD' : 'USD', 'Fetch failed'))
  );

  return results;
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function applyPriceResults(assets: Asset[], results: PriceResult[]): Promise<PriceFetchSummary> {
  const assetBySymbol = new Map<string, Asset>();
  for (const asset of assets) assetBySymbol.set(asset.symbol, asset);

  let updated = 0;
  const failed: string[] = [];

  for (const result of results) {
    if (result.price !== null && !result.error) {
      const asset = assetBySymbol.get(result.symbol);
      if (asset) {
        try {
          await updateAsset(asset.id, { currentMarketPrice: result.price, lastPriceFetchedAt: result.timestamp });
          updated++;
        } catch { failed.push(result.symbol); }
      }
    } else {
      failed.push(result.symbol);
    }
  }
  return { updated, failed };
}

export async function fetchAllPrices(assets: Asset[]): Promise<PriceFetchSummary> {
  const symbols: SymbolRequest[] = assets.map(asset => ({ symbol: asset.symbol, type: classifySymbol(asset) }));
  console.log('[price] Fetching prices for:', symbols.map(s => `${s.symbol}(${s.type})`).join(', '));
  const results = await fetchPrices(symbols);
  console.log('[price] Results:', results.map(r => `${r.symbol}=${r.price ?? r.error}`).join(', '));
  return applyPriceResults(assets, results);
}

export async function fetchSinglePrice(asset: Asset): Promise<PriceResult> {
  const symbolReq: SymbolRequest = { symbol: asset.symbol, type: classifySymbol(asset) };
  const results = await fetchPrices([symbolReq]);
  const result = results[0];
  if (result && result.price !== null && !result.error) {
    await updateAsset(asset.id, { currentMarketPrice: result.price, lastPriceFetchedAt: result.timestamp });
  }
  return result;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export function isPriceStale(lastPriceFetchedAt: string | null | undefined): boolean {
  if (lastPriceFetchedAt == null) return true;
  const fetchedTime = new Date(lastPriceFetchedAt).getTime();
  return Date.now() - fetchedTime > STALE_THRESHOLD_MS;
}
