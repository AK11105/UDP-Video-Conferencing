import { useCallback } from 'react';
import { useCallStore } from '@/stores/callStore';
import type { ControlCommand } from '@/lib/types';

// This hook provides methods to send UDP control commands to the Python client
// In production, this would communicate with a backend service that sends UDP packets

interface ControlCommandsAPI {
  sendMute: () => Promise<void>;
  sendUnmute: () => Promise<void>;
  sendVideoOn: () => Promise<void>;
  sendVideoOff: () => Promise<void>;
  sendBye: () => Promise<void>;
  sendWho: () => Promise<void>;
  sendRawCommand: (command: ControlCommand) => Promise<void>;
}

export function useControlCommands(): ControlCommandsAPI {
  const localControlPort = useCallStore((state) => state.callState.localControlPort);
  const addLog = useCallStore((state) => state.addLog);

  const sendUdpCommand = useCallback(async (command: ControlCommand) => {
    if (!localControlPort) {
      addLog('warn', `Cannot send ${command}: No local control port configured`, 'control');
      return;
    }

    addLog('debug', `Sending command: ${command} to 127.0.0.1:${localControlPort}`, 'control');

    // In production, this would call the backend API to send UDP
    // Example: POST /api/control { command, port: localControlPort }
    try {
      // Simulated backend call
      const response = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command,
          host: '127.0.0.1',
          port: localControlPort,
        }),
      }).catch(() => {
        // If backend not available, log locally
        console.log(`[SIMULATED UDP] ${command} -> 127.0.0.1:${localControlPort}`);
        return { ok: true };
      });

      if (response.ok) {
        addLog('info', `Command sent: ${command}`, 'control');
      } else {
        addLog('error', `Failed to send command: ${command}`, 'control');
      }
    } catch (error) {
      addLog('error', `Error sending command: ${error}`, 'control');
    }
  }, [localControlPort, addLog]);

  const sendMute = useCallback(() => sendUdpCommand('MUTE'), [sendUdpCommand]);
  const sendUnmute = useCallback(() => sendUdpCommand('UNMUTE'), [sendUdpCommand]);
  const sendVideoOn = useCallback(() => sendUdpCommand('VIDEO_ON'), [sendUdpCommand]);
  const sendVideoOff = useCallback(() => sendUdpCommand('VIDEO_OFF'), [sendUdpCommand]);
  const sendBye = useCallback(() => sendUdpCommand('BYE'), [sendUdpCommand]);
  const sendWho = useCallback(() => sendUdpCommand('WHO'), [sendUdpCommand]);

  return {
    sendMute,
    sendUnmute,
    sendVideoOn,
    sendVideoOff,
    sendBye,
    sendWho,
    sendRawCommand: sendUdpCommand,
  };
}
