import { createClient } from '@supabase/supabase-js';
import { Asset, Transaction } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const KEYS = {
  ASSETS: 'AG_ASSETS',
  TRANSACTIONS: 'AG_TRANSACTIONS',
  VERSION: 'AG_DATA_VERSION'
};

// ===== ASSETS =====

export const loadAssets = async (): Promise<Asset[] | null> => {
  // Try Supabase first if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*');
      
      if (error) throw error;
      
      return data as Asset[] || null;
    } catch (e) {
      console.warn("Failed to load assets from Supabase, falling back to localStorage", e);
    }
  }
  
  // Fallback to localStorage
  try {
    const data = localStorage.getItem(KEYS.ASSETS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load assets from localStorage", e);
    return null;
  }
};

export const saveAssets = async (assets: Asset[]) => {
  // Save to Supabase if configured
  if (supabase) {
    try {
      // Use upsert to update existing or insert new
      const { error } = await supabase
        .from('assets')
        .upsert(assets, { onConflict: 'id' });
      
      if (error) throw error;
      console.log("Assets saved to Supabase");
    } catch (e) {
      console.warn("Failed to save assets to Supabase, using localStorage fallback", e);
    }
  }
  
  // Always save to localStorage as backup
  try {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
  } catch (e) {
    console.error("Failed to save assets to localStorage", e);
  }
};

// ===== TRANSACTIONS =====

export const loadTransactions = async (): Promise<Transaction[] | null> => {
  // Try Supabase first if configured
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data as Transaction[] || null;
    } catch (e) {
      console.warn("Failed to load transactions from Supabase, falling back to localStorage", e);
    }
  }
  
  // Fallback to localStorage
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load transactions from localStorage", e);
    return null;
  }
};

export const saveTransactions = async (transactions: Transaction[]) => {
  // Save to Supabase if configured
  if (supabase) {
    try {
      // Use upsert to update existing or insert new
      const { error } = await supabase
        .from('transactions')
        .upsert(transactions, { onConflict: 'id' });
      
      if (error) throw error;
      console.log("Transactions saved to Supabase");
    } catch (e) {
      console.warn("Failed to save transactions to Supabase, using localStorage fallback", e);
    }
  }
  
  // Always save to localStorage as backup
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
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
  // Clear Supabase if configured
  if (supabase) {
    try {
      await supabase.from('assets').delete().neq('id', '');
      await supabase.from('transactions').delete().neq('id', '');
    } catch (e) {
      console.warn("Failed to clear Supabase data", e);
    }
  }
  
  // Clear localStorage
  localStorage.removeItem(KEYS.ASSETS);
  localStorage.removeItem(KEYS.TRANSACTIONS);
  localStorage.removeItem(KEYS.VERSION);
};