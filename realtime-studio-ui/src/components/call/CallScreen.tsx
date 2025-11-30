import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BarChart3, Terminal, ChevronLeft, ChevronRight, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoMosaic } from './VideoMosaic';
import { CallControls } from './CallControls';
import { ParticipantsPanel } from './ParticipantsPanel';
import { MetricsPanel } from './MetricsPanel';
import { LogConsole } from './LogConsole';
import { DebugPanel } from './DebugPanel';
import { useCallStore } from '@/stores/callStore';
import { useDemoMode } from '@/hooks/useDemoMode';
import { cn } from '@/lib/utils';

type SidebarTab = 'participants' | 'metrics' | 'logs';

const DEMO_MODE = false; // Set to false for production

export function CallScreen() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<SidebarTab>('participants');
  const [debugOpen, setDebugOpen] = useState(false);
  const { callState, participants, connectionConfig } = useCallStore();

  // Enable demo mode for UI testing
  useDemoMode(DEMO_MODE);

  const tabs = [
    { id: 'participants' as const, label: 'Participants', icon: Users, count: participants.length },
    { id: 'metrics' as const, label: 'Metrics', icon: BarChart3 },
    { id: 'logs' as const, label: 'Console', icon: Terminal },
  ];

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top status bar */}
      <motion.header 
        className="h-12 px-4 flex items-center justify-between border-b bg-card/50 backdrop-blur-sm"
        initial={{ y: -48 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">Connected</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground font-mono">
            {connectionConfig.serverIp || 'Demo'}:{connectionConfig.serverPort}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setDebugOpen(!debugOpen)}
            className={cn(debugOpen && "bg-primary/20")}
          >
            <Bug className="h-4 w-4 mr-1" />
            Debug
          </Button>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </motion.header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video area */}
        <motion.main 
          className="flex-1 flex flex-col min-w-0"
          layout
        >
          <div className="flex-1 p-4 overflow-hidden">
            <VideoMosaic />
          </div>
          
          {/* Controls */}
          <CallControls />
        </motion.main>

        {/* Sidebar toggle */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-1/2 -translate-y-1/2 z-20 rounded-l-lg rounded-r-none h-16 w-6 bg-card border border-r-0 hover:bg-accent",
            "transition-all duration-200"
          )}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ right: sidebarOpen ? '320px' : '0' }}
        >
          {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden"
            >
              {/* Tabs */}
              <div className="flex border-b p-1 gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={cn(
                        "ml-1 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeTab === tab.id ? "bg-primary-foreground/20" : "bg-muted"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="h-full"
                  >
                    {activeTab === 'participants' && <ParticipantsPanel />}
                    {activeTab === 'metrics' && <MetricsPanel />}
                    {activeTab === 'logs' && <LogConsole />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Debug Panel */}
      <DebugPanel isOpen={debugOpen} onClose={() => setDebugOpen(false)} />
    </div>
  );
}
