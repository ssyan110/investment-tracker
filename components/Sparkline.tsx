import { LineChart, Line } from 'recharts';

interface SparklineProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

export const Sparkline = ({
  data,
  positive,
  width = 60,
  height = 24,
}: SparklineProps) => {
  if (data.length < 2) return null;

  const chartData = data.map((value) => ({ value }));
  const stroke = positive ? '#34d399' : '#f87171';

  return (
    <LineChart width={width} height={height} data={chartData}>
      <Line
        type="monotone"
        dataKey="value"
        stroke={stroke}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
};
