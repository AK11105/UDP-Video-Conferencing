import { motion } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  RotateCcw, Settings, MonitorSpeaker, MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCallStore } from '@/stores/callStore';
import { cn } from '@/lib/utils';

export function CallControls() {
  const { callState, toggleMute, toggleVideo, disconnect, connect } = useCallStore();
  const { isMuted, isVideoOff, isConnected } = callState;

  const controls = [
    {
      id: 'mute',
      icon: isMuted ? MicOff : Mic,
      label: isMuted ? 'Unmute' : 'Mute',
      onClick: toggleMute,
      variant: isMuted ? 'controlMuted' as const : 'control' as const,
      active: !isMuted,
    },
    {
      id: 'video',
      icon: isVideoOff ? VideoOff : Video,
      label: isVideoOff ? 'Turn on video' : 'Turn off video',
      onClick: toggleVideo,
      variant: isVideoOff ? 'controlMuted' as const : 'control' as const,
      active: !isVideoOff,
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      onClick: () => {},
      variant: 'control' as const,
    },
    {
      id: 'reconnect',
      icon: RotateCcw,
      label: 'Reconnect',
      onClick: connect,
      variant: 'control' as const,
    },
  ];

  return (
    <motion.div 
      className="h-24 px-6 flex items-center justify-center gap-4 border-t bg-card/80 backdrop-blur-sm"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className="flex items-center gap-3">
        {controls.map((control, i) => (
          <Tooltip key={control.id}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Button
                  variant={control.variant}
                  size="iconLg"
                  onClick={control.onClick}
                  className={cn(
                    "relative",
                    control.active && "ring-2 ring-success/30"
                  )}
                >
                  <control.icon className="h-5 w-5" />
                  {control.active && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-success/20"
                      initial={{ scale: 1 }}
                      animate={{ scale: 1.2, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{control.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-2" />

        {/* Leave call button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="controlDestructive"
                size="iconXl"
                onClick={disconnect}
                className="hover:scale-105 transition-transform"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Leave call</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* More options */}
      <div className="absolute right-6 flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
