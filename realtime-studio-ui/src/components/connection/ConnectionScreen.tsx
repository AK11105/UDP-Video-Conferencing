import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Mic, Settings, Wifi, Monitor, ChevronRight, Camera, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCallStore } from '@/stores/callStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { LocalPreview } from './LocalPreview';
import { AudioLevelMeter } from './AudioLevelMeter';
import type { QualityPreset } from '@/lib/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function ConnectionScreen() {
  const { connectionConfig, setConnectionConfig, connect, callState } = useCallStore();
  const { cameras, microphones, loadDevices, selectCamera, selectMicrophone, selectedCamera, selectedMicrophone, startLocalPreview, stopLocalPreview, localStream, isLoadingDevices } = useDeviceStore();
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (selectedCamera || selectedMicrophone) {
      startLocalPreview();
    }
    return () => stopLocalPreview();
  }, [selectedCamera, selectedMicrophone, startLocalPreview, stopLocalPreview]);

  const handleJoin = () => {
    if (!connectionConfig.serverIp) return;
    connect();
  };

  const qualityOptions: { value: QualityPreset; label: string; desc: string }[] = [
    { value: 'low', label: 'Low', desc: '320×240 @ 15fps' },
    { value: 'medium', label: 'Medium', desc: '640×480 @ 24fps' },
    { value: 'high', label: 'High', desc: '1280×720 @ 30fps' },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl grid md:grid-cols-2 gap-6 relative z-10"
      >
        {/* Left side - Preview */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="text-center md:text-left mb-6">
            <motion.h1 
              className="text-4xl font-bold text-gradient mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              RealTime AV
            </motion.h1>
            <motion.p 
              className="text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              UDP-based video conferencing
            </motion.p>
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="p-0">
              <LocalPreview stream={localStream} />
            </CardContent>
          </Card>

          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Mic className="h-5 w-5 text-muted-foreground" />
                <AudioLevelMeter className="flex-1" />
                <span className="text-xs text-muted-foreground">Mic Level</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right side - Settings */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Server Connection */}
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wifi className="h-5 w-5 text-primary" />
                Server Connection
              </CardTitle>
              <CardDescription>Enter your Tailscale server IP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverIp">Server IP Address</Label>
                <Input
                  id="serverIp"
                  placeholder="100.x.x.x"
                  value={connectionConfig.serverIp}
                  onChange={(e) => setConnectionConfig({ serverIp: e.target.value })}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverPort">Server Port</Label>
                <Input
                  id="serverPort"
                  type="number"
                  placeholder="5000"
                  value={connectionConfig.serverPort}
                  onChange={(e) => setConnectionConfig({ serverPort: parseInt(e.target.value) || 5000 })}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Device Selection */}
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Devices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Camera
                </Label>
                <Select value={selectedCamera || ''} onValueChange={selectCamera} disabled={isLoadingDevices}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mic className="h-4 w-4" /> Microphone
                </Label>
                <Select value={selectedMicrophone || ''} onValueChange={selectMicrophone} disabled={isLoadingDevices}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {microphones.map((mic) => (
                      <SelectItem key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" /> Quality Preset
                </Label>
                <Select 
                  value={connectionConfig.qualityPreset} 
                  onValueChange={(v) => setConnectionConfig({ qualityPreset: v as QualityPreset })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span>{opt.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{opt.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card variant="glass">
            <CardHeader 
              className="pb-4 cursor-pointer" 
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <CardTitle className="flex items-center justify-between text-sm">
                <span>Advanced Settings</span>
                <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </CardTitle>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="randomPorts">Use Random Ports</Label>
                  <Switch 
                    id="randomPorts"
                    checked={connectionConfig.useRandomPorts}
                    onCheckedChange={(checked) => setConnectionConfig({ useRandomPorts: checked })}
                  />
                </div>
                {!connectionConfig.useRandomPorts && (
                  <div className="space-y-2">
                    <Label htmlFor="localPort">Local Control Port</Label>
                    <Input
                      id="localPort"
                      type="number"
                      placeholder="9000"
                      value={connectionConfig.localControlPort || ''}
                      onChange={(e) => setConnectionConfig({ localControlPort: parseInt(e.target.value) || undefined })}
                      className="font-mono"
                    />
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Join Button */}
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleJoin}
            disabled={!connectionConfig.serverIp || callState.isConnecting}
          >
            {callState.isConnecting ? (
              <>
                <span className="animate-spin mr-2">◌</span>
                Connecting...
              </>
            ) : (
              <>
                <Video className="mr-2 h-5 w-5" />
                Join Session
              </>
            )}
          </Button>

          {callState.errorMessage && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-destructive text-sm text-center"
            >
              {callState.errorMessage}
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
