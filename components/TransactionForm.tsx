import React, { useState, useEffect } from 'react';
import { Asset, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  assets: Asset[];
  initialAssetId?: string;
  initialData?: Transaction | null;
  showAssetPicker?: boolean;
  onAddTransaction: (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => void;
  onUpdateTransaction: (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  assets,
  initialAssetId,
  initialData,
  showAssetPicker = false,
  onAddTransaction,
  onUpdateTransaction,
  onCancel
}) => {
  const [assetId, setAssetId] = useState(initialAssetId || assets[0]?.id || '');
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');

  useEffect(() => {
    if (initialData) {
      setAssetId(initialData.assetId);
      setType(initialData.type);
      setDate(initialData.date);
      setQuantity(initialData.quantity.toString());
      setPrice(initialData.pricePerUnit.toString());
      setFees(initialData.fees.toString());
    } else {
      setAssetId(initialAssetId || assets[0]?.id || '');
      setType(TransactionType.BUY);
      setDate(new Date().toISOString().split('T')[0]);
      setQuantity('');
      setPrice('');
      setFees('0');
    }
  }, [initialData, initialAssetId, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !quantity || !price) return;
    if (initialData) {
      onUpdateTransaction(initialData.id, assetId, type, date, parseFloat(quantity), parseFloat(price), parseFloat(fees));
    } else {
      onAddTransaction(assetId, type, date, parseFloat(quantity), parseFloat(price), parseFloat(fees));
    }
  };

  const isEditing = !!initialData;
  const selectedAsset = assets.find(a => a.id === assetId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Asset Picker — shown when opening from FAB on home */}
      {showAssetPicker && assets.length > 1 && (
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Asset</label>
          <select
            value={assetId}
            onChange={e => setAssetId(e.target.value)}
            className="glass-input appearance-none cursor-pointer"
          >
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Show selected asset badge when picker is hidden */}
      {!showAssetPicker && selectedAsset && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{selectedAsset.symbol}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{selectedAsset.name}</span>
        </div>
      )}

      {/* BUY/SELL Toggle */}
      <div className="segmented-control w-full flex">
        <button
          type="button"
          onClick={() => setType(TransactionType.BUY)}
          className={`flex-1 ${type === TransactionType.BUY ? 'active' : ''}`}
          style={type === TransactionType.BUY ? { color: 'var(--accent-green)' } : {}}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setType(TransactionType.SELL)}
          className={`flex-1 ${type === TransactionType.SELL ? 'active' : ''}`}
          style={type === TransactionType.SELL ? { color: 'var(--accent-red)' } : {}}
        >
          SELL
        </button>
      </div>

      {/* Date */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="glass-input"
          style={{ colorScheme: 'dark' }}
          required
        />
      </div>

      {/* Quantity & Price */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Quantity</label>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="glass-input font-mono"
            placeholder="0.0000"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="glass-input font-mono"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      {/* Fees */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Fees</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={fees}
          onChange={e => setFees(e.target.value)}
          className="glass-input font-mono"
          placeholder="0.00"
        />
      </div>

      <div className="flex gap-3 pt-1">
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
          {isEditing ? 'Update' : 'Commit'}
        </button>
      </div>
    </form>
  );
};
