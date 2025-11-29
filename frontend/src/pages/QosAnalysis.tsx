import { useMetricsStore } from '@/store/metricsStore';
import { MetricCard } from '@/components/cards/MetricCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { LineChartComponent } from '@/components/charts/LineChartComponent';
import { formatNumber, formatLatency, formatPercentage, getQualityLabel, getQualityColor } from '@/utils/formatters';
import {
  BarChart3,
  Volume2,
  MonitorPlay,
  Star,
  Signal,
  Gauge,
  Activity,
} from 'lucide-react';

export const QosAnalysis = () => {
  const { rawData, udpData, getLatestRecord, getAggregatedMetrics } = useMetricsStore();

  const udpLatest = getLatestRecord('UDP');
  const udpMetrics = getAggregatedMetrics('UDP');

  const last100 = rawData.slice(-100);

  // MOS Score data
  const mosData = last100.map((r) => ({
    timestamp: r.ts,
    mos: r.mos_score || 0,
  }));

  // PSNR/SSIM data
  const qualityData = last100.map((r) => ({
    timestamp: r.ts,
    psnr: r.psnr || 0,
    ssim: (r.ssim || 0) * 40, // Scale SSIM for visibility
  }));

  // Audio quality metrics
  const audioData = last100.map((r) => ({
    timestamp: r.ts,
    latency: r.audio_latency_ms || 0,
    jitter: r.audio_jitter_ms || 0,
    loss: (r.audio_packet_loss_rate || 0) * 100,
  }));

  // Network quality correlation
  const networkQualityData = last100.map((r) => ({
    timestamp: r.ts,
    latency: r.latency_ms_avg || 0,
    mos: (r.mos_score || 0) * 10, // Scale for visibility
    loss: (r.packet_loss_rate || 0) * 100,
  }));

  const currentMos = udpLatest?.mos_score || 0;
  const mosLabel = getQualityLabel(currentMos);
  const mosColor = getQualityColor(currentMos);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">QoS Analysis</h1>
          <p className="text-muted-foreground">Quality of Service metrics and analysis</p>
        </div>
      </div>

      {/* Quality Score Overview */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Overall Quality Assessment</h3>
            <p className="text-muted-foreground text-sm">Based on MOS, PSNR, and SSIM metrics</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold font-mono ${mosColor}`}>
              {formatNumber(currentMos, 2)}
            </div>
            <div className={`text-sm font-medium ${mosColor}`}>{mosLabel}</div>
          </div>
        </div>

        {/* Quality Scale */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
          <div className="h-3 rounded-full bg-gradient-to-r from-destructive via-warning to-success relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-foreground border-2 border-background shadow-lg transition-all"
              style={{ left: `${Math.min(Math.max((currentMos - 1) / 4 * 100, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1.0</span>
            <span>2.5</span>
            <span>3.5</span>
            <span>5.0</span>
          </div>
        </div>
      </div>

      {/* Key QoS Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          label="MOS Score"
          value={formatNumber(udpLatest?.mos_score, 2)}
          icon={Star}
        />
        <MetricCard
          label="PSNR"
          value={formatNumber(udpLatest?.psnr, 1)}
          unit="dB"
          icon={Signal}
        />
        <MetricCard
          label="SSIM"
          value={formatNumber(udpLatest?.ssim, 3)}
          icon={Gauge}
        />
        <MetricCard
          label="Audio Latency"
          value={formatLatency(udpLatest?.audio_latency_ms)}
          icon={Volume2}
        />
        <MetricCard
          label="Audio Jitter"
          value={formatLatency(udpLatest?.audio_jitter_ms)}
          icon={Volume2}
        />
        <MetricCard
          label="Audio Loss"
          value={formatPercentage(udpLatest?.audio_packet_loss_rate)}
          icon={Volume2}
        />
      </div>

      {/* Video Quality Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={mosData}
          dataKeys={[
            { key: 'mos', color: 'hsl(160, 84%, 50%)', name: 'MOS Score' },
          ]}
          title="Mean Opinion Score (MOS) Over Time"
          height={280}
        />
        <LineChartComponent
          data={qualityData}
          dataKeys={[
            { key: 'psnr', color: 'hsl(190, 95%, 55%)', name: 'PSNR (dB)' },
            { key: 'ssim', color: 'hsl(38, 95%, 60%)', name: 'SSIM (scaled)' },
          ]}
          title="Video Quality Metrics"
          height={280}
        />
      </div>

      {/* Audio Quality Metrics */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Audio Quality Analysis
        </h3>
        <LineChartComponent
          data={audioData}
          dataKeys={[
            { key: 'latency', color: 'hsl(190, 95%, 55%)', name: 'Latency (ms)' },
            { key: 'jitter', color: 'hsl(38, 95%, 60%)', name: 'Jitter (ms)' },
            { key: 'loss', color: 'hsl(0, 84%, 60%)', name: 'Loss (%)' },
          ]}
          title=""
          height={250}
        />
      </div>

      {/* Network Quality Correlation */}
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-4 text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Network Quality vs User Experience
        </h3>
        <LineChartComponent
          data={networkQualityData}
          dataKeys={[
            { key: 'latency', color: 'hsl(190, 95%, 55%)', name: 'Latency (ms)' },
            { key: 'mos', color: 'hsl(160, 84%, 50%)', name: 'MOS (x10)' },
            { key: 'loss', color: 'hsl(0, 84%, 60%)', name: 'Loss (%)' },
          ]}
          title=""
          height={250}
        />
      </div>

      {/* QoS Thresholds Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">MOS Score Guidelines</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-success">Excellent (4.3-5.0)</span>
              <span className="text-muted-foreground">HD quality</span>
            </div>
            <div className="flex justify-between">
              <span className="text-success">Good (4.0-4.3)</span>
              <span className="text-muted-foreground">Acceptable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warning">Fair (3.6-4.0)</span>
              <span className="text-muted-foreground">Noticeable issues</span>
            </div>
            <div className="flex justify-between">
              <span className="text-destructive">Poor (3.1-3.6)</span>
              <span className="text-muted-foreground">Annoying</span>
            </div>
            <div className="flex justify-between">
              <span className="text-destructive">Bad (&lt;3.1)</span>
              <span className="text-muted-foreground">Unusable</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MonitorPlay className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Video Quality (PSNR)</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-success">&gt;40 dB</span>
              <span className="text-muted-foreground">Excellent</span>
            </div>
            <div className="flex justify-between">
              <span className="text-success">35-40 dB</span>
              <span className="text-muted-foreground">Good</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warning">30-35 dB</span>
              <span className="text-muted-foreground">Acceptable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-destructive">&lt;30 dB</span>
              <span className="text-muted-foreground">Poor</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Audio Quality Thresholds</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-success">Latency &lt;150ms</span>
              <span className="text-muted-foreground">Conversational</span>
            </div>
            <div className="flex justify-between">
              <span className="text-warning">Latency 150-300ms</span>
              <span className="text-muted-foreground">Acceptable</span>
            </div>
            <div className="flex justify-between">
              <span className="text-success">Jitter &lt;30ms</span>
              <span className="text-muted-foreground">Good</span>
            </div>
            <div className="flex justify-between">
              <span className="text-success">Loss &lt;1%</span>
              <span className="text-muted-foreground">Imperceptible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QosAnalysis;
