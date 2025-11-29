import { useMetricsStore } from "@/store/metricsStore";
import { MetricCard } from "@/components/cards/MetricCard";
import { ProtocolCard } from "@/components/cards/ProtocolCard";
import { AreaChartComponent } from "@/components/charts/AreaChartComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";

import {
  formatBytes,
  formatBitrate,
  formatLatency,
  formatPercentage,
  formatNumber,
} from "@/utils/formatters";

import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Cpu,
  Wifi,
  BarChart3,
} from "lucide-react";

// Safe timestamp conversion (fix INVALID DATE)
const safeISO = (ts: any) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

export const Overview = () => {
  const { rawData, udpData, tcpData, sctpData, getAggregatedMetrics } =
    useMetricsStore();

  const udp = getAggregatedMetrics("UDP");
  const tcp = getAggregatedMetrics("TCP");
  const sctp = getAggregatedMetrics("SCTP");

  // -------- TOTALS ----------
  const totalBytesSent = udp.totalBytesSent + tcp.totalBytesSent + sctp.totalBytesSent;
  const totalBytesRecv = udp.totalBytesRecv + tcp.totalBytesRecv + sctp.totalBytesRecv;

  const avgBitrate = (udp.avgBitrate + tcp.avgBitrate + sctp.avgBitrate) / 3;
  const avgLatency = (udp.avgLatency + tcp.avgLatency + sctp.avgLatency) / 3;
  const avgJitter = (udp.avgJitter + tcp.avgJitter + sctp.avgJitter) / 3;
  const avgPacketLoss = (udp.avgPacketLoss + tcp.avgPacketLoss + sctp.avgPacketLoss) / 3;

  const avgCpu = (udp.avgCpu + tcp.avgCpu + sctp.avgCpu) / 3;
  const avgMos = udp.avgMos || tcp.avgMos || sctp.avgMos || 0;

  // -------- SMOOTH CHART DATA ----------
  const last50 = rawData.slice(-50);

  const bitrateData = last50.map((r) => ({
    timestamp: safeISO(r.ts),
    UDP: r.protocol === "UDP" ? r.bitrate_kbps || 0 : 0,
    TCP: r.protocol === "TCP" ? r.bitrate_kbps || 0 : 0,
    SCTP: r.protocol === "SCTP" ? r.bitrate_kbps || 0 : 0,
  }));

  const latencyData = last50.map((r) => ({
    timestamp: safeISO(r.ts),
    UDP: r.protocol === "UDP" ? r.latency_ms_avg || 0 : 0,
    TCP: r.protocol === "TCP" ? r.latency_ms_avg || 0 : 0,
    SCTP: r.protocol === "SCTP" ? r.latency_ms_avg || 0 : 0,
  }));

  const systemData = last50.map((r) => ({
    timestamp: safeISO(r.ts),
    cpu: r.cpu_pct || 0,
    memory: r.mem_pct || 0,
  }));

  // PIE chart
  const trafficData = [
    { name: "UDP", value: udpData.length, color: "hsl(190, 95%, 55%)" },
    { name: "TCP", value: tcpData.length || 1, color: "hsl(160, 84%, 50%)" },
    { name: "SCTP", value: sctpData.length || 1, color: "hsl(38, 95%, 60%)" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Real-time transport protocol analytics
        </p>
      </div>

      {/* KEY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <MetricCard label="Bytes Sent" value={formatBytes(totalBytesSent)} icon={Activity} />
        <MetricCard label="Bytes Recv" value={formatBytes(totalBytesRecv)} icon={Activity} />
        <MetricCard label="Avg Bitrate" value={formatBitrate(avgBitrate)} icon={Zap} />
        <MetricCard label="Avg Latency" value={formatLatency(avgLatency)} icon={Clock} />
        <MetricCard label="Avg Jitter" value={formatLatency(avgJitter)} icon={Wifi} />
        <MetricCard label="Packet Loss" value={formatPercentage(avgPacketLoss)} icon={AlertTriangle} />
        <MetricCard label="CPU Usage" value={formatPercentage(avgCpu)} icon={Cpu} />
        <MetricCard label="MOS Score" value={formatNumber(avgMos, 2)} icon={BarChart3} />
      </div>

      {/* PROTOCOL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProtocolCard
          protocol="UDP"
          isActive={udpData.length > 0}
          metrics={{
            bitrate: formatBitrate(udp.avgBitrate),
            latency: formatLatency(udp.avgLatency),
            loss: formatPercentage(udp.avgPacketLoss),
            mos: formatNumber(udp.avgMos, 2),
          }}
        />

        <ProtocolCard
          protocol="TCP"
          isActive={tcpData.length > 0}
          metrics={{
            bitrate: formatBitrate(tcp.avgBitrate),
            latency: formatLatency(tcp.avgLatency),
            loss: formatPercentage(tcp.avgPacketLoss),
            mos: formatNumber(tcp.avgMos, 2),
          }}
        />

        <ProtocolCard
          protocol="SCTP"
          isActive={sctpData.length > 0}
          metrics={{
            bitrate: formatBitrate(sctp.avgBitrate),
            latency: formatLatency(sctp.avgLatency),
            loss: formatPercentage(sctp.avgPacketLoss),
            mos: formatNumber(sctp.avgMos, 2),
          }}
        />
      </div>

      {/* TOP CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={bitrateData}
          dataKeys={[
            { key: "UDP", color: "hsl(190, 95%, 55%)", name: "UDP" },
            { key: "TCP", color: "hsl(160, 84%, 50%)", name: "TCP" },
            { key: "SCTP", color: "hsl(38, 95%, 60%)", name: "SCTP" },
          ]}
          title="Bitrate Over Time"
          height={280}
        />

        <AreaChartComponent
          data={latencyData}
          dataKeys={[
            { key: "UDP", color: "hsl(190, 95%, 55%)", name: "UDP" },
            { key: "TCP", color: "hsl(160, 84%, 50%)", name: "TCP" },
            { key: "SCTP", color: "hsl(38, 95%, 60%)", name: "SCTP" },
          ]}
          title="Latency Over Time"
          height={280}
        />
      </div>

      {/* PIE + SYSTEM CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PieChartComponent
          data={trafficData}
          title="Traffic Distribution"
          height={250}
          innerRadius={50}
          outerRadius={80}
        />

        <div className="lg:col-span-2">
          <AreaChartComponent
            data={systemData}
            dataKeys={[
              { key: "cpu", color: "hsl(280, 70%, 65%)", name: "CPU %" },
              { key: "memory", color: "hsl(340, 75%, 60%)", name: "Memory %" },
            ]}
            title="System Resources"
            height={250}
          />
        </div>
      </div>
    </div>
  );
};

export default Overview;
