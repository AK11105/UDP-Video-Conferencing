#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time
from concurrent.futures import ThreadPoolExecutor
from .shared.constants import *
from .shared.metrics import metrics


VIDEO_MAX_AGE_MS = 1000  # 1 second staleness threshold


# ============================================================
# PARTICIPANT MANAGERS
# ============================================================
class ParticipantManager:
    """Tracks active video receivers."""

    def __init__(self):
        self._peers = {}
        self._lock = threading.Lock()

    def upsert(self, ip, port):
        with self._lock:
            self._peers[(ip, port)] = time.time()

    def remove(self, ip, port):
        with self._lock:
            self._peers.pop((ip, port), None)

    def remove_all_ip(self, ip):
        with self._lock:
            for k in [p for p in self._peers if p[0] == ip]:
                self._peers.pop(k, None)

    def active(self):
        cutoff = time.time() - HEARTBEAT_TTL

        with self._lock:
            stale = [k for k, ts in self._peers.items() if ts < cutoff]
            for k in stale:
                self._peers.pop(k, None)

            return list(self._peers.keys())


class AudioPeerManager:
    """Tracks active audio receivers."""

    def __init__(self):
        self._peers = {}
        self._lock = threading.Lock()

    def upsert(self, ip, port):
        with self._lock:
            self._peers[(ip, port)] = time.time()

    def remove(self, ip, port):
        with self._lock:
            self._peers.pop((ip, port), None)

    def remove_all_ip(self, ip):
        with self._lock:
            for k in [p for p in self._peers if p[0] == ip]:
                self._peers.pop(k, None)

    def active(self):
        cutoff = time.time() - HEARTBEAT_TTL

        with self._lock:
            stale = [k for k, ts in self._peers.items() if ts < cutoff]
            for k in stale:
                self._peers.pop(k, None)

            return list(self._peers.keys())


# ============================================================
# VIDEO SEGMENTER
# ============================================================
class FrameSegment:
    def __init__(self, sock):
        self.s = sock

    def send_to(self, img_bytes, target):
        size = len(img_bytes)
        count = int(math.ceil(size / float(MAX_IMAGE_DGRAM)))

        start = 0
        remaining = count

        # mark start of frame
        try:
            metrics.mark_frame_start(("send_to", target[0]))
        except:
            pass

        while remaining:
            end = min(size, start + MAX_IMAGE_DGRAM)
            chunk = img_bytes[start:end]

            self.s.sendto(struct.pack("B", remaining) + chunk, target)

            try:
                metrics.inc_bytes_sent(len(chunk))
            except:
                pass

            start = end
            remaining -= 1

        try:
            metrics.frame_sent()
        except:
            pass


