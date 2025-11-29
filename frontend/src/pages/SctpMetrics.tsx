import { useMetricsStore } from '@/store/metricsStore';
import { MetricCard } from '@/components/cards/MetricCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { LineChartComponent } from '@/components/charts/LineChartComponent';
import {
  formatBitrate,
  formatLatency,
  formatPercentage,
  formatNumber,
  formatBytes,
} from '@/utils/formatters';

import {
  Layers,
  Clock,
  AlertTriangle,
  Activity,
  RefreshCw,
  Gauge,
  Timer,
  ArrowLeftRight,
  Heart,
  CheckCircle2,
  Radio,
  AlertCircle,
} from 'lucide-react';

export const SctpMetrics = () => {
  const { sctpData } = useMetricsStore();
  const hasData = sctpData.length > 0;

  // ================================================================
  // ⭐ THEORETICAL SCTP GENERATOR (slightly WORSE than UDP but BETTER than TCP)
  // ================================================================
  function generateTheoreticalSctpRecord() {
    return {
      ts: new Date().toISOString(),
      protocol: "SCTP",

      stream_id: Math.floor(Math.random() * 4),
      association_state: ["ESTABLISHED", "COOKIE_ECHOED", "SHUTDOWN_PENDING"][
        Math.floor(Math.random() * 3)
      ],

      // SCTP RTT between UDP & TCP
      heartbeat_rtt: 50 + Math.random() * 80,
      rtt_ms: 40 + Math.random() * 70,

      sack_count: Math.floor(2 + Math.random() * 5),
      retransmissions: Math.random() < 0.1 ? 1 : 0,

      cwnd_bytes: 12 * 1024 + Math.random() * 100 * 1024,
      in_flight_bytes: 6 * 1024 + Math.random() * 50 * 1024,
      receiver_window: 24 * 1024 + Math.random() * 160 * 1024,

      path_mtu: 1200 + Math.random() * 300,
      ssthresh: 24 * 1024 + Math.random() * 80 * 1024,
      rto_ms: 100 + Math.random() * 150,

      // Bandwidth (between UDP and TCP)
      throughput_kbps: 800 + Math.random() * 1800,
      goodput_kbps: 700 + Math.random() * 1600,
      bitrate_kbps: 900 + Math.random() * 1800,

      latency_ms_avg: 40 + Math.random() * 80,
      jitter_ms_avg: 3 + Math.random() * 10,
      packet_loss_rate: Math.random() * 0.025,

      mos_score: 2.8 + Math.random() * 1.4,

      // Unused fillers
      encode_ms_avg: null,
      decode_ms_avg: null,
      reassembly_ms_avg: null,
      audio_latency_ms: null,
      audio_jitter_ms: null,
      audio_packet_loss_rate: null,
      audio_bitrate: null,
      audio_levels: null,
      cpu_pct: 10 + Math.random() * 20,
      mem_pct: 20 + Math.random() * 30,
      proc_cpu_pct: null,
      network_queue_tx: null,
      network_queue_rx: null,
      frame_loss_rate: null,
      segment_loss_rate: null,
      psnr: null,
      ssim: null,
    };
  }

  const finalData = hasData ? sctpData : Array.from({ length: 120 }, generateTheoreticalSctpRecord);
  const last100 = finalData.slice(-100);
  const latest = last100[last100.length - 1];

  // Chart data remains same as original — just replace sctpData → finalData
  const throughputData = last100.map(r => ({
    timestamp: r.ts,
    throughput: r.throughput_kbps || 0,
    goodput: r.goodput_kbps || 0,
    bitrate: r.bitrate_kbps || 0,
  }));

  const rttData = last100.map(r => ({
    timestamp: r.ts,
    rtt: r.rtt_ms || 0,
    heartbeatRtt: r.heartbeat_rtt || 0,
  }));

  const retransmissionData = last100.map(r => ({
    timestamp: r.ts,
    retransmissions: r.retransmissions || 0,
    sackCount: r.sack_count || 0,
  }));

  const bufferData = last100.map(r => ({
    timestamp: r.ts,
    cwnd: (r.cwnd_bytes || 0) / 1024,
    inFlight: (r.in_flight_bytes || 0) / 1024,
    receiverWindow: (r.receiver_window || 0) / 1024,
  }));

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sctp/20 flex items-center justify-center">
          <Layers className="w-6 h-6 text-sctp" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SCTP Metrics</h1>
          <p className="text-muted-foreground">Stream Control Transmission Protocol</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-sctp/20 text-sctp text-sm font-medium">
          {finalData.length} records
        </span>
      </div>

      {/* THEORETICAL BANNER */}
      {!hasData && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-warning bg-warning/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-1" />
            <div>
              <h3 className="font-semibold">Theoretical Data Mode</h3>
              <p className="text-sm text-muted-foreground">
                SCTP metrics are simulated. Performance is intentionally worse than UDP and slightly better than TCP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rest of your UI unchanged — use latest + finalData */}
    </div>
  );
};

export default SctpMetrics;
