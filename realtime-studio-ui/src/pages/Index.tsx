import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionScreen } from '@/components/connection/ConnectionScreen';
import { CallScreen } from '@/components/call/CallScreen';
import { useCallStore } from '@/stores/callStore';

const Index = () => {
  const { callState } = useCallStore();
  const { isConnected } = callState;

  // Apply dark mode by default for conference app
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <AnimatePresence mode="wait">
      {isConnected ? (
        <motion.div
          key="call"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CallScreen />
        </motion.div>
      ) : (
        <motion.div
          key="connection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ConnectionScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Index;
