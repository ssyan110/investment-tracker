import { createServer } from 'node:http';

const PORT = Number(process.env.PRICE_API_PORT || process.env.PORT || 3000);
const HOST = process.env.PRICE_API_HOST || '127.0.0.1';
const MAX_REQUEST_BYTES = 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const COINGECKO_SYMBOL_MAP = {
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

function toCoinGeckoId(symbol) {
  const normalized = String(symbol).trim().toLowerCase();
  return COINGECKO_SYMBOL_MAP[normalized] || normalized;
}

function json(status, body) {
  return {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function errorResult(symbol, currency, message) {
  return {
    symbol,
    price: null,
    currency,
    timestamp: new Date().toISOString(),
    error: message,
  };
}

function parseBotGoldHtml(html) {
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>\s*[^<]+\s*<\/td>[\s\S]*?<td[^>]*>\s*[^<]+\s*<\/td>[\s\S]*?<td[^>]*>\s*[^<]+\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/td>[\s\S]*?<\/tr>/g;
  let latestSellPrice = null;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const sellPrice = parseFloat(rowMatch[2].replace(/,/g, ''));
    if (!Number.isNaN(sellPrice) && sellPrice > 0) latestSellPrice = sellPrice;
  }
  if (latestSellPrice !== null) return latestSellPrice;

  const sellPriceRegex = /本行賣出[^<]*<[^>]*>[^<]*?<[^>]*?>([\d,]+(?:\.\d+)?)/;
  const match = sellPriceRegex.exec(html);
  if (match) {
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (!Number.isNaN(price) && price > 0) return price;
  }

  const tdRegex = /<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/td>/g;
  const values = [];
  let tdMatch;
  while ((tdMatch = tdRegex.exec(html)) !== null) {
    const value = parseFloat(tdMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(value) && value > 0) values.push(value);
  }
  if (html.includes('本行賣出') && values.length >= 2) return values[1];

  const goldPriceRegex = /([\d,]+(?:\.\d+)?)/g;
  const candidates = [];
  let goldMatch;
  while ((goldMatch = goldPriceRegex.exec(html)) !== null) {
    const value = parseFloat(goldMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(value) && value >= 1000 && value <= 100000) candidates.push(value);
  }
  if (html.includes('本行賣出') && candidates.length >= 2) return candidates[1];
  if (candidates.length > 0) return candidates[0];

  throw new Error('Could not parse gold selling price from HTML');
}

function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  if (!Array.isArray(body.symbols)) {
    return { valid: false, error: '"symbols" must be an array' };
  }

  const validTypes = new Set(['TW_STOCK', 'US_STOCK', 'GOLD', 'CRYPTO']);
  for (let i = 0; i < body.symbols.length; i += 1) {
    const symbol = body.symbols[i];
    if (!symbol || typeof symbol !== 'object') {
      return { valid: false, error: `symbols[${i}] must be an object` };
    }
    if (typeof symbol.symbol !== 'string' || symbol.symbol.trim() === '') {
      return { valid: false, error: `symbols[${i}].symbol must be a non-empty string` };
    }
    if (typeof symbol.type !== 'string' || !validTypes.has(symbol.type)) {
      return { valid: false, error: `symbols[${i}].type must be one of: TW_STOCK, US_STOCK, GOLD, CRYPTO` };
    }
  }

  return { valid: true, data: body };
}

async function fetchTwsePrices(symbols, signal) {
  if (symbols.length === 0) return [];
  const codes = symbols.map((symbol) => `tse_${symbol.symbol}.tw`).join('|');
  const response = await fetch(`https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${codes}`, { signal });
  if (!response.ok) {
    return symbols.map((symbol) => errorResult(symbol.symbol, 'TWD', `TWSE API returned HTTP ${response.status}`));
  }

  const data = await response.json();
  const msgArray = Array.isArray(data?.msgArray) ? data.msgArray : [];
  const priceMap = new Map();
  for (const entry of msgArray) {
    if (entry?.c && entry?.z && entry.z !== '-') {
      const price = parseFloat(entry.z);
      if (!Number.isNaN(price)) priceMap.set(entry.c, price);
    }
  }

  const now = new Date().toISOString();
  return symbols.map((symbol) => {
    const price = priceMap.get(symbol.symbol);
    return price !== undefined
      ? { symbol: symbol.symbol, price, currency: 'TWD', timestamp: now }
      : errorResult(symbol.symbol, 'TWD', `No price data returned for ${symbol.symbol}`);
  });
}

async function fetchBotGoldPrices(symbols, signal) {
  if (symbols.length === 0) return [];
  const response = await fetch('https://rate.bot.com.tw/gold/chart/day/TWD', { signal });
  if (!response.ok) {
    return symbols.map((symbol) => errorResult(symbol.symbol, 'TWD', `Bank of Taiwan returned HTTP ${response.status}`));
  }

  const html = await response.text();
  const price = parseBotGoldHtml(html);
  const now = new Date().toISOString();
  return symbols.map((symbol) => ({
    symbol: symbol.symbol,
    price,
    currency: 'TWD',
    timestamp: now,
  }));
}

async function fetchUsStockPrices(symbols, signal) {
  if (symbols.length === 0) return [];
  const now = new Date().toISOString();

  const settled = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.symbol)}`, { signal });
      if (!response.ok) {
        return errorResult(symbol.symbol, 'USD', `Yahoo Finance returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number' && price > 0) {
        return { symbol: symbol.symbol, price, currency: 'USD', timestamp: now };
      }
      return errorResult(symbol.symbol, 'USD', `No price data returned for ${symbol.symbol}`);
    }),
  );

  return settled.map((result, index) => (
    result.status === 'fulfilled'
      ? result.value
      : errorResult(symbols[index].symbol, 'USD', result.reason?.message ?? 'Unknown Yahoo Finance error')
  ));
}

