import { useState } from 'react';
import { useMetricsStore } from '@/store/metricsStore';
import { formatBitrate, formatLatency, formatPercentage, formatNumber, formatBytes } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import {
  FileDown,
  FileText,
  Download,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ReportExport = () => {
  const { rawData, getAggregatedMetrics } = useMetricsStore();
  const [generating, setGenerating] = useState(false);

  const udpMetrics = getAggregatedMetrics('UDP');
  const tcpMetrics = getAggregatedMetrics('TCP');
  const sctpMetrics = getAggregatedMetrics('SCTP');

  const generateReport = () => {
    setGenerating(true);

    const report = `
TRANSPORT PROTOCOL METRICS REPORT
Generated: ${new Date().toISOString()}
Total Records: ${rawData.length}

================================================================================
EXECUTIVE SUMMARY
================================================================================

This report provides a comprehensive analysis of transport protocol performance
metrics comparing UDP, TCP, and SCTP protocols.

================================================================================
UDP METRICS SUMMARY
================================================================================
Average Bitrate:        ${formatBitrate(udpMetrics.avgBitrate)}
Average Throughput:     ${formatBitrate(udpMetrics.avgThroughput)}
Average Goodput:        ${formatBitrate(udpMetrics.avgGoodput)}
Average Latency:        ${formatLatency(udpMetrics.avgLatency)}
Average Jitter:         ${formatLatency(udpMetrics.avgJitter)}
Packet Loss Rate:       ${formatPercentage(udpMetrics.avgPacketLoss)}
Average Encode Time:    ${formatLatency(udpMetrics.avgEncodeTime)}
Average Decode Time:    ${formatLatency(udpMetrics.avgDecodeTime)}
Average CPU Usage:      ${formatPercentage(udpMetrics.avgCpu)}
Average Memory Usage:   ${formatPercentage(udpMetrics.avgMem)}
MOS Score:              ${formatNumber(udpMetrics.avgMos, 2)}
Total Bytes Sent:       ${formatBytes(udpMetrics.totalBytesSent)}
Total Bytes Received:   ${formatBytes(udpMetrics.totalBytesRecv)}

================================================================================
TCP METRICS SUMMARY
================================================================================
Average Bitrate:        ${formatBitrate(tcpMetrics.avgBitrate)}
Average Throughput:     ${formatBitrate(tcpMetrics.avgThroughput)}
Average Goodput:        ${formatBitrate(tcpMetrics.avgGoodput)}
Average Latency:        ${formatLatency(tcpMetrics.avgLatency)}
Average Jitter:         ${formatLatency(tcpMetrics.avgJitter)}
Packet Loss Rate:       ${formatPercentage(tcpMetrics.avgPacketLoss)}
Average RTT:            ${formatLatency(tcpMetrics.avgRtt)}
Average CWND:           ${formatBytes(tcpMetrics.avgCwnd)}
Retransmissions:        ${formatNumber(tcpMetrics.avgRetransmissions, 1)}
Average CPU Usage:      ${formatPercentage(tcpMetrics.avgCpu)}
Average Memory Usage:   ${formatPercentage(tcpMetrics.avgMem)}
MOS Score:              ${formatNumber(tcpMetrics.avgMos, 2)}

================================================================================
SCTP METRICS SUMMARY
================================================================================
Average Bitrate:        ${formatBitrate(sctpMetrics.avgBitrate)}
Average Throughput:     ${formatBitrate(sctpMetrics.avgThroughput)}
Average Goodput:        ${formatBitrate(sctpMetrics.avgGoodput)}
Average Latency:        ${formatLatency(sctpMetrics.avgLatency)}
Average Jitter:         ${formatLatency(sctpMetrics.avgJitter)}
Packet Loss Rate:       ${formatPercentage(sctpMetrics.avgPacketLoss)}
Average RTT:            ${formatLatency(sctpMetrics.avgRtt)}
Retransmissions:        ${formatNumber(sctpMetrics.avgRetransmissions, 1)}
Average CPU Usage:      ${formatPercentage(sctpMetrics.avgCpu)}
Average Memory Usage:   ${formatPercentage(sctpMetrics.avgMem)}
MOS Score:              ${formatNumber(sctpMetrics.avgMos, 2)}

================================================================================
COMPARATIVE ANALYSIS
================================================================================

LATENCY COMPARISON:
- UDP:  ${formatLatency(udpMetrics.avgLatency)} (Lowest - no reliability overhead)
- TCP:  ${formatLatency(tcpMetrics.avgLatency)} (Higher due to ACK wait times)
- SCTP: ${formatLatency(sctpMetrics.avgLatency)} (Moderate - multi-streaming helps)

THROUGHPUT COMPARISON:
- UDP:  ${formatBitrate(udpMetrics.avgThroughput)} (Highest - minimal headers)
- TCP:  ${formatBitrate(tcpMetrics.avgThroughput)} (Lower due to congestion control)
- SCTP: ${formatBitrate(sctpMetrics.avgThroughput)} (Moderate efficiency)

RELIABILITY COMPARISON:
- UDP:  No reliability (${formatPercentage(udpMetrics.avgPacketLoss)} loss)
- TCP:  Full reliability (${formatNumber(tcpMetrics.avgRetransmissions, 1)} retransmits)
- SCTP: Configurable (${formatNumber(sctpMetrics.avgRetransmissions, 1)} retransmits)

================================================================================
RECOMMENDATIONS
================================================================================

1. For REAL-TIME APPLICATIONS (VoIP, Gaming, Live Streaming):
   → Prefer UDP for lowest latency
   → Accept occasional packet loss
   → Use application-level FEC if needed

2. For RELIABLE DATA TRANSFER (File Transfer, Web):
   → Use TCP for guaranteed delivery
   → Accept higher latency
   → Built-in congestion control

3. For MULTIMEDIA APPLICATIONS (WebRTC, Video Conferencing):
   → Consider SCTP for multi-streaming
   → Partial reliability for time-sensitive data
   → No head-of-line blocking between streams

================================================================================
END OF REPORT
================================================================================
`;

    setTimeout(() => {
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `protocol-metrics-report-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerating(false);
      
      toast({
        title: "Report Generated",
        description: "Your report has been downloaded successfully.",
      });
    }, 1500);
  };

  const exportJSON = () => {
    const data = {
      generated: new Date().toISOString(),
      totalRecords: rawData.length,
      summary: {
        udp: udpMetrics,
        tcp: tcpMetrics,
        sctp: sctpMetrics,
      },
      rawData: rawData.slice(-1000), // Last 1000 records
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "JSON Exported",
      description: "Raw data has been exported successfully.",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <FileDown className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Export Report</h1>
          <p className="text-muted-foreground">Generate and download metrics reports</p>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Text Report */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Text Report</h3>
              <p className="text-sm text-muted-foreground">Comprehensive analysis document</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Executive summary</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Protocol metrics comparison</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Performance analysis</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Recommendations</span>
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={generating}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        {/* JSON Export */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-sctp/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-sctp" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">JSON Data Export</h3>
              <p className="text-sm text-muted-foreground">Raw data for further analysis</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Aggregated metrics</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Last 1000 raw records</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Machine-readable format</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>Import into other tools</span>
            </div>
          </div>

          <Button
            onClick={exportJSON}
            variant="outline"
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4">Report Preview</h3>
        <div className="bg-muted/30 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-muted-foreground">
{`TRANSPORT PROTOCOL METRICS REPORT
Generated: ${new Date().toISOString()}
Total Records: ${rawData.length}

UDP METRICS SUMMARY
-------------------
Average Bitrate:     ${formatBitrate(udpMetrics.avgBitrate)}
Average Latency:     ${formatLatency(udpMetrics.avgLatency)}
Packet Loss Rate:    ${formatPercentage(udpMetrics.avgPacketLoss)}
MOS Score:           ${formatNumber(udpMetrics.avgMos, 2)}

TCP METRICS SUMMARY
-------------------
Average Bitrate:     ${formatBitrate(tcpMetrics.avgBitrate)}
Average Latency:     ${formatLatency(tcpMetrics.avgLatency)}
Average RTT:         ${formatLatency(tcpMetrics.avgRtt)}

SCTP METRICS SUMMARY
--------------------
Average Bitrate:     ${formatBitrate(sctpMetrics.avgBitrate)}
Average Latency:     ${formatLatency(sctpMetrics.avgLatency)}
Average RTT:         ${formatLatency(sctpMetrics.avgRtt)}

...`}
          </pre>
        </div>
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">UDP Records</div>
          <div className="text-2xl font-bold font-mono text-udp">
            {rawData.filter(r => r.protocol === 'UDP').length}
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">TCP Records</div>
          <div className="text-2xl font-bold font-mono text-tcp">
            {rawData.filter(r => r.protocol === 'TCP').length}
          </div>
        </div>
        <div className="glass-card rounded-xl p-5">
          <div className="text-sm text-muted-foreground mb-1">SCTP Records</div>
          <div className="text-2xl font-bold font-mono text-sctp">
            {rawData.filter(r => r.protocol === 'SCTP').length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
