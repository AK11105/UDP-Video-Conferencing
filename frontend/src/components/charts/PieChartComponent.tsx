import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: DataPoint[];
  title?: string;
  className?: string;
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export const PieChartComponent = ({
  data,
  title,
  className,
  height = 300,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
}: PieChartProps) => {
  return (
    <div className={cn('chart-container', className)}>
      {title && (
        <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value, entry) => (
                <span className="text-foreground">{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
