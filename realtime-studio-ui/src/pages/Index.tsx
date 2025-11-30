import React, { useState, useEffect } from "react";

export default function App() {
  const [serverIp, setServerIp] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [ws, setWs] = useState(null);
  const [readyPort, setReadyPort] = useState(null);
  const [mosaicFrame, setMosaicFrame] = useState(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // -------------------------------------------------------------
  // SEND CONTROL COMMAND TO PYTHON (via bridge)
  // -------------------------------------------------------------
  async function sendControl(cmd) {
    if (!readyPort) {
      console.warn("Local control port not ready");
      return;
    }

    try {
      await fetch("http://localhost:3001/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          host: "127.0.0.1",
          port: readyPort,
        }),
      });
    } catch (err) {
      console.error("Control error", err);
    }
  }

  // -------------------------------------------------------------
  // INIT WEBSOCKET ONCE
  // -------------------------------------------------------------
  useEffect(() => {
    console.log("[WS] Connecting → ws://localhost:3001/ws");

    const socket = new WebSocket("ws://localhost:3001/ws");
    setWs(socket);

    socket.onopen = () => console.log("[WS] Connected");
    socket.onerror = (err) => console.error("[WS] ERROR", err);
    socket.onclose = () => console.log("[WS] Closed");

    socket.onmessage = (event) => {
      console.log("[WS RAW]", event.data);

      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "ready") {
        setReadyPort(msg.payload.localControlPort);
        setIsConnected(true);
        setIsConnecting(false);
      }

      if (msg.type === "frame") {
        setMosaicFrame(msg.payload);
      }
    };

    return () => socket.close();
  }, []);

  // -------------------------------------------------------------
  // JOIN BUTTON
  // -------------------------------------------------------------
  async function handleJoin() {
    if (!serverIp.trim()) return;

    setIsConnecting(true);

    try {
      const res = await fetch("http://localhost:3001/api/client/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverIp,
          serverPort: 5000,
          quality: "medium",
          localCtlPort: 0,
        }),
      });

      const json = await res.json();
      console.log("API RES:", json);

      if (!json.success) {
        alert("Failed: " + json.error);
        setIsConnecting(false);
        return;
      }

      console.log("Python started → waiting for READY...");
    } catch (err) {
      alert("Could not reach bridge server");
      setIsConnecting(false);
    }
  }

  // -------------------------------------------------------------
  // CALL UI
  // -------------------------------------------------------------
  if (isConnected) {
    return (
      <div style={{ height: "100vh", background: "#111", color: "white" }}>
        <h2 style={{ padding: 20 }}>Connected: {serverIp}</h2>

        {mosaicFrame ? (
          <img
            src={`data:image/jpeg;base64,${mosaicFrame}`}
            style={{
              maxWidth: "90%",
              maxHeight: "70vh",
              borderRadius: 12,
              display: "block",
              margin: "auto",
            }}
          />
        ) : (
          <p style={{ textAlign: "center" }}>Waiting for video…</p>
        )}

        {/* CONTROL BUTTONS */}
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* MIC BUTTON */}
          <button
            onClick={() => {
              if (micOn) sendControl("MUTE");
              else sendControl("UNMUTE");
              setMicOn(!micOn);
            }}
            style={{
              padding: 15,
              borderRadius: "50%",
              background: micOn ? "#444" : "red",
              color: "white",
              fontSize: 20,
            }}
          >
            {micOn ? "🎤" : "🔇"}
          </button>

          {/* CAMERA BUTTON */}
          <button
            onClick={() => {
              if (camOn) sendControl("VIDEO_OFF");
              else sendControl("VIDEO_ON");
              setCamOn(!camOn);
            }}
            style={{
              padding: 15,
              borderRadius: "50%",
              background: camOn ? "#444" : "red",
              color: "white",
              fontSize: 20,
            }}
          >
            {camOn ? "📷" : "🚫📷"}
          </button>

          {/* LEAVE BUTTON */}
          <button
            onClick={() => {
              sendControl("BYE");
              setIsConnected(false);
              setMosaicFrame(null);
            }}
            style={{
              padding: 15,
              borderRadius: "50%",
              background: "#e53935",
              color: "white",
              fontSize: 20,
            }}
          >
            🚪
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // JOIN SCREEN
  // -------------------------------------------------------------
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", textAlign: "center" }}>
      <h1>Join Session</h1>

      <input
        placeholder="Server IP"
        value={serverIp}
        onChange={(e) => setServerIp(e.target.value)}
        style={{
          padding: 10,
          fontSize: 18,
          width: "60%",
          marginTop: 20,
        }}
      />

      <button
        onClick={handleJoin}
        disabled={isConnecting || !serverIp}
        style={{
          marginTop: 20,
          padding: "12px 25px",
          fontSize: 18,
          background: "#1a73e8",
          border: "none",
          borderRadius: 8,
          color: "white",
        }}
      >
        {isConnecting ? "Connecting..." : "Join"}
      </button>
    </div>
  );
}
