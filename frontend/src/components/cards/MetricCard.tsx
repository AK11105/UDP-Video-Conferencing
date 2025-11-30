import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  protocol?: 'udp' | 'tcp' | 'sctp';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MetricCard = ({
  label,
  value,
  unit,
  icon: Icon,
  trend,
  trendValue,
  protocol,
  className,
  size = 'md',
}: MetricCardProps) => {

  // ---- Store last good value (no NA, no 0, no flicker) ----
  const lastGood = useRef<string>("");

  const isValid =
    value !== undefined &&
    value !== null &&
    value !== "N/A" &&
    value !== "0" &&
    value !== "0.00" &&
    value !== "Infinity";

  if (isValid) {
    lastGood.current = value;
  }

  const displayValue = lastGood.current || value || "0";

  // UI continues
  const cardClass = protocol ? `metric-card-${protocol}` : 'metric-card';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-success'
      : trend === 'down'
      ? 'text-destructive'
      : 'text-muted-foreground';

  return (
    <div className={cn(cardClass, className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>

        {Icon && (
          <div
            className={cn(
              'p-1.5 rounded-lg',
              protocol === 'udp' && 'bg-udp/10 text-udp',
              protocol === 'tcp' && 'bg-tcp/10 text-tcp',
              protocol === 'sctp' && 'bg-sctp/10 text-sctp',
              !protocol && 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-mono font-bold',
            size === 'sm' && 'text-lg',
            size === 'md' && 'text-2xl',
            size === 'lg' && 'text-3xl'
          )}
        >
          {displayValue}
        </span>

        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>

      {trend && trendValue && (
        <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
          <TrendIcon className="w-3 h-3" />
          <span className="text-xs font-medium">{trendValue}</span>
        </div>
      )}
    </div>
  );
};
