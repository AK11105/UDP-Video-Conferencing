import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useCallStore } from "@/stores/callStore";
import "./index.css";


function initWebSocket() {
  const ws = new WebSocket("ws://localhost:3002/ws");

  ws.onopen = () => {
    console.log("[WS] Connected to bridge");
    useCallStore.getState().setWs(ws);
  };

  ws.onclose = () => {
    console.log("[WS] Disconnected from bridge");
    useCallStore.getState().addLog("error", "WebSocket disconnected", "bridge");

    // optional: auto-reconnect
    setTimeout(initWebSocket, 1500);
  };

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    const store = useCallStore.getState();

    switch (data.type) {
      case "ready":
        console.log("[WS] Python client READY");
        store.addLog("info", "Python client initialized", "python");
        break;

      case "frame":
        store.setMosaicFrame(data.payload);
        break;

      case "log":
        store.addLog(data.payload.level, data.payload.message, "python");
        break;

      case "metrics":
        store.updateMetrics(data.payload);
        break;

      case "participants":
        store.setParticipants(data.payload);
        break;

      default:
        console.warn("[WS] Unknown message type", data);
    }
  };
}

initWebSocket();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
