import WebSocket, { WebSocketServer } from "ws";
import { Server as HTTPServer } from "http";

let wsServer: WebSocketServer | null = null;

export function createWebSocketHub(httpServer: HTTPServer) {
  // Proper socket server attached to HTTP
  wsServer = new WebSocketServer({
    server: httpServer,
    path: "/ws"
  });

  wsServer.on("connection", (socket) => {
    console.log("[WS] client connected");

    socket.on("close", () => {
      console.log("[WS] client disconnected");
    });
  });

  console.log("[WS] WebSocket Hub initialised → path: /ws");
}

export function broadcast(type: string, payload: any) {
  if (!wsServer) return;

  const msg = JSON.stringify({ type, payload });

  wsServer.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
