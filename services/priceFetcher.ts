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

/** Strip .tw / .TW suffix and return the bare symbol */
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

function currencyForSymbolType(type: SymbolRequest['type']): string {
  return type === 'GOLD' || type === 'TW_STOCK' ? 'TWD' : type === 'CRYPTO' ? 'USDT' : 'USD';
}

function getConfiguredPriceApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : null;
}

const COINGECKO_SYMBOL_MAP: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  doge: 'dogecoin',
  ada: 'cardano',
  xrp: 'ripple',
  trx: 'tron',
  ton: 'the-open-network',
  link: 'chainlink',
  matic: 'matic-network',
  avax: 'avalanche-2',
};

function toCoinGeckoId(symbol: string): string {
  const normalized = symbol.trim().toLowerCase();
  return COINGECKO_SYMBOL_MAP[normalized] ?? normalized;
}

function prepareServerSideSymbols(symbols: SymbolRequest[]) {
  const cleanedSymbols = symbols.map(s => ({
    ...s,
    symbol: s.type === 'TW_STOCK' ? stripTwSuffix(s.symbol) : s.symbol,
  }));

  const originalSymbolMap = new Map<string, string[]>();
  for (let i = 0; i < symbols.length; i++) {
    const cleanedSymbol = cleanedSymbols[i].symbol;
    const originals = originalSymbolMap.get(cleanedSymbol) ?? [];
    originals.push(symbols[i].symbol);
    originalSymbolMap.set(cleanedSymbol, originals);
  }

  return { cleanedSymbols, originalSymbolMap };
}

function restoreOriginalSymbols(results: PriceResult[], originalSymbolMap: Map<string, string[]>): PriceResult[] {
  return results.map(result => ({
    ...result,
    symbol: originalSymbolMap.get(result.symbol)?.shift() ?? result.symbol,
  }));
}

function ensureCompleteServerSideResults(
  requestedSymbols: SymbolRequest[],
  results: PriceResult[],
  originalSymbolMap: Map<string, string[]>,
): PriceResult[] {
  const restoredResults = restoreOriginalSymbols(results, originalSymbolMap);
  const resultBySymbol = new Map(restoredResults.map(result => [result.symbol, result]));

  return requestedSymbols.map(symbol => (
    resultBySymbol.get(symbol.symbol)
    ?? errorResult(symbol.symbol, currencyForSymbolType(symbol.type), `No price data returned for ${symbol.symbol}`)
  ));
}

function formatTwseDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function formatTpexDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function getTaiwanMonthlyDateCandidates(now = new Date()): Date[] {
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  return [current, previousMonth];
}

function parseTaiwanClosePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const price = parseFloat(raw.replace(/,/g, '').trim());
  return Number.isFinite(price) && price > 0 ? price : null;
}

function rocDateToIsoTimestamp(raw: string | undefined): string {
  if (!raw) return new Date().toISOString();
  const match = raw.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return new Date().toISOString();
  const year = Number(match[1]) + 1911;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day, 8, 0, 0)).toISOString();
}

async function fetchTwseMonthlyClose(stockNo: string, date: Date): Promise<PriceResult | null> {
  const response = await fetch(`https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${formatTwseDate(date)}&stockNo=${stockNo}`);
  if (!response.ok) return null;

  const data = await response.json() as { stat?: string; data?: string[][] };
  if (data.stat !== 'OK' || !Array.isArray(data.data) || data.data.length === 0) return null;

  for (let i = data.data.length - 1; i >= 0; i -= 1) {
    const row = data.data[i];
    const price = parseTaiwanClosePrice(row?.[6]);
    if (price !== null) {
      return { symbol: stockNo, price, currency: 'TWD', timestamp: rocDateToIsoTimestamp(row?.[0]) };
    }
  }
  return null;
}

async function fetchTpexMonthlyClose(stockNo: string, date: Date): Promise<PriceResult | null> {
  const response = await fetch(`https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?code=${stockNo}&date=${formatTpexDate(date)}&id=&response=json`);
  if (!response.ok) return null;

  const data = await response.json() as { tables?: Array<{ data?: string[][] }> };
  const rows = data.tables?.flatMap(table => Array.isArray(table.data) ? table.data : []) ?? [];
  if (rows.length === 0) return null;

  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const price = parseTaiwanClosePrice(row?.[6]);
    if (price !== null) {
      return { symbol: stockNo, price, currency: 'TWD', timestamp: rocDateToIsoTimestamp(row?.[0]) };
    }
  }
  return null;
}

