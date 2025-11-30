import dgram from "dgram";
import { broadcastFrame } from "./wsHub";

const VIDEO_PORT = 9999;
const sock = dgram.createSocket("udp4");

sock.on("message", (msg: Buffer) => {
  const base64 = msg.toString("base64");
  broadcastFrame(base64);
});

sock.bind(VIDEO_PORT, "127.0.0.1");
