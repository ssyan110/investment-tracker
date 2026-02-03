import { supabase, Asset, Transaction } from './supabase.js';

// ===== ASSETS =====

export const getAssets = async (): Promise<Asset[]> => {
  const { data, error } = await supabase
    .from('assets')
    .select('*');
  
  if (error) throw error;
  return data || [];
};

export const createAsset = async (asset: Omit<Asset, 'id'>): Promise<Asset> => {
  const id = `asset-${Date.now()}`;
  const { data, error } = await supabase
    .from('assets')
    .insert([{ id, ...asset }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateAsset = async (id: string, updates: Partial<Asset>): Promise<Asset> => {
  const { data, error } = await supabase
    .from('assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteAsset = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ===== TRANSACTIONS =====

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const getTransactionsByAsset = async (assetId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('asset_id', assetId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

export const createTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const id = `tx-${Date.now()}`;
  const { data, error } = await supabase
    .from('transactions')
    .insert([{ id, ...transaction }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateTransaction = async (id: string, updates: Partial<Transaction>): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
