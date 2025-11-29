import { useMetricsStore } from '@/store/metricsStore';
import { LineChartComponent } from '@/components/charts/LineChartComponent';
import { BarChartComponent } from '@/components/charts/BarChartComponent';
import { formatBitrate, formatLatency, formatPercentage, formatNumber, formatBytes } from '@/utils/formatters';
import { GitCompare, Info } from 'lucide-react';

export const ProtocolComparison = () => {
  const { rawData, getAggregatedMetrics } = useMetricsStore();

  const udpMetrics = getAggregatedMetrics('UDP');
  const tcpMetrics = getAggregatedMetrics('TCP');
  const sctpMetrics = getAggregatedMetrics('SCTP');

  // Prepare comparison data for bar chart
  const comparisonMetrics = [
    { name: 'Bitrate (Kbps)', UDP: udpMetrics.avgBitrate, TCP: tcpMetrics.avgBitrate, SCTP: sctpMetrics.avgBitrate },
    { name: 'Goodput (Kbps)', UDP: udpMetrics.avgGoodput, TCP: tcpMetrics.avgGoodput, SCTP: sctpMetrics.avgGoodput },
    { name: 'Latency (ms)', UDP: udpMetrics.avgLatency, TCP: tcpMetrics.avgLatency, SCTP: sctpMetrics.avgLatency },
    { name: 'Jitter (ms)', UDP: udpMetrics.avgJitter, TCP: tcpMetrics.avgJitter, SCTP: sctpMetrics.avgJitter },
    { name: 'Packet Loss (%)', UDP: udpMetrics.avgPacketLoss, TCP: tcpMetrics.avgPacketLoss, SCTP: sctpMetrics.avgPacketLoss },
    { name: 'Encode Time (ms)', UDP: udpMetrics.avgEncodeTime, TCP: tcpMetrics.avgEncodeTime, SCTP: sctpMetrics.avgEncodeTime },
    { name: 'Decode Time (ms)', UDP: udpMetrics.avgDecodeTime, TCP: tcpMetrics.avgDecodeTime, SCTP: sctpMetrics.avgDecodeTime },
    { name: 'CPU (%)', UDP: udpMetrics.avgCpu, TCP: tcpMetrics.avgCpu, SCTP: sctpMetrics.avgCpu },
    { name: 'Memory (%)', UDP: udpMetrics.avgMem, TCP: tcpMetrics.avgMem, SCTP: sctpMetrics.avgMem },
  ];

  // Prepare time series comparison
  const last50 = rawData.slice(-150);
  const bitrateTimeSeries = last50.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.bitrate_kbps || 0 : null,
    TCP: r.protocol === 'TCP' ? r.bitrate_kbps || 0 : null,
    SCTP: r.protocol === 'SCTP' ? r.bitrate_kbps || 0 : null,
  }));

  const latencyTimeSeries = last50.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.latency_ms_avg || 0 : null,
    TCP: r.protocol === 'TCP' ? r.latency_ms_avg || 0 : null,
    SCTP: r.protocol === 'SCTP' ? r.latency_ms_avg || 0 : null,
  }));

  const lossTimeSeries = last50.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.packet_loss_rate || 0 : null,
    TCP: r.protocol === 'TCP' ? r.packet_loss_rate || 0 : null,
    SCTP: r.protocol === 'SCTP' ? r.packet_loss_rate || 0 : null,
  }));

  const cpuTimeSeries = last50.map((r) => ({
    timestamp: r.ts,
    UDP: r.protocol === 'UDP' ? r.cpu_pct || 0 : null,
    TCP: r.protocol === 'TCP' ? r.cpu_pct || 0 : null,
    SCTP: r.protocol === 'SCTP' ? r.cpu_pct || 0 : null,
  }));

  // Comparison table data
  const tableData = [
    { metric: 'Avg Bitrate', udp: formatBitrate(udpMetrics.avgBitrate), tcp: formatBitrate(tcpMetrics.avgBitrate), sctp: formatBitrate(sctpMetrics.avgBitrate) },
    { metric: 'Avg Goodput', udp: formatBitrate(udpMetrics.avgGoodput), tcp: formatBitrate(tcpMetrics.avgGoodput), sctp: formatBitrate(sctpMetrics.avgGoodput) },
    { metric: 'Avg Latency', udp: formatLatency(udpMetrics.avgLatency), tcp: formatLatency(tcpMetrics.avgLatency), sctp: formatLatency(sctpMetrics.avgLatency) },
    { metric: 'Avg Jitter', udp: formatLatency(udpMetrics.avgJitter), tcp: formatLatency(tcpMetrics.avgJitter), sctp: formatLatency(sctpMetrics.avgJitter) },
    { metric: 'Packet Loss', udp: formatPercentage(udpMetrics.avgPacketLoss), tcp: formatPercentage(tcpMetrics.avgPacketLoss), sctp: formatPercentage(sctpMetrics.avgPacketLoss) },
    { metric: 'Frame Loss', udp: formatPercentage(udpMetrics.avgFrameLoss), tcp: formatPercentage(tcpMetrics.avgFrameLoss), sctp: formatPercentage(sctpMetrics.avgFrameLoss) },
    { metric: 'Encode Time', udp: formatLatency(udpMetrics.avgEncodeTime), tcp: formatLatency(tcpMetrics.avgEncodeTime), sctp: formatLatency(sctpMetrics.avgEncodeTime) },
    { metric: 'Decode Time', udp: formatLatency(udpMetrics.avgDecodeTime), tcp: formatLatency(tcpMetrics.avgDecodeTime), sctp: formatLatency(sctpMetrics.avgDecodeTime) },
    { metric: 'Reassembly Time', udp: formatLatency(udpMetrics.avgReassemblyTime), tcp: formatLatency(tcpMetrics.avgReassemblyTime), sctp: formatLatency(sctpMetrics.avgReassemblyTime) },
    { metric: 'Avg RTT', udp: 'N/A', tcp: formatLatency(tcpMetrics.avgRtt), sctp: formatLatency(sctpMetrics.avgRtt) },
    { metric: 'Avg CWND', udp: 'N/A', tcp: formatBytes(tcpMetrics.avgCwnd), sctp: formatBytes(sctpMetrics.avgCwnd) },
    { metric: 'Retransmissions', udp: 'N/A', tcp: formatNumber(tcpMetrics.avgRetransmissions, 1), sctp: formatNumber(sctpMetrics.avgRetransmissions, 1) },
    { metric: 'CPU Usage', udp: formatPercentage(udpMetrics.avgCpu), tcp: formatPercentage(tcpMetrics.avgCpu), sctp: formatPercentage(sctpMetrics.avgCpu) },
    { metric: 'Memory Usage', udp: formatPercentage(udpMetrics.avgMem), tcp: formatPercentage(tcpMetrics.avgMem), sctp: formatPercentage(sctpMetrics.avgMem) },
    { metric: 'MOS Score', udp: formatNumber(udpMetrics.avgMos, 2), tcp: formatNumber(tcpMetrics.avgMos, 2), sctp: formatNumber(sctpMetrics.avgMos, 2) },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <GitCompare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Protocol Comparison</h1>
          <p className="text-muted-foreground">Side-by-side analysis of UDP, TCP, and SCTP</p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Metrics Comparison Table</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metric</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-udp uppercase tracking-wide">UDP</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-tcp uppercase tracking-wide">TCP</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-sctp uppercase tracking-wide">SCTP</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={row.metric} className={i % 2 === 0 ? 'bg-card' : 'bg-muted/10'}>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{row.metric}</td>
                  <td className="px-4 py-3 text-sm text-center font-mono text-udp">{row.udp}</td>
                  <td className="px-4 py-3 text-sm text-center font-mono text-tcp">{row.tcp}</td>
                  <td className="px-4 py-3 text-sm text-center font-mono text-sctp">{row.sctp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={bitrateTimeSeries.filter(d => d.UDP || d.TCP || d.SCTP)}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="Bitrate Comparison (Kbps)"
          height={280}
        />
        <LineChartComponent
          data={latencyTimeSeries.filter(d => d.UDP || d.TCP || d.SCTP)}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="Latency Comparison (ms)"
          height={280}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={lossTimeSeries.filter(d => d.UDP || d.TCP || d.SCTP)}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="Packet Loss Comparison (%)"
          height={280}
        />
        <LineChartComponent
          data={cpuTimeSeries.filter(d => d.UDP || d.TCP || d.SCTP)}
          dataKeys={[
            { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
            { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
            { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
          ]}
          title="CPU Usage Comparison (%)"
          height={280}
        />
      </div>

      {/* Bar Chart Comparison */}
      <BarChartComponent
        data={comparisonMetrics.slice(0, 5)}
        dataKeys={[
          { key: 'UDP', color: 'hsl(190, 95%, 55%)', name: 'UDP' },
          { key: 'TCP', color: 'hsl(160, 84%, 50%)', name: 'TCP' },
          { key: 'SCTP', color: 'hsl(38, 95%, 60%)', name: 'SCTP' },
        ]}
        title="Key Metrics Comparison"
        height={300}
      />

      {/* Protocol Characteristics */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Protocol Characteristics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3 p-4 rounded-lg bg-udp/5 border border-udp/20">
            <h4 className="font-semibold text-udp flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-udp" />
              UDP
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Lowest latency - no handshake</li>
              <li>• No reliability guarantees</li>
              <li>• No congestion control</li>
              <li>• Best for real-time applications</li>
              <li>• Packet loss is acceptable</li>
              <li>• No head-of-line blocking</li>
            </ul>
          </div>
          <div className="space-y-3 p-4 rounded-lg bg-tcp/5 border border-tcp/20">
            <h4 className="font-semibold text-tcp flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-tcp" />
              TCP
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Guaranteed delivery</li>
              <li>• Ordered packet delivery</li>
              <li>• Built-in congestion control</li>
              <li>• Higher latency (retransmissions)</li>
              <li>• Head-of-line blocking</li>
              <li>• Best for reliable data transfer</li>
            </ul>
          </div>
          <div className="space-y-3 p-4 rounded-lg bg-sctp/5 border border-sctp/20">
            <h4 className="font-semibold text-sctp flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sctp" />
              SCTP
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Multi-streaming support</li>
              <li>• Message-oriented (not byte stream)</li>
              <li>• Partial reliability option (PR-SCTP)</li>
              <li>• Multi-homing for fault tolerance</li>
              <li>• No stream head-of-line blocking</li>
              <li>• Best compromise for multimedia</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtocolComparison;
