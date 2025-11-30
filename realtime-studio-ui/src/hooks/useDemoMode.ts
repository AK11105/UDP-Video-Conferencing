import { useEffect, useRef } from 'react';
import { useCallStore } from '@/stores/callStore';

/**
 * Demo mode hook that simulates a live conference for UI testing
 * Enable by setting DEMO_MODE=true in the component
 */
export function useDemoMode(enabled: boolean = false) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    setParticipants, 
    updateMetrics, 
    addLog, 
    setMosaicFrame,
    addHistoryEvent 
  } = useCallStore();

  useEffect(() => {
    if (!enabled) return;

    // Initial participants
    const demoParticipants = [
      { id: '1', ip: '100.64.0.12', port: 5001, isMuted: false, isVideoOff: false, lastSeen: Date.now(), packetLoss: 0.5 },
      { id: '2', ip: '100.64.0.15', port: 5002, isMuted: true, isVideoOff: false, lastSeen: Date.now(), packetLoss: 1.2 },
      { id: '3', ip: '100.64.0.23', port: 5003, isMuted: false, isVideoOff: true, lastSeen: Date.now(), packetLoss: 0.1 },
    ];
    setParticipants(demoParticipants);
    addLog('info', 'Demo mode activated', 'demo');
    addHistoryEvent('join', 'Demo user 1 joined');
    addHistoryEvent('join', 'Demo user 2 joined');
    addHistoryEvent('join', 'Demo user 3 joined');

    // Simulate metrics updates
    intervalRef.current = setInterval(() => {
      updateMetrics({
        sendFps: 24 + Math.random() * 6,
        receiveFps: 22 + Math.random() * 8,
        encodeTimeMs: 15 + Math.random() * 10,
        decodeTimeMs: 12 + Math.random() * 8,
        bytesSent: Math.floor(Math.random() * 100000),
        bytesReceived: Math.floor(Math.random() * 500000),
        packetLoss: Math.random() * 2,
        audioLatencyMs: 50 + Math.random() * 30,
        jitterMs: 10 + Math.random() * 20,
      });

      // Random log entries
      const logTypes = [
        { level: 'info' as const, messages: ['Frame received', 'Heartbeat sent', 'Roster updated'] },
        { level: 'debug' as const, messages: ['UDP packet processed', 'Audio buffer filled'] },
      ];
      if (Math.random() > 0.7) {
        const type = logTypes[Math.floor(Math.random() * logTypes.length)];
        const msg = type.messages[Math.floor(Math.random() * type.messages.length)];
        addLog(type.level, msg, 'demo');
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, setParticipants, updateMetrics, addLog, setMosaicFrame, addHistoryEvent]);
}
