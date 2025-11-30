import dgram from "dgram";
import { localCtlPort } from "./pythonClient";

const sock = dgram.createSocket("udp4");

export function sendControl(cmd: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!localCtlPort) return reject("local control port not ready");

    const msg = Buffer.from(cmd);
    sock.send(msg, localCtlPort, "127.0.0.1", (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}
