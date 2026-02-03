import React, { useState } from 'react';
import { AssetType, AccountingMethod } from '../types';

interface AddAssetFormProps {
  type: AssetType;
  onSave: (symbol: string, name: string, currency: string, method: AccountingMethod) => void;
  onCancel: () => void;
}

export const AddAssetForm: React.FC<AddAssetFormProps> = ({ type, onSave, onCancel }) => {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [method, setMethod] = useState<AccountingMethod>(AccountingMethod.AVERAGE_COST);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol && name) {
      onSave(symbol, name, currency, method);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-white">Add New {type}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Symbol / Ticker</label>
            <input 
              type="text" 
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none placeholder-zinc-700 font-mono uppercase"
              placeholder={type === AssetType.CRYPTO ? "BTC" : "AAPL"}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Asset Name</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none placeholder-zinc-700"
              placeholder="e.g. Bitcoin, Apple Inc."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Currency</label>
              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="JPY">JPY</option>
                <option value="EUR">EUR</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Method</label>
              <select 
                value={method} 
                onChange={e => setMethod(e.target.value as AccountingMethod)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value={AccountingMethod.AVERAGE_COST}>Avg Cost</option>
                <option value={AccountingMethod.FIFO}>FIFO</option>
                <option value={AccountingMethod.LIFO}>LIFO</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-indigo-900/20 transition-all"
            >
              Create Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};