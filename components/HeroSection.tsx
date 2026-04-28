import { useState } from 'react';
import { PortfolioTimeSeriesPoint, AllocationDataPoint, PnlDataPoint, TimeRange } from '../types';
import { formatCurrency } from '../utils';
import { PortfolioChart } from './PortfolioChart';
import { TimeRangeSelector } from './TimeRangeSelector';
import { AllocationChart } from './AllocationChart';
import { PnlBarChart } from './PnlBarChart';

type HeroTab = 'chart' | 'allocation' | 'pnl';

interface HeroSectionProps {
  totalValue: number;
  totalPnl: number;
  totalReturn: number;
  chartData: PortfolioTimeSeriesPoint[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  allocationData: AllocationDataPoint[];
  pnlData: PnlDataPoint[];
}

export const HeroSection = ({
  totalValue,
  totalPnl,
  totalReturn,
  chartData,
  selectedRange,
  onRangeChange,
  allocationData,
  pnlData,
}: HeroSectionProps) => {
  const [activeTab, setActiveTab] = useState<HeroTab>('chart');

  return (
    <div className="glass-elevated p-5 animate-slide-up">
      <div
        className="text-[12px] font-medium uppercase tracking-widest mb-1"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}
      >
        Total Portfolio
      </div>
      <div
        className="text-[40px] font-bold font-mono tracking-tight leading-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {formatCurrency(totalValue)}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={totalPnl >= 0 ? 'badge-green' : 'badge-red'}>
          {totalPnl > 0 ? '+' : ''}
          {formatCurrency(totalPnl)}
        </span>
        <span
          className="text-[12px] font-mono"
          style={{
            color: totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}
        >
          {(totalReturn * 100).toFixed(2)}%
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-3" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        {([
          { key: 'chart' as HeroTab, label: 'Trend' },
          { key: 'allocation' as HeroTab, label: 'Allocation' },
          { key: 'pnl' as HeroTab, label: 'P&L' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 pb-2 text-[12px] font-semibold transition-all"
            style={{
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-quaternary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent-blue)' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'chart' && (
        <div>
          <PortfolioChart data={chartData} />
          <div className="mt-3">
            <TimeRangeSelector value={selectedRange} onChange={onRangeChange} />
          </div>
        </div>
      )}
      {activeTab === 'allocation' && (
        <AllocationChart data={allocationData} totalValue={totalValue} />
      )}
      {activeTab === 'pnl' && (
        <PnlBarChart data={pnlData} />
      )}
    </div>
  );
};
