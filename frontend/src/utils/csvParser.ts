import Papa from 'papaparse';
import { MetricRecord, Protocol, CongestionState } from '@/types/metrics';

const parseNumber = (value: string | number | undefined | null): number | null => {
  if (value === undefined || value === null || value === '' || value === 'N/A') {
    return null;
  }
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? null : num;
};

const parseProtocol = (value: string | undefined): Protocol => {
  const upper = (value || '').toUpperCase();
  if (upper === 'TCP') return 'TCP';
  if (upper === 'SCTP') return 'SCTP';
  return 'UDP';
};

const parseCongestionState = (value: string | undefined): CongestionState | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes('slow')) return 'slow_start';
  if (lower.includes('avoidance')) return 'congestion_avoidance';
  if (lower.includes('recovery')) return 'fast_recovery';
  if (lower.includes('idle')) return 'idle';
  return null;
};

export const parseMetricsCSV = async (csvContent: string): Promise<MetricRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const records: MetricRecord[] = results.data.map((row: any) => ({
            ts: row.ts || new Date().toISOString(),
            protocol: parseProtocol(row.protocol),
            role: row.role || 'both',
            
            // Traffic Counters
            bytes_sent: parseNumber(row.bytes_sent),
            bytes_recv: parseNumber(row.bytes_recv),
            segments_sent: parseNumber(row.segments_sent),
            segments_recv: parseNumber(row.segments_recv),
            frames_sent: parseNumber(row.frames_sent),
            frames_recv: parseNumber(row.frames_recv),
            frames_dropped: parseNumber(row.frames_dropped),
            segment_drops: parseNumber(row.segment_drops),
            
            // Timing Metrics
            encode_ms_avg: parseNumber(row.encode_ms_avg),
            decode_ms_avg: parseNumber(row.decode_ms_avg),
            reassembly_ms_avg: parseNumber(row.reassembly_ms_avg),
            
            // Network Metrics
            latency_ms_avg: parseNumber(row.latency_ms_avg),
            jitter_ms_avg: parseNumber(row.jitter_ms_avg),
            packet_loss_rate: parseNumber(row.packet_loss_rate),
            frame_loss_rate: parseNumber(row.frame_loss_rate),
            segment_loss_rate: parseNumber(row.segment_loss_rate),
            throughput_kbps: parseNumber(row.throughput_kbps) || calculateThroughput(row),
            goodput_kbps: parseNumber(row.goodput_kbps),
            bitrate_kbps: parseNumber(row.bitrate_kbps) || calculateBitrate(row),
            
            // Congestion/Transport Metrics
            rtt_ms: parseNumber(row.rtt_ms),
            rto_ms: parseNumber(row.rto_ms),
            cwnd_bytes: parseNumber(row.cwnd_bytes),
            ssthresh: parseNumber(row.ssthresh),
            congestion_state: parseCongestionState(row.congestion_state),
            retransmissions: parseNumber(row.retransmissions),
            fast_retransmits: parseNumber(row.fast_retransmits),
            dup_acks: parseNumber(row.dup_acks),
            in_flight_bytes: parseNumber(row.in_flight_bytes),
            receiver_window: parseNumber(row.receiver_window),
            sender_buffer: parseNumber(row.sender_buffer),
            receiver_buffer: parseNumber(row.receiver_buffer),
            path_mtu: parseNumber(row.path_mtu),
            
            // QoS Metrics
            mos_score: parseNumber(row.mos_score),
            psnr: parseNumber(row.psnr),
            ssim: parseNumber(row.ssim),
            
            // Audio Metrics
            audio_packet_loss_rate: parseNumber(row.audio_packet_loss_rate),
            audio_jitter_ms: parseNumber(row.audio_jitter_ms),
            audio_latency_ms: parseNumber(row.audio_latency_ms),
            audio_bitrate: parseNumber(row.audio_bitrate),
            audio_levels: parseNumber(row.audio_levels),
            
            // System Metrics
            cpu_pct: parseNumber(row.cpu_pct),
            mem_pct: parseNumber(row.mem_pct),
            proc_cpu_pct: parseNumber(row.proc_cpu_pct),
            proc_mem_pct: parseNumber(row.proc_mem_pct),
            network_queue_tx: parseNumber(row.network_queue_tx),
            network_queue_rx: parseNumber(row.network_queue_rx),
            disk_io_kbps: parseNumber(row.disk_io_kbps),
            
            // SCTP specific
            stream_id: parseNumber(row.stream_id),
            heartbeat_rtt: parseNumber(row.heartbeat_rtt),
            sack_count: parseNumber(row.sack_count),
            association_state: row.association_state || null,
          }));
          
          resolve(records);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
};

// Helper functions for computed metrics
const calculateThroughput = (row: any): number | null => {
  const bytesSent = parseNumber(row.bytes_sent);
  if (bytesSent === null) return null;
  // Assuming 1 second intervals, convert bytes to kbps
  return (bytesSent * 8) / 1000;
};

const calculateBitrate = (row: any): number | null => {
  const throughput = parseNumber(row.throughput_kbps);
  if (throughput !== null) return throughput;
  return calculateThroughput(row);
};

export const fetchMetricsCSV = async (url: string): Promise<MetricRecord[]> => {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.statusText}`);
    }
    const csvContent = await response.text();
    return parseMetricsCSV(csvContent);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    throw error;
  }
};
