import { Asset, AssetType } from '../types';
import { round } from '../utils';

// API Endpoints
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=twd';

/**
 * Mocks the behavior of fetching from Bank of Taiwan (which doesn't have a public CORS API).
 * Gold price is roughly based on ~2600-2700 USD/oz converted to TWD/g.
 * 1 oz = 31.1035g.
 * Current Base Estimate: ~2880 TWD/g.
 */
const fetchBankOfTaiwanGoldPrice = async (): Promise<number> => {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 600)); 
  
  // Fluctuate price slightly to show "Live" update on refresh
  const basePrice = 2880; 
  const fluctuation = (Math.random() - 0.5) * 20; // +/- 10 TWD
  return round(basePrice + fluctuation, 0);
};

const fetchRealCryptoPrice = async (): Promise<number | null> => {
  try {
    const response = await fetch(COINGECKO_API);
    const data = await response.json();
    return data.bitcoin.twd;
  } catch (error) {
    console.warn('Failed to fetch BTC price, falling back to mock.');
    return null;
  }
};

const simulateStockPrice = async (currentPrice: number): Promise<number> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  // +/- 1.5% fluctuation
  const change = currentPrice * (Math.random() - 0.5) * 0.03;
  return round(currentPrice + change, 2);
};

export const updateMarketPrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  const updatedAssets = await Promise.all(currentAssets.map(async (asset) => {
    let newPrice = asset.currentMarketPrice || 0;

    try {
      switch (asset.type) {
        case AssetType.GOLD:
          // Specific logic for Bank of Taiwan Gold Passbook
          newPrice = await fetchBankOfTaiwanGoldPrice();
          break;
        
        case AssetType.CRYPTO:
          if (asset.symbol === 'BTC') {
            const btcPrice = await fetchRealCryptoPrice();
            if (btcPrice) newPrice = btcPrice;
          }
          break;

        case AssetType.ETF:
        case AssetType.STOCK:
          // Simulate live ticker updates for Stocks/ETFs
          newPrice = await simulateStockPrice(asset.currentMarketPrice || 100);
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