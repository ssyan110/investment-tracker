import { Asset, Transaction } from '../types';

const KEYS = {
  ASSETS: 'AG_ASSETS',
  TRANSACTIONS: 'AG_TRANSACTIONS',
  VERSION: 'AG_DATA_VERSION'
};

export const loadAssets = (): Asset[] | null => {
  try {
    const data = localStorage.getItem(KEYS.ASSETS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load assets", e);
    return null;
  }
};

export const saveAssets = (assets: Asset[]) => {
  try {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
  } catch (e) {
    console.error("Failed to save assets", e);
  }
};

export const loadTransactions = (): Transaction[] | null => {
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load transactions", e);
    return null;
  }
};

export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error("Failed to save transactions", e);
  }
};

export const loadDataVersion = (): number => {
  try {
    const v = localStorage.getItem(KEYS.VERSION);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
};

export const saveDataVersion = (version: number) => {
  localStorage.setItem(KEYS.VERSION, version.toString());
};

export const clearData = () => {
  localStorage.removeItem(KEYS.ASSETS);
  localStorage.removeItem(KEYS.TRANSACTIONS);
  localStorage.removeItem(KEYS.VERSION);
};