# ============================================================
# CONTROL PLANE
# ============================================================
def control_plane(pm_video, pm_audio, frames_dict, video_off_set, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", CTRL_PORT))
    sock.settimeout(0.5)

    print(f"[CTRL] Listening on UDP/{CTRL_PORT}")

    while not stop_event.is_set():
        try:
            data, (ip, src_port) = sock.recvfrom(1024)
        except socket.timeout:
            continue

        msg = data.decode(errors="ignore").strip().split()
        if not msg:
            continue

        cmd = msg[0]

        # — WHO request for listing peers —
        if cmd == "WHO":
            peers = pm_video.active()
            payload = "PEERS " + " ".join([f"{pip}:{pport}" for pip, pport in peers])
            try:
                sock.sendto(payload.encode(), (ip, src_port))
            except:
                pass
            continue

        # — Video JOIN / HEARTBEAT / LEAVE —
        if cmd in {"JOIN", "HEARTBEAT", "LEAVE"} and len(msg) == 2:
            try:
                port = int(msg[1])
            except:
                continue

            if cmd in {"JOIN", "HEARTBEAT"}:
                pm_video.upsert(ip, port)
                if cmd == "JOIN":
                    print(f"[CTRL] JOIN from {ip}:{port}")

            elif cmd == "LEAVE":
                pm_video.remove(ip, port)
                frames_dict.pop(ip, None)
                pm_video.remove_all_ip(ip)
                print(f"[CTRL] LEAVE from {ip}:{port}")

            continue

        # — Audio control —
        if cmd in {"AJOIN", "AHEARTBEAT", "ALEAVE"} and len(msg) == 2:
            try:
                port = int(msg[1])
            except:
                continue

            if cmd in {"AJOIN", "AHEARTBEAT"}:
                pm_audio.upsert(ip, port)
                if cmd == "AJOIN":
                    print(f"[CTRL] AJOIN audio from {ip}:{port}")

            elif cmd == "ALEAVE":
                pm_audio.remove(ip, port)
                pm_audio.remove_all_ip(ip)
                print(f"[CTRL] ALEAVE audio from {ip}:{port}")

            continue

        # — video on/off toggle —
        if cmd == "VIDOFF":
            video_off_set.add(ip)
            frames_dict.pop(ip, None)
            continue

        if cmd == "VIDON":
            video_off_set.discard(ip)
            continue

    sock.close()


# ============================================================
# UPLINK RECEIVER (VIDEO)
# ============================================================
def uplink_receiver(frames_dict, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", UPLINK_PORT))
    sock.settimeout(0.5)

    print(f"[UPLINK] Listening on UDP/{UPLINK_PORT}")

    buffers = {}

    while not stop_event.is_set():
        try:
            seg, (ip, _) = sock.recvfrom(MAX_DGRAM)
        except socket.timeout:
            continue
        except:
            continue

        metrics.inc_bytes_recv(len(seg))

        remain = seg[0]

        if ip not in buffers:
            buffers[ip] = bytearray()
            try:
                metrics.mark_frame_start(("uplink", ip))
            except:
                pass

        buffers[ip] += seg[1:]

        if remain == 1:
            full = buffers.pop(ip, None)
            if full is None:
                metrics.segment_dropped()
                continue

            arr = np.frombuffer(bytes(full), dtype=np.uint8)

            tdec = time.perf_counter()
            img = cv2.imdecode(arr, 1)
            dec_ms = (time.perf_counter() - tdec) * 1000

            if img is not None:
                frames_dict[ip] = (time.time_ns(), img)
                metrics.frame_received()
                metrics.add_decode_time(dec_ms)
                metrics.mark_frame_complete(("uplink", ip))
            else:
                metrics.frame_dropped()

    sock.close()


# ============================================================
# MOSAIC BUILDER
# ============================================================
def make_mosaic_from_peers(peers, frames_dict, video_off_set, tile_w=TILE_W, tile_h=TILE_H):
    now_ns = time.time_ns()
    cutoff_ns = VIDEO_MAX_AGE_MS * 1_000_000

    tiles = []

    for ip, _port in peers:
        stale = True

        if ip not in video_off_set:
            entry = frames_dict.get(ip)
            if entry:
                ts, img = entry
                if now_ns - ts <= cutoff_ns:
                    tiles.append(cv2.resize(img, (tile_w, tile_h)))
                    stale = False

        if stale:
            tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))

    if not tiles:
        return np.zeros((tile_h, tile_w, 3), dtype=np.uint8)

    n = len(tiles)
    cols = int(math.ceil(math.sqrt(n)))
    rows = int(math.ceil(n / cols))

    while len(tiles) < rows * cols:
        tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))

    row_imgs = [np.hstack(tiles[r * cols:(r + 1) * cols]) for r in range(rows)]
    return np.vstack(row_imgs)


# ============================================================
# VIDEO MIXER
# ============================================================
def mixer_loop(pm_video, frames_dict, video_off_set, frame_queue, stop_event):
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]

    while not stop_event.is_set():
        peers = pm_video.active()
        mosaic = make_mosaic_from_peers(peers, frames_dict, video_off_set)

        t0 = time.perf_counter()
        ok, enc = cv2.imencode(".jpg", mosaic, encode_param)
        enc_ms = (time.perf_counter() - t0) * 1000

        if ok:
            metrics.add_encode_time(enc_ms)
            try:
                frame_queue.put(enc.tobytes(), timeout=0.05)
            except queue.Full:
                pass

        time.sleep(0.03)  # ~30 FPS


