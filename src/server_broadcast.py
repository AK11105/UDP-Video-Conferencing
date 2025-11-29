#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time
from concurrent.futures import ThreadPoolExecutor
from .shared.constants import *
from .shared.metrics import metrics

# Local video staleness (ms) before we show black instead of last frame
VIDEO_MAX_AGE_MS = 1000  # 1s

# ====================== Participant registries ======================

class ParticipantManager:
    """Tracks routable downlink endpoints (ip, port) for video."""
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
            for k in [k for k in self._peers if k[0] == ip]:
                self._peers.pop(k, None)
    def active(self):
        cutoff = time.time() - HEARTBEAT_TTL
        with self._lock:
            stale = [k for k, ts in self._peers.items() if ts < cutoff]
            for k in stale:
                self._peers.pop(k, None)
            return list(self._peers.keys())

class AudioPeerManager:
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
            for k in [k for k in self._peers if k[0] == ip]:
                self._peers.pop(k, None)
    def active(self):
        cutoff = time.time() - HEARTBEAT_TTL
        with self._lock:
            stale = [k for k, ts in self._peers.items() if ts < cutoff]
            for k in stale:
                self._peers.pop(k, None)
            return list(self._peers.keys())

# ====================== Video segmentation ======================

class FrameSegment:
    def __init__(self, sock):
        self.s = sock
    def send_to(self, img_bytes, target):
        size = len(img_bytes)
        count = int(math.ceil(size / float(MAX_IMAGE_DGRAM)))
        start = 0
        remaining = count
        # mark frame start for this peer
        try: metrics.mark_frame_start(("send_to", target[0]))
        except: pass
        while remaining:
            end = min(size, start + MAX_IMAGE_DGRAM)
            chunk = img_bytes[start:end]
            self.s.sendto(struct.pack("B", remaining) + chunk, target)
            try: metrics.inc_bytes_sent(len(chunk))
            except: pass
            start = end
            remaining -= 1
        try: metrics.frame_sent()
        except: pass

# ====================== Control plane ======================

def control_plane(pm_video, pm_audio, frames_dict, video_off_set, stop_event):
    """
    Strings on CTRL_PORT:
      Video: JOIN/HEARTBEAT/LEAVE <video_port>, WHO
      Audio: AJOIN/AHEARTBEAT/ALEAVE <audio_port>
      Video toggle: VIDOFF / VIDON   (per IP)
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", CTRL_PORT))
    sock.settimeout(0.5)
    print(f"[CTRL] Listening on port {CTRL_PORT}")
    while not stop_event.is_set():
        try:
            data, (ip, src_port) = sock.recvfrom(1024)
        except socket.timeout:
            continue
        msg = data.decode(errors="ignore").strip().split()
        if not msg:
            continue
        cmd = msg[0]

        # Roster
        if cmd == "WHO":
            peers = pm_video.active()
            payload = "PEERS " + " ".join([f"{p_ip}:{p_port}" for (p_ip, p_port) in peers])
            try:
                sock.sendto(payload.encode(), (ip, src_port))
            except Exception:
                pass
            continue

        # Video control
        if cmd in {"JOIN", "HEARTBEAT", "LEAVE"} and len(msg) == 2:
            try:
                port = int(msg[1])
            except ValueError:
                continue
            if cmd in {"JOIN", "HEARTBEAT"}:
                pm_video.upsert(ip, port)
                if cmd == "JOIN":
                    print(f"[CTRL] JOIN from {ip}:{port}")
            elif cmd == "LEAVE":
                pm_video.remove(ip, port)
                # Also purge any stored frames for this IP so it disappears immediately
                frames_dict.pop(ip, None)
                # And remove other downlink entries of same IP (different ports)
                pm_video.remove_all_ip(ip)
                print(f"[CTRL] LEAVE from {ip}:{port}")
            continue

        # Audio control
        if cmd in {"AJOIN", "AHEARTBEAT", "ALEAVE"} and len(msg) == 2:
            try:
                port = int(msg[1])
            except ValueError:
                continue
            if cmd in {"AJOIN", "AHEARTBEAT"}:
                pm_audio.upsert(ip, port)
                if cmd == "AJOIN":
                    print(f"[CTRL] AJOIN (audio) from {ip}:{port}")
            elif cmd == "ALEAVE":
                pm_audio.remove(ip, port)
                pm_audio.remove_all_ip(ip)
                print(f"[CTRL] ALEAVE (audio) from {ip}:{port}")
            continue

        # Video on/off toggle (immediate blackout)
        if cmd == "VIDOFF":
            video_off_set.add(ip)
            # also discard any cached image so it doesn't linger
            frames_dict.pop(ip, None)
            continue
        if cmd == "VIDON":
            if ip in video_off_set:
                video_off_set.discard(ip)
            continue
    sock.close()

# ====================== Video Uplink & Mixer ======================

def uplink_receiver(frames_dict, stop_event):
    """
    Receive JPEG segments from clients on UPLINK_PORT.
    Store per-IP: frames_dict[ip] = (ts_ns, image)
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", UPLINK_PORT))
    sock.settimeout(0.5)
    print(f"[UPLINK] Listening on port {UPLINK_PORT}")

    buffers = {}
    while not stop_event.is_set():
        try:
            seg, (ip, _port) = sock.recvfrom(MAX_DGRAM)
        except socket.timeout:
            continue
        except Exception:
            continue
        if not seg:
            continue

        # count bytes/segments received
        try: metrics.inc_bytes_recv(len(seg))
        except: pass

        remain = seg[0]
        buf = buffers.get(ip)
        if buf is None:
            buf = bytearray()
            buffers[ip] = buf
            # mark reassembly start for this ip
            try: metrics.mark_frame_start(("uplink", ip))
            except: pass
        buf += seg[1:]

        if remain == 1:
            complete = buffers.pop(ip, None)
            if not complete:
                try: metrics.segment_dropped()
                except: pass
                continue
            arr = np.frombuffer(bytes(complete), dtype=np.uint8)
            tdec0 = time.perf_counter()
            img = cv2.imdecode(arr, 1)
            dec_ms = (time.perf_counter() - tdec0) * 1000.0
            if img is not None:
                frames_dict[ip] = (time.time_ns(), img)
                try:
                    metrics.add_decode_time(dec_ms)
                    metrics.frame_received()
                    metrics.mark_frame_complete(("uplink", ip))
                except: pass
            else:
                try: metrics.frame_dropped()
                except: pass
    sock.close()

