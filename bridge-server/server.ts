import express from "express";
import cors from "cors";
import { PythonClient } from "./pythonClient";
import { createWebSocketHub } from "./wsHub";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3001;
const python = new PythonClient();

createWebSocketHub(); // start websocket

app.post("/api/client/start", async (req, res) => {
  const { serverIp, serverPort, quality, localCtlPort } = req.body;

  try {
    const ctlPort = await python.start(serverIp, serverPort, quality, localCtlPort ?? 0);

    res.json({
      success: true,
      localControlPort: ctlPort
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.toString() });
  }
});

app.listen(PORT, () => {
  console.log("[API] Bridge server running on port", PORT);
});
