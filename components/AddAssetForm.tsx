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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md glass-elevated overflow-hidden animate-slide-up m-4" style={{ borderRadius: 'var(--radius-xl)' }}>
        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          <h3 className="text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>Add {type}</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-glass-elevated)', color: 'var(--text-tertiary)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Symbol / Ticker</label>
            <input
              type="text"
              value={symbol}
              onChange={e => setSymbol(e.target.value.toUpperCase())}
              className="glass-input font-mono uppercase"
              placeholder={type === AssetType.CRYPTO ? "BTC" : "AAPL"}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Asset Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="glass-input"
              placeholder="e.g. Bitcoin, Apple Inc."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="glass-input appearance-none cursor-pointer"
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
                <option value="JPY">JPY</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Method</label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as AccountingMethod)}
                className="glass-input appearance-none cursor-pointer"
              >
                <option value={AccountingMethod.AVERAGE_COST}>Avg Cost</option>
                <option value={AccountingMethod.FIFO}>FIFO</option>
                <option value={AccountingMethod.LIFO}>LIFO</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="glass-btn flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-btn glass-btn-primary flex-1"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};