def make_mosaic_from_peers(peers, frames_dict, video_off_set, tile_w=TILE_W, tile_h=TILE_H):
    """Build a grid where each active peer gets either its fresh frame or a black tile."""
    tiles = []
    now_ns = time.time_ns()
    max_age_ns = VIDEO_MAX_AGE_MS * 1_000_000
    for (ip, _port) in peers:
        use_black = False
        if ip in video_off_set:
            use_black = True
        else:
            entry = frames_dict.get(ip)
            if entry is None:
                use_black = True
            else:
                ts_ns, img = entry
                if now_ns - ts_ns > max_age_ns:
                    use_black = True
        if use_black:
            tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))
        else:
            _ts, img = frames_dict[ip]
            tiles.append(cv2.resize(img, (tile_w, tile_h)))

    if not tiles:
        return np.zeros((tile_h, tile_w, 3), dtype=np.uint8)

    n = len(tiles)
    cols = int(math.ceil(math.sqrt(n)))
    rows = int(math.ceil(n / cols))
    while len(tiles) < rows * cols:
        tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))
    rows_img = [np.hstack(tiles[r*cols:(r+1)*cols]) for r in range(rows)]
    return np.vstack(rows_img)

def mixer_loop(pm_video, frames_dict, video_off_set, frame_queue, stop_event):
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    while not stop_event.is_set():
        peers = pm_video.active()  # list of (ip, port)
        mosaic = make_mosaic_from_peers(peers, frames_dict, video_off_set)
        tenc0 = time.perf_counter()
        ok, enc = cv2.imencode(".jpg", mosaic, encode_param)
        enc_ms = (time.perf_counter() - tenc0) * 1000.0
        if ok:
            try: metrics.add_encode_time(enc_ms)
            except: pass
            try:
                frame_queue.put(enc.tobytes(), timeout=0.05)
            except queue.Full:
                pass
        time.sleep(0.03)  # ~33 fps target

# ====================== Audio (unchanged from your last version) ======================

