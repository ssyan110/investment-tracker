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
      onUpdateTransaction(initialData.id, assetId, type, date, parseFloat(quantity), parseFloat(price), parseFloat(fees));
    } else {
      onAddTransaction(assetId, type, date, parseFloat(quantity), parseFloat(price), parseFloat(fees));
    }
    if (!initialData) {
      setQuantity('');
      setFees('0');
    }
  };

  const isEditing = !!initialData;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-elevated p-5 transition-all duration-300"
      style={{
        borderColor: isEditing ? 'rgba(100,210,255,0.3)' : undefined,
        boxShadow: isEditing ? '0 0 30px -10px rgba(100,210,255,0.15)' : undefined,
      }}
    >
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[15px] font-semibold" style={{ color: isEditing ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
          {isEditing ? 'Edit Transaction' : 'New Transaction'}
        </h3>
        {isEditing && (
          <button type="button" onClick={onCancel} className="text-[12px] font-semibold" style={{ color: 'var(--accent-red)' }}>
            Cancel
          </button>
        )}
      </div>

      {/* BUY/SELL Toggle */}
      <div className="segmented-control w-full flex mb-4">
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

      <div className="space-y-3">
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
      </div>

      <div className="mt-5 flex gap-3">
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="glass-btn flex-1"
          >
            Discard
          </button>
        )}
        <button
          type="submit"
          className={`glass-btn flex-1 ${isEditing ? 'glass-btn-primary' : ''}`}
          style={!isEditing ? {
            background: 'linear-gradient(135deg, rgba(100,210,255,0.25), rgba(125,122,255,0.25))',
            borderColor: 'rgba(100,210,255,0.35)',
            color: 'var(--accent-blue)',
          } : {}}
        >
          {isEditing ? 'Update' : 'Commit'}
        </button>
      </div>
    </form>
  );
};