import { Asset } from '../types';
import { round } from '../utils';

/**
 * DEPRECATED: Live price fetching has been disabled for performance.
 * All prices must now be entered manually by the user.
 * 
 * This module is kept for backward compatibility but contains no active fetching logic.
 */

/**
 * Manual price update function - updates a single asset's price
 * This is called when the user manually enters a price in the UI
 */
export const updateManualPrice = (asset: Asset, newPrice: number): Asset => {
  return {
    ...asset,
    currentMarketPrice: round(newPrice, 2)
  };
};

/**
 * Placeholder - live price fetching is disabled
 * Returns the assets unchanged
 */
export const updateMarketPrices = async (currentAssets: Asset[]): Promise<Asset[]> => {
  console.warn('Live price fetching is disabled. All prices must be entered manually.');
  return currentAssets;
};

/**
 * Placeholder - live price fetching is disabled
 * Returns null
 */
export const fetchSingleAssetPrice = async (asset: Asset): Promise<number | null> => {
  console.warn('Live price fetching is disabled. All prices must be entered manually.');
  return null;
};