import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { AssetTimeSeriesPoint, TimeRange } from '../types';
import { TimeRangeSelector } from './TimeRangeSelector';

interface AssetPerformanceChartProps {
  data: AssetTimeSeriesPoint[];
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export const AssetPerformanceChart = ({
  data,
  selectedRange,
  onRangeChange,
}: AssetPerformanceChartProps) => {
  if (data.length < 2) {
    return (
      <div className="glass p-8 text-center">
        <p style={{ color: 'var(--text-tertiary)' }}>
          Not enough data to display chart
        </p>
        <div style={{ marginTop: '12px' }}>
          <TimeRangeSelector value={selectedRange} onChange={onRangeChange} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            position={{ y: 0 }}
            contentStyle={{
              background: 'rgba(30, 30, 40, 0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#F5F5F7',
              fontSize: '13px',
            }}
            labelStyle={{ color: 'rgba(245,245,247,0.6)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
          />
          <Line
            type="monotone"
            dataKey="marketValue"
            name="Market Value"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#38bdf8' }}
          />
          <Line
            type="monotone"
            dataKey="costBasis"
            name="Cost Basis"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '12px' }}>
        <TimeRangeSelector value={selectedRange} onChange={onRangeChange} />
      </div>
    </div>
  );
};
