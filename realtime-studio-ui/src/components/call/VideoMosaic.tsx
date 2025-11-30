import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, VideoOff, WifiOff, AlertCircle } from 'lucide-react';
import { useCallStore } from '@/stores/callStore';
import { cn } from '@/lib/utils';

export function VideoMosaic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const { mosaicFrame, participants, metrics } = useCallStore();

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.floor(width), height: Math.floor(height) });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draw mosaic frame
  useEffect(() => {
    if (!canvasRef.current || !mosaicFrame) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Scale to fit while maintaining aspect ratio
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    };
    img.src = mosaicFrame.startsWith('data:') ? mosaicFrame : `data:image/jpeg;base64,${mosaicFrame}`;
  }, [mosaicFrame, dimensions]);

  const showPlaceholder = !mosaicFrame || participants.length === 0;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full relative rounded-2xl overflow-hidden bg-secondary"
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="grid grid-cols-2 gap-4 mb-6"
          >
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-32 h-24 rounded-xl bg-muted flex items-center justify-center"
              >
                <User className="w-8 h-8 text-muted-foreground/50" />
              </motion.div>
            ))}
          </motion.div>
          <p className="text-sm">Waiting for video feeds...</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {participants.length === 0 ? 'No participants connected' : 'Receiving frames...'}
          </p>
        </div>
      ) : (
        <motion.canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full video-canvas"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* Overlay stats */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            metrics.receiveFps > 10 ? "bg-success" : metrics.receiveFps > 0 ? "bg-warning" : "bg-destructive"
          )} />
          <span className="font-mono">{metrics.receiveFps.toFixed(0)} FPS</span>
        </div>
      </div>

      {/* Participant overlay tiles */}
      {participants.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
          {participants.slice(0, 6).map((participant, i) => (
            <ParticipantTile 
              key={participant.id} 
              participant={participant}
              index={i}
            />
          ))}
          {participants.length > 6 && (
            <div className="flex-shrink-0 w-20 h-14 rounded-lg bg-muted/80 backdrop-blur-sm flex items-center justify-center text-xs text-muted-foreground">
              +{participants.length - 6} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ParticipantTileProps {
  participant: {
    id: string;
    ip: string;
    port: number;
    isMuted: boolean;
    isVideoOff: boolean;
    packetLoss?: number;
  };
  index: number;
}

function ParticipantTile({ participant, index }: ParticipantTileProps) {
  const isStale = false; // Would check lastSeen timestamp
  const hasHighPacketLoss = (participant.packetLoss || 0) > 10;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden relative",
        "bg-muted/80 backdrop-blur-sm border border-border/50",
        isStale && "opacity-60"
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {participant.isVideoOff ? (
          <VideoOff className="w-5 h-5 text-muted-foreground" />
        ) : (
          <User className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      {/* Name/IP */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent px-2 py-1">
        <p className="text-[10px] font-mono truncate text-foreground/80">
          {participant.ip.split('.').slice(-1)}:{participant.port}
        </p>
      </div>

      {/* Status indicators */}
      <div className="absolute top-1 right-1 flex gap-1">
        {participant.isMuted && (
          <div className="w-4 h-4 rounded-full bg-destructive/80 flex items-center justify-center">
            <span className="text-[8px] text-destructive-foreground">M</span>
          </div>
        )}
        {hasHighPacketLoss && (
          <div className="w-4 h-4 rounded-full bg-warning/80 flex items-center justify-center">
            <AlertCircle className="w-2.5 h-2.5 text-warning-foreground" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