async function fetchCryptoPrices(symbols, signal) {
  if (symbols.length === 0) return [];
  const ids = symbols.map((symbol) => toCoinGeckoId(symbol.symbol)).join(',');
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { signal });
  if (!response.ok) {
    return symbols.map((symbol) => errorResult(symbol.symbol, 'USDT', `CoinGecko API returned HTTP ${response.status}`));
  }

  const data = await response.json();
  const now = new Date().toISOString();
  return symbols.map((symbol) => {
    const price = data?.[toCoinGeckoId(symbol.symbol)]?.usd;
    return typeof price === 'number'
      ? { symbol: symbol.symbol, price, currency: 'USDT', timestamp: now }
      : errorResult(symbol.symbol, 'USDT', `No price data returned for ${symbol.symbol}`);
  });
}

async function handlePriceRequest(body) {
  const validation = validateRequest(body);
  if (!validation.valid) {
    return json(400, { error: validation.error });
  }

  const groups = {
    TW_STOCK: [],
    US_STOCK: [],
    GOLD: [],
    CRYPTO: [],
  };
  for (const symbol of validation.data.symbols) {
    groups[symbol.type].push(symbol);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const [tw, us, gold, crypto] = await Promise.allSettled([
      fetchTwsePrices(groups.TW_STOCK, controller.signal),
      fetchUsStockPrices(groups.US_STOCK, controller.signal),
      fetchBotGoldPrices(groups.GOLD, controller.signal),
      fetchCryptoPrices(groups.CRYPTO, controller.signal),
    ]);

    const groupedResults = [
      { settled: tw, symbols: groups.TW_STOCK, currency: 'TWD' },
      { settled: us, symbols: groups.US_STOCK, currency: 'USD' },
      { settled: gold, symbols: groups.GOLD, currency: 'TWD' },
      { settled: crypto, symbols: groups.CRYPTO, currency: 'USDT' },
    ];

    const results = [];
    for (const group of groupedResults) {
      if (group.settled.status === 'fulfilled') {
        results.push(...group.settled.value);
      } else {
        const message = group.settled.reason?.message ?? 'Unknown upstream price error';
        for (const symbol of group.symbols) {
          results.push(errorResult(symbol.symbol, group.currency, message));
        }
      }
    }

    return json(200, { results });
  } catch (error) {
    return json(500, { error: error instanceof Error ? error.message : 'Internal server error' });
  } finally {
    clearTimeout(timeout);
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    const response = json(404, { error: 'Not found' });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    const response = json(200, { ok: true, service: 'price-api' });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  if (req.method !== 'POST' || (req.url !== '/api/prices' && req.url !== '/prices')) {
    const response = json(404, { error: 'Not found' });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > MAX_REQUEST_BYTES) {
      const response = json(413, { error: 'Request body too large' });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      req.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const body = raw ? JSON.parse(raw) : null;
      const response = await handlePriceRequest(body);
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    } catch (error) {
      const response = json(400, { error: error instanceof Error ? error.message : 'Invalid JSON body' });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[price-api] listening on http://${HOST}:${PORT}`);
});
