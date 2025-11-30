import express from "express";
import cors from "cors";
import http from "http";
import { PythonClient } from "./pythonClient";
import { createWebSocketHub } from "./wsHub";

const app = express();
app.use(express.json());
app.use(cors());

const python = new PythonClient();

// Create HTTP server because WebSocket MUST attach to it
const httpServer = http.createServer(app);

// Attach WebSocket server to EXPRESS server
createWebSocketHub(httpServer);

// ------------------------------
// API ENDPOINTS
// ------------------------------
app.post("/api/client/start", async (req, res) => {
  const { serverIp, serverPort, quality, localCtlPort } = req.body;

  try {
    const ctlPort = await python.start(
      serverIp,
      serverPort,
      quality,
      localCtlPort ?? 0
    );

    res.json({
      success: true,
      localControlPort: ctlPort,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.toString(),
    });
  }
});

app.post("/api/control", (req, res) => {
  const { command, host, port } = req.body;

  if (!command || !port) {
    return res.status(400).json({ error: "Invalid command" });
  }

  const dgram = require("dgram");
  const sock = dgram.createSocket("udp4");

  const msg = Buffer.from(command);
  sock.send(msg, port, host, (err) => {
    sock.close();

    if (err) {
      console.error("UDP send error", err);
      return res.status(500).json({ success: false });
    }

    console.log("[CONTROL] Sent:", command, "→", host, port);
    res.json({ success: true });
  });
});


// ------------------------------
// START SERVER
// ------------------------------
const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`[API] Bridge + WebSocket running on http://localhost:${PORT}`);
  console.log(`[WS] WebSocket available at ws://localhost:${PORT}/ws`);
});
