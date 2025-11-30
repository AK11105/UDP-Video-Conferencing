import { motion } from 'framer-motion';
import { useDeviceStore } from '@/stores/deviceStore';
import { cn } from '@/lib/utils';

interface AudioLevelMeterProps {
  className?: string;
}

export function AudioLevelMeter({ className }: AudioLevelMeterProps) {
  const audioLevel = useDeviceStore((state) => state.audioLevel);
  
  const bars = 12;
  const activeLevel = Math.floor((audioLevel / 100) * bars);

  return (
    <div className={cn("flex items-center gap-0.5 h-6", className)}>
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = i < activeLevel;
        const isHigh = i >= bars * 0.75;
        const isMid = i >= bars * 0.5 && !isHigh;
        
        return (
          <motion.div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-75",
              isActive
                ? isHigh
                  ? "bg-destructive"
                  : isMid
                  ? "bg-warning"
                  : "bg-success"
                : "bg-muted"
            )}
            initial={{ height: 4 }}
            animate={{ 
              height: isActive ? 8 + (i * 1.2) : 4,
              opacity: isActive ? 1 : 0.3
            }}
            transition={{ duration: 0.05 }}
          />
        );
      })}
    </div>
  );
}
