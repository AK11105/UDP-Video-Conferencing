/**
 * UDP Bridge Module
 * 
 * This module provides the interface for communicating with the backend service
 * that handles UDP packet transmission to the local Python client.
 * 
 * In production, this would communicate with either:
 * 1. An Electron main process via IPC
 * 2. A local Node.js server via HTTP/WebSocket
 * 
 * The backend is responsible for:
 * - Spawning the Python client process
 * - Parsing stdout for [LOCALCTL] port information
 * - Sending UDP packets to the local control port
 * - Streaming video frames from the Python client
 */

import type { ControlCommand } from '@/lib/types';

export interface UdpBridgeConfig {
  backendUrl: string;
  websocketUrl: string;
}

const DEFAULT_CONFIG: UdpBridgeConfig = {
  backendUrl: 'http://localhost:3001',
  websocketUrl: 'ws://localhost:3001/ws',
};

class UdpBridge {
  private config: UdpBridgeConfig;
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: Partial<UdpBridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a control command to the local Python client via UDP
   */
  async sendCommand(command: ControlCommand, port: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.backendUrl}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          host: '127.0.0.1',
          port,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send UDP command:', error);
      return false;
    }
  }

  /**
   * Start the Python client process
   */
  async startClient(serverIp: string, serverPort: number, options?: {
    quality?: 'low' | 'medium' | 'high';
    cameraDevice?: string;
    micDevice?: string;
  }): Promise<{ success: boolean; localControlPort?: number }> {
    try {
      const response = await fetch(`${this.config.backendUrl}/api/client/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverIp,
          serverPort,
          ...options,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start client');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to start Python client:', error);
      return { success: false };
    }
  }

  /**
   * Stop the Python client process
   */
  async stopClient(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.backendUrl}/api/client/stop`, {
        method: 'POST',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to stop Python client:', error);
      return false;
    }
  }

  /**
   * Connect to the WebSocket for real-time updates
   */
  connectWebSocket(handlers: {
    onFrame?: (frameData: string) => void;
    onLog?: (log: { level: string; message: string }) => void;
    onMetrics?: (metrics: Record<string, number>) => void;
    onParticipants?: (participants: any[]) => void;
    onError?: (error: string) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
  }): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.config.websocketUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected to backend');
      handlers.onConnect?.();
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected from backend');
      handlers.onDisconnect?.();
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      handlers.onError?.('WebSocket connection error');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'frame':
            handlers.onFrame?.(data.payload);
            break;
          case 'log':
            handlers.onLog?.(data.payload);
            break;
          case 'metrics':
            handlers.onMetrics?.(data.payload);
            break;
          case 'participants':
            handlers.onParticipants?.(data.payload);
            break;
          case 'error':
            handlers.onError?.(data.payload);
            break;
        }
      } catch (e) {
        // Binary frame data
        if (event.data instanceof Blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            handlers.onFrame?.(`data:image/jpeg;base64,${base64}`);
          };
          reader.readAsDataURL(event.data);
        }
      }
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.backendUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const udpBridge = new UdpBridge();
export default UdpBridge;
