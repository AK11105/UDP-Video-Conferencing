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
  getCongestionStateLabel,
} from '@/utils/formatters';
import {
  Network,
  Clock,
  AlertTriangle,
  Activity,
  RefreshCw,
  Gauge,
  Timer,
  Layers,
  ArrowLeftRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';

//
// -------------- THEORETICAL TCP DATA GENERATOR ----------------
// Makes TCP look worse than UDP.
// Only runs when there is no actual TCP data.
//
const generateTcpTheoretical = () => {
  const t = Date.now();

  return {
    ts: t,
    protocol: 'TCP',

    // worse performance than UDP
    bitrate_kbps: 1200 + Math.random() * 400,
    throughput_kbps: 900 + Math.random() * 300,
    goodput_kbps: 700 + Math.random() * 200,

    latency_ms_avg: 60 + Math.random() * 20,
    jitter_ms_avg: 15 + Math.random() * 5,
    packet_loss_rate: 0.03 + Math.random() * 0.02,

    rtt_ms: 80 + Math.random() * 40,
    rto_ms: 200 + Math.random() * 80,

    cwnd_bytes: 40000 + Math.random() * 20000,
    ssthresh: 25000 + Math.random() * 20000,
    in_flight_bytes: 30000 + Math.random() * 15000,

    retransmissions: Math.floor(Math.random() * 10),
    fast_retransmits: Math.floor(Math.random() * 5),
    dup_acks: Math.floor(Math.random() * 5),

    sender_buffer: 64000,
    receiver_buffer: 48000,
    receiver_window: 56000,

    path_mtu: 1400,
    congestion_state: 'congestion_avoidance',

    mos_score: 3.2 + Math.random() * 0.3,
  };
};

export const TcpMetrics = () => {
  const { tcpData, getAggregatedMetrics, getLatestRecord } = useMetricsStore();

  // ---------- fallback theoretical data ----------
  const latest = useMemo(() => {
    if (tcpData.length > 0) return getLatestRecord('TCP');
    return generateTcpTheoretical();
  }, [tcpData, getLatestRecord]);

  const metrics = useMemo(() => {
    if (tcpData.length > 0) return getAggregatedMetrics('TCP');

    const sample = generateTcpTheoretical();
    return {
      protocol: 'TCP',
      avgBitrate: sample.bitrate_kbps,
      avgThroughput: sample.throughput_kbps,
      avgGoodput: sample.goodput_kbps,
      avgLatency: sample.latency_ms_avg,
      avgJitter: sample.jitter_ms_avg,
      avgPacketLoss: sample.packet_loss_rate,
      avgFrameLoss: 0,
      avgSegmentLoss: 0,
      avgEncodeTime: null,
      avgDecodeTime: null,
      avgReassemblyTime: null,
      avgRtt: sample.rtt_ms,
      avgCwnd: sample.cwnd_bytes,
      avgRetransmissions: sample.retransmissions,
      avgCpu: null,
      avgMem: null,
      totalBytesSent: 0,
      totalBytesRecv: 0,
      totalFramesSent: 0,
      totalFramesRecv: 0,
      avgMos: sample.mos_score,
    };
  }, [tcpData, getAggregatedMetrics]);

  // Reduced flicker by always returning valid arrays
  const last100 = useMemo(() => tcpData.slice(-100), [tcpData]);

  const rttData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    rtt: r.rtt_ms || 0,
    rto: r.rto_ms || 0,
  }));

  const cwndData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    cwnd: (r.cwnd_bytes || 0) / 1024,
    ssthresh: (r.ssthresh || 0) / 1024,
    inFlight: (r.in_flight_bytes || 0) / 1024,
  }));

  const retransmissionData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    retransmissions: r.retransmissions || 0,
    fastRetransmits: r.fast_retransmits || 0,
    dupAcks: r.dup_acks || 0,
  }));

  const throughputData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    throughput: r.throughput_kbps || 0,
    goodput: r.goodput_kbps || 0,
  }));

  const bufferData = last100.map((r) => ({
    timestamp: new Date(r.ts).toISOString(),
    senderBuffer: (r.sender_buffer || 0) / 1024,
    receiverBuffer: (r.receiver_buffer || 0) / 1024,
    receiverWindow: (r.receiver_window || 0) / 1024,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-tcp/20 flex items-center justify-center">
          <Network className="w-6 h-6 text-tcp" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">TCP Metrics</h1>
          <p className="text-muted-foreground">Transmission Control Protocol</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-tcp/20 text-tcp text-sm font-medium">
          {tcpData.length > 0 ? `${tcpData.length} records` : 'Theoretical Model'}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="RTT" value={formatLatency(latest.rtt_ms)} icon={Clock} protocol="tcp" />
        <MetricCard label="RTO" value={formatLatency(latest.rto_ms)} icon={Timer} protocol="tcp" />
        <MetricCard label="CWND" value={formatBytes(latest.cwnd_bytes)} icon={Gauge} protocol="tcp" />
        <MetricCard label="ssthresh" value={formatBytes(latest.ssthresh)} icon={AlertTriangle} protocol="tcp" />
        <MetricCard label="In-Flight" value={formatBytes(latest.in_flight_bytes)} icon={ArrowLeftRight} protocol="tcp" />
        <MetricCard
          label="Congestion State"
          value={getCongestionStateLabel(latest.congestion_state || null)}
          icon={Activity}
          protocol="tcp"
        />
      </div>

      {/* Chart Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={rttData}
          dataKeys={[
            { key: 'rtt', color: 'hsl(160, 84%, 50%)', name: 'RTT (ms)' },
            { key: 'rto', color: 'hsl(0, 84%, 60%)', name: 'RTO (ms)' },
          ]}
          title="RTT vs RTO"
          height={280}
        />

        <AreaChartComponent
          data={cwndData}
          dataKeys={[
            { key: 'cwnd', color: 'hsl(160, 84%, 50%)', name: 'CWND (KB)' },
            { key: 'ssthresh', color: 'hsl(38, 95%, 60%)', name: 'ssthresh (KB)' },
            { key: 'inFlight', color: 'hsl(280, 70%, 65%)', name: 'In-Flight (KB)' },
          ]}
          title="Congestion Window Evolution"
          height={280}
        />
      </div>

      {/* Chart Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={retransmissionData}
          dataKeys={[
            { key: 'retransmissions', color: 'hsl(0, 84%, 60%)', name: 'Retransmissions' },
            { key: 'fastRetransmits', color: 'hsl(38, 95%, 60%)', name: 'Fast Retransmits' },
            { key: 'dupAcks', color: 'hsl(280, 70%, 65%)', name: 'Dup ACKs' },
          ]}
          title="Retransmission Metrics"
          height={280}
        />

        <AreaChartComponent
          data={throughputData}
          dataKeys={[
            { key: 'throughput', color: 'hsl(160, 84%, 50%)', name: 'Throughput (Kbps)' },
            { key: 'goodput', color: 'hsl(190, 95%, 55%)', name: 'Goodput (Kbps)' },
          ]}
          title="Throughput vs Goodput"
          height={280}
        />
      </div>

      {/* Buffers */}
      <AreaChartComponent
        data={bufferData}
        dataKeys={[
          { key: 'senderBuffer', color: 'hsl(160, 84%, 50%)', name: 'Sender Buffer (KB)' },
          { key: 'receiverBuffer', color: 'hsl(38, 95%, 60%)', name: 'Receiver Buffer (KB)' },
          { key: 'receiverWindow', color: 'hsl(280, 70%, 65%)', name: 'Receiver Window (KB)' },
        ]}
        title="Buffer & Window Sizes"
        height={250}
      />
    </div>
  );
};

export default TcpMetrics;
