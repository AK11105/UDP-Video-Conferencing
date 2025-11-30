import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mic, MicOff, Video, VideoOff, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCallStore } from '@/stores/callStore';
import { useControlCommands } from '@/hooks/useControlCommands';
import { cn } from '@/lib/utils';

export function ParticipantsPanel() {
  const { participants, history } = useCallStore();
  const { sendWho } = useControlCommands();

  // Auto-refresh participants every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      sendWho();
    }, 2000);
    return () => clearInterval(interval);
  }, [sendWho]);

  const recentHistory = history.filter(
    (e) => e.type === 'join' || e.type === 'leave'
  ).slice(-5);

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Participants ({participants.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={sendWho}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {participants.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-muted-foreground"
          >
            <User className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No participants yet</p>
            <p className="text-xs mt-1">Waiting for others to join...</p>
          </motion.div>
        ) : (
          participants.map((participant, i) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors",
                "flex items-center gap-3"
              )}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate font-mono">
                  {participant.ip}:{participant.port}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Connection status */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wifi className="h-3 w-3 text-success" />
                    <span>{participant.packetLoss || 0}% loss</span>
                  </div>
                </div>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  participant.isMuted ? "bg-destructive/20" : "bg-success/20"
                )}>
                  {participant.isMuted ? (
                    <MicOff className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Mic className="h-3.5 w-3.5 text-success" />
                  )}
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  participant.isVideoOff ? "bg-destructive/20" : "bg-success/20"
                )}>
                  {participant.isVideoOff ? (
                    <VideoOff className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <Video className="h-3.5 w-3.5 text-success" />
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Recent activity */}
      {recentHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Activity</h4>
          <div className="space-y-1.5">
            {recentHistory.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  event.type === 'join' ? "bg-success" : "bg-warning"
                )} />
                <span>{event.message}</span>
                <span className="ml-auto opacity-50">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
