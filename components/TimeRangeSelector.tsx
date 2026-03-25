import { TimeRange } from '../types';

const TIME_RANGE_OPTIONS: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export const TimeRangeSelector = ({ value, onChange }: TimeRangeSelectorProps) => (
  <div className="segmented-control w-full flex" style={{ overflow: 'hidden' }}>
    {TIME_RANGE_OPTIONS.map(range => (
      <button
        key={range}
        onClick={() => onChange(range)}
        className={`flex-1 ${value === range ? 'active' : ''}`}
        style={{ minWidth: 0, padding: '6px 4px', fontSize: '13px' }}
      >
        {range}
      </button>
    ))}
  </div>
);
