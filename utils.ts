/**
 * Bank-grade rounding.
 * Note: In a production Node.js environment, we would use 'decimal.js'.
 * For this React demo, we use strict epsilon rounding to avoid IEEE 754 float errors.
 */
export const round = (value: number, decimals: number = 2): number => {
  return Number(Math.round(Number(value + "e" + decimals)) + "e-" + decimals);
};

export const formatCurrency = (amount: number, currency: string = 'TWD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatUnit = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
};