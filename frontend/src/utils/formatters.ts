export const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return value.toFixed(decimals);
};

export const formatBytes = (bytes: number | null | undefined): string => {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

export const formatBitrate = (kbps: number | null | undefined): string => {
  if (kbps === null || kbps === undefined || isNaN(kbps)) return 'N/A';
  
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(2)} Mbps`;
  }
  return `${kbps.toFixed(2)} Kbps`;
};

export const formatLatency = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || isNaN(ms)) return 'N/A';
  return `${ms.toFixed(2)} ms`;
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
};

export const formatTimestamp = (ts: string): string => {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
};

export const formatShortTimestamp = (ts: string): string => {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
};

export const getQualityColor = (mos: number | null): string => {
  if (mos === null) return 'text-muted-foreground';
  if (mos >= 4.0) return 'text-success';
  if (mos >= 3.0) return 'text-warning';
  return 'text-destructive';
};

export const getQualityLabel = (mos: number | null): string => {
  if (mos === null) return 'Unknown';
  if (mos >= 4.3) return 'Excellent';
  if (mos >= 4.0) return 'Good';
  if (mos >= 3.6) return 'Fair';
  if (mos >= 3.1) return 'Poor';
  return 'Bad';
};

export const getCongestionStateLabel = (state: string | null): string => {
  if (!state) return 'N/A';
  const labels: Record<string, string> = {
    slow_start: 'Slow Start',
    congestion_avoidance: 'Congestion Avoidance',
    fast_recovery: 'Fast Recovery',
    idle: 'Idle',
  };
  return labels[state] || state;
};
