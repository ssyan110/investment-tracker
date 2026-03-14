import React from 'react';
import { InventoryState } from '../types';
import { formatCurrency, formatUnit, round } from '../utils';

interface InventoryTableProps {
  history: InventoryState[];
  currency: string;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ history, currency }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="glass px-4 py-3 flex items-center gap-2">
        <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span className="text-[12px] font-semibold" style={{ color: 'var(--accent-green)' }}>Verified Audit Trail</span>
      </div>

      {/* State Cards */}
      <div className="space-y-2 stagger-children">
        {history.map((state) => (
          <div key={state.transactionId} className="glass p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{state.date}</span>
              {state.realizedPnl !== 0 && (
                <span className={state.realizedPnl > 0 ? 'badge-green' : 'badge-red'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                  P/L {state.realizedPnl > 0 ? '+' : ''}{formatCurrency(state.realizedPnl, currency)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--text-quaternary)' }}>Units</div>
                <div className="text-[14px] font-mono font-medium" style={{ color: 'var(--accent-blue)' }}>
                  {formatUnit(state.unitsAfter)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--text-quaternary)' }}>Avg Cost</div>
                <div className="text-[14px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {formatCurrency(round(state.avgCostAfter, 2), currency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--text-quaternary)' }}>Book Value</div>
                <div className="text-[14px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(state.inventoryValueAfter, currency)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="glass p-8 text-center">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No inventory records</p>
          </div>
        )}
      </div>
    </div>
  );
};