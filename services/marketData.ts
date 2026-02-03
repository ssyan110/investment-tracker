import { Asset, AssetType } from '../types';
import { round } from '../utils';

// API Endpoints
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=usd,twd';
const POLYGON_API_KEY = 'nPvXQfiS7OtN9HZyj8iMvAiJ3Q0Ygbwq'; // Free tier key
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v7/finance/quote';

/**
 * Fetch real gold price from metals API (free tier)
 */
const fetchGoldPrice = async (currency: string = 'USD'): Promise<number | null> => {
  try {
    // Using MetalPriceAPI free endpoint
    const response = await fetch('https://api.metals.live/v1/spot/gold');
    const data = await response.json();
    
    if (data.price) {
      // Data is in USD per troy ounce
      // Convert to per gram: divide by 31.1035
      const pricePerGram = data.price / 31.1035;
      
      // If TWD is requested, convert (rough rate: 1 USD = 30 TWD)
      if (currency.toUpperCase() === 'TWD') {
        return round(pricePerGram * 30, 2);
      }
      return round(pricePerGram, 2);
    }
  } catch (error) {
    console.warn('Failed to fetch real gold price:', error);
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
 * Fetch ETF prices - same as stocks via Yahoo Finance
 */
const fetchETFPrice = async (symbol: string, currency: string = 'USD'): Promise<number | null> => {
  return fetchStockPrice(symbol, currency);
};

export const updateMarketPrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  const updatedAssets = await Promise.all(currentAssets.map(async (asset) => {
    let newPrice = asset.currentMarketPrice || 0;

    try {
      switch (asset.type) {
        case AssetType.GOLD:
          const goldPrice = await fetchGoldPrice(asset.currency);
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
        return await fetchGoldPrice(asset.currency);
      
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