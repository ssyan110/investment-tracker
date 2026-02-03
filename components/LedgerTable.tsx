import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { formatCurrency, formatUnit } from '../utils';

interface LedgerTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
}

type SortKey = keyof Transaction;
type SortDirection = 'asc' | 'desc';

export const LedgerTable: React.FC<LedgerTableProps> = ({ transactions, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'asc', // Requirement: Default ascending
  });

  const processedTransactions = useMemo(() => {
    let data = [...transactions];

    // 1. Filter
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

    // 2. Sort
    data.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === undefined || bValue === undefined) return 0;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
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

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <span className="text-zinc-700 ml-1">↕</span>;
    return <span className="text-indigo-400 ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="relative group">
         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
         </div>
         <input
            type="text"
            placeholder="Search date, type, quantity, price..."
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none transition-all duration-300 placeholder-zinc-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="overflow-x-auto rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            <tr>
              <th 
                className="px-6 py-4 bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                onClick={() => handleSort('date')}
              >
                Date <SortIcon column="date" />
              </th>
              <th 
                className="px-6 py-4 bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                onClick={() => handleSort('type')}
              >
                Type <SortIcon column="type" />
              </th>
              <th 
                className="px-6 py-4 text-right bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                onClick={() => handleSort('quantity')}
              >
                Qty <SortIcon column="quantity" />
              </th>
              <th 
                className="px-6 py-4 text-right bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                onClick={() => handleSort('pricePerUnit')}
              >
                Price <SortIcon column="pricePerUnit" />
              </th>
              <th 
                className="px-6 py-4 text-right bg-black/20 cursor-pointer hover:text-zinc-300 transition-colors select-none"
                onClick={() => handleSort('totalAmount')}
              >
                Total <SortIcon column="totalAmount" />
              </th>
              <th className="px-6 py-4 text-center bg-black/20">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {processedTransactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors group">
                <td className="px-6 py-4 font-mono text-zinc-300">{tx.date}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${
                    tx.type === TransactionType.BUY 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-400">{formatUnit(tx.quantity)}</td>
                <td className="px-6 py-4 text-right font-mono text-zinc-400">{formatCurrency(tx.pricePerUnit)}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-white">
                  {formatCurrency(tx.totalAmount)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onEdit(tx)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-all hover:scale-105"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {processedTransactions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest">
                  {searchTerm ? 'No matching records found' : 'No transactions recorded'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};