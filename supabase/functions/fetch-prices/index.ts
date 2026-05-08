// Supabase Edge Function: fetch-prices
// Deno runtime — proxies price requests to external APIs

// ── Interfaces ──────────────────────────────────────────────────────────────

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

export interface FetchPricesRequest {
  symbols: SymbolRequest[];
}

export interface FetchPricesResponse {
  results: PriceResult[];
}

// ── CORS Headers ────────────────────────────────────────────────────────────

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Request Validation ──────────────────────────────────────────────────────

function validateRequest(body: unknown): { valid: true; data: FetchPricesRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (!Array.isArray(obj.symbols)) {
    return { valid: false, error: '"symbols" must be an array' };
  }

  const validTypes = new Set(['TW_STOCK', 'US_STOCK', 'GOLD', 'CRYPTO']);

  for (let i = 0; i < obj.symbols.length; i++) {
    const item = obj.symbols[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `symbols[${i}] must be an object` };
    }
    const sym = item as Record<string, unknown>;
    if (typeof sym.symbol !== 'string' || sym.symbol.trim() === '') {
      return { valid: false, error: `symbols[${i}].symbol must be a non-empty string` };
    }
    if (typeof sym.type !== 'string' || !validTypes.has(sym.type)) {
      return { valid: false, error: `symbols[${i}].type must be one of: TW_STOCK, US_STOCK, GOLD, CRYPTO` };
    }
  }

  return { valid: true, data: body as FetchPricesRequest };
}


// ── Helper: error PriceResult ───────────────────────────────────────────────

function errorResult(symbol: string, currency: string, message: string): PriceResult {
  return {
    symbol,
    price: null,
    currency,
    timestamp: new Date().toISOString(),
    error: message,
  };
}

// ── TWSE Price Fetcher (Taiwan Stocks / ETFs) ───────────────────────────────

function formatTwseDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function formatTpexDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

function getTaiwanMonthlyDateCandidates(now = new Date()): Date[] {
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    new Date(now.getFullYear(), now.getMonth(), 0),
  ];
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

async function fetchTwseMonthlyClose(symbol: SymbolRequest, date: Date, signal: AbortSignal): Promise<PriceResult | null> {
  const response = await fetch(`https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${formatTwseDate(date)}&stockNo=${symbol.symbol}`, { signal });
  if (!response.ok) return null;
  const data = await response.json() as { stat?: string; data?: string[][] };
  if (data.stat !== 'OK' || !Array.isArray(data.data) || data.data.length === 0) return null;
  for (let i = data.data.length - 1; i >= 0; i -= 1) {
    const row = data.data[i];
    const price = parseTaiwanClosePrice(row?.[6]);
    if (price !== null) return { symbol: symbol.symbol, price, currency: 'TWD', timestamp: rocDateToIsoTimestamp(row?.[0]) };
  }
  return null;
}

async function fetchTpexMonthlyClose(symbol: SymbolRequest, date: Date, signal: AbortSignal): Promise<PriceResult | null> {
  const response = await fetch(`https://www.tpex.org.tw/www/zh-tw/afterTrading/tradingStock?code=${symbol.symbol}&date=${formatTpexDate(date)}&id=&response=json`, { signal });
  if (!response.ok) return null;
  const data = await response.json() as { tables?: Array<{ data?: string[][] }> };
  const rows = data.tables?.flatMap((table) => Array.isArray(table.data) ? table.data : []) ?? [];
  if (rows.length === 0) return null;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const row = rows[i];
    const price = parseTaiwanClosePrice(row?.[6]);
    if (price !== null) return { symbol: symbol.symbol, price, currency: 'TWD', timestamp: rocDateToIsoTimestamp(row?.[0]) };
  }
  return null;
}

