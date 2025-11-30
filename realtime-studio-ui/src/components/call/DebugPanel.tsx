import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, Terminal, Radio, Wifi, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallStore } from '@/stores/callStore';
import { useControlCommands } from '@/hooks/useControlCommands';
import type { ControlCommand } from '@/lib/types';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const { callState, connectionConfig, addLog } = useCallStore();
  const { sendRawCommand } = useControlCommands();
  const [customCommand, setCustomCommand] = useState('');

  const commands: { label: string; command: ControlCommand; color: string }[] = [
    { label: 'MUTE', command: 'MUTE', color: 'bg-warning' },
    { label: 'UNMUTE', command: 'UNMUTE', color: 'bg-success' },
    { label: 'VIDEO_ON', command: 'VIDEO_ON', color: 'bg-success' },
    { label: 'VIDEO_OFF', command: 'VIDEO_OFF', color: 'bg-warning' },
    { label: 'WHO', command: 'WHO', color: 'bg-primary' },
    { label: 'BYE', command: 'BYE', color: 'bg-destructive' },
  ];

  const handleSendCommand = (command: ControlCommand) => {
    sendRawCommand(command);
    addLog('debug', `Sent debug command: ${command}`, 'debug-panel');
  };

  const handleCustomCommand = () => {
    if (customCommand.trim()) {
      addLog('debug', `Sent custom command: ${customCommand}`, 'debug-panel');
      // In real implementation, this would send to the backend
      console.log(`[DEBUG] Custom command: ${customCommand}`);
      setCustomCommand('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 right-4 z-50 w-80"
        >
          <Card variant="glass" className="shadow-elevated-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" />
                Debug Panel
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Server className="h-3 w-3" /> Connection Info
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground">Server</p>
                    <p className="font-mono">{connectionConfig.serverIp || 'N/A'}:{connectionConfig.serverPort}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-muted-foreground">Local CTL Port</p>
                    <p className="font-mono">{callState.localControlPort || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Quick Commands */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Radio className="h-3 w-3" /> UDP Commands
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {commands.map((cmd) => (
                    <Button
                      key={cmd.command}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendCommand(cmd.command)}
                      className="text-[10px] h-7"
                      disabled={!callState.localControlPort}
                    >
                      {cmd.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Command */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Terminal className="h-3 w-3" /> Custom Command
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={customCommand}
                    onChange={(e) => setCustomCommand(e.target.value)}
                    placeholder="Enter command..."
                    className="h-8 text-xs font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomCommand()}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCustomCommand}
                    className="h-8 px-2"
                    disabled={!customCommand.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* State Display */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Wifi className="h-3 w-3" /> Call State
                </h4>
                <div className="p-2 rounded bg-muted/50 font-mono text-[10px] space-y-1">
                  <p>isConnected: <span className={callState.isConnected ? 'text-success' : 'text-destructive'}>{String(callState.isConnected)}</span></p>
                  <p>isMuted: <span className={callState.isMuted ? 'text-warning' : 'text-success'}>{String(callState.isMuted)}</span></p>
                  <p>isVideoOff: <span className={callState.isVideoOff ? 'text-warning' : 'text-success'}>{String(callState.isVideoOff)}</span></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
