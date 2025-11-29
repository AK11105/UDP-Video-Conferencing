import { useMetricsStore } from '@/store/metricsStore';
import { MetricCard } from '@/components/cards/MetricCard';
import { AreaChartComponent } from '@/components/charts/AreaChartComponent';
import { LineChartComponent } from '@/components/charts/LineChartComponent';
import { formatPercentage, formatNumber } from '@/utils/formatters';
import {
  Activity,
  Cpu,
  HardDrive,
  Network,
  AlertTriangle,
  Server,
  Database,
  Wifi,
} from 'lucide-react';

export const SystemHealth = () => {
  const { rawData, getLatestRecord } = useMetricsStore();

  const latest = getLatestRecord('UDP') || getLatestRecord('TCP') || getLatestRecord('SCTP');
  const last100 = rawData.slice(-100);

  // CPU & Memory data
  const systemData = last100.map((r) => ({
    timestamp: r.ts,
    cpu: r.cpu_pct || 0,
    memory: r.mem_pct || 0,
    procCpu: r.proc_cpu_pct || 0,
    procMem: r.proc_mem_pct || 0,
  }));

  // Network queue data
  const queueData = last100.map((r) => ({
    timestamp: r.ts,
    txQueue: r.network_queue_tx || 0,
    rxQueue: r.network_queue_rx || 0,
  }));

  // Disk I/O data
  const diskData = last100.map((r) => ({
    timestamp: r.ts,
    diskIo: r.disk_io_kbps || 0,
  }));

  // Packet drops data
  const dropsData = last100.map((r) => ({
    timestamp: r.ts,
    framesDropped: r.frames_dropped || 0,
    segmentDrops: r.segment_drops || 0,
  }));

  // Calculate health status
  const cpuHealth = (latest?.cpu_pct || 0) < 70 ? 'healthy' : (latest?.cpu_pct || 0) < 90 ? 'warning' : 'critical';
  const memHealth = (latest?.mem_pct || 0) < 70 ? 'healthy' : (latest?.mem_pct || 0) < 90 ? 'warning' : 'critical';

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getHealthBg = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-success/20';
      case 'warning': return 'bg-warning/20';
      case 'critical': return 'bg-destructive/20';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
          <p className="text-muted-foreground">Resource utilization and system metrics</p>
        </div>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`glass-card rounded-xl p-5 ${getHealthBg(cpuHealth)}`}>
          <div className="flex items-center justify-between mb-3">
            <Cpu className={`w-8 h-8 ${getHealthColor(cpuHealth)}`} />
            <span className={`text-xs font-semibold uppercase ${getHealthColor(cpuHealth)}`}>
              {cpuHealth}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">{formatPercentage(latest?.cpu_pct)}</div>
          <div className="text-sm text-muted-foreground">System CPU</div>
        </div>

        <div className={`glass-card rounded-xl p-5 ${getHealthBg(memHealth)}`}>
          <div className="flex items-center justify-between mb-3">
            <HardDrive className={`w-8 h-8 ${getHealthColor(memHealth)}`} />
            <span className={`text-xs font-semibold uppercase ${getHealthColor(memHealth)}`}>
              {memHealth}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono">{formatPercentage(latest?.mem_pct)}</div>
          <div className="text-sm text-muted-foreground">Memory Usage</div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono">{formatPercentage(latest?.proc_cpu_pct)}</div>
          <div className="text-sm text-muted-foreground">Process CPU</div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono">{formatPercentage(latest?.proc_mem_pct)}</div>
          <div className="text-sm text-muted-foreground">Process Memory</div>
        </div>
      </div>

      {/* Resource Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          label="TX Queue"
          value={formatNumber(latest?.network_queue_tx, 0)}
          icon={Network}
        />
        <MetricCard
          label="RX Queue"
          value={formatNumber(latest?.network_queue_rx, 0)}
          icon={Network}
        />
        <MetricCard
          label="Disk I/O"
          value={formatNumber(latest?.disk_io_kbps, 0)}
          unit="KB/s"
          icon={HardDrive}
        />
        <MetricCard
          label="Frames Dropped"
          value={formatNumber(latest?.frames_dropped, 0)}
          icon={AlertTriangle}
        />
        <MetricCard
          label="Segment Drops"
          value={formatNumber(latest?.segment_drops, 0)}
          icon={AlertTriangle}
        />
        <MetricCard
          label="Path MTU"
          value={formatNumber(latest?.path_mtu, 0)}
          unit="bytes"
          icon={Wifi}
        />
      </div>

      {/* CPU & Memory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={systemData}
          dataKeys={[
            { key: 'cpu', color: 'hsl(280, 70%, 65%)', name: 'System CPU' },
            { key: 'procCpu', color: 'hsl(190, 95%, 55%)', name: 'Process CPU' },
          ]}
          title="CPU Usage (%)"
          height={280}
        />
        <AreaChartComponent
          data={systemData}
          dataKeys={[
            { key: 'memory', color: 'hsl(340, 75%, 60%)', name: 'System Memory' },
            { key: 'procMem', color: 'hsl(38, 95%, 60%)', name: 'Process Memory' },
          ]}
          title="Memory Usage (%)"
          height={280}
        />
      </div>

      {/* Network & I/O Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AreaChartComponent
          data={queueData}
          dataKeys={[
            { key: 'txQueue', color: 'hsl(190, 95%, 55%)', name: 'TX Queue' },
            { key: 'rxQueue', color: 'hsl(160, 84%, 50%)', name: 'RX Queue' },
          ]}
          title="Network Queue Lengths"
          height={280}
        />
        <LineChartComponent
          data={diskData}
          dataKeys={[
            { key: 'diskIo', color: 'hsl(38, 95%, 60%)', name: 'Disk I/O (KB/s)' },
          ]}
          title="Disk I/O"
          height={280}
        />
      </div>

      {/* Packet Drops */}
      <AreaChartComponent
        data={dropsData}
        dataKeys={[
          { key: 'framesDropped', color: 'hsl(0, 84%, 60%)', name: 'Frames Dropped' },
          { key: 'segmentDrops', color: 'hsl(38, 95%, 60%)', name: 'Segment Drops' },
        ]}
        title="Packet Drops"
        height={220}
      />

      {/* System Health Guidelines */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Health Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-success">Healthy</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• CPU &lt; 70%</li>
              <li>• Memory &lt; 70%</li>
              <li>• Queue length &lt; 100</li>
              <li>• Minimal drops</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-warning">Warning</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• CPU 70-90%</li>
              <li>• Memory 70-90%</li>
              <li>• Queue length 100-500</li>
              <li>• Occasional drops</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive">Critical</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• CPU &gt; 90%</li>
              <li>• Memory &gt; 90%</li>
              <li>• Queue length &gt; 500</li>
              <li>• Frequent drops</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
