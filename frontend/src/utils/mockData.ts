// import { MetricRecord, Protocol } from '@/types/metrics';

// // Generate realistic mock data for demonstration
// export const generateMockData = (count: number = 100): MetricRecord[] => {
//   const records: MetricRecord[] = [];
//   const now = Date.now();
  
//   for (let i = 0; i < count; i++) {
//     const timestamp = new Date(now - (count - i) * 1000).toISOString();
    
//     // Generate UDP data (main protocol with all metrics)
//     records.push(generateUdpRecord(timestamp, i));
    
//     // Generate some TCP data (theoretical)
//     if (i % 3 === 0) {
//       records.push(generateTcpRecord(timestamp, i));
//     }
    
//     // Generate some SCTP data (theoretical)
//     if (i % 5 === 0) {
//       records.push(generateSctpRecord(timestamp, i));
//     }
//   }
  
//   return records;
// };

// const randomInRange = (min: number, max: number): number => {
//   return Math.random() * (max - min) + min;
// };

// const addNoise = (base: number, variance: number): number => {
//   return base + (Math.random() - 0.5) * variance;
// };

// const generateUdpRecord = (timestamp: string, index: number): MetricRecord => {
//   const baseLatency = 15 + Math.sin(index / 20) * 5;
//   const baseJitter = 2 + Math.sin(index / 10) * 1;
//   const baseBitrate = 2500 + Math.sin(index / 15) * 500;
  
//   return {
//     ts: timestamp,
//     protocol: 'UDP',
//     role: 'both',
    
//     bytes_sent: Math.floor(randomInRange(300000, 400000)),
//     bytes_recv: Math.floor(randomInRange(280000, 380000)),
//     segments_sent: Math.floor(randomInRange(200, 300)),
//     segments_recv: Math.floor(randomInRange(190, 290)),
//     frames_sent: Math.floor(randomInRange(25, 35)),
//     frames_recv: Math.floor(randomInRange(24, 34)),
//     frames_dropped: Math.floor(randomInRange(0, 2)),
//     segment_drops: Math.floor(randomInRange(0, 5)),
    
//     encode_ms_avg: addNoise(8, 2),
//     decode_ms_avg: addNoise(6, 1.5),
//     reassembly_ms_avg: addNoise(4, 1),
    
//     latency_ms_avg: addNoise(baseLatency, 3),
//     jitter_ms_avg: addNoise(baseJitter, 0.5),
//     packet_loss_rate: addNoise(0.5, 0.3),
//     frame_loss_rate: addNoise(0.3, 0.2),
//     segment_loss_rate: addNoise(0.4, 0.25),
//     throughput_kbps: addNoise(baseBitrate * 0.95, 100),
//     goodput_kbps: addNoise(baseBitrate * 0.9, 100),
//     bitrate_kbps: addNoise(baseBitrate, 150),
    
//     rtt_ms: null,
//     rto_ms: null,
//     cwnd_bytes: null,
//     ssthresh: null,
//     congestion_state: null,
//     retransmissions: null,
//     fast_retransmits: null,
//     dup_acks: null,
//     in_flight_bytes: null,
//     receiver_window: null,
//     sender_buffer: null,
//     receiver_buffer: null,
//     path_mtu: 1500,
    
//     mos_score: addNoise(4.2, 0.3),
//     psnr: addNoise(38, 3),
//     ssim: addNoise(0.95, 0.02),
    
//     audio_packet_loss_rate: addNoise(0.3, 0.2),
//     audio_jitter_ms: addNoise(1.5, 0.5),
//     audio_latency_ms: addNoise(12, 2),
//     audio_bitrate: addNoise(128, 20),
//     audio_levels: addNoise(-20, 5),
    
//     cpu_pct: addNoise(35, 10),
//     mem_pct: addNoise(45, 8),
//     proc_cpu_pct: addNoise(25, 8),
//     proc_mem_pct: addNoise(30, 5),
//     network_queue_tx: Math.floor(randomInRange(0, 50)),
//     network_queue_rx: Math.floor(randomInRange(0, 40)),
//     disk_io_kbps: addNoise(500, 200),
//   };
// };

// const generateTcpRecord = (timestamp: string, index: number): MetricRecord => {
//   const baseRtt = 50 + Math.sin(index / 25) * 15;
//   const baseCwnd = 65536 + Math.sin(index / 20) * 20000;
//   const baseBitrate = 2200 + Math.sin(index / 18) * 400;
  
//   return {
//     ts: timestamp,
//     protocol: 'TCP',
//     role: 'both',
    
//     bytes_sent: Math.floor(randomInRange(280000, 360000)),
//     bytes_recv: Math.floor(randomInRange(260000, 340000)),
//     segments_sent: Math.floor(randomInRange(180, 260)),
//     segments_recv: Math.floor(randomInRange(170, 250)),
//     frames_sent: Math.floor(randomInRange(22, 32)),
//     frames_recv: Math.floor(randomInRange(21, 31)),
//     frames_dropped: Math.floor(randomInRange(0, 1)),
//     segment_drops: Math.floor(randomInRange(0, 3)),
    
//     encode_ms_avg: addNoise(9, 2),
//     decode_ms_avg: addNoise(7, 1.5),
//     reassembly_ms_avg: addNoise(5, 1),
    
//     latency_ms_avg: addNoise(baseRtt * 0.6, 5),
//     jitter_ms_avg: addNoise(1.5, 0.4),
//     packet_loss_rate: addNoise(0.1, 0.08),
//     frame_loss_rate: addNoise(0.05, 0.03),
//     segment_loss_rate: addNoise(0.08, 0.05),
//     throughput_kbps: addNoise(baseBitrate * 0.92, 100),
//     goodput_kbps: addNoise(baseBitrate * 0.88, 100),
//     bitrate_kbps: addNoise(baseBitrate, 120),
    
