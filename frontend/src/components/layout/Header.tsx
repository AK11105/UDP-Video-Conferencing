import { useMetricsStore } from '@/store/metricsStore';
import { formatTimestamp } from '@/utils/formatters';
import { RefreshCw, Pause, Play, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export const Header = () => {
  const { lastUpdated, isPolling, setIsPolling, pollingInterval, setPollingInterval, rawData } = useMetricsStore();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`pulse-dot ${isPolling ? 'bg-success' : 'bg-muted'}`} />
          <span className="text-sm text-muted-foreground">
            {isPolling ? 'Live' : 'Paused'}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground font-mono">
          {rawData.length} records
        </span>
        {lastUpdated && (
          <>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">
              Updated: {formatTimestamp(lastUpdated.toISOString())}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={pollingInterval}
          onChange={(e) => setPollingInterval(Number(e.target.value))}
          className="h-9 px-3 text-sm bg-secondary text-secondary-foreground rounded-lg border-0 focus:ring-2 focus:ring-ring"
        >
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
        </select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPolling(!isPolling)}
          className="h-9 w-9"
        >
          {isPolling ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {isDark ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  );
};
