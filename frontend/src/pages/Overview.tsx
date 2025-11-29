import { useMetricsStore } from '@/store/metricsStore';
import { MetricCard } from '@/components/cards/MetricCard';
import { ProtocolCard } from '@/components/cards/ProtocolCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { PieChartComponent } from '@/components/charts/PieChartComponent';
import { formatBytes, formatBitrate, formatLatency, formatPercentage, formatNumber } from '@/utils/formatters';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Cpu,
  HardDrive,
  Wifi,
  BarChart3,
} from 'lucide-react';

export const Overview = () => {
  const { rawData, udpData, tcpData, sctpData, getAggregatedMetrics } = useMetricsStore();

  const udpMetrics = getAggregatedMetrics('UDP');
  const tcpMetrics = getAggregatedMetrics('TCP');
  const sctpMetrics = getAggregatedMetrics('SCTP');

  // Calculate totals
  const totalBytesSent = udpMetrics.totalBytesSent + tcpMetrics.totalBytesSent + sctpMetrics.totalBytesSent;
  const totalBytesRecv = udpMetrics.totalBytesRecv + tcpMetrics.totalBytesRecv + sctpMetrics.totalBytesRecv;
  const avgBitrate = (udpMetrics.avgBitrate + tcpMetrics.avgBitrate + sctpMetrics.avgBitrate) / 3;
  const avgLatency = (udpMetrics.avgLatency + tcpMetrics.avgLatency + sctpMetrics.avgLatency) / 3;
  const avgJitter = (udpMetrics.avgJitter + tcpMetrics.avgJitter + sctpMetrics.avgJitter) / 3;
  const avgPacketLoss = (udpMetrics.avgPacketLoss + tcpMetrics.avgPacketLoss + sctpMetrics.avgPacketLoss) / 3;
  const avgCpu = (udpMetrics.avgCpu + tcpMetrics.avgCpu + sctpMetrics.avgCpu) / 3;
  const avgMem = (udpMetrics.avgMem + tcpMetrics.avgMem + sctpMetrics.avgMem) / 3;
  const avgMos = udpMetrics.avgMos || tcpMetrics.avgMos || sctpMetrics.avgMos;

  // Prepare time series data for charts
  const last50Records = rawData.slice(-50);
  const bitrateData = last50Records.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.bitrate_kbps || 0 : 0,
    TCP: r.protocol === 'TCP' ? r.bitrate_kbps || 0 : 0,
    SCTP: r.protocol === 'SCTP' ? r.bitrate_kbps || 0 : 0,
  }));

  const latencyData = last50Records.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.latency_ms_avg || 0 : 0,
    TCP: r.protocol === 'TCP' ? r.latency_ms_avg || 0 : 0,
    SCTP: r.protocol === 'SCTP' ? r.latency_ms_avg || 0 : 0,
  }));

  // Traffic distribution pie chart
  const trafficData = [
    { name: 'UDP', value: udpData.length, color: 'hsl(190, 95%, 55%)' },
    { name: 'TCP', value: tcpData.length || 1, color: 'hsl(160, 84%, 50%)' },
    { name: 'SCTP', value: sctpData.length || 1, color: 'hsl(38, 95%, 60%)' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Real-time transport protocol metrics</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <MetricCard
          label="Bytes Sent"
          value={formatBytes(totalBytesSent)}
          icon={Activity}
        />
        <MetricCard
          label="Bytes Recv"
          value={formatBytes(totalBytesRecv)}
          icon={Activity}
        />
        <MetricCard
          label="Avg Bitrate"
          value={formatBitrate(avgBitrate)}
          icon={Zap}
        />
        <MetricCard
          label="Avg Latency"
          value={formatLatency(avgLatency)}
          icon={Clock}
        />
        <MetricCard
          label="Avg Jitter"
          value={formatLatency(avgJitter)}
          icon={Wifi}
        />
        <MetricCard
          label="Packet Loss"
          value={formatPercentage(avgPacketLoss)}
          icon={AlertTriangle}
        />
        <MetricCard
          label="CPU Usage"
          value={formatPercentage(avgCpu)}
          icon={Cpu}
        />
        <MetricCard
          label="MOS Score"
          value={formatNumber(avgMos, 1)}
          icon={BarChart3}
        />
      </div>

      {/* Protocol Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProtocolCard
          protocol="UDP"
          metrics={{
            bitrate: formatBitrate(udpMetrics.avgBitrate),
            latency: formatLatency(udpMetrics.avgLatency),
            loss: formatPercentage(udpMetrics.avgPacketLoss),
            mos: formatNumber(udpMetrics.avgMos, 2),
          }}
          isActive={udpData.length > 0}
        />
        <ProtocolCard
          protocol="TCP"
          metrics={{
            bitrate: formatBitrate(tcpMetrics.avgBitrate),
            latency: formatLatency(tcpMetrics.avgLatency),
            loss: formatPercentage(tcpMetrics.avgPacketLoss),
            mos: formatNumber(tcpMetrics.avgMos, 2),
          }}
          isActive={tcpData.length > 0}
        />
        <ProtocolCard
          protocol="SCTP"
          metrics={{
            bitrate: formatBitrate(sctpMetrics.avgBitrate),
            latency: formatLatency(sctpMetrics.avgLatency),
            loss: formatPercentage(sctpMetrics.avgPacketLoss),
            mos: formatNumber(sctpMetrics.avgMos, 2),
          }}
          isActive={sctpData.length > 0}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={bitrateData}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="Bitrate Over Time (Kbps)"
          height={280}
        />
        <AreaChartComponent
          data={latencyData}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="Latency Over Time (ms)"
          height={280}
        />
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PieChartComponent
          data={trafficData}
          title="Traffic by Protocol"
          height={250}
          innerRadius={50}
          outerRadius={80}
        />
        <div className="lg:col-span-2">
          <AreaChartComponent
            data={last50Records.map((r) => ({
              timestamp: r.ts,
              cpu: r.cpu_pct || 0,
              memory: r.mem_pct || 0,
            }))}
            dataKeys={[
              { key: 'cpu', color: 'hsl(280, 70%, 65%)', name: 'CPU %' },
              { key: 'memory', color: 'hsl(340, 75%, 60%)', name: 'Memory %' },
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
