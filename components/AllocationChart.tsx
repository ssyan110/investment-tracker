import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { AllocationDataPoint, AssetType } from '../types';
import { formatCurrency } from '../utils';

interface AllocationChartProps {
  data: AllocationDataPoint[];
  totalValue: number;
}

const ASSET_COLORS: Record<AssetType, string> = {
  [AssetType.GOLD]: '#fbbf24',
  [AssetType.ETF]: '#8b5cf6',
  [AssetType.STOCK]: '#22d3ee',
  [AssetType.CRYPTO]: '#fb923c',
};

const ASSET_LABELS: Record<AssetType, string> = {
  [AssetType.GOLD]: 'Gold',
  [AssetType.ETF]: 'ETF',
  [AssetType.STOCK]: 'Stock',
  [AssetType.CRYPTO]: 'Crypto',
};

export const AllocationChart = ({ data, totalValue }: AllocationChartProps) => {
  if (data.length === 0) {
    return (
      <div className="glass p-8 text-center">
        <p style={{ color: 'var(--text-tertiary)' }}>No allocation data available</p>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="type"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.type}
                  fill={ASSET_COLORS[entry.type]}
                />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
        {/* Center label overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Total</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatCurrency(totalValue)}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '8px',
        }}
      >
        {data.map((entry) => (
          <div
            key={entry.type}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: ASSET_COLORS[entry.type],
                display: 'inline-block',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {ASSET_LABELS[entry.type]} {entry.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
