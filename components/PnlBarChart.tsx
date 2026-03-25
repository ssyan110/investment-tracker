import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { PnlDataPoint } from '../types';
import { formatCurrency } from '../utils';

interface PnlBarChartProps {
  data: PnlDataPoint[];
}

export const PnlBarChart = ({ data }: PnlBarChartProps) => {
  if (data.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <p style={{ color: 'var(--text-tertiary)' }}>No P&L data available</p>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden', width: '100%' }}>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
        <XAxis
          dataKey="symbol"
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(30, 30, 40, 0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#F5F5F7',
            fontSize: '13px',
          }}
          wrapperStyle={{ zIndex: 10 }}
          formatter={(value) => formatCurrency(Number(value))}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.symbol}
              fill={entry.pnl >= 0 ? '#30D158' : '#FF453A'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
};
