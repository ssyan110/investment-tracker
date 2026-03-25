import React from 'react';
import { PortfolioPosition, AllocationDataPoint, PnlDataPoint } from '../types';
import { formatCurrency, formatUnit } from '../utils';
import { AllocationChart } from './AllocationChart';
import { PnlBarChart } from './PnlBarChart';

interface PortfolioDashboardProps {
  positions: PortfolioPosition[];
  hideCostBasis?: boolean;
  allocationData?: AllocationDataPoint[];
  pnlData?: PnlDataPoint[];
  totalValue?: number;
}

export const PortfolioSummary: React.FC<PortfolioDashboardProps> = ({ positions, hideCostBasis = false }) => {
  const totalValue = positions.reduce((acc, p) => acc + p.marketValue, 0);
  const totalCost = positions.reduce((acc, p) => acc + p.investmentAmount, 0);
  const totalUnrealized = totalValue - totalCost;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="glass p-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Value</div>
        <div className="text-[20px] font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {formatCurrency(totalValue)}
        </div>
      </div>

      {!hideCostBasis && (
        <div className="glass p-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Cost Basis</div>
          <div className="text-[20px] font-bold font-mono tracking-tight" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(totalCost)}
          </div>
        </div>
      )}

      <div className={`glass p-4 ${hideCostBasis ? '' : 'col-span-2'}`}>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Unrealized P/L</div>
        <div className="text-[20px] font-bold font-mono tracking-tight" style={{ color: totalUnrealized >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {totalUnrealized > 0 ? '+' : ''}{formatCurrency(totalUnrealized)}
        </div>
      </div>
    </div>
  );
};

export const PortfolioHoldings: React.FC<{ positions: PortfolioPosition[] }> = ({ positions }) => {
  if (positions.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>No holdings yet</p>
      </div>
    );
  }

  return (
    <div className="glass overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>Holdings</h3>
        <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-quaternary)' }}>Manual Price</span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--border-glass)' }}>
        {positions.map((pos) => (
          <div key={pos.asset.id} className="px-4 py-3 flex items-center gap-3 transition-colors" style={{ ['--tw-divide-opacity' as any]: '1' }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{pos.asset.symbol}</span>
                <span className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{pos.asset.name}</span>
              </div>
              <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {formatUnit(pos.units)} @ {formatCurrency(pos.avgCost)}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[14px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pos.marketValue)}</div>
              <div className="flex items-center justify-end gap-2 mt-0.5">
                <span className="text-[11px] font-mono" style={{ color: pos.unrealizedPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                </span>
                <span className={pos.returnPercentage >= 0 ? 'badge-green' : 'badge-red'} style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {(pos.returnPercentage * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = (props) => {
  const { positions, allocationData, pnlData, totalValue } = props;

  return (
    <div className="space-y-4">
      <PortfolioSummary {...props} />
      <PortfolioHoldings positions={positions} />
      {allocationData && allocationData.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Allocation</h3>
          <AllocationChart data={allocationData} totalValue={totalValue ?? 0} />
        </div>
      )}
      {pnlData && pnlData.length > 0 && (
        <div className="glass p-4">
          <h3 className="text-[15px] font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>P&L by Asset</h3>
          <PnlBarChart data={pnlData} />
        </div>
      )}
    </div>
  );
};