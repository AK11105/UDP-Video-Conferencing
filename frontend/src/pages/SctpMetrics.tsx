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

function generateSctpRecord() {
  const now = new Date().toISOString();

  // SCTP: better than TCP, worse than UDP
  const rtt = 30 + Math.random() * 60;            // 30 - 90 ms (better than TCP)
  const hbRtt = rtt + (5 + Math.random() * 20);   // heartbeat RTT slightly higher
  const jitter = 2 + Math.random() * 6;           // modest jitter
  const loss = Math.random() * 0.02;              // up to 2% packet loss
  const cwnd = 16 * 1024 + Math.random() * 140 * 1024; // cwnd moderate
  const inflight = 8 * 1024 + Math.random() * 60 * 1024;

  return {
    ts: now,
    protocol: 'SCTP',

    // SCTP identity
    stream_id: Math.floor(Math.random() * 4),
    association_state: ['ESTABLISHED', 'COOKIE_ECHOED', 'SHUTDOWN_PENDING'][Math.floor(Math.random() * 3)],

    // timing
    heartbeat_rtt: Math.round(hbRtt),
    rtt_ms: Math.round(rtt),
    rto_ms: Math.round((rtt * 2.2)),

    // reliability & retrans
    sack_count: Math.floor(1 + Math.random() * 6),
    retransmissions: Math.random() < 0.08 ? 1 : 0,   // ~8% chance
    // flow / congestion
    cwnd_bytes: Math.round(cwnd),
    in_flight_bytes: Math.round(inflight),
    receiver_window: Math.round(24 * 1024 + Math.random() * 160 * 1024),
    ssthresh: Math.round(24 * 1024 + Math.random() * 80 * 1024),

    path_mtu: 1200 + Math.floor(Math.random() * 300),

    // bandwidth (between UDP and TCP)
    bitrate_kbps: Math.round(900 + Math.random() * 1700),
    throughput_kbps: Math.round(800 + Math.random() * 1500),
    goodput_kbps: Math.round(700 + Math.random() * 1400),

    // aggregated network stats
    latency_ms_avg: Math.round(rtt),
    jitter_ms_avg: Math.round(jitter),
    packet_loss_rate: Number(loss.toFixed(4)),

    // QoE
    mos_score: Number((2.8 + Math.random() * 1.2).toFixed(2)),

    // filler fields expected by UI (avoid N/A)
    encode_ms_avg: 0,
    decode_ms_avg: 0,
    reassembly_ms_avg: 0,
    audio_latency_ms: 0,
    audio_jitter_ms: 0,
    audio_packet_loss_rate: 0,
    audio_bitrate: 0,
    audio_levels: 0,

    cpu_pct: 10 + Math.random() * 20,
    mem_pct: 20 + Math.random() * 30,
    proc_cpu_pct: 0,
    network_queue_tx: 0,
    network_queue_rx: 0,

    frame_loss_rate: 0,
    segment_loss_rate: 0,
    psnr: null,
    ssim: null,
  };
}

