import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatUnit } from '../utils';

interface LedgerTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

type SortKey = keyof Transaction;
type SortDirection = 'asc' | 'desc';

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc',
  });

  const processedTransactions = useMemo(() => {
    let data = [...transactions];
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(tx =>
        tx.date.toLowerCase().includes(lowerTerm) ||
        tx.type.toLowerCase().includes(lowerTerm) ||
        tx.quantity.toString().includes(lowerTerm) ||
        tx.pricePerUnit.toString().includes(lowerTerm) ||
        tx.totalAmount.toString().includes(lowerTerm)
      );
    }
    data.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === undefined || bValue === undefined) return 0;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [transactions, searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-quaternary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search transactions…"
          className="glass-input pl-10"
          style={{ fontSize: '14px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sort pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {([
          { key: 'date' as SortKey, label: 'Date' },
          { key: 'type' as SortKey, label: 'Type' },
          { key: 'quantity' as SortKey, label: 'Qty' },
          { key: 'totalAmount' as SortKey, label: 'Total' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all"
            style={{
              background: sortConfig.key === key ? 'var(--bg-glass-elevated)' : 'transparent',
              color: sortConfig.key === key ? 'var(--accent-blue)' : 'var(--text-tertiary)',
              border: `1px solid ${sortConfig.key === key ? 'rgba(100,210,255,0.2)' : 'var(--border-glass)'}`,
            }}
          >
            {label}
            {sortConfig.key === key && (
              <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Transaction Cards */}
      <div className="space-y-2 stagger-children">
        {processedTransactions.map((tx) => (
          <div key={tx.id} className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: tx.type === TransactionType.BUY ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
                    color: tx.type === TransactionType.BUY ? 'var(--accent-green)' : 'var(--accent-red)',
                    border: `1px solid ${tx.type === TransactionType.BUY ? 'rgba(48,209,88,0.2)' : 'rgba(255,69,58,0.2)'}`,
                  }}
                >
                  {tx.type}
                </span>
                <span className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{tx.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onEdit(tx)}
                  className="text-[12px] font-semibold transition-opacity active:opacity-60"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm('Delete this transaction?')) onDelete(tx.id); }}
                  className="text-[12px] font-semibold transition-opacity active:opacity-60"
                  style={{ color: 'var(--accent-red)' }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <div className="space-y-0.5">
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {formatUnit(tx.quantity)} × {formatCurrency(tx.pricePerUnit)}
                </div>
                {tx.fees > 0 && (
                  <div className="text-[10px]" style={{ color: 'var(--text-quaternary)' }}>
                    Fee: {formatCurrency(tx.fees)}
                  </div>
                )}
              </div>
              <div className="text-[17px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                {formatCurrency(tx.totalAmount)}
              </div>
            </div>
          </div>
        ))}

        {processedTransactions.length === 0 && (
          <div className="glass p-8 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              {searchTerm ? 'No matching records' : 'No transactions recorded'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};