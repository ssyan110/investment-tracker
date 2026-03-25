import { TimeRange } from '../types';

const TIME_RANGE_OPTIONS: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export const TimeRangeSelector = ({ value, onChange }: TimeRangeSelectorProps) => (
  <div className="segmented-control w-full flex">
    {TIME_RANGE_OPTIONS.map(range => (
      <button
        key={range}
        onClick={() => onChange(range)}
        className={`flex-1 ${value === range ? 'active' : ''}`}
      >
        {range}
      </button>
    ))}
  </div>
);
