import { create } from 'zustand';
import Papa from 'papaparse';
import { MetricRecord, Protocol, AggregatedMetrics } from '@/types/metrics';

// URL of your Python metrics server
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

const calculateAverage = (values: (number | null)[]): number => {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  return valid.length ? valid.reduce((a, b) => a + b) / valid.length : 0;
};

const calculateSum = (values: (number | null)[]): number => {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  return valid.reduce((a, b) => a + b, 0);
};

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
    const udpData = data.filter((d) => d.protocol === 'UDP');
    const tcpData = data.filter((d) => d.protocol === 'TCP');
    const sctpData = data.filter((d) => d.protocol === 'SCTP');

    set({
      rawData: data,
      udpData,
      tcpData,
      sctpData,
      lastUpdated: new Date(),
      error: null,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setPollingInterval: (interval) => set({ pollingInterval: interval }),
  setIsPolling: (polling) => set({ isPolling: polling }),

  // ⭐⭐⭐ Fetch CSV from Python metrics server
  fetchMetrics: async () => {
    try {
      set({ isLoading: true });

      const response = await fetch(METRICS_URL, { cache: "no-store" });
      const text = await response.text();

      const result = Papa.parse(text, { header: true });
      const records: MetricRecord[] = result.data as MetricRecord[];

      // Fix missing protocols → assume UDP
      records.forEach((r) => {
        if (!r.protocol) r.protocol = "UDP";
      });

      get().setRawData(records);
      set({ isLoading: false });
    } catch (error) {
      console.error("Fetch failed:", error);
      set({ error: "Failed to fetch metrics", isLoading: false });
    }
  },

  getProtocolData: (protocol) => {
    const s = get();
    if (protocol === "UDP") return s.udpData;
    if (protocol === "TCP") return s.tcpData;
    if (protocol === "SCTP") return s.sctpData;
    return [];
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
    const data = get().getProtocolData(protocol);

    return data
      .filter((d) => d[metric] !== null && d[metric] !== undefined)
      .map((d) => ({
        timestamp: d.ts,
        value: Number(d[metric]) || 0,
      }));
  },
}));

// 🔄 Auto polling
setInterval(() => {
  const store = useMetricsStore.getState();
  if (store.isPolling) store.fetchMetrics();
}, 2000);
