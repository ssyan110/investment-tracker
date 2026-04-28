import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { PortfolioTimeSeriesPoint } from '../types';

interface PortfolioChartProps {
  data: PortfolioTimeSeriesPoint[];
  height?: number;
}

const getChartHeight = (heightProp?: number): number => {
  if (heightProp !== undefined) return heightProp;
  return typeof window !== 'undefined' && window.innerWidth < 640 ? 200 : 280;
};

export const PortfolioChart = ({ data, height }: PortfolioChartProps) => {
  if (data.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <p style={{ color: 'var(--text-tertiary)' }}>No chart data available</p>
      </div>
    );
  }

  const isPositive =
    data.length >= 2 ? data[data.length - 1].value >= data[0].value : true;

  const strokeColor = isPositive ? '#34d399' : '#f87171';
  const fillId = isPositive ? 'areaGradientGreen' : 'areaGradientRed';
  const chartHeight = getChartHeight(height);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="areaGradientGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="areaGradientRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: strokeColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
