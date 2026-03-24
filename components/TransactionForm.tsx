import { useState, useEffect } from 'react';
import { Asset, Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  assets: Asset[];
  initialAssetId?: string;
  initialData?: Transaction | null;
  showAssetPicker?: boolean;
  isSaving?: boolean;
  onAddTransaction: (assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number, note: string) => void;
  onUpdateTransaction: (id: string, assetId: string, type: TransactionType, date: string, quantity: number, price: number, fees: number, note: string) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  assets, initialAssetId, initialData, showAssetPicker = false, isSaving = false,
  onAddTransaction, onUpdateTransaction, onCancel
}) => {
  const [assetId, setAssetId] = useState(initialAssetId || assets[0]?.id || '');
  const [type, setType] = useState<TransactionType>(TransactionType.BUY);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialData) {
      setAssetId(initialData.assetId);
      setType(initialData.type);
      setDate(initialData.date);
      setQuantity(initialData.quantity.toString());
      setPrice(initialData.pricePerUnit.toString());
      setFees(initialData.fees.toString());
      setNote(initialData.note || '');
    } else {
      setAssetId(initialAssetId || assets[0]?.id || '');
      setType(TransactionType.BUY);
      setDate(new Date().toISOString().split('T')[0]);
      setQuantity(''); setPrice(''); setFees('0'); setNote('');
    }
  }, [initialData, initialAssetId, assets]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !quantity || !price || isSaving) return;
    const q = parseFloat(quantity), p = parseFloat(price), f = parseFloat(fees);
    if (initialData) onUpdateTransaction(initialData.id, assetId, type, date, q, p, f, note);
    else onAddTransaction(assetId, type, date, q, p, f, note);
  };

  const isEditing = !!initialData;
  const selectedAsset = assets.find(a => a.id === assetId);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {showAssetPicker && assets.length > 1 && (
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Asset</label>
          <select value={assetId} onChange={e => setAssetId(e.target.value)} className="glass-input appearance-none cursor-pointer">
            {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
          </select>
        </div>
      )}
      {!showAssetPicker && selectedAsset && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{selectedAsset.symbol}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{selectedAsset.name}</span>
        </div>
      )}
      <div className="segmented-control w-full flex">
        <button type="button" onClick={() => setType(TransactionType.BUY)} className={`flex-1 ${type === TransactionType.BUY ? 'active' : ''}`} style={type === TransactionType.BUY ? { color: 'var(--accent-green)' } : {}}>BUY</button>
        <button type="button" onClick={() => setType(TransactionType.SELL)} className={`flex-1 ${type === TransactionType.SELL ? 'active' : ''}`} style={type === TransactionType.SELL ? { color: 'var(--accent-red)' } : {}}>SELL</button>
      </div>
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="glass-input" style={{ colorScheme: 'dark' }} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Quantity</label>
          <input type="number" step="0.0001" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="glass-input font-mono" placeholder="0.0000" required />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Price</label>
          <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} className="glass-input font-mono" placeholder="0.00" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Fees</label>
          <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} className="glass-input font-mono" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ml-1" style={{ color: 'var(--text-tertiary)' }}>Note</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} className="glass-input" placeholder="Optional" maxLength={100} />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="glass-btn flex-1" disabled={isSaving}>Cancel</button>
        <button type="submit" className="glass-btn glass-btn-primary flex-1 flex items-center justify-center gap-2" disabled={isSaving}>
          {isSaving && <div className="w-3.5 h-3.5 border-2 border-transparent border-t-current rounded-full animate-spin" />}
          {isEditing ? 'Update' : 'Commit'}
        </button>
      </div>
    </form>
  );
};