async function fetchTaiwanMonthlyClose(symbolRequest: SymbolRequest): Promise<PriceResult> {
  const stockNo = stripTwSuffix(symbolRequest.symbol);
  let lastError = 'No TWSE/TPEX close data returned';

  for (const candidateDate of getTaiwanMonthlyDateCandidates()) {
    try {
      const twseResult = await fetchTwseMonthlyClose(stockNo, candidateDate);
      if (twseResult) return { ...twseResult, symbol: symbolRequest.symbol };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'TWSE monthly close fetch failed';
    }

    try {
      const tpexResult = await fetchTpexMonthlyClose(stockNo, candidateDate);
      if (tpexResult) return { ...tpexResult, symbol: symbolRequest.symbol };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'TPEX monthly close fetch failed';
    }
  }

  return errorResult(symbolRequest.symbol, 'TWD', lastError);
}

async function fetchTwsePricesDirect(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];
  return Promise.all(symbols.map(fetchTaiwanMonthlyClose));
}

function shouldFallbackToDirectTwse(results: PriceResult[]): boolean {
  return results.length > 0 && results.every(result => (
    result.price === null
    && !!result.error
    && (result.error.includes('HTTP price API unavailable') || result.error.includes('Edge Function unavailable'))
  ));
}

async function fetchViaHttpPriceApi(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const baseUrl = getConfiguredPriceApiBaseUrl();
  if (!baseUrl) {
    throw new Error('VITE_API_URL is not configured');
  }

  const { cleanedSymbols, originalSymbolMap } = prepareServerSideSymbols(symbols);
  const response = await fetch(`${baseUrl}/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: cleanedSymbols }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json() as { results?: PriceResult[]; error?: string };
  if (!Array.isArray(data.results)) {
    throw new Error(data.error ?? 'Invalid response from price API');
  }

  return ensureCompleteServerSideResults(symbols, data.results, originalSymbolMap);
}

// ── Edge Function proxy (handles TW_STOCK, US_STOCK, GOLD) ──────────────────

async function fetchViaEdgeFunction(symbols: SymbolRequest[], priorErrorMessage?: string): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const { cleanedSymbols, originalSymbolMap } = prepareServerSideSymbols(symbols);

  try {
    console.log(`[price] Invoking Edge Function for: ${cleanedSymbols.map(s => `${s.symbol}(${s.type})`).join(', ')}`);
    const { data, error } = await supabase.functions.invoke('fetch-prices', {
      body: { symbols: cleanedSymbols },
    });

    if (error) {
      console.error('[price] Edge Function error:', error);
      throw error;
    }

    const results = (data?.results as PriceResult[]) ?? [];
    return ensureCompleteServerSideResults(symbols, results, originalSymbolMap);
  } catch (err) {
    const edgeMessage = err instanceof Error ? err.message : 'Edge Function unavailable';
    const message = priorErrorMessage
      ? `${priorErrorMessage}; Edge Function unavailable: ${edgeMessage}`
      : `Edge Function unavailable: ${edgeMessage}`;
    console.warn('[price] Edge Function failed:', message);
    return symbols.map(s => {
      const currency = currencyForSymbolType(s.type);
      return errorResult(s.symbol, currency, message);
    });
  }
}

async function fetchServerSidePrices(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const apiBaseUrl = getConfiguredPriceApiBaseUrl();
  let priorErrorMessage: string | undefined;

  if (apiBaseUrl) {
    try {
      console.log(`[price] Using HTTP price API at ${apiBaseUrl}`);
      return await fetchViaHttpPriceApi(symbols);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HTTP price API unavailable';
      priorErrorMessage = `HTTP price API unavailable: ${message}`;
      console.warn('[price] HTTP price API failed, falling back to Edge Function:', message);
    }
  }

  return fetchViaEdgeFunction(symbols, priorErrorMessage);
}

async function fetchTwStockPricesWithFallback(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const primaryResults = await fetchServerSidePrices(symbols);
  const failedSymbols = symbols.filter(symbol => {
    const result = primaryResults.find(candidate => candidate.symbol === symbol.symbol);
    return !result || result.price === null || !!result.error;
  });

  if (failedSymbols.length === 0) {
    return primaryResults;
  }

  if (shouldFallbackToDirectTwse(primaryResults)) {
    console.warn('[price] Server-side TW fetch unavailable, falling back to direct TWSE/TPEX monthly close fetch');
  } else {
    console.warn(`[price] Retrying ${failedSymbols.length} failed TW symbol(s) via direct TWSE/TPEX monthly close fetch`);
  }

  const fallbackResults = await fetchTwsePricesDirect(failedSymbols);
  const fallbackBySymbol = new Map(fallbackResults.map(result => [result.symbol, result]));
  return symbols.map(symbol => {
    const fallback = fallbackBySymbol.get(symbol.symbol);
    if (fallback && fallback.price !== null && !fallback.error) return fallback;
    return primaryResults.find(result => result.symbol === symbol.symbol) ?? fallback ?? errorResult(symbol.symbol, 'TWD', 'TW price fetch failed');
  });
}

// ── Crypto: CoinGecko API (CORS-friendly, no proxy needed) ──────────────────

async function fetchCryptoPricesDirect(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const ids = symbols.map(s => toCoinGeckoId(s.symbol)).join(',');
  try {
    console.log(`[price] Fetching CoinGecko: ${ids}`);
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`);
    if (!res.ok) {
      console.warn(`[price] CoinGecko HTTP ${res.status}`);
      return symbols.map(s => errorResult(s.symbol, 'USDT', `CoinGecko HTTP ${res.status}`));
    }
    const data: Record<string, { usd?: number; last_updated_at?: number }> = await res.json();
    console.log('[price] CoinGecko response:', data);
    return symbols.map(s => {
      const entry = data[toCoinGeckoId(s.symbol)];
      const timestamp = typeof entry?.last_updated_at === 'number'
        ? new Date(entry.last_updated_at * 1000).toISOString()
        : new Date().toISOString();
      return entry?.usd != null
        ? { symbol: s.symbol, price: entry.usd, currency: 'USDT', timestamp }
        : errorResult(s.symbol, 'USDT', `No price data returned for ${s.symbol}`);
    });
  } catch (err) {
    console.warn('[price] CoinGecko error:', err);
    return symbols.map(s => errorResult(s.symbol, 'USDT', err instanceof Error ? err.message : 'CoinGecko fetch failed'));
  }
}

