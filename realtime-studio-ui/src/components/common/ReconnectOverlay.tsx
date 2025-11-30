import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReconnectOverlayProps {
  isVisible: boolean;
  message?: string;
  onReconnect: () => void;
  isReconnecting?: boolean;
}

export function ReconnectOverlay({ 
  isVisible, 
  message = 'Connection lost', 
  onReconnect,
  isReconnecting = false 
}: ReconnectOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6 p-8"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 2,
            ease: "easeInOut"
          }}
          className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center"
        >
          <WifiOff className="w-10 h-10 text-destructive" />
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{message}</h2>
          <p className="text-muted-foreground max-w-sm">
            The connection to the conference server was interrupted. 
            Click below to attempt reconnection.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="hero"
            size="lg"
            onClick={onReconnect}
            disabled={isReconnecting}
          >
            {isReconnecting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Reconnect
              </>
            )}
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Check your network connection and server status</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
