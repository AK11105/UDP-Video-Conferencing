import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";
import { broadcast } from "./wsHub";

export class PythonClient {
  proc: ChildProcessWithoutNullStreams | null = null;
  localCtlPort: number | null = null;

  start(
    serverIp: string,
    serverPort: number,
    quality: string,
    localCtl: number = 0
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.proc) return reject("Python client already running");

      const args = [
        "-m",
        "src.client_receive",
        "--server", serverIp,
        "--port", serverPort.toString(),
        "--localctl", localCtl.toString(),
      ];

      console.log("[PY] Starting python:", args.join(" "));

      this.proc = spawn("python", args, {
        cwd: process.cwd().replace("\\bridge-server", ""),
        env: process.env,
      });

      let resolved = false;

      const rl = readline.createInterface({
        input: this.proc.stdout!,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        console.log("[PY]", line);

        // detect control port
        const ctl = line.match(/\[LOCALCTL\].*:(\d+)/);
        if (ctl) {
          this.localCtlPort = parseInt(ctl[1]);
          broadcast("ready", { localControlPort: this.localCtlPort });

          if (!resolved) {
            resolved = true;
            resolve(this.localCtlPort);
          }
          return;
        }

        // detect frame
        if (line.startsWith("FRAME:")) {
          broadcast("frame", line.substring(6));
          return;
        }

        // detect json
        try {
          const msg = JSON.parse(line);
          if (msg.type) broadcast(msg.type, msg.payload);
        } catch {}
      });

      this.proc.stderr?.on("data", (data) => {
        const err = data.toString();
        console.error("[PY-ERR]", err);

        broadcast("log", {
          type: "error",
          payload: { message: err, source: "python" },
        });

        // if python fails BEFORE sending LOCALCTL → reject immediately
        if (!resolved) {
          resolved = true;
          reject(new Error("Python crashed before startup"));
        }
      });

      this.proc.on("exit", () => {
        console.log("[PY] Client exited");

        broadcast("log", {
          type: "info",
          payload: { message: "Python client exited" },
        });

        this.proc = null;

        // process died before resolving
        if (!resolved) {
          resolved = true;
          reject(new Error("Python exited early"));
        }
      });
    });
  }

  stop() {
    if (this.proc) {
      console.log("[PY] Killing Python client...");
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }
}
