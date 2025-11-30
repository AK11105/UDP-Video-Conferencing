import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Video, Mic, Settings, Wifi, Monitor, ChevronRight, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function ConnectionScreen({
  serverIp,
  serverPort,
  setServerIp,
  setServerPort,
  onJoin,
  isConnecting,
  errorMessage
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-8">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-4xl grid md:grid-cols-2 gap-6"
      >
        {/* LEFT (Title) */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">RealTime AV</h1>
          <p className="text-muted-foreground">UDP-based video conferencing</p>

          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              <p>Local Preview Disabled (Zustand Removed)</p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT (Settings) */}
        <div className="space-y-4">
          {/* SERVER SETTINGS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wifi className="h-5 w-5 text-primary" />
                Server Connection
              </CardTitle>
              <CardDescription>Enter your Tailscale Server</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Server IP</Label>
                <Input
                  value={serverIp}
                  placeholder="100.x.x.x"
                  onChange={(e) => setServerIp(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Server Port</Label>
                <Input
                  type="number"
                  value={serverPort}
                  placeholder="5000"
                  onChange={(e) => setServerPort(parseInt(e.target.value) || 5000)}
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* QUALITY */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="h-5 w-5 text-primary" />
                Quality Preset
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Choose quality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — 320×240</SelectItem>
                  <SelectItem value="medium">Medium — 640×480</SelectItem>
                  <SelectItem value="high">High — 1280×720</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* ADVANCED */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <CardTitle className="flex justify-between text-sm">
                <span>Advanced Settings</span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
                />
              </CardTitle>
            </CardHeader>

            {showAdvanced && (
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  (No extra advanced settings — Zustand removed)
                </p>
              </CardContent>
            )}
          </Card>

          {/* JOIN BUTTON */}
          <Button
            className="w-full"
            size="lg"
            onClick={onJoin}
            disabled={!serverIp || isConnecting}
          >
            {isConnecting ? "Connecting..." : "Join Session"}
          </Button>

          {errorMessage && (
            <p className="text-center text-red-500">{errorMessage}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
