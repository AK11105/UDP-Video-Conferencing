import { create } from "zustand";
import type {
  CallState,
  ConnectionConfig,
  CallMetrics,
  Participant,
  LogEntry,
  HistoryEvent,
  ControlCommand,
} from "@/lib/types";

interface CallStore {
  // WebSocket
  ws: WebSocket | null;
  setWs: (ws: WebSocket | null) => void;

  // Connection state
  callState: CallState;
  connectionConfig: ConnectionConfig;

  // Participants
  participants: Participant[];
  localParticipant: Participant | null;

  // Metrics
  metrics: CallMetrics;

  // Logs and history
  logs: LogEntry[];
  history: HistoryEvent[];

  // Video frame
  mosaicFrame: string | null;
  localPreviewFrame: string | null;

  // Connection actions
  setConnectionConfig: (config: Partial<ConnectionConfig>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  setConnecting: (isConnecting: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  setError: (error: string | null) => void;
  setLocalControlPort: (port: number | null) => void;

  // Call controls
  toggleMute: () => void;
  toggleVideo: () => void;
  setMuted: (isMuted: boolean) => void;
  setVideoOff: (isVideoOff: boolean) => void;
  sendCommand: (command: ControlCommand) => Promise<void>;

  // Participants
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (p: Participant) => void;
  removeParticipant: (id: string) => void;
  updateParticipant: (id: string, data: Partial<Participant>) => void;

  // Metrics
  updateMetrics: (data: Partial<CallMetrics>) => void;

  // Logs
  addLog: (level: LogEntry["level"], msg: string, source?: string) => void;
  clearLogs: () => void;

  // History
  addHistoryEvent: (
    type: HistoryEvent["type"],
    msg: string,
    pid?: string
  ) => void;

  // Frames
  setMosaicFrame: (f: string | null) => void;
  setLocalPreviewFrame: (f: string | null) => void;

  // Reset
  reset: () => void;
}

// ------------------------------------------------------------
// INITIAL STATE
// ------------------------------------------------------------

const initialCallState: CallState = {
  isConnected: false,
  isConnecting: false,
  isMuted: false,
  isVideoOff: false,
  localControlPort: null,
  errorMessage: null,
};

const initialConnectionConfig: ConnectionConfig = {
  serverIp: "",
  serverPort: 5000,
  qualityPreset: "medium",
  useRandomPorts: true,
};

const initialMetrics: CallMetrics = {
  sendFps: 0,
  receiveFps: 0,
  encodeTimeMs: 0,
  decodeTimeMs: 0,
  bytesSent: 0,
  bytesReceived: 0,
  packetLoss: 0,
  audioLatencyMs: 0,
  jitterMs: 0,
  lastUpdated: Date.now(),
};

// ------------------------------------------------------------
// STORE IMPLEMENTATION
// ------------------------------------------------------------

export const useCallStore = create<CallStore>((set, get) => ({
  // WebSocket
  ws: null,
  setWs: (ws) => set({ ws }),

  // Core state
  callState: initialCallState,
  connectionConfig: initialConnectionConfig,
  participants: [],
  localParticipant: null,
  metrics: initialMetrics,
  logs: [],
  history: [],
  mosaicFrame: null,
  localPreviewFrame: null,

  // ------------------------------------------------------------
  // Update connection config
  // ------------------------------------------------------------
  setConnectionConfig: (config) =>
    set((s) => ({
      connectionConfig: { ...s.connectionConfig, ...config },
    })),

  // ------------------------------------------------------------
  // CONNECT FLOW (React → Node Bridge → Python → READY)
  // ------------------------------------------------------------
  connect: async () => {
    const {
      setConnecting,
      setConnected,
      setError,
      addLog,
      addHistoryEvent,
      connectionConfig,
      setLocalControlPort,
    } = get();

    try {
      setConnecting(true);
      setError(null);

      addLog("info", "Contacting bridge server…", "system");

      // 1. Call Node bridge API
      const res = await fetch("http://localhost:3001/api/client/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverIp: connectionConfig.serverIp,
          serverPort: connectionConfig.serverPort,
          quality: connectionConfig.qualityPreset,
          randomPorts: connectionConfig.useRandomPorts,
          localCtlPort: connectionConfig.localControlPort ?? 0,
        }),
      });

      if (!res.ok) throw new Error("Bridge server unreachable");

      const data = await res.json();
      if (!data.success)
        throw new Error(data.error || "Failed to launch Python client");

      setLocalControlPort(data.localControlPort);
      addLog("info", `Python client started on port ${data.localControlPort}`, "system");

      // 2. Wait for READY via WebSocket
      addLog("info", "Waiting for READY event from Python…", "system");

      const ws = get().ws;
      if (!ws) throw new Error("WebSocket not connected to bridge");

      const ready = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        const handler = (evt: MessageEvent) => {
          const msg = JSON.parse(evt.data);

          if (msg.type === "ready") {
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            resolve(true);
          }
        };
        ws.addEventListener("message", handler);
      });

      if (!ready) throw new Error("Python client did not send READY");

      // 3. Fully connected
      setConnected(true);
      addLog("info", "Connected successfully", "system");
      addHistoryEvent("join", "You joined the call");
    } catch (err: any) {
      setError(err.message);
      setConnecting(false);
      get().addLog("error", err.message, "system");
    }
  },

  // ------------------------------------------------------------
  // DISCONNECT
  // ------------------------------------------------------------
  disconnect: () => {
    const { addLog, addHistoryEvent, sendCommand } = get();

    sendCommand("BYE");
    addLog("info", "Disconnecting…", "system");
    addHistoryEvent("leave", "You left the call");

    set({
      callState: initialCallState,
      participants: [],
      mosaicFrame: null,
      localPreviewFrame: null,
    });
  },

  // ------------------------------------------------------------
  // State helpers
  // ------------------------------------------------------------
  setConnecting: (isConnecting) =>
    set((s) => ({ callState: { ...s.callState, isConnecting } })),

  setConnected: (isConnected) =>
    set((s) => ({ callState: { ...s.callState, isConnected, isConnecting: false } })),

  setError: (errorMessage) =>
    set((s) => ({ callState: { ...s.callState, errorMessage, isConnecting: false } })),

  setLocalControlPort: (port) =>
    set((s) => ({ callState: { ...s.callState, localControlPort: port } })),

  // ------------------------------------------------------------
  // CALL CONTROLS (Mute / Video)
  // ------------------------------------------------------------
  toggleMute: () => {
    const { callState, sendCommand, addLog } = get();
    const muted = !callState.isMuted;

    sendCommand(muted ? "MUTE" : "UNMUTE");
    addLog("info", muted ? "Muted mic" : "Unmuted mic", "controls");

    set({ callState: { ...callState, isMuted: muted } });
  },

  toggleVideo: () => {
    const { callState, sendCommand, addLog } = get();
    const videoOff = !callState.isVideoOff;

    sendCommand(videoOff ? "VIDEO_OFF" : "VIDEO_ON");
    addLog("info", videoOff ? "Video off" : "Video on", "controls");

    set({ callState: { ...callState, isVideoOff: videoOff } });
  },

  setMuted: (isMuted) =>
    set((s) => ({ callState: { ...s.callState, isMuted } })),

  setVideoOff: (isVideoOff) =>
    set((s) => ({ callState: { ...s.callState, isVideoOff } })),

  // ------------------------------------------------------------
  // SEND CONTROL COMMAND → via bridge
  // ------------------------------------------------------------
  sendCommand: async (command) => {
    const { callState, addLog } = get();

    if (!callState.localControlPort) {
      addLog("warn", `Cannot send ${command}: no control port`, "udp");
      return;
    }

    await fetch("http://localhost:3001/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command,
        host: "127.0.0.1",
        port: callState.localControlPort,
      }),
    });

    addLog("debug", `Sent command ${command}`, "udp");
  },

  // ------------------------------------------------------------
  // PARTICIPANTS
  // ------------------------------------------------------------
  setParticipants: (p) => set({ participants: p }),

  addParticipant: (p) => {
    get().addHistoryEvent("join", `${p.ip}:${p.port} joined`, p.id);
    set((s) => ({ participants: [...s.participants, p] }));
  },

  removeParticipant: (id) => {
    const p = get().participants.find((x) => x.id === id);
    if (p) get().addHistoryEvent("leave", `${p.ip}:${p.port} left`, id);

    set((s) => ({
      participants: s.participants.filter((x) => x.id !== id),
    }));
  },

  updateParticipant: (id, updates) =>
    set((s) => ({
      participants: s.participants.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  // ------------------------------------------------------------
  // METRICS
  // ------------------------------------------------------------
  updateMetrics: (m) =>
    set((s) => ({
      metrics: { ...s.metrics, ...m, lastUpdated: Date.now() },
    })),

  // ------------------------------------------------------------
  // LOGS
  // ------------------------------------------------------------
  addLog: (level, message, source) =>
    set((s) => ({
      logs: [
        ...s.logs.slice(-499),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
          level,
          message,
          source,
        },
      ],
    })),

  clearLogs: () => set({ logs: [] }),

  // ------------------------------------------------------------
  // HISTORY
  // ------------------------------------------------------------
  addHistoryEvent: (type, message, participantId) =>
    set((s) => ({
      history: [
        ...s.history.slice(-99),
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
          type,
          message,
          participantId,
        },
      ],
    })),

  // ------------------------------------------------------------
  // FRAMES
  // ------------------------------------------------------------
  setMosaicFrame: (f) => set({ mosaicFrame: f }),
  setLocalPreviewFrame: (f) => set({ localPreviewFrame: f }),

  // ------------------------------------------------------------
  // RESET
  // ------------------------------------------------------------
  reset: () =>
    set({
      callState: initialCallState,
      participants: [],
      localParticipant: null,
      metrics: initialMetrics,
      logs: [],
      history: [],
      mosaicFrame: null,
      localPreviewFrame: null,
    }),
}));