//     rtt_ms: addNoise(baseRtt, 10),
//     rto_ms: addNoise(baseRtt * 3, 20),
//     cwnd_bytes: Math.floor(addNoise(baseCwnd, 5000)),
//     ssthresh: Math.floor(randomInRange(40000, 80000)),
//     congestion_state: index % 10 < 3 ? 'slow_start' : index % 10 < 8 ? 'congestion_avoidance' : 'fast_recovery',
//     retransmissions: Math.floor(randomInRange(0, 10)),
//     fast_retransmits: Math.floor(randomInRange(0, 3)),
//     dup_acks: Math.floor(randomInRange(0, 15)),
//     in_flight_bytes: Math.floor(randomInRange(10000, 50000)),
//     receiver_window: Math.floor(randomInRange(60000, 130000)),
//     sender_buffer: Math.floor(randomInRange(100000, 200000)),
//     receiver_buffer: Math.floor(randomInRange(80000, 180000)),
//     path_mtu: 1460,
    
//     mos_score: addNoise(3.9, 0.25),
//     psnr: addNoise(36, 3),
//     ssim: addNoise(0.93, 0.02),
    
//     audio_packet_loss_rate: addNoise(0.1, 0.08),
//     audio_jitter_ms: addNoise(1.2, 0.4),
//     audio_latency_ms: addNoise(25, 5),
//     audio_bitrate: addNoise(128, 15),
//     audio_levels: addNoise(-22, 4),
    
//     cpu_pct: addNoise(40, 12),
//     mem_pct: addNoise(50, 10),
//     proc_cpu_pct: addNoise(30, 10),
//     proc_mem_pct: addNoise(35, 6),
//     network_queue_tx: Math.floor(randomInRange(0, 30)),
//     network_queue_rx: Math.floor(randomInRange(0, 25)),
//     disk_io_kbps: addNoise(450, 180),
//   };
// };

// const generateSctpRecord = (timestamp: string, index: number): MetricRecord => {
//   const baseRtt = 35 + Math.sin(index / 22) * 10;
//   const baseBitrate = 2400 + Math.sin(index / 16) * 450;
  
//   return {
//     ts: timestamp,
//     protocol: 'SCTP',
//     role: 'both',
    
//     bytes_sent: Math.floor(randomInRange(290000, 380000)),
//     bytes_recv: Math.floor(randomInRange(270000, 360000)),
//     segments_sent: Math.floor(randomInRange(190, 280)),
//     segments_recv: Math.floor(randomInRange(180, 270)),
//     frames_sent: Math.floor(randomInRange(24, 34)),
//     frames_recv: Math.floor(randomInRange(23, 33)),
//     frames_dropped: Math.floor(randomInRange(0, 1)),
//     segment_drops: Math.floor(randomInRange(0, 4)),
    
//     encode_ms_avg: addNoise(8.5, 2),
//     decode_ms_avg: addNoise(6.5, 1.5),
//     reassembly_ms_avg: addNoise(4.5, 1),
    
//     latency_ms_avg: addNoise(baseRtt * 0.5, 4),
//     jitter_ms_avg: addNoise(1.8, 0.4),
//     packet_loss_rate: addNoise(0.2, 0.12),
//     frame_loss_rate: addNoise(0.1, 0.06),
//     segment_loss_rate: addNoise(0.15, 0.08),
//     throughput_kbps: addNoise(baseBitrate * 0.94, 100),
//     goodput_kbps: addNoise(baseBitrate * 0.9, 100),
//     bitrate_kbps: addNoise(baseBitrate, 140),
    
//     rtt_ms: addNoise(baseRtt, 8),
//     rto_ms: addNoise(baseRtt * 2.5, 15),
//     cwnd_bytes: Math.floor(addNoise(70000, 6000)),
//     ssthresh: Math.floor(randomInRange(45000, 85000)),
//     congestion_state: 'congestion_avoidance',
//     retransmissions: Math.floor(randomInRange(0, 6)),
//     fast_retransmits: Math.floor(randomInRange(0, 2)),
//     dup_acks: Math.floor(randomInRange(0, 10)),
//     in_flight_bytes: Math.floor(randomInRange(12000, 45000)),
//     receiver_window: Math.floor(randomInRange(65000, 140000)),
//     sender_buffer: Math.floor(randomInRange(110000, 210000)),
//     receiver_buffer: Math.floor(randomInRange(90000, 190000)),
//     path_mtu: 1480,
    
//     mos_score: addNoise(4.1, 0.25),
//     psnr: addNoise(37, 3),
//     ssim: addNoise(0.94, 0.02),
    
//     audio_packet_loss_rate: addNoise(0.15, 0.1),
//     audio_jitter_ms: addNoise(1.3, 0.4),
//     audio_latency_ms: addNoise(18, 4),
//     audio_bitrate: addNoise(128, 18),
//     audio_levels: addNoise(-21, 4),
    
//     cpu_pct: addNoise(38, 11),
//     mem_pct: addNoise(48, 9),
//     proc_cpu_pct: addNoise(28, 9),
//     proc_mem_pct: addNoise(32, 5),
//     network_queue_tx: Math.floor(randomInRange(0, 40)),
//     network_queue_rx: Math.floor(randomInRange(0, 35)),
//     disk_io_kbps: addNoise(480, 190),
    
//     stream_id: Math.floor(randomInRange(0, 4)),
//     heartbeat_rtt: addNoise(baseRtt * 0.8, 5),
//     sack_count: Math.floor(randomInRange(0, 20)),
//     association_state: 'established',
//   };
// };
