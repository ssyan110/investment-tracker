/**
 * Bank-grade rounding.
 * Uses strict epsilon rounding to avoid IEEE 754 float errors.
 */
export const round = (value: number, decimals: number = 2): number => {
  return Number(Math.round(Number(value + "e" + decimals)) + "e-" + decimals);
};

export const formatCurrency = (amount: number, currency: string = 'TWD') => {
  // USDT is not a standard ISO currency code
  if (currency === 'USDT') {
    return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' ₮';
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2) + ' ' + currency;
  }
};

export const formatUnit = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
};
