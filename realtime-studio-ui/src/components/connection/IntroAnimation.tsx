import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Wifi, Radio } from 'lucide-react';

interface IntroAnimationProps {
  onComplete?: () => void;
}

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex items-center justify-center"
      animate={{ opacity: 0 }}
      transition={{ delay: 2.5, duration: 0.3 }}
    >
      <div className="text-center">
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-lg">
            <Video className="w-12 h-12 text-primary-foreground" />
          </div>
          <motion.div
            className="absolute -top-2 -right-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-8 h-8 rounded-full bg-success flex items-center justify-center">
              <Wifi className="w-4 h-4 text-success-foreground" />
            </div>
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="w-8 h-8 rounded-full bg-warning flex items-center justify-center">
              <Radio className="w-4 h-4 text-warning-foreground" />
            </div>
          </motion.div>
        </motion.div>
        <motion.h1
          className="text-3xl font-bold text-gradient mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          RealTime AV
        </motion.h1>
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
        >
          UDP Video Conferencing
        </motion.p>
        <motion.div
          className="mt-8 flex justify-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