// ── Main dispatch ───────────────────────────────────────────────────────────

async function fetchPrices(symbols: SymbolRequest[]): Promise<PriceResult[]> {
  const groups: Record<string, SymbolRequest[]> = { TW_STOCK: [], US_STOCK: [], GOLD: [], CRYPTO: [] };
  for (const sym of symbols) groups[sym.type].push(sym);

  // TW_STOCK gets a final direct-browser fallback because TWSE's monthly endpoint is CORS-accessible.
  // US_STOCK and GOLD still require server-side access.
  const serverSideSymbols = [...groups.US_STOCK, ...groups.GOLD];

  const [twResults, serverResults, cryptoResults] = await Promise.allSettled([
    fetchTwStockPricesWithFallback(groups.TW_STOCK),
    fetchServerSidePrices(serverSideSymbols),
    fetchCryptoPricesDirect(groups.CRYPTO),
  ]);

  const results: PriceResult[] = [];

  if (twResults.status === 'fulfilled') {
    results.push(...twResults.value);
  } else {
    groups.TW_STOCK.forEach(symbol => results.push(errorResult(symbol.symbol, 'TWD', 'Fetch failed')));
  }

  if (serverResults.status === 'fulfilled') {
    results.push(...serverResults.value);
  } else {
    serverSideSymbols.forEach(s => {
      const currency = currencyForSymbolType(s.type);
      results.push(errorResult(s.symbol, currency, 'Fetch failed'));
    });
  }

  if (cryptoResults.status === 'fulfilled') {
    results.push(...cryptoResults.value);
  } else {
    groups.CRYPTO.forEach(s => results.push(errorResult(s.symbol, 'USDT', 'Fetch failed')));
  }

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
