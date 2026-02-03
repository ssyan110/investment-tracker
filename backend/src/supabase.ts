import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  method: string;
  currency: string;
  current_market_price: number;
}

export interface Transaction {
  id: string;
  asset_id: string;
  date: string;
  type: string;
  quantity: number;
  price_per_unit: number;
  fees: number;
  total_amount: number;
}
