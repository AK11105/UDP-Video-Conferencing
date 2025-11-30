import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import readline from "readline";

export class PythonClient {
  proc: ChildProcessWithoutNullStreams | null = null;
  localCtlPort: number | null = null;

  start(serverIp: string, serverPort: number, quality: string, localCtl: number = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.proc) {
        return reject("Python client already running");
      }

      const args = [
        "-m", "src.gui_client",
        "--server", serverIp,
        "--port", serverPort.toString(),
        "--localctl", localCtl.toString()
      ];

      console.log("[PY] Starting python:", args.join(" "));

      this.proc = spawn("python", args, {
        cwd: process.cwd().replace("\\bridge-server", ""),
        env: process.env
      });

      const rl = readline.createInterface({
        input: this.proc.stdout!,
        crlfDelay: Infinity
      });

      rl.on("line", (line: string) => {
        console.log("[PY]", line);

        const match = line.match(/\[LOCALCTL\].*:(\d+)/);
        if (match) {
          this.localCtlPort = parseInt(match[1]);
          return resolve(this.localCtlPort);
        }
      });

      this.proc.on("exit", () => {
        console.log("[PY] Client exited");
        this.proc = null;
      });

      this.proc.on("error", (err) => reject(err));
    });
  }

  stop() {
    if (this.proc) {
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }
}
