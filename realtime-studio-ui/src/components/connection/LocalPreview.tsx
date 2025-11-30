import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VideoOff, User } from 'lucide-react';

interface LocalPreviewProps {
  stream: MediaStream | null;
  className?: string;
}

export function LocalPreview({ stream, className }: LocalPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative aspect-video bg-secondary overflow-hidden ${className}`}>
      {stream ? (
        <motion.video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4"
          >
            <User className="w-10 h-10" />
          </motion.div>
          <p className="text-sm">Camera preview</p>
        </div>
      )}
      
      {/* Status indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stream ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-xs text-foreground/80 bg-background/50 backdrop-blur-sm px-2 py-0.5 rounded">
          {stream ? 'Live' : 'No camera'}
        </span>
      </div>
    </div>
  );
}
