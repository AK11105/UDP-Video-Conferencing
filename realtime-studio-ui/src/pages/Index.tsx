import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

export default function App() {
  // ----------------------------
  // STATE
  // ----------------------------
  const [serverIp, setServerIp] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [ws, setWs] = useState(null);
  const [readyPort, setReadyPort] = useState(null);
  const [mosaicFrame, setMosaicFrame] = useState(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // ----------------------------
  // WEBSOCKET INIT
  // ----------------------------
  useEffect(() => {
    console.log("[WS] Connecting → ws://localhost:3001/ws");

    const socket = new WebSocket("ws://localhost:3001/ws");
    setWs(socket);

    socket.onopen = () => console.log("[WS] Connected");
    socket.onerror = (err) => console.error("[WS ERROR]", err);
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
        console.log("[WS] READY received:", msg.payload);
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

  // ----------------------------
  // SEND COMMAND → Bridge → Python
  // ----------------------------
  function sendCommand(cmd) {
    if (!readyPort) return;
    fetch("http://localhost:3001/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: cmd,
        host: "127.0.0.1",
        port: readyPort,
      }),
    });
  }

  // ----------------------------
  // LOCAL CAMERA PREVIEW LOGIC
  // ----------------------------
  useEffect(() => {
    async function startCam() {
      if (!camOn) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        const videoEl = document.getElementById("local-video");
        if (videoEl) videoEl.srcObject = stream;
      } catch (err) {
        console.error("Camera error:", err);
      }
    }

    if (camOn) startCam();
    else {
      const videoEl = document.getElementById("local-video");
      if (videoEl && videoEl.srcObject) {
        videoEl.srcObject.getTracks().forEach((t) => t.stop());
        videoEl.srcObject = null;
      }
    }
  }, [camOn]);

  // ----------------------------
  // JOIN SESSION
  // ----------------------------
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
      console.log("API RESPONSE:", json);

      if (!json.success) {
        alert("Bridge error: " + json.error);
        setIsConnecting(false);
        return;
      }

      console.log("Python client started → waiting for READY...");
    } catch {
      alert("Could not reach bridge server");
      setIsConnecting(false);
    }
  }

  // ----------------------------
  // CALL SCREEN
  // ----------------------------
  if (isConnected) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        {/* HEADER */}
        <div
          style={{
            height: 60,
            background: "#202124",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            fontSize: 18,
          }}
        >
          <b>Meeting with {serverIp}</b>
          <span style={{ opacity: 0.7 }}>Control Port: {readyPort}</span>
        </div>

        {/* MAIN VIDEO AREA */}
        <div
          style={{
            flex: 1,
            background: "#171717",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {mosaicFrame ? (
            <img
              src={`data:image/jpeg;base64,${mosaicFrame}`}
              alt="Video"
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                borderRadius: 12,
                background: "#000",
              }}
            />
          ) : (
            <p style={{ color: "white" }}>Waiting for video…</p>
          )}

          {/* SELF VIEW PREVIEW (Google Meet style) */}
          <div
            style={{
              position: "absolute",
              bottom: 120,
              right: 30,
              width: 180,
              height: 120,
              borderRadius: 10,
              background: "#0008",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#ccc",
              border: "1px solid #333",
              overflow: "hidden",
            }}
          >
            {camOn ? (
              <video
                id="local-video"
                autoPlay
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 40 }}>🚫📷</span>
                <div style={{ marginTop: 5, fontSize: 12 }}>Camera Off</div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div
          style={{
            height: 80,
            background: "#202124",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 25,
          }}
        >
          {/* MIC */}
          <button
            onClick={() => {
              const newMic = !micOn;
              setMicOn(newMic);
              sendCommand(newMic ? "UNMUTE" : "MUTE");
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: micOn ? "#3c4043" : "#d93025",
              color: "white",
              fontSize: 26,
              border: "none",
            }}
          >
            {micOn ? "🎤" : "🔇"}
          </button>

          {/* CAMERA */}
          <button
            onClick={() => {
              const newCam = !camOn;
              setCamOn(newCam);
              sendCommand(newCam ? "VIDEO_ON" : "VIDEO_OFF");
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: camOn ? "#3c4043" : "#d93025",
              color: "white",
              fontSize: 26,
              border: "none",
            }}
          >
            {camOn ? "📷" : "🚫📷"}
          </button>

          {/* LEAVE */}
          <button
            onClick={() => {
              setIsConnected(false);
              setMosaicFrame(null);
              sendCommand("BYE");
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "#ea4335",
              color: "white",
              fontSize: 26,
              border: "none",
            }}
          >
            🚪
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------
  // JOIN SCREEN
  // ----------------------------
  return (
    <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 20 }}>Join Session</h1>

      <input
        placeholder="Enter server IP"
        value={serverIp}
        onChange={(e) => setServerIp(e.target.value)}
        style={{
          padding: 10,
          width: "50%",
          fontSize: 18,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
      />

      <br />

      <button
        onClick={handleJoin}
        disabled={isConnecting || !serverIp}
        style={{
          marginTop: 20,
          padding: "12px 25px",
          fontSize: 18,
          borderRadius: 8,
          background: "#1a73e8",
          color: "white",
          opacity: isConnecting ? 0.6 : 1,
          border: "none",
        }}
      >
        {isConnecting ? "Connecting..." : "Join"}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
