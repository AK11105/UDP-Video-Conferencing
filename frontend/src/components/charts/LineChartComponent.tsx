import {
  LineChart,
  Line,
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

interface LineChartProps {
  data: DataPoint[];
  dataKeys: {
    key: string;
    color: string;
    name: string;
    strokeDasharray?: string;
  }[];
  title?: string;
  className?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisLabel?: string;
  dot?: boolean;
}

export const LineChartComponent = ({
  data,
  dataKeys,
  title,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  yAxisLabel,
  dot = false,
}: LineChartProps) => {
  return (
    <div className={cn('chart-container', className)}>
      {title && (
        <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          {dataKeys.map(({ key, color, name, strokeDasharray }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={name}
              stroke={color}
              strokeWidth={2}
              strokeDasharray={strokeDasharray}
              dot={dot}
              activeDot={{ r: 4, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
