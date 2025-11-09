#!/usr/bin/env python
import sys, subprocess, threading, socket, tkinter as tk
from tkinter import ttk, messagebox
from pathlib import Path
import re, time

try:
    from .shared.constants import CTRL_PORT
except Exception:
    sys.path.append(str(Path(__file__).resolve().parents[1]))
    from src.shared.constants import CTRL_PORT

POLL_MS = 2000  # refresh roster every 2s
CTL_REGEX = re.compile(r"\[LOCALCTL\]\s+127\.0\.0\.1:(\d+)")

class AVClientGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("AV Client")
        self.geometry("560x520")
        self.resizable(False, False)

        # --- State ---
        self.proc = None
        self._stdout_thread = None
        self.localctl_port = None

        # --- Connection form ---
        frm = ttk.LabelFrame(self, text="Connection")
        frm.pack(fill="x", padx=10, pady=10)

        ttk.Label(frm, text="Server IP (Tailscale):").grid(row=0, column=0, sticky="e", padx=6, pady=6)
        self.server_var = tk.StringVar(value="100.0.0.0")
        ttk.Entry(frm, textvariable=self.server_var, width=28).grid(row=0, column=1, sticky="w", padx=6, pady=6)

        # Runtime toggles
        self.btn_video_on  = ttk.Button(frm, text="Video On",  command=self.video_on, state="disabled")
        self.btn_video_off = ttk.Button(frm, text="Video Off", command=self.video_off, state="disabled")
        self.btn_mute      = ttk.Button(frm, text="Mute",      command=self.mute, state="disabled")
        self.btn_unmute    = ttk.Button(frm, text="Unmute",    command=self.unmute, state="disabled")
        self.btn_video_on.grid(row=1, column=0, padx=6, pady=4, sticky="ew")
        self.btn_video_off.grid(row=1, column=1, padx=6, pady=4, sticky="ew")
        self.btn_mute.grid(row=2, column=0, padx=6, pady=4, sticky="ew")
        self.btn_unmute.grid(row=2, column=1, padx=6, pady=4, sticky="ew")

        # Join/Leave
        self.btn_join  = ttk.Button(frm, text="Join",  command=self.join_session)
        self.btn_leave = ttk.Button(frm, text="Leave", command=self.leave_session, state="disabled")
        self.btn_join.grid(row=3, column=0, padx=6, pady=(6,0), sticky="ew")
        self.btn_leave.grid(row=3, column=1, padx=6, pady=(6,0), sticky="ew")

        # Participants
        roster_frm = ttk.LabelFrame(self, text="Participants")
        roster_frm.pack(fill="both", expand=False, padx=10, pady=(0,10))
        self.roster = tk.Listbox(roster_frm, height=8)
        self.roster.pack(side="left", fill="both", expand=True, padx=6, pady=6)
        sc = ttk.Scrollbar(roster_frm, orient="vertical", command=self.roster.yview)
        sc.pack(side="right", fill="y")
        self.roster.config(yscrollcommand=sc.set)
        self.refresh_btn = ttk.Button(self, text="Refresh Participants Now", command=self.refresh_roster_once)
        self.refresh_btn.pack(pady=(0,10))

        # Log
        log_frm = ttk.LabelFrame(self, text="Log")
        log_frm.pack(fill="both", expand=True, padx=10, pady=(0,10))
        self.log_box = tk.Text(log_frm, height=10, wrap="word", state="disabled")
        self.log_box.pack(fill="both", expand=True, padx=6, pady=6)

        # schedule roster polling
        self.after(POLL_MS, self._periodic_roster_refresh)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # --------------- Join/Leave --------------- #
    def join_session(self):
        if self.proc is not None:
            return
        host = self.server_var.get().strip()
        if not host:
            messagebox.showerror("Error", "Please enter the server's Tailscale IP.")
            return

        cmd = [
            sys.executable, "-m", "src.client_receive",
            "--server", host,
            "--port", "0",
            "--aport", "0",
            "--localctl", "0",  # auto-pick a local control port
        ]
        try:
            self.proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            self._stdout_thread = threading.Thread(target=self._pipe_stdout, daemon=True)
            self._stdout_thread.start()
            self.btn_join.config(state="disabled")
            self.btn_leave.config(state="normal")
            self._set_controls_enabled(False)  # enable after we know localctl
            self._append_log(f"[INFO] Joining {host}\n")
        except Exception as e:
            self._append_log(f"[ERROR] Failed to start client: {e}\n")
            self.proc = None

    def leave_session(self):
        # Try graceful BYE over local control first
        if self.localctl_port:
            try:
                self._send_localctl("BYE")
            except Exception:
                pass
        # Wait a moment for graceful shutdown
        if self.proc:
            try:
                self.proc.wait(timeout=2.0)
            except Exception:
                pass
            try:
                self.proc.terminate()
            except Exception:
                pass
        self.proc = None
        self.localctl_port = None
        self.btn_join.config(state="normal")
        self.btn_leave.config(state="disabled")
        self._set_controls_enabled(False)
        self._append_log("[INFO] Left session.\n")

    # --------------- Runtime controls --------------- #
    def video_on(self):  self._send_localctl("VIDEO_ON")
    def video_off(self): self._send_localctl("VIDEO_OFF")
    def mute(self):      self._send_localctl("MUTE")
    def unmute(self):    self._send_localctl("UNMUTE")

    def _send_localctl(self, text: str):
        if not self.localctl_port:
            self._append_log("[WARN] Local control not ready yet.\n")
            return
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.sendto(text.encode(), ("127.0.0.1", self.localctl_port))
        sock.close()

    # --------------- Roster --------------- #
    def refresh_roster_once(self):
        host = self.server_var.get().strip()
        if not host:
            return
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(0.8)
            sock.sendto(b"WHO", (host, CTRL_PORT))
            data, _ = sock.recvfrom(4096)
            reply = data.decode(errors="ignore").strip()
            peers = []
            if reply.startswith("PEERS"):
                peers = reply.split()[1:]
            self._populate_roster(peers)
        except socket.timeout:
            self._populate_roster([])
            self._append_log("[WARN] Roster request timeout.\n")
        except Exception as e:
            self._append_log(f"[WARN] Roster error: {e}\n")
        finally:
            try: sock.close()
            except: pass

    def _populate_roster(self, peers):
        self.roster.delete(0, "end")
        if not peers:
            self.roster.insert("end", "(no participants reported)")
            return
        for p in peers:
            self.roster.insert("end", p)

    # --------------- Logging / stdout capture --------------- #
    def _pipe_stdout(self):
        if not self.proc or not self.proc.stdout:
            return
        for line in self.proc.stdout:
            self._append_log(line)
            m = CTL_REGEX.search(line)
            if m:
                self.localctl_port = int(m.group(1))
                self._set_controls_enabled(True)
        self._append_log("[INFO] Client process ended.\n")

    def _append_log(self, text: str):
        self.log_box.configure(state="normal")
        self.log_box.insert("end", text)
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def _set_controls_enabled(self, enabled: bool):
        state = "normal" if enabled else "disabled"
        self.btn_video_on.config(state=state)
        self.btn_video_off.config(state=state)
        self.btn_mute.config(state=state)
        self.btn_unmute.config(state=state)

    # --------------- Periodic roster --------------- #
    def _periodic_roster_refresh(self):
        self.refresh_roster_once()
        self.after(POLL_MS, self._periodic_roster_refresh)

    # --------------- Close --------------- #
    def _on_close(self):
        self.leave_session()
        self.destroy()

def main():
    app = AVClientGUI()
    app.mainloop()

if __name__ == "__main__":
    main()