# ============================================================
# AUDIO UPLINK
# ============================================================
def audio_uplink_receiver(audio_store, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", AUDIO_UPLINK_PORT))
    sock.settimeout(0.5)

    print(f"[A-UP] Listening on UDP/{AUDIO_UPLINK_PORT}")

    header_bytes = 12

    while not stop_event.is_set():
        try:
            pkt, (ip, port) = sock.recvfrom(4096)
        except socket.timeout:
            continue
        except:
            continue

        if len(pkt) < header_bytes:
            continue

        ts, seq = struct.unpack("!QI", pkt[:header_bytes])
        audio = np.frombuffer(pkt[header_bytes:], dtype=np.int16)

        if audio.size != AUDIO_SAMPLES:
            continue

        audio_store[(ip, port)] = (ts, audio)

    sock.close()


# ============================================================
# AUDIO MIXER
# ============================================================
def audio_mixer_loop(audio_store, mix_queue, stop_event):
    frame_interval = AUDIO_DT_MS / 1000.0
    cutoff_ns = AUDIO_PAYLOAD_MAX_AGE_MS * 1_000_000
    silence = np.zeros((AUDIO_SAMPLES,), dtype=np.int16)

    next_tick = time.perf_counter()

    while not stop_event.is_set():
        now_ns = time.time_ns()

        frames = []

        for (ip, port), (ts_ns, audio) in list(audio_store.items()):
            if now_ns - ts_ns <= cutoff_ns:
                frames.append(audio.astype(np.int32))

        if not frames:
            mixed = silence
        else:
            mixed = np.clip(sum(frames), -32768, 32767).astype(np.int16)

        try:
            mix_queue.put(mixed.tobytes(), timeout=0.02)
        except queue.Full:
            pass

        next_tick += frame_interval
        delay = next_tick - time.perf_counter()
        if delay > 0:
            time.sleep(delay)
        else:
            next_tick = time.perf_counter()


# ============================================================
# AUDIO DOWNLINK
# ============================================================
def audio_send_loop(pm_audio, mix_queue, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    seq = 0

    while not stop_event.is_set():
        try:
            block = mix_queue.get(timeout=0.1)
        except queue.Empty:
            continue

        ts_ns = time.time_ns()
        header = struct.pack("!QI", ts_ns, seq)
        seq = (seq + 1) % (2**32)

        payload = header + block

        for ip, port in pm_audio.active():
            try:
                sock.sendto(payload, (ip, port))
                metrics.inc_bytes_sent(len(payload))
            except:
                pass

    sock.close()


# ============================================================
# VIDEO BROADCASTER
# ============================================================
def video_send_loop(fs, pm_video, frame_queue, stop_event):
    executor = ThreadPoolExecutor(max_workers=SEND_WORKERS)

    while not stop_event.is_set():
        try:
            img_bytes = frame_queue.get(timeout=0.1)
        except queue.Empty:
            continue

        for peer in pm_video.active():
            executor.submit(fs.send_to, img_bytes, peer)


# ============================================================
# MAIN SERVER
# ============================================================
def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    fs = FrameSegment(sock)

    pm_video = ParticipantManager()
    pm_audio = AudioPeerManager()

    frames_dict = {}       # latest frame per IP
    video_off_set = set()  # IPs manually hidden

    frame_queue = queue.Queue(maxsize=4)
    audio_queue = queue.Queue(maxsize=8)

    stop_event = threading.Event()

    # — THREADS —
    threading.Thread(target=control_plane, args=(pm_video, pm_audio, frames_dict, video_off_set, stop_event), daemon=True).start()
    threading.Thread(target=uplink_receiver, args=(frames_dict, stop_event), daemon=True).start()
    threading.Thread(target=mixer_loop, args=(pm_video, frames_dict, video_off_set, frame_queue, stop_event), daemon=True).start()
    threading.Thread(target=video_send_loop, args=(fs, pm_video, frame_queue, stop_event), daemon=True).start()

    audio_store = {}
    threading.Thread(target=audio_uplink_receiver, args=(audio_store, stop_event), daemon=True).start()
    threading.Thread(target=audio_mixer_loop, args=(audio_store, audio_queue, stop_event), daemon=True).start()
    threading.Thread(target=audio_send_loop, args=(pm_audio, audio_queue, stop_event), daemon=True).start()

    print(f"[CTRL]   Listening on {CTRL_PORT}")
    print(f"[UPLINK] Listening on {UPLINK_PORT}")
    print(f"[A-UP]   Listening on {AUDIO_UPLINK_PORT}")
    print(f"[A-DOWN] Broadcasting from {AUDIO_DOWNLINK_PORT}")
    print("[SERVER] Mixer running — press Ctrl+C to stop")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

    stop_event.set()
    time.sleep(0.2)
    sock.close()

    metrics.stop()
    print("[SERVER] fully stopped.")


if __name__ == "__main__":
    main()
