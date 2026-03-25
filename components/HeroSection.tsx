import { PortfolioTimeSeriesPoint, TimeRange } from '../types';
import { formatCurrency } from '../utils';
import { PortfolioChart } from './PortfolioChart';
import { TimeRangeSelector } from './TimeRangeSelector';

interface HeroSectionProps {
  totalValue: number;
  totalPnl: number;
  totalReturn: number;
  chartData: PortfolioTimeSeriesPoint[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export const HeroSection = ({
  totalValue,
  totalPnl,
  totalReturn,
  chartData,
  selectedRange,
  onRangeChange,
}: HeroSectionProps) => (
  <div className="glass-elevated p-5 animate-slide-up">
    <div
      className="text-[11px] font-semibold uppercase tracking-widest mb-1"
      style={{ color: 'var(--text-tertiary)' }}
    >
      Total Portfolio
    </div>
    <div
      className="text-[32px] font-bold font-mono tracking-tight leading-tight"
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
          color:
            totalReturn >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
        }}
      >
        {(totalReturn * 100).toFixed(2)}%
      </span>
    </div>
    <div className="mt-4">
      <PortfolioChart data={chartData} />
    </div>
    <div className="mt-3">
      <TimeRangeSelector value={selectedRange} onChange={onRangeChange} />
    </div>
  </div>
);
