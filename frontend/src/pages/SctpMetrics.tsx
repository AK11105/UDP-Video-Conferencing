import { useMemo } from 'react';
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

//
// -------- THEORETICAL SCTP DATA (worse than UDP, slightly worse vs TCP) -------
// Runs ONLY when sctpData is empty.
// UDP best → TCP medium → SCTP weakest.
//
const generateSctpTheoretical = () => {
  const t = Date.now();

  return {
    ts: t,
    protocol: 'SCTP',

    stream_id: Math.floor(Math.random() * 4),
    association_state: 'ESTABLISHED',

    // worse bitrate/performance than UDP and TCP
    bitrate_kbps: 900 + Math.random() * 300,
    throughput_kbps: 700 + Math.random() * 250,
    goodput_kbps: 500 + Math.random() * 200,

    rtt_ms: 100 + Math.random() * 30,
    heartbeat_rtt: 120 + Math.random() * 40,
    rto_ms: 250 + Math.random() * 80,

    latency_ms_avg: 70 + Math.random() * 20,
    jitter_ms_avg: 20 + Math.random() * 8,
    packet_loss_rate: 0.04 + Math.random() * 0.03,

    retransmissions: Math.floor(Math.random() * 12),
    sack_count: Math.floor(Math.random() * 8),

    cwnd_bytes: 30000 + Math.random() * 15000,
    in_flight_bytes: 25000 + Math.random() * 10000,
    receiver_window: 40000 + Math.random() * 15000,
    ssthresh: 20000 + Math.random() * 10000,

    path_mtu: 1300,
    mos_score: 2.9 + Math.random() * 0.2,
  };
};

export const SctpMetrics = () => {
  const { sctpData, getAggregatedMetrics, getLatestRecord } = useMetricsStore();

  // --------- fallback to theoretical if no SCTP data ---------
  const latest = useMemo(() => {
    if (sctpData.length > 0) return getLatestRecord('SCTP');
    return generateSctpTheoretical();
  }, [sctpData, getLatestRecord]);

  const metrics = useMemo(() => {
    if (sctpData.length > 0) return getAggregatedMetrics('SCTP');

    const s = generateSctpTheoretical();
    return {
      protocol: 'SCTP',
      avgBitrate: s.bitrate_kbps,
      avgThroughput: s.throughput_kbps,
      avgGoodput: s.goodput_kbps,
      avgLatency: s.latency_ms_avg,
      avgJitter: s.jitter_ms_avg,
      avgPacketLoss: s.packet_loss_rate,
      avgFrameLoss: 0,
      avgSegmentLoss: 0,
      avgEncodeTime: null,
      avgDecodeTime: null,
      avgReassemblyTime: null,
      avgRtt: s.rtt_ms,
      avgCwnd: s.cwnd_bytes,
      avgRetransmissions: s.retransmissions,
      avgCpu: null,
      avgMem: null,
      totalBytesSent: 0,
      totalBytesRecv: 0,
      totalFramesSent: 0,
      totalFramesRecv: 0,
      avgMos: s.mos_score,
    };
  }, [sctpData, getAggregatedMetrics]);

  // smooth performance — no flicker
  const last100 = useMemo(() => sctpData.slice(-100), [sctpData]);

  const throughputData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    throughput: r.throughput_kbps || 0,
    goodput: r.goodput_kbps || 0,
    bitrate: r.bitrate_kbps || 0,
  }));

  const rttData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    rtt: r.rtt_ms || 0,
    heartbeatRtt: r.heartbeat_rtt || 0,
  }));

  const retransmissionData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    retransmissions: r.retransmissions || 0,
    sackCount: r.sack_count || 0,
  }));

  const bufferData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
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
          <p className="text-muted-foreground">Stream Control Transmission Protocol</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-sctp/20 text-sctp text-sm font-medium">
          {sctpData.length > 0 ? `${sctpData.length} records` : 'Theoretical Model'}
        </span>
      </div>

      {/* Info Banner */}
      {sctpData.length === 0 && (
        <div className="glass-card rounded-xl p-4 border-l-4 border-warning bg-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground">Theoretical Mode</h3>
              <p className="text-sm text-muted-foreground">
                SCTP metrics are simulated. Real multi-stream SCTP values will appear once SCTP transport is implemented.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Row 1 — SCTP-specific */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Stream ID" value={formatNumber(latest.stream_id, 0)} icon={Radio} protocol="sctp" />
        <MetricCard
          label="Association State"
          value={latest.association_state}
          icon={CheckCircle2}
          protocol="sctp"
          size="sm"
        />
        <MetricCard label="Heartbeat RTT" value={formatLatency(latest.heartbeat_rtt)} icon={Heart} protocol="sctp" />
        <MetricCard label="RTT" value={formatLatency(latest.rtt_ms)} icon={Clock} protocol="sctp" />
        <MetricCard label="SACK Count" value={formatNumber(latest.sack_count)} icon={CheckCircle2} protocol="sctp" />
        <MetricCard
          label="Retransmissions"
          value={formatNumber(latest.retransmissions)}
          icon={RefreshCw}
          protocol="sctp"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="CWND" value={formatBytes(latest.cwnd_bytes)} icon={Gauge} protocol="sctp" />
        <MetricCard label="In-Flight" value={formatBytes(latest.in_flight_bytes)} icon={ArrowLeftRight} protocol="sctp" />
        <MetricCard
          label="Receiver Window"
          value={formatBytes(latest.receiver_window)}
          icon={Activity}
          protocol="sctp"
        />
        <MetricCard label="Path MTU" value={formatNumber(latest.path_mtu)} icon={ArrowLeftRight} protocol="sctp" />
        <MetricCard label="RTO" value={formatLatency(latest.rto_ms)} icon={Timer} protocol="sctp" />
        <MetricCard label="ssthresh" value={formatBytes(latest.ssthresh)} icon={AlertTriangle} protocol="sctp" />
      </div>

      {/* Standard Network Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Throughput" value={formatBitrate(latest.throughput_kbps)} icon={Activity} protocol="sctp" />
        <MetricCard label="Goodput" value={formatBitrate(latest.goodput_kbps)} icon={Gauge} protocol="sctp" />
        <MetricCard label="Latency" value={formatLatency(latest.latency_ms_avg)} icon={Clock} protocol="sctp" />
        <MetricCard label="Jitter" value={formatLatency(latest.jitter_ms_avg)} icon={Activity} protocol="sctp" />
        <MetricCard label="Packet Loss" value={formatPercentage(latest.packet_loss_rate)} icon={AlertTriangle} protocol="sctp" />
        <MetricCard label="MOS Score" value={formatNumber(latest.mos_score, 2)} icon={Activity} protocol="sctp" />
      </div>

      {/* Charts Row 1 */}
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

      {/* Charts Row 2 */}
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

      {/* Info Block */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">SCTP Characteristics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h4 className="text-sm font-medium text-sctp">Multi-Streaming</h4>
            <p className="text-xs text-muted-foreground">Independent streams prevent HOL blocking.</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-sctp">Message-Oriented</h4>
            <p className="text-xs text-muted-foreground">Preserves message boundaries unlike TCP.</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-sctp">Partial Reliability</h4>
            <p className="text-xs text-muted-foreground">Supports timed reliability (PR-SCTP).</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-sctp">Multi-Homing</h4>
            <p className="text-xs text-muted-foreground">Multiple IP paths for resilience.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SctpMetrics;
