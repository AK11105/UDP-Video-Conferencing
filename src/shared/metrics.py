# src/shared/metrics.py
import threading
import time
import csv
import json
import os
from statistics import mean

try:
    import psutil
except Exception:
    psutil = None

class MetricsCollector:
    """
    Lightweight metrics collector that appends a CSV row once per flush_interval
    and writes a JSON snapshot. Meant to be imported as:
        from .shared.metrics import metrics
    """

    def __init__(self, role="app", csv_path=None, json_path=None, flush_interval=1.0):
        self.role = role
        # place metrics files in cwd unless overridden
        cwd = os.getcwd()
        self.csv_path = csv_path or os.path.join(cwd, "metrics.csv")
        self.json_path = json_path or os.path.join(cwd, "metrics.json")
        self.flush_interval = flush_interval

        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._bg_thread = None
        self.reset_counters()
        self._ensure_csv_header()
        self._bg_thread = threading.Thread(target=self._bg_flush_loop, daemon=True)
        self._bg_thread.start()

        # temporary per-frame start times (keys are opaque tuples)
        self._frame_start = {}

    def reset_counters(self):
        with self._lock:
            # totals & counters
            self.total_bytes_sent = 0
            self.total_bytes_recv = 0
            self.segments_sent = 0
            self.segments_recv = 0
            self.frames_sent = 0
            self.frames_recv = 0
            self.frames_dropped = 0
            self.segment_drops = 0
            # timing lists
            self.encode_times = []
            self.decode_times = []
            self.reassembly_times = []
            self.latencies = []
            self.jitters = []
            # last sample timestamp
            self.last_sample_ts = None

    # --- public event methods (call these from your app) ---
    def inc_bytes_sent(self, n):
        with self._lock:
            self.total_bytes_sent += n
            self.segments_sent += 1

    def inc_bytes_recv(self, n):
        with self._lock:
            self.total_bytes_recv += n
            self.segments_recv += 1

    def frame_sent(self):
        with self._lock:
            self.frames_sent += 1

    def frame_received(self):
        with self._lock:
            self.frames_recv += 1

    def frame_dropped(self):
        with self._lock:
            self.frames_dropped += 1

    def segment_dropped(self):
        with self._lock:
            self.segment_drops += 1

    def add_encode_time(self, ms):
        with self._lock:
            self.encode_times.append(ms)

    def add_decode_time(self, ms):
        with self._lock:
            self.decode_times.append(ms)

    def add_reassembly_time(self, ms):
        with self._lock:
            self.reassembly_times.append(ms)

    def add_latency(self, ms):
        with self._lock:
            if self.latencies:
                prev = self.latencies[-1]
                self.jitters.append(abs(ms - prev))
            self.latencies.append(ms)

    # helpers for measuring reassembly time (key can be ('uplink', ip) or ('recv', ip) etc)
    def mark_frame_start(self, key):
        try:
            self._frame_start[key] = time.perf_counter()
        except Exception:
            pass

    def mark_frame_complete(self, key):
        try:
            start = self._frame_start.pop(key, None)
            if start is not None:
                self.add_reassembly_time((time.perf_counter() - start) * 1000.0)
        except Exception:
            pass

    # background flush loop
    def _ensure_csv_header(self):
        header = [
            "ts","role","bytes_sent","bytes_recv","segments_sent","segments_recv",
            "frames_sent","frames_recv","frames_dropped","segment_drops",
            "encode_ms_avg","decode_ms_avg","reassembly_ms_avg","latency_ms_avg","jitter_ms_avg",
            "cpu_pct","mem_pct"
        ]
        if not os.path.exists(self.csv_path):
            try:
                with open(self.csv_path, "w", newline="") as f:
                    w = csv.writer(f)
                    w.writerow(header)
            except Exception:
                pass

    def _bg_flush_loop(self):
        header = [
            "ts","role","bytes_sent","bytes_recv","segments_sent","segments_recv",
            "frames_sent","frames_recv","frames_dropped","segment_drops",
            "encode_ms_avg","decode_ms_avg","reassembly_ms_avg","latency_ms_avg","jitter_ms_avg",
            "cpu_pct","mem_pct"
        ]
        while not self._stop.is_set():
            self._flush_once(header)
            time.sleep(self.flush_interval)
        # final flush on stop
        self._flush_once(header)

    def _flush_once(self, header):
        ts = time.time()
        cpu = psutil.cpu_percent() if psutil else None
        mem = psutil.virtual_memory().percent if psutil else None

        with self._lock:
            row = {
                "ts": ts,
                "role": self.role,
                "bytes_sent": self.total_bytes_sent,
                "bytes_recv": self.total_bytes_recv,
                "segments_sent": self.segments_sent,
                "segments_recv": self.segments_recv,
                "frames_sent": self.frames_sent,
                "frames_recv": self.frames_recv,
                "frames_dropped": self.frames_dropped,
                "segment_drops": self.segment_drops,
                "encode_ms_avg": mean(self.encode_times) if self.encode_times else None,
                "decode_ms_avg": mean(self.decode_times) if self.decode_times else None,
                "reassembly_ms_avg": mean(self.reassembly_times) if self.reassembly_times else None,
                "latency_ms_avg": mean(self.latencies) if self.latencies else None,
                "jitter_ms_avg": mean(self.jitters) if self.jitters else None,
                "cpu_pct": cpu,
                "mem_pct": mem
            }

        # append CSV row
        try:
            with open(self.csv_path, "a", newline="") as f:
                w = csv.writer(f)
                vals = [ row[h] for h in header ]
                w.writerow(vals)
        except Exception:
            pass

        # write JSON snapshot (overwrite)
        try:
            with open(self.json_path, "w") as f:
                json.dump(row, f, default=str)
        except Exception:
            pass

    def stop(self):
        self._stop.set()
        if self._bg_thread is not None:
            self._bg_thread.join(timeout=2.0)

# module-level singleton
metrics = MetricsCollector(role="av_app")
