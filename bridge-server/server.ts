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

// ------------------------------
// START SERVER
// ------------------------------
const PORT = 3001;

httpServer.listen(PORT, () => {
  console.log(`[API] Bridge + WebSocket running on http://localhost:${PORT}`);
  console.log(`[WS] WebSocket available at ws://localhost:${PORT}/ws`);
});
