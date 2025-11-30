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
} from '@/utils/formatters';
import {
  Zap,
  Clock,
  AlertTriangle,
  Activity,
  Radio,
  Volume2,
  Gauge,
  Timer,
  Layers,
} from 'lucide-react';

// defensive timestamp -> always returns valid ISO string
const safeISO = (ts: any) => {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export const UdpMetrics = () => {
  const { udpData, getLatestRecord } = useMetricsStore();

  // Latest record (safe)
  const latest = useMemo(() => getLatestRecord('UDP'), [udpData]);

  // Keep last 100 valid records only
  const last100 = useMemo(() => {
    if (!Array.isArray(udpData)) return [];
    return udpData
      .filter((r) => r && (r.ts)) // simple existence check
      .slice(-100);
  }, [udpData]);

  const bitrateData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        bitrate: r.bitrate_kbps || 0,
        throughput: r.throughput_kbps || 0,
        goodput: r.goodput_kbps || 0,
      })),
    [last100]
  );

  const timingData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        encode: r.encode_ms_avg || 0,
        decode: r.decode_ms_avg || 0,
        reassembly: r.reassembly_ms_avg || 0,
      })),
    [last100]
  );

  const networkData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        latency: r.latency_ms_avg || 0,
        jitter: r.jitter_ms_avg || 0,
      })),
    [last100]
  );

  const lossData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        packet: r.packet_loss_rate || 0,
        frame: r.frame_loss_rate || 0,
        segment: r.segment_loss_rate || 0,
      })),
    [last100]
  );

  const audioData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        latency: r.audio_latency_ms || 0,
        jitter: r.audio_jitter_ms || 0,
        loss: (r.audio_packet_loss_rate || 0) * 10,
      })),
    [last100]
  );

  const systemData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        cpu: r.cpu_pct || 0,
        memory: r.mem_pct || 0,
        procCpu: r.proc_cpu_pct || 0,
      })),
    [last100]
  );

  const queueData = useMemo(
    () =>
      last100.map((r) => ({
        timestamp: safeISO(r.ts),
        tx: r.network_queue_tx || 0,
        rx: r.network_queue_rx || 0,
      })),
    [last100]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-udp/20 flex items-center justify-center">
          <Radio className="w-6 h-6 text-udp" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">UDP Metrics</h1>
          <p className="text-muted-foreground">User Datagram Protocol – Real-time Transport</p>
        </div>
        <span className="ml-auto px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
          {udpData?.length ?? 0} records
        </span>
      </div>

      {/* Key Metrics Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Bitrate" value={formatBitrate(latest?.bitrate_kbps)} icon={Zap} protocol="udp" />
        <MetricCard label="Throughput" value={formatBitrate(latest?.throughput_kbps)} icon={Activity} protocol="udp" />
        <MetricCard label="Goodput" value={formatBitrate(latest?.goodput_kbps)} icon={Gauge} protocol="udp" />
        <MetricCard label="Latency" value={formatLatency(latest?.latency_ms_avg)} icon={Clock} protocol="udp" />
        <MetricCard label="Jitter" value={formatLatency(latest?.jitter_ms_avg)} icon={Activity} protocol="udp" />
        <MetricCard label="Packet Loss" value={formatPercentage(latest?.packet_loss_rate)} icon={AlertTriangle} protocol="udp" />
      </div>

      {/* Key Metrics Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Encode Time" value={formatLatency(latest?.encode_ms_avg)} icon={Timer} protocol="udp" />
        <MetricCard label="Decode Time" value={formatLatency(latest?.decode_ms_avg)} icon={Timer} protocol="udp" />
        <MetricCard label="Reassembly" value={formatLatency(latest?.reassembly_ms_avg)} icon={Layers} protocol="udp" />
        <MetricCard label="MOS Score" value={formatNumber(latest?.mos_score, 2)} icon={Activity} protocol="udp" />
        <MetricCard label="PSNR" value={formatNumber(latest?.psnr, 1)} unit="dB" icon={Activity} protocol="udp" />
        <MetricCard label="SSIM" value={formatNumber(latest?.ssim, 3)} icon={Activity} protocol="udp" />
      </div>

      {/* Audio Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard label="Audio Latency" value={formatLatency(latest?.audio_latency_ms)} icon={Volume2} protocol="udp" />
        <MetricCard label="Audio Jitter" value={formatLatency(latest?.audio_jitter_ms)} icon={Volume2} protocol="udp" />
        <MetricCard label="Audio Loss" value={formatPercentage(latest?.audio_packet_loss_rate)} icon={Volume2} protocol="udp" />
        <MetricCard label="Audio Bitrate" value={formatNumber(latest?.audio_bitrate, 0)} unit="kbps" icon={Volume2} protocol="udp" />
        <MetricCard label="Audio Levels" value={formatNumber(latest?.audio_levels, 1)} unit="dB" icon={Volume2} protocol="udp" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={bitrateData}
          dataKeys={[
            { key: 'bitrate', color: 'hsl(190, 95%, 55%)', name: 'Bitrate' },
            { key: 'throughput', color: 'hsl(200, 95%, 65%)', name: 'Throughput' },
            { key: 'goodput', color: 'hsl(180, 95%, 45%)', name: 'Goodput' },
          ]}
          title="Bandwidth Metrics (Kbps)"
          height={280}
        />

        <AreaChartComponent
          data={timingData}
          dataKeys={[
            { key: 'encode', color: 'hsl(280, 70%, 65%)', name: 'Encode' },
            { key: 'decode', color: 'hsl(340, 75%, 60%)', name: 'Decode' },
            { key: 'reassembly', color: 'hsl(38, 95%, 60%)', name: 'Reassembly' },
          ]}
          title="Processing Times (ms)"
          height={280}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={networkData}
          dataKeys={[
            { key: 'latency', color: 'hsl(190, 95%, 55%)', name: 'Latency' },
            { key: 'jitter', color: 'hsl(340, 75%, 60%)', name: 'Jitter' },
          ]}
          title="Latency & Jitter (ms)"
          height={280}
        />

        <AreaChartComponent
          data={lossData}
          dataKeys={[
            { key: 'packet', color: 'hsl(0, 84%, 60%)', name: 'Packet Loss' },
            { key: 'frame', color: 'hsl(38, 95%, 60%)', name: 'Frame Loss' },
            { key: 'segment', color: 'hsl(280, 70%, 65%)', name: 'Segment Loss' },
          ]}
          title="Loss Rates (%)"
          height={280}
        />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineChartComponent
          data={audioData}
          dataKeys={[
            { key: 'latency', color: 'hsl(190, 95%, 55%)', name: 'Audio Latency' },
            { key: 'jitter', color: 'hsl(160, 84%, 50%)', name: 'Audio Jitter' },
            { key: 'loss', color: 'hsl(0, 84%, 60%)', name: 'Audio Loss (x10)' },
          ]}
          title="Audio Metrics"
          height={280}
        />

        <AreaChartComponent
          data={systemData}
          dataKeys={[
            { key: 'cpu', color: 'hsl(280, 70%, 65%)', name: 'System CPU' },
            { key: 'memory', color: 'hsl(340, 75%, 60%)', name: 'Memory' },
            { key: 'procCpu', color: 'hsl(38, 95%, 60%)', name: 'Process CPU' },
          ]}
          title="CPU & Memory (%)"
          height={280}
        />
      </div>

      {/* Network Queue Chart */}
      <AreaChartComponent
        data={queueData}
        dataKeys={[
          { key: 'tx', color: 'hsl(190, 95%, 55%)', name: 'TX Queue' },
          { key: 'rx', color: 'hsl(160, 84%, 50%)', name: 'RX Queue' },
        ]}
        title="Network Queue Lengths"
        height={220}
      />
    </div>
  );
};

export default UdpMetrics;
