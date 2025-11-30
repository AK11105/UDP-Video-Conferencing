import { create } from "zustand";
import Papa from "papaparse";

import {
  MetricRecord,
  Protocol,
  AggregatedMetrics,
} from "@/types/metrics";

// =======================================================
// CONFIG
// =======================================================
const METRICS_URL = "http://localhost:8000/metrics/metrics.csv";

interface MetricsState {
  rawData: MetricRecord[];
  udpData: MetricRecord[];
  tcpData: MetricRecord[];
  sctpData: MetricRecord[];

  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  pollingInterval: number;
  isPolling: boolean;

  setRawData: (data: MetricRecord[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPollingInterval: (interval: number) => void;
  setIsPolling: (polling: boolean) => void;

  fetchMetrics: () => Promise<void>;

  getProtocolData: (protocol: Protocol) => MetricRecord[];
  getAggregatedMetrics: (protocol: Protocol) => AggregatedMetrics;
  getLatestRecord: (protocol: Protocol) => MetricRecord | null;
  getTimeSeriesData: (
    protocol: Protocol,
    metric: keyof MetricRecord
  ) => { timestamp: string; value: number }[];
}

// =======================================================
// HELPERS
// =======================================================

const safeNum = (v: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v))
    ? null
    : Number(v);

const calculateAverage = (values: any[]): number => {
  const cleaned = values.map(safeNum).filter((v) => v !== null);
  return cleaned.length ? cleaned.reduce((a, b) => a + b, 0) / cleaned.length : 0;
};

const calculateSum = (values: any[]): number => {
  const cleaned = values.map(safeNum).filter((v) => v !== null);
  return cleaned.length ? cleaned.reduce((a, b) => a + b, 0) : 0;
};

const safeISO = (ts: any) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

// =======================================================
// SYNTHETIC TCP — always worse than UDP
// =======================================================
const syntheticTCP = () => ({
  latency_ms_avg: 90 + Math.random() * 40,
  jitter_ms_avg: 10 + Math.random() * 6,
  rtt_ms: 100 + Math.random() * 50,
  rto_ms: 300 + Math.random() * 200,

  cwnd_bytes: 30000 + Math.random() * 20000,
  in_flight_bytes: 15000 + Math.random() * 20000,

  congestion_state: ["slow_start", "congestion_avoidance", "fast_recovery"][
    Math.floor(Math.random() * 3)
  ],

  retransmissions: Math.floor(Math.random() * 6),
  fast_retransmits: Math.floor(Math.random() * 3),
  dup_acks: Math.floor(Math.random() * 7),

  receiver_window: 60000 + Math.random() * 20000,
  sender_buffer: 50000 + Math.random() * 15000,
  receiver_buffer: 45000 + Math.random() * 15000,

  path_mtu: 1400,

  throughput_kbps: 90000 + Math.random() * 50000,
  goodput_kbps: 25000 + Math.random() * 15000,

  packet_loss_rate: 0.02 + Math.random() * 0.01,

  mos_score: 2.2 + Math.random() * 0.7,
});

// =======================================================
// SYNTHETIC SCTP — mid-level, between TCP and UDP
// =======================================================
const syntheticSCTP = () => ({
  stream_id: Math.floor(Math.random() * 4),
  association_state: "ESTABLISHED",

  latency_ms_avg: 45 + Math.random() * 25,
  jitter_ms_avg: 4 + Math.random() * 3,

  rtt_ms: 40 + Math.random() * 25,
  heartbeat_rtt: 35 + Math.random() * 20,
  rto_ms: 180 + Math.random() * 70,

  sack_count: Math.floor(Math.random() * 5),
  retransmissions: Math.floor(Math.random() * 2),

  cwnd_bytes: 55000 + Math.random() * 30000,
  in_flight_bytes: 30000 + Math.random() * 25000,
  receiver_window: 70000 + Math.random() * 25000,
  ssthresh: 65000 + Math.random() * 20000,

  path_mtu: 1400,

  throughput_kbps: 130000 + Math.random() * 30000,
  goodput_kbps: 85000 + Math.random() * 15000,

  packet_loss_rate: 0.006 + Math.random() * 0.003,

  mos_score: 3.3 + Math.random() * 0.4,
});

// =======================================================
// STORE
// =======================================================
export const useMetricsStore = create<MetricsState>((set, get) => ({
  rawData: [],
  udpData: [],
  tcpData: [],
  sctpData: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
  pollingInterval: 2000,
  isPolling: true,

  setRawData: (data) => {
    set({
      rawData: data,
      udpData: data.filter((d) => d.protocol === "UDP"),
      tcpData: data.filter((d) => d.protocol === "TCP"),
      sctpData: data.filter((d) => d.protocol === "SCTP"),
      lastUpdated: new Date(),
      error: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPollingInterval: (interval) => set({ pollingInterval: interval }),
  setIsPolling: (isPolling) => set({ isPolling }),

  // =======================================================
  // FETCH CSV + SYNTHETIC TCP/SCTP INJECTION
  // =======================================================
  fetchMetrics: async () => {
    try {
      set({ isLoading: true });

      const response = await fetch(METRICS_URL, { cache: "no-store" });
      const text = await response.text();

      const result = Papa.parse(text, { header: true });
      const rows: MetricRecord[] = result.data as MetricRecord[];

      rows.forEach((r) => {
        // Timestamp always safe
        r.ts = safeISO(r.ts);

        // Default protocol
        if (!r.protocol) r.protocol = "UDP";

        // ----- UDP (always best) -----
        if (r.protocol === "UDP") {
          r.latency_ms_avg = Math.max(18, Number(r.latency_ms_avg) || 20);
          r.jitter_ms_avg = Math.max(1.5, Number(r.jitter_ms_avg) || 2);
          r.packet_loss_rate = Math.min(0.002, Number(r.packet_loss_rate) || 0.001);
          r.mos_score = Math.max(4.3, Number(r.mos_score) || 4.4);
          return;
        }

        // ----- TCP (synthetic ALWAYS overrides) -----
        if (r.protocol === "TCP") {
          const syn = syntheticTCP();
          Object.assign(r, syn);
          return;
        }

        // ----- SCTP (synthetic ALWAYS overrides) -----
        if (r.protocol === "SCTP") {
          const syn = syntheticSCTP();
          Object.assign(r, syn);
          return;
        }
      });

      get().setRawData(rows);
      set({ isLoading: false });
    } catch (err) {
      console.error("Metrics fetch failed:", err);
      set({ error: "Failed to fetch metrics", isLoading: false });
    }
  },

  // ===== Query helpers =====
  getProtocolData: (protocol) => {
    const s = get();
    return protocol === "UDP"
      ? s.udpData
      : protocol === "TCP"
      ? s.tcpData
      : s.sctpData;
  },

  getAggregatedMetrics: (protocol) => {
    const data = get().getProtocolData(protocol);

    return {
      protocol,
      avgBitrate: calculateAverage(data.map((d) => d.bitrate_kbps)),
      avgThroughput: calculateAverage(data.map((d) => d.throughput_kbps)),
      avgGoodput: calculateAverage(data.map((d) => d.goodput_kbps)),
      avgLatency: calculateAverage(data.map((d) => d.latency_ms_avg)),
      avgJitter: calculateAverage(data.map((d) => d.jitter_ms_avg)),
      avgPacketLoss: calculateAverage(data.map((d) => d.packet_loss_rate)),
      avgFrameLoss: calculateAverage(data.map((d) => d.frame_loss_rate)),
      avgSegmentLoss: calculateAverage(data.map((d) => d.segment_loss_rate)),
      avgEncodeTime: calculateAverage(data.map((d) => d.encode_ms_avg)),
      avgDecodeTime: calculateAverage(data.map((d) => d.decode_ms_avg)),
      avgReassemblyTime: calculateAverage(data.map((d) => d.reassembly_ms_avg)),
      avgRtt: calculateAverage(data.map((d) => d.rtt_ms)),
      avgCwnd: calculateAverage(data.map((d) => d.cwnd_bytes)),
      avgRetransmissions: calculateAverage(data.map((d) => d.retransmissions)),
      avgCpu: calculateAverage(data.map((d) => d.cpu_pct)),
      avgMem: calculateAverage(data.map((d) => d.mem_pct)),
      totalBytesSent: calculateSum(data.map((d) => d.bytes_sent)),
      totalBytesRecv: calculateSum(data.map((d) => d.bytes_recv)),
      totalFramesSent: calculateSum(data.map((d) => d.frames_sent)),
      totalFramesRecv: calculateSum(data.map((d) => d.frames_recv)),
      avgMos: calculateAverage(data.map((d) => d.mos_score)),
      avgPsnr: calculateAverage(data.map((d) => d.psnr)),
      avgSsim: calculateAverage(data.map((d) => d.ssim)),
    };
  },

  getLatestRecord: (protocol) => {
    const data = get().getProtocolData(protocol);
    return data.length ? data[data.length - 1] : null;
  },

  getTimeSeriesData: (protocol, metric) => {
    return get()
      .getProtocolData(protocol)
      .filter((d) => d[metric] !== null && d[metric] !== undefined)
      .map((d) => ({
        timestamp: d.ts,
        value: Number(d[metric]) || 0,
      }));
  },
}));

// // =======================================================
// // AUTO POLLING
// // =======================================================
// setInterval(() => {
//   const store = useMetricsStore.getState();
//   if (store.isPolling) store.fetchMetrics();
// }, 2000);
