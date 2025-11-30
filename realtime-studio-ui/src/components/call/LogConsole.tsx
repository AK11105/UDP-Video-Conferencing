import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Trash2, ArrowDown, Pause, Play, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCallStore } from '@/stores/callStore';
import { cn } from '@/lib/utils';
import type { LogEntry } from '@/lib/types';

export function LogConsole() {
  const { logs, clearLogs } = useCallStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogEntry['level'] | 'all'>('all');

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (filter && !log.message.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const levelColors: Record<LogEntry['level'], string> = {
    info: 'text-primary',
    warn: 'text-warning',
    error: 'text-destructive',
    debug: 'text-muted-foreground',
  };

  const levelBadgeColors: Record<LogEntry['level'], string> = {
    info: 'bg-primary/20 text-primary',
    warn: 'bg-warning/20 text-warning',
    error: 'bg-destructive/20 text-destructive',
    debug: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            variant={autoScroll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className="h-8 px-2"
          >
            {autoScroll ? <ArrowDown className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="h-8 px-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Level filter */}
        <div className="flex items-center gap-1">
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors",
                levelFilter === level
                  ? level === 'all' 
                    ? "bg-primary text-primary-foreground" 
                    : levelBadgeColors[level as LogEntry['level']]
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs bg-muted/30"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Terminal className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-xs">No logs to display</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors",
                  levelColors[log.level]
                )}
              >
                {/* Timestamp */}
                <span className="text-muted-foreground/60 flex-shrink-0 w-16">
                  {new Date(log.timestamp).toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>

                {/* Level badge */}
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-medium uppercase flex-shrink-0",
                  levelBadgeColors[log.level]
                )}>
                  {log.level}
                </span>

                {/* Source */}
                {log.source && (
                  <span className="text-muted-foreground/60 flex-shrink-0">
                    [{log.source}]
                  </span>
                )}

                {/* Message */}
                <span className="flex-1 break-all">{log.message}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{filteredLogs.length} entries</span>
        <span className="flex items-center gap-1">
          {autoScroll && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
          {autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
        </span>
      </div>
    </div>
  );
}
