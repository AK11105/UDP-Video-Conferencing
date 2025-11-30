// Core types for the conferencing system

export interface Participant {
  id: string;
  ip: string;
  port: number;
  displayName?: string;
  isMuted: boolean;
  isVideoOff: boolean;
  lastSeen: number;
  audioLevel?: number;
  packetLoss?: number;
}

export interface ConnectionConfig {
  serverIp: string;
  serverPort: number;
  localControlPort?: number;
  qualityPreset: 'low' | 'medium' | 'high';
  useRandomPorts: boolean;
  cameraDeviceId?: string;
  microphoneDeviceId?: string;
}

export interface CallMetrics {
  sendFps: number;
  receiveFps: number;
  encodeTimeMs: number;
  decodeTimeMs: number;
  bytesSent: number;
  bytesReceived: number;
  packetLoss: number;
  audioLatencyMs: number;
  jitterMs: number;
  lastUpdated: number;
}

export interface PeerMetrics {
  peerId: string;
  packetLoss: number;
  latencyMs: number;
  lastFrameTime: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export interface HistoryEvent {
  id: string;
  timestamp: number;
  type: 'join' | 'leave' | 'mute' | 'unmute' | 'video_on' | 'video_off' | 'error' | 'reconnect';
  participantId?: string;
  message: string;
}

export type ControlCommand = 'MUTE' | 'UNMUTE' | 'VIDEO_ON' | 'VIDEO_OFF' | 'BYE' | 'WHO';

export interface CallState {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  localControlPort: number | null;
  errorMessage: string | null;
}

export type QualityPreset = 'low' | 'medium' | 'high';

export interface QualitySettings {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  low: { width: 320, height: 240, fps: 15, bitrate: 256000 },
  medium: { width: 640, height: 480, fps: 24, bitrate: 512000 },
  high: { width: 1280, height: 720, fps: 30, bitrate: 1500000 },
};

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}
