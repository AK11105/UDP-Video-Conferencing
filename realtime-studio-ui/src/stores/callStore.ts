import { create } from "zustand";

export const useCallStore = create((set) => ({
  // UI State
  isConnected: false,
  isConnecting: false,
  errorMessage: null,

  // Server configuration
  serverIp: "",
  serverPort: 5000,

  // Local Python control port (from READY)
  localControlPort: null,

  // Last video frame (base64 JPEG)
  frame: null,

  // -------------------------
  // Mutators
  // -------------------------

  setServerIp: (ip) => set({ serverIp: ip }),
  setServerPort: (port) => set({ serverPort: port }),

  setConnecting: (val) => set({ isConnecting: val }),
  setConnected: (val) => set({ isConnected: val, isConnecting: false }),
  setError: (msg) => set({ errorMessage: msg, isConnecting: false }),
  setLocalControlPort: (port) => set({ localControlPort: port }),

  setFrame: (frame) => set({ frame }),

  // Reset UI state
  reset: () =>
    set({
      isConnected: false,
      isConnecting: false,
      errorMessage: null,
      localControlPort: null,
      frame: null,
    }),
}));
