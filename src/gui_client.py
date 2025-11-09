#!/usr/bin/env python
import sys, subprocess, threading, socket, tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path

# Import shared constants directly so the GUI knows the CTRL_PORT
try:
    from .shared.constants import CTRL_PORT
except Exception:
    # Fallback if run as a script from project root
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from src.shared.constants import CTRL_PORT

POLL_MS = 2000  # refresh roster every 2s

class AVClientGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AV Client")
        self.geometry("520x420")
        self.resizable(False, False)

        # --- State ---
        self.proc = None
        self._running = False
        self._stdout_thread = None

        # --- Top: Connection form ---
        frm = ttk.LabelFrame(self, text="Connection")
        frm.pack(fill="x", padx=10, pady=10)

        ttk.Label(frm, text="Server IP (Tailscale):").grid(row=0, column=0, sticky="e", padx=6, pady=6)
        self.server_var = tk.StringVar(value="100.0.0.0")
        ttk.Entry(frm, textvariable=self.server_var, width=28).grid(row=0, column=1, sticky="w", padx=6, pady=6)

        # Video/audio toggles
        self.video_on = tk.BooleanVar(value=True)
        self.audio_on = tk.BooleanVar(value=True)
        ttk.Checkbutton(frm, text="Video On", variable=self.video_on).grid(row=1, column=0, sticky="w", padx=6)
        ttk.Checkbutton(frm, text="Audio On", variable=self.audio_on).grid(row=1, column=1, sticky="w", padx=6)

        # Buttons
        btns = ttk.Frame(frm)
        btns.grid(row=2, column=0, columnspan=2, pady=(6, 0))
        self.join_btn  = ttk.Button(btns, text="Join",  command=self.join_session)
        self.leave_btn = ttk.Button(btns, text="Leave", command=self.leave_session, state="disabled")
        self.join_btn.grid(row=0, column=0, padx=6)
        self.leave_btn.grid(row=0, column=1, padx=6)

        # --- Middle: Participants ---
        roster_frm = ttk.LabelFrame(self, text="Participants")
        roster_frm.pack(fill="both", expand=False, padx=10, pady=(0,10))
        self.roster = tk.Listbox(roster_frm, height=8)
        self.roster.pack(side="left", fill="both", expand=True, padx=6, pady=6)
        sc = ttk.Scrollbar(roster_frm, orient="vertical", command=self.roster.yview)
        sc.pack(side="right", fill="y")
        self.roster.config(yscrollcommand=sc.set)

        # Manual refresh
        self.refresh_btn = ttk.Button(self, text="Refresh Participants Now", command=self.refresh_roster_once)
        self.refresh_btn.pack(pady=(0,10))

        # --- Bottom: Log output (tail of client stdout) ---
        log_frm = ttk.LabelFrame(self, text="Log")
        log_frm.pack(fill="both", expand=True, padx=10, pady=(0,10))
        self.log_box = tk.Text(log_frm, height=8, wrap="word", state="disabled")
        self.log_box.pack(fill="both", expand=True, padx=6, pady=6)

        # periodic roster refresh
        self.after(POLL_MS, self._periodic_roster_refresh)

        # close handler
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ----------------- Session control ----------------- #

    def join_session(self):
        if self.proc is not None:
            return
        host = self.server_var.get().strip()
        if not host:
            messagebox.showerror("Error", "Please enter the server's Tailscale IP.")
            return

        # Build command
        # Use module form so project imports resolve: python -m src.client_receive
        cmd = [
            sys.executable, "-m", "src.client_receive",
            "--server", host,
            "--port", "0",
            "--aport", "0",
        ]
        if not self.video_on.get():
            cmd.append("--no-video")
        if not self.audio_on.get():
            cmd.append("--no-audio")

        try:
            self.proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            self._running = True
            self._stdout_thread = threading.Thread(target=self._pipe_stdout, daemon=True)
            self._stdout_thread.start()
        except Exception as e:
            self._append_log(f"[ERROR] Failed to start client: {e}\n")
            self.proc = None
            self._running = False
            return

        self.join_btn.configure(state="disabled")
        self.leave_btn.configure(state="normal")
        self._append_log(f"[INFO] Joined session at {host}\n")

    def leave_session(self):
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass
            self.proc = None
            self._running = False
            self.join_btn.configure(state="normal")
            self.leave_btn.configure(state="disabled")
            self._append_log("[INFO] Left session.\n")

    # ----------------- Logging ----------------- #

    def _pipe_stdout(self):
        if not self.proc or not self.proc.stdout:
            return
        for line in self.proc.stdout:
            self._append_log(line)
        self._append_log("[INFO] Client process ended.\n")

    def _append_log(self, text: str):
        self.log_box.configure(state="normal")
        self.log_box.insert("end", text)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    # ----------------- Participants (roster) ----------------- #

    def refresh_roster_once(self):
        host = self.server_var.get().strip()
        if not host:
            return
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.8)
            # send WHO to server control plane
            sock.sendto(b"WHO", (host, CTRL_PORT))
            data, _ = sock.recvfrom(4096)
            reply = data.decode(errors="ignore").strip()
            # Expected format: "PEERS ip:port ip:port ..."
            peers = []
            if reply.startswith("PEERS"):
                parts = reply.split()[1:]
                peers = parts
            self._populate_roster(peers)
        except socket.timeout:
            self._populate_roster([])
            self._append_log("[WARN] Roster request timeout.\n")
        except Exception as e:
            self._append_log(f"[WARN] Roster error: {e}\n")
        finally:
            try:
                sock.close()
            except Exception:
                pass

    def _populate_roster(self, peers):
        self.roster.delete(0, "end")
        if not peers:
            self.roster.insert("end", "(no participants reported)")
            return
        for p in peers:
            self.roster.insert("end", p)

    def _periodic_roster_refresh(self):
        # auto-refresh every POLL_MS
        self.refresh_roster_once()
        self.after(POLL_MS, self._periodic_roster_refresh)

    # ----------------- Window close ----------------- #

    def _on_close(self):
        self.leave_session()
        self.destroy()

def main():
    app = AVClientGUI()
    app.mainloop()

if __name__ == "__main__":
    main()
