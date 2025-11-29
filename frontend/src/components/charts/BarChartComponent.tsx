import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface BarChartProps {
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
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
}

export const BarChartComponent = ({
  data,
  dataKeys,
  title,
  className,
  height = 300,
  showGrid = true,
  showLegend = true,
  layout = 'horizontal',
  stacked = false,
}: BarChartProps) => {
  return (
    <div className={cn('chart-container', className)}>
      {title && (
        <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          )}
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {dataKeys.map(({ key, color, name }, index) => (
            <Bar
              key={key}
              dataKey={key}
              name={name}
              fill={color}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? 'stack' : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
