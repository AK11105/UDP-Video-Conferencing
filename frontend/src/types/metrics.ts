export type Protocol = 'UDP' | 'TCP' | 'SCTP';
export type Role = 'sender' | 'receiver' | 'both';
export type CongestionState = 'slow_start' | 'congestion_avoidance' | 'fast_recovery' | 'idle';

export interface MetricRecord {
  ts: string;
  protocol: Protocol;
  role: Role;
  
  // Traffic Counters
  bytes_sent: number | null;
  bytes_recv: number | null;
  segments_sent: number | null;
  segments_recv: number | null;
  frames_sent: number | null;
  frames_recv: number | null;
  frames_dropped: number | null;
  segment_drops: number | null;
  
  // Timing Metrics
  encode_ms_avg: number | null;
  decode_ms_avg: number | null;
  reassembly_ms_avg: number | null;
  
  // Network Metrics
  latency_ms_avg: number | null;
  jitter_ms_avg: number | null;
  packet_loss_rate: number | null;
  frame_loss_rate: number | null;
  segment_loss_rate: number | null;
  throughput_kbps: number | null;
  goodput_kbps: number | null;
  bitrate_kbps: number | null;
  
  // Congestion/Transport Metrics (TCP/SCTP specific)
  rtt_ms: number | null;
  rto_ms: number | null;
  cwnd_bytes: number | null;
  ssthresh: number | null;
  congestion_state: CongestionState | null;
  retransmissions: number | null;
  fast_retransmits: number | null;
  dup_acks: number | null;
  in_flight_bytes: number | null;
  receiver_window: number | null;
  sender_buffer: number | null;
  receiver_buffer: number | null;
  path_mtu: number | null;
  
  // QoS Metrics
  mos_score: number | null;
  psnr: number | null;
  ssim: number | null;
  
  // Audio Metrics
  audio_packet_loss_rate: number | null;
  audio_jitter_ms: number | null;
  audio_latency_ms: number | null;
  audio_bitrate: number | null;
  audio_levels: number | null;
  
  // System Metrics
  cpu_pct: number | null;
  mem_pct: number | null;
  proc_cpu_pct: number | null;
  proc_mem_pct: number | null;
  network_queue_tx: number | null;
  network_queue_rx: number | null;
  disk_io_kbps: number | null;
  
  // SCTP specific
  stream_id?: number | null;
  heartbeat_rtt?: number | null;
  sack_count?: number | null;
  association_state?: string | null;
}

export interface AggregatedMetrics {
  protocol: Protocol;
  avgBitrate: number;
  avgThroughput: number;
  avgGoodput: number;
  avgLatency: number;
  avgJitter: number;
  avgPacketLoss: number;
  avgFrameLoss: number;
  avgSegmentLoss: number;
  avgEncodeTime: number;
  avgDecodeTime: number;
  avgReassemblyTime: number;
  avgRtt: number;
  avgCwnd: number;
  avgRetransmissions: number;
  avgCpu: number;
  avgMem: number;
  totalBytesSent: number;
  totalBytesRecv: number;
  totalFramesSent: number;
  totalFramesRecv: number;
  avgMos: number;
  avgPsnr: number;
  avgSsim: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  protocol?: Protocol;
}

export interface ProtocolComparison {
  metric: string;
  udp: number | null;
  tcp: number | null;
  sctp: number | null;
  unit: string;
}
