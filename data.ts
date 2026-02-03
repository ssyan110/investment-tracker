import { Asset, Transaction, AssetType, AccountingMethod, TransactionType } from './types';

export const DATA_VERSION = 4; // Increment to force DB update for user

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'gold-bot',
    symbol: 'GOLD',
    name: 'Gold Passbook (TWD)',
    type: AssetType.GOLD,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 2880
  },
  {
    id: '0050',
    symbol: '0050',
    name: 'Yuanta Taiwan 50 ETF',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 198.5
  },
  {
    id: '0056',
    symbol: '0056',
    name: 'Yuanta High Dividend ETF',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 38.2
  },
  {
    id: '2330',
    symbol: '2330',
    name: 'TSMC',
    type: AssetType.STOCK,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 1050
  },
  {
    id: '00919',
    symbol: '00919',
    name: 'Capital TIP Customizing High Div',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 26.5
  },
  {
    id: '00646',
    symbol: '00646',
    name: 'Yuanta S&P 500 ETF',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 58.4
  },
  {
    id: '2615',
    symbol: '2615',
    name: 'Wan Hai Lines',
    type: AssetType.STOCK,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 85.2
  },
  {
    id: '00878',
    symbol: '00878',
    name: 'Cathay Sust. High Div ETF',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 23.1
  },
  {
    id: '0052',
    symbol: '0052',
    name: 'Fubon Tech ETF',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 165.0
  },
  {
    id: '009813',
    symbol: '009813',
    name: 'BlackRock S&P 500 (Local)',
    type: AssetType.ETF,
    method: AccountingMethod.AVERAGE_COST,
    currency: 'TWD',
    currentMarketPrice: 11.2
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx_0001', assetId: 'gold-bot', date: '2024-12-06', type: TransactionType.BUY, quantity: 5.0, pricePerUnit: 2764.0, fees: 0.0, totalAmount: 13820.0 },
  { id: 'tx_0002', assetId: 'gold-bot', date: '2025-02-10', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3063.0, fees: 0.0, totalAmount: 3063.0 },
  { id: 'tx_0003', assetId: 'gold-bot', date: '2025-03-12', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3102.0, fees: 0.0, totalAmount: 3102.0 },
  { id: 'tx_0004', assetId: 'gold-bot', date: '2025-02-18', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3089.0, fees: 0.0, totalAmount: 3089.0 },
  { id: 'tx_0005', assetId: 'gold-bot', date: '2025-02-21', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3103.0, fees: 0.0, totalAmount: 3103.0 },
  { id: 'tx_0006', assetId: 'gold-bot', date: '2025-02-27', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3085.0, fees: 0.0, totalAmount: 6170.0 },
  { id: 'tx_0007', assetId: 'gold-bot', date: '2025-03-05', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3094.0, fees: 0.0, totalAmount: 6188.0 },
  { id: 'tx_0008', assetId: 'gold-bot', date: '2025-05-15', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3094.0, fees: 0.0, totalAmount: 3094.0 },
  { id: 'tx_0009', assetId: 'gold-bot', date: '2025-03-13', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3127.0, fees: 0.0, totalAmount: 6254.0 },
  { id: 'tx_0010', assetId: 'gold-bot', date: '2025-03-18', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3211.0, fees: 0.0, totalAmount: 6422.0 },
  { id: 'tx_0011', assetId: 'gold-bot', date: '2025-03-20', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3257.0, fees: 0.0, totalAmount: 3257.0 },
  { id: 'tx_0012', assetId: 'gold-bot', date: '2025-04-01', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3351.0, fees: 0.0, totalAmount: 3351.0 },
  { id: 'tx_0013', assetId: 'gold-bot', date: '2025-04-11', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3398.0, fees: 0.0, totalAmount: 3398.0 },
  { id: 'tx_0014', assetId: 'gold-bot', date: '2025-04-16', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3441.0, fees: 0.0, totalAmount: 3441.0 },
  { id: 'tx_0015', assetId: 'gold-bot', date: '2025-04-17', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3516.0, fees: 0.0, totalAmount: 7032.0 },
  { id: 'tx_0016', assetId: 'gold-bot', date: '2025-04-23', type: TransactionType.BUY, quantity: 2.0, pricePerUnit: 3493.0, fees: 0.0, totalAmount: 6986.0 },
  { id: 'tx_0017', assetId: '0050', date: '2025-05-05', type: TransactionType.BUY, quantity: 68.0, pricePerUnit: 44.1, fees: 1.0, totalAmount: 2999.8 },
  { id: 'tx_0018', assetId: '2330', date: '2025-05-19', type: TransactionType.BUY, quantity: 3.0, pricePerUnit: 993.0, fees: 20.0, totalAmount: 2999.0 },
  { id: 'tx_0019', assetId: 'gold-bot', date: '2025-05-02', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3302.0, fees: 0.0, totalAmount: 3302.0 },
  { id: 'tx_0020', assetId: '0050', date: '2025-05-05', type: TransactionType.BUY, quantity: 64.0, pricePerUnit: 46.86, fees: 1.0, totalAmount: 3000.04 },
  { id: 'tx_0021', assetId: 'gold-bot', date: '2025-06-09', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3215.0, fees: 0.0, totalAmount: 3215.0 },
  { id: 'tx_0022', assetId: '0050', date: '2025-07-07', type: TransactionType.BUY, quantity: 61.0, pricePerUnit: 48.8, fees: 1.2, totalAmount: 2978.0 },
  { id: 'tx_0023', assetId: '0056', date: '2025-06-19', type: TransactionType.BUY, quantity: 30.0, pricePerUnit: 34.47, fees: 20.0, totalAmount: 1054.1 },
  { id: 'tx_0024', assetId: 'gold-bot', date: '2025-07-07', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 3105.0, fees: 0.0, totalAmount: 3105.0 },
  { id: 'tx_0025', assetId: '00919', date: '2025-07-11', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 21.5, fees: 20.0, totalAmount: 1095.0 },
  { id: 'tx_0026', assetId: '0056', date: '2025-07-22', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 34.64, fees: 20.0, totalAmount: 1752.0 },
  { id: 'tx_0027', assetId: '0050', date: '2025-08-05', type: TransactionType.BUY, quantity: 58.0, pricePerUnit: 51.24, fees: 1.2, totalAmount: 2973.12 },
  { id: 'tx_0028', assetId: '00646', date: '2025-08-25', type: TransactionType.BUY, quantity: 20.0, pricePerUnit: 61.45, fees: 20.0, totalAmount: 1249.0 },
  { id: 'tx_0029', assetId: '0050', date: '2025-09-05', type: TransactionType.BUY, quantity: 56.0, pricePerUnit: 52.7, fees: 1.0, totalAmount: 2952.2 },
  { id: 'tx_0030', assetId: '00919', date: '2025-09-23', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 21.45, fees: 20.0, totalAmount: 1092.5 },
  { id: 'tx_0031', assetId: '0050', date: '2025-09-26', type: TransactionType.BUY, quantity: 20.0, pricePerUnit: 57.4, fees: 20.0, totalAmount: 1168.0 },
  { id: 'tx_0032', assetId: 'gold-bot', date: '2025-10-01', type: TransactionType.SELL, quantity: 5.0, pricePerUnit: 3785.0, fees: 0.0, totalAmount: 18925.0 },
  { id: 'tx_0033', assetId: '2615', date: '2025-10-15', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 79.9, fees: 20.0, totalAmount: 4015.0 },
  { id: 'tx_0034', assetId: '0050', date: '2025-10-07', type: TransactionType.BUY, quantity: 49.0, pricePerUnit: 61.01, fees: 1.0, totalAmount: 2990.49 },
  { id: 'tx_0035', assetId: 'gold-bot', date: '2025-10-18', type: TransactionType.BUY, quantity: 0.5, pricePerUnit: 4306.0, fees: 0.0, totalAmount: 2153.0 },
  { id: 'tx_0036', assetId: '0050', date: '2025-10-28', type: TransactionType.BUY, quantity: 62.0, pricePerUnit: 63.74, fees: 1.12, totalAmount: 3953.0 },
  { id: 'tx_0037', assetId: 'gold-bot', date: '2025-10-24', type: TransactionType.BUY, quantity: 0.5, pricePerUnit: 4054.0, fees: 0.0, totalAmount: 2027.0 },
  { id: 'tx_0038', assetId: '0056', date: '2025-10-20', type: TransactionType.BUY, quantity: 26.0, pricePerUnit: 37.27, fees: 1.0, totalAmount: 970.02 },
  { id: 'tx_0039', assetId: 'gold-bot', date: '2025-11-18', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 4057.0, fees: 0.0, totalAmount: 4057.0 },
  { id: 'tx_0040', assetId: '0056', date: '2025-11-18', type: TransactionType.BUY, quantity: 28.0, pricePerUnit: 35.33, fees: 1.0, totalAmount: 990.24 },
  { id: 'tx_0041', assetId: '0050', date: '2025-11-20', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 60.1, fees: 20.0, totalAmount: 3025.0 },
  { id: 'tx_0042', assetId: '00878', date: '2025-11-20', type: TransactionType.BUY, quantity: 100.0, pricePerUnit: 20.29, fees: 20.0, totalAmount: 2049.0 },
  { id: 'tx_0043', assetId: '0052', date: '2025-11-20', type: TransactionType.BUY, quantity: 200.0, pricePerUnit: 35.82, fees: 20.0, totalAmount: 7184.0 },
  { id: 'tx_0044', assetId: 'gold-bot', date: '2025-12-18', type: TransactionType.BUY, quantity: 0.5, pricePerUnit: 4238.0, fees: 0.0, totalAmount: 2119.0 },
  { id: 'tx_0045', assetId: 'gold-bot', date: '2025-12-30', type: TransactionType.BUY, quantity: 1.0, pricePerUnit: 4440.0, fees: 0.0, totalAmount: 4440.0 },
  { id: 'tx_0046', assetId: '0050', date: '2025-12-18', type: TransactionType.BUY, quantity: 64.0, pricePerUnit: 61.79, fees: 1.5, totalAmount: 3956.06 },
  { id: 'tx_0047', assetId: '00878', date: '2025-12-18', type: TransactionType.BUY, quantity: 46.0, pricePerUnit: 21.34, fees: 1.36, totalAmount: 983.0 },
  { id: 'tx_0048', assetId: '009813', date: '2025-12-27', type: TransactionType.BUY, quantity: 200.0, pricePerUnit: 10.69, fees: 20.0, totalAmount: 2158.0 },
  { id: 'tx_0049', assetId: '00646', date: '2026-01-05', type: TransactionType.BUY, quantity: 50.0, pricePerUnit: 67.85, fees: 20.0, totalAmount: 3412.5 },
  { id: 'tx_0050', assetId: '009813', date: '2026-01-07', type: TransactionType.BUY, quantity: 300.0, pricePerUnit: 10.6, fees: 20.0, totalAmount: 3200.0 },
  { id: 'tx_0051', assetId: '009813', date: '2026-01-14', type: TransactionType.BUY, quantity: 200.0, pricePerUnit: 10.7, fees: 20.0, totalAmount: 2160.0 },
  { id: 'tx_0052', assetId: '0050', date: '2026-01-19', type: TransactionType.BUY, quantity: 83.0, pricePerUnit: 71.7, fees: 1.5, totalAmount: 5952.6 },
  { id: 'tx_0053', assetId: '00878', date: '2026-01-19', type: TransactionType.BUY, quantity: 44.0, pricePerUnit: 22.65, fees: 1.0, totalAmount: 997.6 },
  { id: 'tx_0054', assetId: 'gold-bot', date: '2026-01-29', type: TransactionType.SELL, quantity: 4.0, pricePerUnit: 5565.0, fees: 0.0, totalAmount: 22260.0 }
];
