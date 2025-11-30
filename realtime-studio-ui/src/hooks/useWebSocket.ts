import { useCallback, useEffect, useRef, useState } from 'react';
import { useCallStore } from '@/stores/callStore';

interface WebSocketHookOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export function useWebSocket(options: WebSocketHookOptions) {
  const {
    url,
    autoConnect = false,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const addLog = useCallStore((state) => state.addLog);
  const setMosaicFrame = useCallStore((state) => state.setMosaicFrame);
  const updateMetrics = useCallStore((state) => state.updateMetrics);
  const setParticipants = useCallStore((state) => state.setParticipants);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      
      switch (data.type) {
        case 'mosaic_frame':
          // Base64 encoded JPEG frame
          setMosaicFrame(data.payload as string);
          break;
          
        case 'metrics':
          updateMetrics(data.payload as Record<string, number>);
          break;
          
        case 'participants':
          setParticipants(data.payload as any[]);
          break;
          
        case 'log':
          const logData = data.payload as { level: 'info' | 'warn' | 'error'; message: string };
          addLog(logData.level, logData.message, 'python');
          break;
          
        case 'local_ctl_port':
          useCallStore.getState().setLocalControlPort(data.payload as number);
          break;
          
        case 'error':
          setError(data.payload as string);
          addLog('error', data.payload as string, 'websocket');
          break;
          
        default:
          console.log('Unknown WebSocket message type:', data.type);
      }
    } catch (e) {
      // Binary data - likely a video frame
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          setMosaicFrame(`data:image/jpeg;base64,${base64}`);
        };
        reader.readAsDataURL(event.data);
      }
    }
  }, [addLog, setMosaicFrame, updateMetrics, setParticipants]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        addLog('info', 'WebSocket connected', 'websocket');
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        setIsConnecting(false);
        addLog('warn', `WebSocket disconnected: ${event.reason || 'Unknown reason'}`, 'websocket');
        
        // Attempt reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            addLog('info', `Reconnecting... (attempt ${reconnectAttemptsRef.current})`, 'websocket');
            connect();
          }, reconnectInterval);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
      
      ws.onerror = (event) => {
        setError('WebSocket error occurred');
        addLog('error', 'WebSocket error', 'websocket');
      };
      
      ws.onmessage = handleMessage;
      
      wsRef.current = ws;
    } catch (e) {
      setIsConnecting(false);
      setError(e instanceof Error ? e.message : 'Connection failed');
    }
  }, [url, handleMessage, addLog, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [maxReconnectAttempts]);

  const send = useCallback((data: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
  };
}
