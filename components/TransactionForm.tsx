import React, { useState, useEffect } from 'react';
import { Asset, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  assets: Asset[];
  initialData?: Transaction | null;
  onAddTransaction: (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => void;
  onUpdateTransaction: (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ 
  assets, 
  initialData, 
  onAddTransaction, 
  onUpdateTransaction,
  onCancel
}) => {
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setAssetId(initialData.assetId);
      setType(initialData.type);
      setDate(initialData.date);
      setQuantity(initialData.quantity.toString());
      setPrice(initialData.pricePerUnit.toString());
      setFees(initialData.fees.toString());
    } else {
      setAssetId(assets[0]?.id || '');
      setType(TransactionType.BUY);
      setDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPrice('');
      setFees('0');
    }
  }, [initialData, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !quantity || !price) return;
    
    if (initialData) {
      onUpdateTransaction(
        initialData.id,
        assetId,
        type,
        date,
        parseFloat(quantity),
        parseFloat(price),
        parseFloat(fees)
      );
    } else {
      onAddTransaction(
        assetId,
        type,
        date,
        parseFloat(quantity),
        parseFloat(price),
        parseFloat(fees)
      );
    }
    
    if (!initialData) {
      setQuantity('');
      setFees('0');
    }
  };

  const isEditing = !!initialData;

  const inputClass = "w-full bg-zinc-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all duration-300 placeholder-zinc-700";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1";

  return (
    <form onSubmit={handleSubmit} className={`p-8 rounded-3xl border backdrop-blur-md transition-all duration-500 ${isEditing ? 'bg-indigo-900/10 border-indigo-500/30 shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]' : 'bg-zinc-900/30 border-white/5'}`}>
      <div className="flex justify-between items-center mb-8">
        <h3 className={`text-lg font-bold tracking-tight ${isEditing ? 'text-indigo-400' : 'text-white'}`}>
          {isEditing ? `Edit Record #${initialData.id.split('-')[1]}` : 'New Transaction'}
        </h3>
        {isEditing && (
          <button type="button" onClick={onCancel} className="text-xs text-zinc-500 hover:text-white transition-colors">
            CANCEL
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className={labelClass}>Asset</label>
          <select 
            value={assetId} 
            onChange={e => setAssetId(e.target.value)}
            className={`${inputClass} appearance-none cursor-pointer`}
            disabled={isEditing}
          >
            {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Type</label>
          <div className="flex bg-zinc-900/80 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setType(TransactionType.BUY)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${type === TransactionType.BUY ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setType(TransactionType.SELL)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${type === TransactionType.SELL ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              SELL
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Quantity</label>
          <input 
            type="number" 
            step="0.0001" 
            min="0"
            value={quantity} 
            onChange={e => setQuantity(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="0.0000"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Price</label>
          <input 
            type="number" 
            step="0.01" 
            min="0"
            value={price} 
            onChange={e => setPrice(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="0.00"
            required
          />
        </div>

         <div className="md:col-span-2">
          <label className={labelClass}>Fees</label>
          <input 
            type="number" 
            step="0.01" 
            min="0"
            value={fees} 
            onChange={e => setFees(e.target.value)}
            className={`${inputClass} font-mono`}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
         {isEditing && (
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-800 transition-colors"
            >
              DISCARD
            </button>
         )}
        <button 
          type="submit" 
          className={`px-8 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-white shadow-lg ${isEditing ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-zinc-100 text-black hover:bg-white shadow-white/10'}`}
        >
          {isEditing ? 'UPDATE RECORD' : 'COMMIT TRANSACTION'}
        </button>
      </div>
    </form>
  );
};