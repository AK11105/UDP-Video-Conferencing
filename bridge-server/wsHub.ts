import WebSocket from "ws";

let wsServer: WebSocket.Server;

export function createWebSocketHub() {
  wsServer = new WebSocket.Server({ port: 3002, path: "/ws" });

  wsServer.on("connection", (socket) => {
    console.log("[WS] client connected");

    socket.on("close", () => {
      console.log("[WS] client disconnected");
    });
  });

  console.log("[WS] WebSocket listening on ws://localhost:3002/ws");
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
