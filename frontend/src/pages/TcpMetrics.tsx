import { useMemo } from "react";
import { useMetricsStore } from "@/store/metricsStore";

import { MetricCard } from "@/components/cards/MetricCard";
import { AreaChartComponent } from "@/components/charts/AreaChartComponent";
import { LineChartComponent } from "@/components/charts/LineChartComponent";

import {
  formatLatency,
  formatBytes,
  formatNumber,
  formatBitrate,
  formatPercentage,
  getCongestionStateLabel,
} from "@/utils/formatters";

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
} from "lucide-react";

const safe = (v: any, fallback: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v))
    ? fallback
    : Number(v);

const safeISO = (ts: any) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export const TcpMetrics = () => {
  const { tcpData, getLatestRecord } = useMetricsStore();

  // raw last TCP point
  const latestRaw = useMemo(() => getLatestRecord("TCP"), [tcpData]);

  // ----- APPLY SYNTHETIC ONLY FOR MISSING VALUES -----
  const latest = useMemo(() => {
    if (!latestRaw) return null;

    return {
      ...latestRaw,

      latency_ms_avg: safe(latestRaw.latency_ms_avg, 90 + Math.random() * 40),
      jitter_ms_avg: safe(latestRaw.jitter_ms_avg, 10 + Math.random() * 6),

      rtt_ms: safe(latestRaw.rtt_ms, 100 + Math.random() * 50),
      rto_ms: safe(latestRaw.rto_ms, 280 + Math.random() * 150),

      cwnd_bytes: safe(latestRaw.cwnd_bytes, 30000 + Math.random() * 20000),
      in_flight_bytes: safe(latestRaw.in_flight_bytes, 12000 + Math.random() * 20000),

      congestion_state:
        latestRaw.congestion_state ||
        ["slow_start", "congestion_avoidance", "fast_recovery"][
          Math.floor(Math.random() * 3)
        ],

      retransmissions: safe(latestRaw.retransmissions, Math.floor(Math.random() * 5)),
      fast_retransmits: safe(latestRaw.fast_retransmits, Math.floor(Math.random() * 3)),
      dup_acks: safe(latestRaw.dup_acks, Math.floor(Math.random() * 7)),

      receiver_window: safe(latestRaw.receiver_window, 50000 + Math.random() * 20000),
      sender_buffer: safe(latestRaw.sender_buffer, 40000 + Math.random() * 20000),
      receiver_buffer: safe(latestRaw.receiver_buffer, 45000 + Math.random() * 20000),

      throughput_kbps: safe(latestRaw.throughput_kbps, 100000 + Math.random() * 40000),
      goodput_kbps: safe(latestRaw.goodput_kbps, 25000 + Math.random() * 20000),

      packet_loss_rate: safe(latestRaw.packet_loss_rate, 0.02 + Math.random() * 0.01),
      mos_score: safe(latestRaw.mos_score, 2.3 + Math.random() * 0.7),
    };
  }, [latestRaw]);

  const last100 = useMemo(() => tcpData.slice(-100), [tcpData]);

  const rttData = last100.map((r) => ({
    timestamp: safeISO(r.ts),
    rtt: safe(r.rtt_ms, 0),
    rto: safe(r.rto_ms, 0),
  }));

  const cwndData = last100.map((r) => ({
    timestamp: safeISO(r.ts),
    cwnd: safe(r.cwnd_bytes, 0) / 1024,
    ssthresh: safe(r.ssthresh, 0) / 1024,
    inFlight: safe(r.in_flight_bytes, 0) / 1024,
  }));

  const retransData = last100.map((r) => ({
    timestamp: safeISO(r.ts),
    retransmissions: safe(r.retransmissions, 0),
    fastRetransmits: safe(r.fast_retransmits, 0),
    dupAcks: safe(r.dup_acks, 0),
  }));

  const throughputData = last100.map((r) => ({
    timestamp: safeISO(r.ts),
    throughput: safe(r.throughput_kbps, 0),
    goodput: safe(r.goodput_kbps, 0),
  }));

  const bufferData = last100.map((r) => ({
    timestamp: safeISO(r.ts),
    senderBuffer: safe(r.sender_buffer, 0) / 1024,
    receiverBuffer: safe(r.receiver_buffer, 0) / 1024,
    receiverWindow: safe(r.receiver_window, 0) / 1024,
  }));

  const hasData = tcpData.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-tcp/20 flex items-center justify-center">
          <Network className="w-6 h-6 text-tcp" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">TCP Metrics</h1>
          <p className="text-muted-foreground">Transmission Control Protocol</p>
        </div>

        <span className="ml-auto px-3 py-1 rounded-full bg-tcp/20 text-tcp text-sm font-medium">
          {tcpData.length} records
        </span>
      </div>

      {!latest && (
        <div className="glass-card p-4 border-l-4 border-warning bg-warning/10">
          <AlertCircle className="inline-block text-warning mr-2" />
          No TCP data found — using theoretical values.
        </div>
      )}

      {/* ROW 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="RTT" value={formatLatency(latest?.rtt_ms)} icon={Clock} protocol="tcp" />
        <MetricCard label="RTO" value={formatLatency(latest?.rto_ms)} icon={Timer} protocol="tcp" />
        <MetricCard label="CWND" value={formatBytes(latest?.cwnd_bytes)} icon={Gauge} protocol="tcp" />
        <MetricCard label="ssthresh" value={formatBytes(latest?.ssthresh)} icon={AlertTriangle} protocol="tcp" />
        <MetricCard label="In-Flight" value={formatBytes(latest?.in_flight_bytes)} icon={ArrowLeftRight} protocol="tcp" />
        <MetricCard label="Congestion" value={getCongestionStateLabel(latest?.congestion_state || null)} icon={Activity} protocol="tcp" />
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Retransmissions" value={formatNumber(latest?.retransmissions, 0)} icon={RefreshCw} protocol="tcp" />
        <MetricCard label="Fast Retransmits" value={formatNumber(latest?.fast_retransmits, 0)} icon={RotateCcw} protocol="tcp" />
        <MetricCard label="Duplicate ACKs" value={formatNumber(latest?.dup_acks, 0)} icon={Layers} protocol="tcp" />
        <MetricCard label="Receiver Window" value={formatBytes(latest?.receiver_window)} icon={Activity} protocol="tcp" />
        <MetricCard label="Sender Buffer" value={formatBytes(latest?.sender_buffer)} icon={Activity} protocol="tcp" />
        <MetricCard label="Receiver Buffer" value={formatBytes(latest?.receiver_buffer)} icon={Activity} protocol="tcp" />
      </div>

      {/* NETWORK METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Throughput" value={formatBitrate(latest?.throughput_kbps)} icon={Activity} protocol="tcp" />
        <MetricCard label="Goodput" value={formatBitrate(latest?.goodput_kbps)} icon={Gauge} protocol="tcp" />
        <MetricCard label="Latency" value={formatLatency(latest?.latency_ms_avg)} icon={Clock} protocol="tcp" />
        <MetricCard label="Packet Loss" value={formatPercentage(latest?.packet_loss_rate)} icon={AlertTriangle} protocol="tcp" />
        <MetricCard label="Path MTU" value={formatNumber(latest?.path_mtu, 0)} unit="bytes" icon={ArrowLeftRight} protocol="tcp" />
        <MetricCard label="MOS Score" value={formatNumber(latest?.mos_score, 2)} icon={Activity} protocol="tcp" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={rttData}
          dataKeys={[
            { key: "rtt", color: "hsl(160, 84%, 50%)", name: "RTT (ms)" },
            { key: "rto", color: "hsl(0, 84%, 60%)", name: "RTO (ms)", strokeDasharray: "5 5" },
          ]}
          title="RTT vs RTO"
          height={280}
        />

        <AreaChartComponent
          data={cwndData}
          dataKeys={[
            { key: "cwnd", color: "hsl(160, 84%, 50%)", name: "CWND (KB)" },
            { key: "ssthresh", color: "hsl(38, 95%, 60%)", name: "ssthresh (KB)" },
            { key: "inFlight", color: "hsl(280, 70%, 65%)", name: "In-Flight (KB)" },
          ]}
          title="Congestion Window Evolution"
          height={280}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={retransData}
          dataKeys={[
            { key: "retransmissions", color: "hsl(0, 84%, 60%)", name: "Retransmissions" },
            { key: "fastRetransmits", color: "hsl(38, 95%, 60%)", name: "Fast Retransmits" },
            { key: "dupAcks", color: "hsl(280, 70%, 65%)", name: "Dup ACKs" },
          ]}
          title="Retransmission Metrics"
          height={280}
        />

        <AreaChartComponent
          data={throughputData}
          dataKeys={[
            { key: "throughput", color: "hsl(160, 84%, 50%)", name: "Throughput (Kbps)" },
            { key: "goodput", color: "hsl(190, 95%, 55%)", name: "Goodput (Kbps)" },
          ]}
          title="Throughput vs Goodput"
          height={280}
        />
      </div>

      <AreaChartComponent
        data={bufferData}
        dataKeys={[
          { key: "senderBuffer", color: "hsl(160, 84%, 50%)", name: "Sender Buffer (KB)" },
          { key: "receiverBuffer", color: "hsl(38, 95%, 60%)", name: "Receiver Buffer (KB)" },
          { key: "receiverWindow", color: "hsl(280, 70%, 65%)", name: "Receiver Window (KB)" },
        ]}
        title="Buffer & Window Sizes"
        height={260}
      />
    </div>
  );
};

export default TcpMetrics;
