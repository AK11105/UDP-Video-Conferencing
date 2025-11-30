// Convert anything → number or NaN
const toNum = (v: any): number => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return v;
  const p = parseFloat(v);
  return isNaN(p) ? NaN : p;
};

// ---------------------------------------------------------
// NUMBER
// ---------------------------------------------------------
export const formatNumber = (value: any, decimals: number = 2): string => {
  const num = toNum(value);
  if (isNaN(num)) return "0";
  return num.toFixed(decimals);
};

// ---------------------------------------------------------
// BYTES
// ---------------------------------------------------------
export const formatBytes = (bytes: any): string => {
  const num = toNum(bytes);
  if (isNaN(num)) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = num;
  let i = 0;

  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }

  return `${size.toFixed(2)} ${units[i]}`;
};

// ---------------------------------------------------------
// BITRATE
// ---------------------------------------------------------
export const formatBitrate = (kbps: any, prev?: string): string => {
  const n = Number(kbps);
  if (isNaN(n) || !isFinite(n)) return prev ?? "0 Kbps";

  if (n >= 1000) return `${(n / 1000).toFixed(2)} Mbps`;
  return `${n.toFixed(2)} Kbps`;
};



// ---------------------------------------------------------
// LATENCY
// ---------------------------------------------------------
export const formatLatency = (ms: any, prev?: string): string => {
  const n = Number(ms);
  if (isNaN(n) || !isFinite(n)) return prev ?? "0 ms";
  return `${n.toFixed(2)} ms`;
};


// ---------------------------------------------------------
// PERCENTAGE
// ---------------------------------------------------------
export const formatPercentage = (v: any, prev?: string): string => {
  const n = Number(v);
  if (isNaN(n) || !isFinite(n)) return prev ?? "0%";
  return `${n.toFixed(2)}%`;
};

// ---------------------------------------------------------
// TIMESTAMPS
// ---------------------------------------------------------
export const formatTimestamp = (ts: string): string => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "00:00:00";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatShortTimestamp = (ts: string): string => {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "00:00";
  return d.toLocaleTimeString("en-US", {
    minute: "2-digit",
    second: "2-digit",
  });
};

// ---------------------------------------------------------
// QUALITY METRICS
// ---------------------------------------------------------
export const getQualityColor = (mos: any): string => {
  const num = toNum(mos);
  if (isNaN(num)) return "text-muted-foreground";

  if (num >= 4.0) return "text-success";
  if (num >= 3.0) return "text-warning";
  return "text-destructive";
};

export const getQualityLabel = (mos: any): string => {
  const num = toNum(mos);
  if (isNaN(num)) return "Unknown";

  if (num >= 4.3) return "Excellent";
  if (num >= 4.0) return "Good";
  if (num >= 3.6) return "Fair";
  if (num >= 3.1) return "Poor";
  return "Bad";
};

// ---------------------------------------------------------
// CONGESTION STATE LABEL
// ---------------------------------------------------------
export const getCongestionStateLabel = (state: any): string => {
  if (!state) return "N/A";
  const labels: Record<string, string> = {
    slow_start: "Slow Start",
    congestion_avoidance: "Congestion Avoidance",
    fast_recovery: "Fast Recovery",
    idle: "Idle",
  };
  return labels[state] || state;
};