async function fetchRealtimeMisPrice(symbol: SymbolRequest, signal: AbortSignal): Promise<PriceResult | null> {
  const codes = [`tse_${symbol.symbol}.tw`, `otc_${symbol.symbol}.tw`].join('|');
  const response = await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${codes}`, { signal });
  if (!response.ok) return null;
  const data = await response.json();
  const msgArray: Array<Record<string, string>> = Array.isArray(data?.msgArray) ? data.msgArray : [];
  for (const entry of msgArray) {
    const price = parseTaiwanClosePrice(entry.z);
    if (entry.c === symbol.symbol && price !== null) {
      const timestamp = entry.tlong ? new Date(Number(entry.tlong)).toISOString() : new Date().toISOString();
      return { symbol: symbol.symbol, price, currency: 'TWD', timestamp };
    }
  }
  return null;
}

async function fetchSingleTaiwanPrice(symbol: SymbolRequest, signal: AbortSignal): Promise<PriceResult> {
  let lastError = 'No TWSE/TPEX price data returned';
  for (const date of getTaiwanMonthlyDateCandidates()) {
    try {
      const twse = await fetchTwseMonthlyClose(symbol, date, signal);
      if (twse) return twse;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'TWSE monthly close fetch failed';
    }
    try {
      const tpex = await fetchTpexMonthlyClose(symbol, date, signal);
      if (tpex) return tpex;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'TPEX monthly close fetch failed';
    }
  }
  try {
    const realtime = await fetchRealtimeMisPrice(symbol, signal);
    if (realtime) return realtime;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'TWSE realtime fetch failed';
  }
  return errorResult(symbol.symbol, 'TWD', lastError);
}

async function fetchTwsePrices(
  symbols: SymbolRequest[],
  signal: AbortSignal,
): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];
  return Promise.all(symbols.map((symbol) => fetchSingleTaiwanPrice(symbol, signal)));
}

async function fetchBotGoldPrice(
  symbols: SymbolRequest[],
  signal: AbortSignal,
): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  try {
    const res = await fetch('https://rate.bot.com.tw/gold/chart/day/TWD', { signal });
    if (!res.ok) {
      return symbols.map((s) =>
        errorResult(s.symbol, 'TWD', `Bank of Taiwan returned HTTP ${res.status}`),
      );
    }

    const html = await res.text();
    const price = parseBotGoldHtml(html);
    const now = new Date().toISOString();

    return symbols.map((s) => ({
      symbol: s.symbol,
      price,
      currency: 'TWD',
      timestamp: now,
    }));
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('parse')
        ? 'Bank of Taiwan data source unavailable'
        : err instanceof Error
          ? err.message
          : 'Bank of Taiwan data source unavailable';
    return symbols.map((s) => errorResult(s.symbol, 'TWD', message));
  }
}


// ── US Stock Price Fetcher (Yahoo Finance) ──────────────────────────────────

async function fetchUsStockPrices(
  symbols: SymbolRequest[],
  signal: AbortSignal,
): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  const promises = symbols.map(async (s): Promise<PriceResult> => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) {
        return errorResult(s.symbol, 'USD', `Yahoo Finance returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      const timestamp = typeof meta?.regularMarketTime === 'number'
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString();

      if (typeof price === 'number' && price > 0) {
        return { symbol: s.symbol, price, currency: 'USD', timestamp };
      }

      return errorResult(s.symbol, 'USD', `No price data returned for ${s.symbol}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Yahoo Finance error';
      return errorResult(s.symbol, 'USD', message);
    }
  });

  const settled = await Promise.allSettled(promises);
  return settled.map((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    return errorResult(symbols[i].symbol, 'USD', result.reason?.message ?? 'Unknown error');
  });
}

// ── Crypto Price Fetcher (CoinGecko) ────────────────────────────────────────

async function fetchCryptoPrices(
  symbols: SymbolRequest[],
  signal: AbortSignal,
): Promise<PriceResult[]> {
  if (symbols.length === 0) return [];

  // CoinGecko expects lowercase IDs, comma-joined
  const ids = symbols.map((s) => s.symbol.toLowerCase()).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      return symbols.map((s) =>
        errorResult(s.symbol, 'USDT', `CoinGecko API returned HTTP ${res.status}`),
      );
    }

    const data: Record<string, { usd?: number; last_updated_at?: number }> = await res.json();

    return symbols.map((s) => {
      const entry = data[toCoinGeckoId(s.symbol)];
      const timestamp = typeof entry?.last_updated_at === 'number'
        ? new Date(entry.last_updated_at * 1000).toISOString()
        : new Date().toISOString();
      if (entry && typeof entry.usd === 'number') {
        return { symbol: s.symbol, price: entry.usd, currency: 'USDT', timestamp };
      }
      return errorResult(s.symbol, 'USDT', `No price data returned for ${s.symbol}`);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown CoinGecko API error';
    return symbols.map((s) => errorResult(s.symbol, 'USDT', message));
  }
}


// ── Routing & Parallel Dispatch ─────────────────────────────────────────────

async function handleFetchPrices(
  request: FetchPricesRequest,
  signal: AbortSignal,
): Promise<FetchPricesResponse> {
  const { symbols } = request;

  // Group symbols by type
  const groups: Record<string, SymbolRequest[]> = {
    TW_STOCK: [],
    US_STOCK: [],
    GOLD: [],
    CRYPTO: [],
  };

  for (const sym of symbols) {
    groups[sym.type].push(sym);
  }

  // Dispatch each group to its handler in parallel
  const [twResults, goldResults, usResults, cryptoResults] = await Promise.allSettled([
    fetchTwsePrices(groups.TW_STOCK, signal),
    fetchBotGoldPrice(groups.GOLD, signal),
    fetchUsStockPrices(groups.US_STOCK, signal),
    fetchCryptoPrices(groups.CRYPTO, signal),
  ]);

  // Merge results, handling any rejected promises
  const results: PriceResult[] = [];

  const settledGroups = [
    { settled: twResults, symbols: groups.TW_STOCK, currency: 'TWD' },
    { settled: goldResults, symbols: groups.GOLD, currency: 'TWD' },
    { settled: usResults, symbols: groups.US_STOCK, currency: 'USD' },
    { settled: cryptoResults, symbols: groups.CRYPTO, currency: 'USDT' },
  ];

  for (const { settled, symbols: groupSymbols, currency } of settledGroups) {
    if (settled.status === 'fulfilled') {
      results.push(...settled.value);
    } else {
      // If the entire group handler rejected, create error entries for all symbols
      const message = settled.reason?.message ?? 'Unknown error';
      for (const s of groupSymbols) {
        results.push(errorResult(s.symbol, currency, message));
      }
    }
  }

  return { results };
}

// ── Main Server ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json();
    const validation = validateRequest(body);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 10-second overall timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await handleFetchPrices(validation.data, controller.signal);
      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
