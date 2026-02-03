import { Asset, AssetType } from '../types';
import { round } from '../utils';

// API Endpoints
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd,twd';
const POLYGON_API_KEY = 'nPvXQfiS7OtN9HZyj8iMvAiJ3Q0Ygbwq'; // Free tier key
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';

/**
 * Fetch Taiwan Bank official gold "buy in" price (購入價)
 * Taiwan Bank publishes daily gold prices for their gold passbook accounts
 */
const fetchTaiwanBankGoldPrice = async (): Promise<number | null> => {
  try {
    // Try multiple sources for Taiwan Bank gold price
    
    // Source 1: Taiwan Bank's rate API (if available)
    try {
      const response = await fetch('https://rate.bot.com.tw/xrt/fltrate?Lang=zh-TW');
      const data = await response.json();
      
      // Look for gold (黃金) in the rates
      if (data && typeof data === 'object') {
        // Taiwan Bank gold rates are typically listed in the data
        // Format: {code: "GOLD", name: "黃金", buy: price, sell: price}
        const goldData = Object.values(data).find((item: any) => 
          item?.code === 'GOLD' || item?.name?.includes('黃金')
        ) as any;
        
        if (goldData?.buy) {
          return parseFloat(goldData.buy);
        }
      }
    } catch (e) {
      console.warn('Taiwan Bank API source 1 failed, trying fallback...');
    }

    // Source 2: Fetch from a Taiwan financial data provider
    try {
      const response = await fetch('https://tw.rter.info/json.php');
      const data = await response.json();
      
      if (data?.Au?.Exrate) {
        // This gives gold price in TWD
        return parseFloat(data.Au.Exrate);
      }
    } catch (e) {
      console.warn('Taiwan financial data API failed, trying metals API...');
    }

    // Source 3: Use metals.live and convert to TWD per gram
    // Taiwan Bank buy-in price is typically lower than spot
    const response = await fetch('https://api.metals.live/v1/spot/gold');
    const data = await response.json();
    
    if (data.price) {
      // Convert USD per troy ounce to TWD per gram
      const pricePerGram = data.price / 31.1035; // 1 troy oz = 31.1035g
      const priceInTWD = pricePerGram * 30; // Rough USD to TWD conversion
      // Apply Taiwan Bank's typical 2-3% discount from spot for buy-in price
      const buyInPrice = priceInTWD * 0.97; // 3% discount
      return round(buyInPrice, 0);
    }
  } catch (error) {
    console.warn('Failed to fetch Taiwan Bank gold price:', error);
  }
  return null;
};


/**
 * Fetch real cryptocurrency prices from CoinGecko API (free, no auth required)
 */
const fetchCryptoPrice = async (symbol: string, currency: string = 'USD'): Promise<number | null> => {
  try {
    // Map common symbols to CoinGecko IDs
    const coinMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'LTC': 'litecoin',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin'
    };
    
    const coinId = coinMap[symbol.toUpperCase()] || symbol.toLowerCase();
    const currencyParam = currency.toUpperCase() === 'TWD' ? 'twd' : 'usd';
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currencyParam}`
    );
    const data = await response.json();
    
    if (data[coinId]?.[currencyParam]) {
      return data[coinId][currencyParam];
    }
  } catch (error) {
    console.warn(`Failed to fetch ${symbol} price:`, error);
  }
  return null;
};

/**
 * Fetch stock/ETF prices from Yahoo Finance
 * Works for US stocks, ETFs, and international markets
 */
const fetchStockPrice = async (symbol: string, currency: string = 'USD'): Promise<number | null> => {
  try {
    // Normalize symbol
    const normalizedSymbol = symbol.toUpperCase().trim();
    
    // For Taiwan stocks, need to add .TW extension
    let querySymbol = normalizedSymbol;
    if (currency.toUpperCase() === 'TWD' && !normalizedSymbol.includes('.')) {
      querySymbol = `${normalizedSymbol}.TW`;
    }
    
    const response = await fetch(
      `${YAHOO_FINANCE_API}?symbols=${querySymbol}&fields=regularMarketPrice,currency`
    );
    
    if (!response.ok) {
      console.warn(`Stock not found: ${normalizedSymbol}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
      const price = data.quoteResponse.result[0].regularMarketPrice;
      // Price is already in the asset's native currency from Yahoo Finance
      return round(price, 2);
    }
  } catch (error) {
    console.warn(`Failed to fetch stock price for ${symbol}:`, error);
  }
  return null;
};

/**
 * Fetch ETF prices via Yahoo Finance
 * Handles both US and Taiwan ETFs
 */
const fetchETFPrice = async (symbol: string, currency: string = 'USD'): Promise<number | null> => {
  try {
    // Try with original symbol first
    let tickerSymbol = symbol;
    
    // If it looks like a Taiwan ETF (4 digits), try adding .TW suffix
    if (/^\d{4}$/.test(symbol)) {
      tickerSymbol = `${symbol}.TW`;
    }
    
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${tickerSymbol}?modules=price`;
    const response = await fetch(url);
    
    if (!response.ok) {
      // If .TW suffix failed, try without it
      if (tickerSymbol.endsWith('.TW')) {
        return fetchStockPrice(symbol, currency);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.quoteSummary?.result?.[0]?.price?.regularMarketPrice) {
      const price = data.quoteSummary.result[0].price.regularMarketPrice;
      return round(price, 2);
    }
  } catch (error) {
    console.warn(`Failed to fetch ETF price for ${symbol}:`, error);
    // Fallback to stock price fetch without suffix
    return fetchStockPrice(symbol, currency);
  }
  return null;
};

export const updateMarketPrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  const updatedAssets = await Promise.all(currentAssets.map(async (asset) => {
    let newPrice = asset.currentMarketPrice || 0;

    try {
      switch (asset.type) {
        case AssetType.GOLD:
          const goldPrice = await fetchTaiwanBankGoldPrice();
          if (goldPrice !== null) {
            newPrice = goldPrice;
          }
          break;
        
        case AssetType.CRYPTO:
          const cryptoPrice = await fetchCryptoPrice(asset.symbol, asset.currency);
          if (cryptoPrice !== null) {
            newPrice = cryptoPrice;
          }
          break;

        case AssetType.STOCK:
          const stockPrice = await fetchStockPrice(asset.symbol, asset.currency);
          if (stockPrice !== null) {
            newPrice = stockPrice;
          }
          break;

        case AssetType.ETF:
          const etfPrice = await fetchETFPrice(asset.symbol, asset.currency);
          if (etfPrice !== null) {
            newPrice = etfPrice;
          }
          break;
          
        default:
          break;
      }
    } catch (e) {
      console.error(`Failed to update price for ${asset.symbol}`, e);
    }

    return {
      ...asset,
      currentMarketPrice: newPrice
    };
  }));

  return updatedAssets;
};

/**
 * Fetch price for a single asset (used for real-time updates in the UI)
 */
export const fetchSingleAssetPrice = async (asset: Asset): Promise<number | null> => {
  try {
    switch (asset.type) {
      case AssetType.GOLD:
        return await fetchTaiwanBankGoldPrice();
      
      case AssetType.CRYPTO:
        return await fetchCryptoPrice(asset.symbol, asset.currency);

      case AssetType.STOCK:
        return await fetchStockPrice(asset.symbol, asset.currency);

      case AssetType.ETF:
        return await fetchETFPrice(asset.symbol, asset.currency);
      
      default:
        return null;
    }
  } catch (error) {
    console.error(`Failed to fetch price for ${asset.symbol}:`, error);
    return null;
  }
};