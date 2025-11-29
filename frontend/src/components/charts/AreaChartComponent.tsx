import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { formatShortTimestamp } from '@/utils/formatters';

interface DataPoint {
  timestamp: string;
  [key: string]: string | number;
}

interface AreaChartProps {
  data: DataPoint[];
  dataKeys: {
    key: string;
    color: string;
    name: string;
  }[];
  title?: string;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  gradient?: boolean;
}

export const AreaChartComponent = ({
  data,
  dataKeys,
  title,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  yAxisLabel,
  gradient = true,
}: AreaChartProps) => {
  return (
    <div className={cn('chart-container', className)}>
      {title && (
        <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {dataKeys.map(({ key, color }) => (
              <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          )}
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatShortTimestamp}
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fontSize: 10 } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={formatShortTimestamp}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {dataKeys.map(({ key, color, name }) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              name={name}
              stroke={color}
              strokeWidth={2}
              fill={gradient ? `url(#gradient-${key})` : color}
              fillOpacity={gradient ? 1 : 0.2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
