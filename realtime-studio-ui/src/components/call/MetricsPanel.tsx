import { motion } from 'framer-motion';
import { 
  Activity, ArrowUp, ArrowDown, Clock, 
  Gauge, AlertTriangle, Zap, Radio 
} from 'lucide-react';
import { useCallStore } from '@/stores/callStore';
import { cn } from '@/lib/utils';

export function MetricsPanel() {
  const { metrics, history } = useCallStore();

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const metricGroups = [
    {
      title: 'Frame Rate',
      icon: Activity,
      items: [
        { label: 'Send FPS', value: metrics.sendFps.toFixed(1), unit: 'fps', status: metrics.sendFps > 20 ? 'good' : metrics.sendFps > 10 ? 'warning' : 'bad' },
        { label: 'Receive FPS', value: metrics.receiveFps.toFixed(1), unit: 'fps', status: metrics.receiveFps > 20 ? 'good' : metrics.receiveFps > 10 ? 'warning' : 'bad' },
      ],
    },
    {
      title: 'Processing',
      icon: Zap,
      items: [
        { label: 'Encode Time', value: metrics.encodeTimeMs.toFixed(1), unit: 'ms', status: metrics.encodeTimeMs < 30 ? 'good' : metrics.encodeTimeMs < 50 ? 'warning' : 'bad' },
        { label: 'Decode Time', value: metrics.decodeTimeMs.toFixed(1), unit: 'ms', status: metrics.decodeTimeMs < 30 ? 'good' : metrics.decodeTimeMs < 50 ? 'warning' : 'bad' },
      ],
    },
    {
      title: 'Bandwidth',
      icon: Radio,
      items: [
        { label: 'Bytes Sent', value: formatBytes(metrics.bytesSent), icon: ArrowUp },
        { label: 'Bytes Received', value: formatBytes(metrics.bytesReceived), icon: ArrowDown },
      ],
    },
    {
      title: 'Quality',
      icon: Gauge,
      items: [
        { label: 'Packet Loss', value: metrics.packetLoss.toFixed(2), unit: '%', status: metrics.packetLoss < 1 ? 'good' : metrics.packetLoss < 5 ? 'warning' : 'bad' },
        { label: 'Audio Latency', value: metrics.audioLatencyMs.toFixed(0), unit: 'ms', status: metrics.audioLatencyMs < 100 ? 'good' : metrics.audioLatencyMs < 200 ? 'warning' : 'bad' },
        { label: 'Jitter', value: metrics.jitterMs.toFixed(1), unit: 'ms', status: metrics.jitterMs < 30 ? 'good' : metrics.jitterMs < 50 ? 'warning' : 'bad' },
      ],
    },
  ];

  const statusColors = {
    good: 'text-success',
    warning: 'text-warning',
    bad: 'text-destructive',
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {metricGroups.map((group, gi) => (
        <motion.div
          key={group.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <group.icon className="h-3.5 w-3.5" />
            {group.title}
          </div>
          <div className="grid gap-2">
            {group.items.map((item, ii) => (
              <div
                key={item.label}
                className="flex items-center justify-between p-2.5 rounded-lg bg-card/50 border"
              >
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-sm font-mono font-medium",
                    item.status && statusColors[item.status]
                  )}>
                    {item.value}
                  </span>
                  {item.unit && (
                    <span className="text-xs text-muted-foreground">{item.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      {/* Last updated */}
      <div className="text-xs text-center text-muted-foreground pt-4 border-t">
        <Clock className="h-3 w-3 inline mr-1" />
        Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
      </div>

      {/* Connection events history */}
      <div className="pt-4 border-t">
        <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Event History
        </h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {history.slice(-10).reverse().map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-2 text-xs py-1"
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                event.type === 'join' && "bg-success",
                event.type === 'leave' && "bg-warning",
                event.type === 'error' && "bg-destructive",
                (event.type === 'mute' || event.type === 'unmute' || event.type === 'video_on' || event.type === 'video_off') && "bg-primary"
              )} />
              <span className="flex-1 truncate text-muted-foreground">{event.message}</span>
              <span className="text-[10px] text-muted-foreground/50">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground/50 text-center py-2">No events yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