export const SctpMetrics = () => {
  const { sctpData } = useMetricsStore();

  // ensure we always have usable data immediately (no N/A)
  const finalData = sctpData.length > 0 ? sctpData : Array.from({ length: 120 }, generateSctpRecord);
  const last100 = finalData.slice(-100);
  const latest = last100[last100.length - 1] ?? generateSctpRecord();

  // Prepare chart data (fields match your original UI)
  const throughputData = last100.map((r) => ({
    timestamp: r.ts,
    throughput: r.throughput_kbps || 0,
    goodput: r.goodput_kbps || 0,
    bitrate: r.bitrate_kbps || 0,
  }));

  const rttData = last100.map((r) => ({
    timestamp: r.ts,
    rtt: r.rtt_ms || 0,
    heartbeatRtt: r.heartbeat_rtt || r.heartbeat_rtt || 0, // support both keys if any
  }));

  const retransmissionData = last100.map((r) => ({
    timestamp: r.ts,
    retransmissions: r.retransmissions || 0,
    sackCount: r.sack_count || r.sack_count || 0,
  }));

  const bufferData = last100.map((r) => ({
    timestamp: r.ts,
    cwnd: (r.cwnd_bytes || 0) / 1024,
    inFlight: (r.in_flight_bytes || 0) / 1024,
    receiverWindow: (r.receiver_window || 0) / 1024,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-sctp/20 flex items-center justify-center">
          <Layers className="w-6 h-6 text-sctp" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SCTP Metrics</h1>
          <p className="text-muted-foreground">Stream Control Transmission Protocol - Multi-streaming</p>
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium bg-sctp/20 text-sctp`}>
          {finalData.length} records
        </span>
      </div>

      {/* Theoretical banner if data was generated locally */}
      {sctpData.length === 0 && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Theoretical Data Mode</h3>
              <p className="text-sm text-muted-foreground">
                SCTP metrics are simulated client-side and intentionally set to be better than TCP but not as good as UDP.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCTP-Specific Metrics - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Stream ID"
          value={formatNumber(latest?.stream_id ?? 0, 0)}
          icon={Radio}
          protocol="sctp"
        />
        <MetricCard
          label="Association State"
          value={latest?.association_state || 'N/A'}
          icon={CheckCircle2}
          protocol="sctp"
          size="sm"
        />
        {/* <MetricCard
          label="Heartbeat RTT"
          value={formatLatency(latest?.heartbeat_rtt ?? latest?.heartbeatRtt)}
          icon={Heart}
          protocol="sctp"
        /> */}
        <MetricCard
          label="RTT"
          value={formatLatency(latest?.rtt_ms)}
          icon={Clock}
          protocol="sctp"
        />
        {/* <MetricCard
          label="SACK Count"
          value={formatNumber(latest?.sack_count ?? latest?.sackCount ?? 0, 0)}
          icon={CheckCircle2}
          protocol="sctp"
        /> */}
        <MetricCard
          label="Retransmissions"
          value={formatNumber(latest?.retransmissions ?? 0, 0)}
          icon={RefreshCw}
          protocol="sctp"
        />
      </div>

      {/* SCTP-Specific Metrics - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          label="CWND"
          value={formatBytes(latest?.cwnd_bytes)}
          icon={Gauge}
          protocol="sctp"
        />
        <MetricCard
          label="In-Flight"
          value={formatBytes(latest?.in_flight_bytes)}
          icon={ArrowLeftRight}
          protocol="sctp"
        />
        <MetricCard
          label="Receiver Window"
          value={formatBytes(latest?.receiver_window)}
          icon={Activity}
          protocol="sctp"
        />
        <MetricCard
          label="Path MTU"
          value={formatNumber(latest?.path_mtu ?? 0, 0)}
          unit="bytes"
          icon={ArrowLeftRight}
          protocol="sctp"
        />
        <MetricCard
          label="RTO"
          value={formatLatency(latest?.rto_ms)}
          icon={Timer}
          protocol="sctp"
        />
        <MetricCard
          label="ssthresh"
          value={formatBytes(latest?.ssthresh)}
          icon={AlertTriangle}
          protocol="sctp"
        />
      </div>

      {/* Standard Network Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Throughput"
          value={formatBitrate(latest?.throughput_kbps)}
          icon={Activity}
          protocol="sctp"
        />
        <MetricCard
          label="Goodput"
          value={formatBitrate(latest?.goodput_kbps)}
          icon={Gauge}
          protocol="sctp"
        />
        <MetricCard
          label="Latency"
          value={formatLatency(latest?.latency_ms_avg ?? latest?.rtt_ms)}
          icon={Clock}
          protocol="sctp"
        />
        <MetricCard
          label="Jitter"
          value={formatLatency(latest?.jitter_ms_avg)}
          icon={Activity}
          protocol="sctp"
        />
        <MetricCard
          label="Packet Loss"
          value={formatPercentage(latest?.packet_loss_rate)}
          icon={AlertTriangle}
          protocol="sctp"
        />
        <MetricCard
          label="MOS Score"
          value={formatNumber(latest?.mos_score, 2)}
          icon={Activity}
          protocol="sctp"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={throughputData}
          dataKeys={[
            { key: 'bitrate', color: 'hsl(38, 95%, 60%)', name: 'Bitrate' },
            { key: 'throughput', color: 'hsl(28, 95%, 55%)', name: 'Throughput' },
            { key: 'goodput', color: 'hsl(48, 95%, 50%)', name: 'Goodput' },
          ]}
          title="Bandwidth Metrics (Kbps)"
          height={280}
        />
        <LineChartComponent
          data={rttData}
          dataKeys={[
            { key: 'rtt', color: 'hsl(38, 95%, 60%)', name: 'RTT (ms)' },
            { key: 'heartbeatRtt', color: 'hsl(160, 84%, 50%)', name: 'Heartbeat RTT (ms)' },
          ]}
          title="RTT Metrics"
          height={280}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={retransmissionData}
          dataKeys={[
            { key: 'retransmissions', color: 'hsl(0, 84%, 60%)', name: 'Retransmissions' },
            { key: 'sackCount', color: 'hsl(160, 84%, 50%)', name: 'SACK Count' },
          ]}
          title="Reliability Metrics"
          height={280}
        />
        <AreaChartComponent
          data={bufferData}
          dataKeys={[
            { key: 'cwnd', color: 'hsl(38, 95%, 60%)', name: 'CWND (KB)' },
            { key: 'inFlight', color: 'hsl(280, 70%, 65%)', name: 'In-Flight (KB)' },
            { key: 'receiverWindow', color: 'hsl(160, 84%, 50%)', name: 'Receiver Window (KB)' },
          ]}
          title="Window & Buffer Sizes"
          height={280}
        />
      </div>

      {/* SCTP Characteristics Info */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">SCTP Characteristics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-sctp">Multi-Streaming</h4>
            <p className="text-xs text-muted-foreground">
              Independent streams within a single association avoid head-of-line blocking.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-sctp">Message-Oriented</h4>
            <p className="text-xs text-muted-foreground">
              Preserves message boundaries unlike TCP's byte-stream model.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-sctp">Partial Reliability</h4>
            <p className="text-xs text-muted-foreground">
              PR-SCTP allows timed reliability for real-time applications.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-sctp">Multi-Homing</h4>
            <p className="text-xs text-muted-foreground">
              Supports multiple IP addresses per endpoint for fault tolerance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SctpMetrics;
