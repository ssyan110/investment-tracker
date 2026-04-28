import { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatUnit } from '../utils';

interface LedgerTableProps {
  transactions: Transaction[];
  currency?: string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

type SortKey = keyof Transaction;
type SortDirection = 'asc' | 'desc';

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, currency = 'TWD', onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'asc' });
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const processedTransactions = useMemo(() => {
    let data = [...transactions];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(tx =>
        tx.date.toLowerCase().includes(lower) || tx.type.toLowerCase().includes(lower) ||
        tx.quantity.toString().includes(lower) || tx.pricePerUnit.toString().includes(lower) ||
        tx.totalAmount.toString().includes(lower) || (tx.note || '').toLowerCase().includes(lower)
      );
    }
    data.sort((a, b) => {
      const av = a[sortConfig.key], bv = b[sortConfig.key];
      if (av === undefined || bv === undefined) return 0;
      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [transactions, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search transactions…" className="glass-input pl-10" style={{ fontSize: '14px' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* Sort pills with fade edges */}
      <div className="sort-pills-container">
        <div className="flex gap-2 overflow-x-auto pb-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {([
            { key: 'date' as SortKey, label: 'Date' }, { key: 'type' as SortKey, label: 'Type' },
            { key: 'quantity' as SortKey, label: 'Qty' }, { key: 'totalAmount' as SortKey, label: 'Total' },
          ]).map(({ key, label }) => (
            <button key={key} onClick={() => handleSort(key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all"
              style={{
                background: sortConfig.key === key ? 'var(--bg-glass-elevated)' : 'transparent',
                color: sortConfig.key === key ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                border: `1px solid ${sortConfig.key === key ? 'rgba(56,189,248,0.2)' : 'var(--border-glass)'}`,
              }}>
              {label}{sortConfig.key === key && <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Cards with swipe */}
      <div className="space-y-2 stagger-children">
        {processedTransactions.map(tx => (
          <SwipeCard key={tx.id} tx={tx} currency={currency} isSwiped={swipedId === tx.id}
            onSwipe={() => setSwipedId(swipedId === tx.id ? null : tx.id)}
            onEdit={() => { setSwipedId(null); onEdit(tx); }}
            onDelete={() => { setSwipedId(null); onDelete(tx.id); }}
          />
        ))}
        {processedTransactions.length === 0 && (
          <div className="glass p-8 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>{searchTerm ? 'No matching records' : 'No transactions recorded'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Swipeable transaction card
const SwipeCard: React.FC<{
  tx: Transaction; currency: string; isSwiped: boolean;
  onSwipe: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ tx, currency, isSwiped, onSwipe, onEdit, onDelete }) => {
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; isDragging.current = false; };
  const handleTouchMove = () => { isDragging.current = true; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (diff > 60) onSwipe(); // swipe left to reveal
    else if (diff < -60 && isSwiped) onSwipe(); // swipe right to hide
  };

  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 'var(--radius-lg)' }}>
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-stretch" style={{ zIndex: 0 }}>
        <button onClick={onEdit} className="w-16 flex items-center justify-center text-[11px] font-semibold" style={{ background: 'rgba(56,189,248,0.2)', color: 'var(--accent-blue)' }}>Edit</button>
        <button onClick={onDelete} className="w-16 flex items-center justify-center text-[11px] font-semibold" style={{ background: 'rgba(248,113,113,0.2)', color: 'var(--accent-red)' }}>Delete</button>
      </div>
      {/* Card */}
      <div
        className="glass p-4 relative transition-transform duration-200"
        style={{ transform: isSwiped ? 'translateX(-128px)' : 'translateX(0)', zIndex: 1 }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: tx.type === TransactionType.BUY ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)',
                color: tx.type === TransactionType.BUY ? 'var(--accent-green)' : 'var(--accent-red)',
                border: `1px solid ${tx.type === TransactionType.BUY ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
              }}>{tx.type}</span>
            <span className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{tx.date}</span>
          </div>
          {/* Desktop: show buttons inline */}
          <div className="hidden sm:flex items-center gap-3">
            <button onClick={onEdit} className="text-[12px] font-semibold transition-opacity active:opacity-60" style={{ color: 'var(--accent-blue)' }}>Edit</button>
            <button onClick={onDelete} className="text-[12px] font-semibold transition-opacity active:opacity-60" style={{ color: 'var(--accent-red)' }}>Delete</button>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="space-y-0.5">
            <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{formatUnit(tx.quantity)} × {formatCurrency(tx.pricePerUnit, currency)}</div>
            {tx.fees > 0 && <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>Fee: {formatCurrency(tx.fees, currency)}</div>}
            {tx.note && <div className="text-[10px] italic mt-0.5" style={{ color: 'var(--text-quaternary)' }}>"{tx.note}"</div>}
          </div>
          <div className="text-[17px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(tx.totalAmount, currency)}</div>
        </div>
      </div>
    </div>
  );
};
