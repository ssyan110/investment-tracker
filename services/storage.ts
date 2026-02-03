import { Asset, Transaction } from '../types';

const KEYS = {
  ASSETS: 'AG_ASSETS',
  TRANSACTIONS: 'AG_TRANSACTIONS',
  VERSION: 'AG_DATA_VERSION'
};

// ===== ASSETS =====

export const loadAssets = async (): Promise<Asset[] | null> => {
  try {
    const data = localStorage.getItem(KEYS.ASSETS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load assets from localStorage", e);
    return null;
  }
};

export const saveAssets = async (assets: Asset[]) => {
  try {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
    console.log("Assets saved to localStorage");
  } catch (e) {
    console.error("Failed to save assets to localStorage", e);
  }
};

// ===== TRANSACTIONS =====

export const loadTransactions = async (): Promise<Transaction[] | null> => {
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load transactions from localStorage", e);
    return null;
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    console.log("Transactions saved to localStorage");
  } catch (e) {
    console.error("Failed to save transactions to localStorage", e);
  }
};

// ===== VERSION =====

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

export const clearData = async () => {
  localStorage.removeItem(KEYS.ASSETS);
  localStorage.removeItem(KEYS.TRANSACTIONS);
  localStorage.removeItem(KEYS.VERSION);
};