def audio_uplink_receiver(audio_store, stop_event):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", AUDIO_UPLINK_PORT))
    sock.settimeout(0.5)
    print(f"[A-UP] Listening on port {AUDIO_UPLINK_PORT}")

    header_size = 8 + 4
    while not stop_event.is_set():
        try:
            pkt, (ip, port) = sock.recvfrom(4096)
        except socket.timeout:
            continue
        if len(pkt) < header_size:
            continue
        ts_ns, seq = struct.unpack("!QI", pkt[:header_size])
        payload = np.frombuffer(pkt[header_size:], dtype=np.int16)
        if payload.size != AUDIO_SAMPLES:
            continue
        audio_store[(ip, port)] = (ts_ns, payload)
    sock.close()

def audio_mixer_loop(audio_store, mix_queue, stop_event):
    frame_interval = AUDIO_DT_MS / 1000.0
    max_age_ns = AUDIO_PAYLOAD_MAX_AGE_MS * 1_000_000
    silence = np.zeros((AUDIO_SAMPLES,), dtype=np.int16)
    next_time = time.perf_counter()
    while not stop_event.is_set():
        now_ns = time.time_ns()
        frames = []
        for (_k, (ts_ns, block)) in list(audio_store.items()):
            if now_ns - ts_ns <= max_age_ns:
                frames.append(block.astype(np.int32))
        mixed = silence if not frames else np.clip(np.sum(frames, axis=0), -32768, 32767).astype(np.int16)
        try:
            mix_queue.put(mixed.tobytes(), timeout=0.02)
        except queue.Full:
            pass
        next_time += frame_interval
        delay = next_time - time.perf_counter()
        if delay > 0: time.sleep(delay)
        else: next_time = time.perf_counter()

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
        seq = (seq + 1) & 0xFFFFFFFF
        payload = header + block
        for (ip, port) in pm_audio.active():
            try:
                sock.sendto(payload, (ip, port))
                metrics.inc_bytes_sent(len(payload))
            except:
                pass
    sock.close()

# ====================== Video broadcaster ======================

def video_send_loop(fs, pm_video, frame_queue, stop_event):
    executor = ThreadPoolExecutor(max_workers=SEND_WORKERS)
    while not stop_event.is_set():
        try:
            img_bytes = frame_queue.get(timeout=0.1)
        except queue.Empty:
            continue
        peers = pm_video.active()
        if not peers: continue
        for peer in peers:
            executor.submit(fs.send_to, img_bytes, peer)

# ====================== Main ======================

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    fs = FrameSegment(sock)
    pm_video = ParticipantManager()
    pm_audio = AudioPeerManager()

    frame_queue = queue.Queue(maxsize=4)
    audio_mix_queue = queue.Queue(maxsize=8)
    stop_event = threading.Event()

    # per-IP latest frame + ts; and a set of IPs with video turned off
    frames_dict = {}          # { ip: (ts_ns, image) }
    video_off_set = set()     # { ip }

    # Threads
    threading.Thread(target=control_plane, args=(pm_video, pm_audio, frames_dict, video_off_set, stop_event), daemon=True).start()
    threading.Thread(target=uplink_receiver, args=(frames_dict, stop_event), daemon=True).start()
    threading.Thread(target=mixer_loop, args=(pm_video, frames_dict, video_off_set, frame_queue, stop_event), daemon=True).start()
    threading.Thread(target=video_send_loop, args=(fs, pm_video, frame_queue, stop_event), daemon=True).start()

    threading.Thread(target=audio_uplink_receiver, args=(audio_store := {}, stop_event), daemon=True).start()
    threading.Thread(target=audio_mixer_loop, args=(audio_store, audio_mix_queue, stop_event), daemon=True).start()
    threading.Thread(target=audio_send_loop, args=(pm_audio, audio_mix_queue, stop_event), daemon=True).start()

    print(f"[CTRL]   Listening on port {CTRL_PORT}")
    print(f"[UPLINK] Listening on port {UPLINK_PORT}")
    print(f"[A-UP]   Listening on port {AUDIO_UPLINK_PORT}")
    print(f"[A-DOWN] Broadcasting from port {AUDIO_DOWNLINK_PORT}")
    print("[INFO] AV mixer broadcasting... Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    stop_event.set()
    time.sleep(0.2)
    sock.close()
    # stop metrics background thread gracefully
    try:
        metrics.stop()
    except: pass
    print("[INFO] Server stopped.")

if __name__ == "__main__":
    main()
