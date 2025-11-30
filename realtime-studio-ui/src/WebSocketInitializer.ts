// WebSocketInitializer.tsx
import { useEffect } from "react";
import { useCallStore } from "@/stores/callStore";

export function WebSocketInitializer() {
  useEffect(() => {
    console.log("🟡 INIT WEBSOCKET…");

    const ws = new WebSocket("ws://localhost:3002/ws");

    ws.onopen = () => {
      console.log("🟢 [WS] CONNECTED TO BRIDGE");
      useCallStore.getState().setWs(ws);
    };

    ws.onerror = (err) => {
      console.error("🔴 [WS] ERROR:", err);
    };

    ws.onclose = (evt) => {
      console.warn("🟠 [WS] CLOSED:", evt.code, evt.reason);
    };

    ws.onmessage = (evt) => {
      console.log("📩 [WS RAW MESSAGE]:", evt.data);

      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch (e) {
        console.error("❌ [WS] Failed to parse JSON:", evt.data);
        return;
      }

      console.log("🔍 [WS PARSED]:", msg);

      const store = useCallStore.getState();

      switch (msg.type) {
        case "ready":
          console.log("⚡ READY EVENT:", msg.payload);
          store.setLocalControlPort(msg.payload.localControlPort);
          break;

        case "frame":
          console.log("🖼️ FRAME RECEIVED (length):", msg.payload.length);
          store.setMosaicFrame(msg.payload);
          break;

        case "participants":
          console.log("👥 PARTICIPANTS:", msg.payload);
          store.setParticipants(msg.payload);
          break;

        case "metrics":
          console.log("📊 METRICS:", msg.payload);
          store.updateMetrics(msg.payload);
          break;

        case "log":
          console.log("📜 LOG MESSAGE:", msg.payload);
          store.addLog(msg.payload.level, msg.payload.message);
          break;

        default:
          console.warn("❓ UNKNOWN WS MESSAGE:", msg);
      }
    };

    return () => {
      console.log("🔌 CLEANUP — Closing WS");
      ws.close();
    };
  }, []);

  return null;
}
