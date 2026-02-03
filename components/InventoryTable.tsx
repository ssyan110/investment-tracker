import React from 'react';
import { InventoryState } from '../types';
import { formatCurrency, formatUnit, round } from '../utils';

interface InventoryTableProps {
  history: InventoryState[];
  currency: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ history, currency }) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm mt-6">
       <div className="bg-gradient-to-r from-zinc-900 to-zinc-800/80 px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-400 border-b border-white/5">
          Audit Trail <span className="text-zinc-600 mx-2">//</span> Verified State
       </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase tracking-widest text-zinc-500 font-medium">
            <tr>
              <th className="px-6 py-4 bg-black/20">Date</th>
              <th className="px-6 py-4 text-right bg-black/20">Units After</th>
              <th className="px-6 py-4 text-right bg-black/20">Avg Cost</th>
              <th className="px-6 py-4 text-right bg-black/20">Book Value</th>
              <th className="px-6 py-4 text-right bg-black/20">Realized PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.map((state) => (
              <tr key={state.transactionId} className="hover:bg-white/[0.03] transition-colors">
                <td className="px-6 py-4 font-mono text-zinc-400">{state.date}</td>
                <td className="px-6 py-4 text-right font-mono font-medium text-indigo-400">
                  {formatUnit(state.unitsAfter)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-zinc-500">
                  {formatCurrency(round(state.avgCostAfter, 2), currency)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-white">
                  {formatCurrency(state.inventoryValueAfter, currency)}
                </td>
                <td className={`px-6 py-4 text-right font-mono ${state.realizedPnl > 0 ? 'text-emerald-400' : state.realizedPnl < 0 ? 'text-rose-400' : 'text-zinc-700'}`}>
                  {state.realizedPnl !== 0 ? formatCurrency(state.realizedPnl, currency) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-indigo-900/20 text-indigo-300 text-xs flex items-center border-t border-white/5">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        <span>Immutable Ledger Reconstructed</span>
      </div>
    </div>
  );
};