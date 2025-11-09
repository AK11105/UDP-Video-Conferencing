#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time
from concurrent.futures import ThreadPoolExecutor
from .shared.constants import *

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
    def active(self):
        cutoff = time.time() - HEARTBEAT_TTL
        with self._lock:
            stale = [k for k, ts in self._peers.items() if ts < cutoff]
            for k in stale:
                self._peers.pop(k, None)
            return list(self._peers.keys())

class AudioPeerManager:
    """Tracks routable downlink endpoints (ip, port) for audio."""
    def __init__(self):
        self._peers = {}
        self._lock = threading.Lock()
    def upsert(self, ip, port):
        with self._lock:
            self._peers[(ip, port)] = time.time()
    def remove(self, ip, port):
        with self._lock:
            self._peers.pop((ip, port), None)
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
        while remaining:
            end = min(size, start + MAX_IMAGE_DGRAM)
            self.s.sendto(struct.pack("B", remaining) + img_bytes[start:end], target)
            start = end
            remaining -= 1

# ====================== Control plane ======================

def control_plane(pm_video, pm_audio, stop_event):
    """
    Protocol (strings on CTRL_PORT):
      JOIN <video_port>
      HEARTBEAT <video_port>
      LEAVE <video_port>
      AJOIN <audio_port>
      AHEARTBEAT <audio_port>
      ALEAVE <audio_port>
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", CTRL_PORT))
    sock.settimeout(0.5)
    print(f"[CTRL] Listening on port {CTRL_PORT}")
    while not stop_event.is_set():
        try:
            data, (ip, _) = sock.recvfrom(1024)
        except socket.timeout:
            continue
        msg = data.decode(errors="ignore").strip().split()
        if not msg: continue
        cmd = msg[0]
        if cmd in {"JOIN", "HEARTBEAT", "LEAVE", "AJOIN", "AHEARTBEAT", "ALEAVE"} and len(msg) == 2:
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
                print(f"[CTRL] LEAVE from {ip}:{port}")
            elif cmd in {"AJOIN", "AHEARTBEAT"}:
                pm_audio.upsert(ip, port)
                if cmd == "AJOIN":
                    print(f"[CTRL] AJOIN (audio) from {ip}:{port}")
            elif cmd == "ALEAVE":
                pm_audio.remove(ip, port)
                print(f"[CTRL] ALEAVE (audio) from {ip}:{port}")
    sock.close()

# ====================== Video Uplink & Mixer ======================

def uplink_receiver(frames_dict, stop_event):
    """Receive JPEG segments from clients on UPLINK_PORT and store last full frame per sender."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", UPLINK_PORT))
    sock.settimeout(0.5)
    print(f"[UPLINK] Listening on port {UPLINK_PORT}")

    buffers = {}
    while not stop_event.is_set():
        try:
            seg, (ip, port) = sock.recvfrom(MAX_DGRAM)
        except socket.timeout:
            continue
        if not seg: continue
        remain = seg[0]
        key = (ip, port)
        buf = buffers.get(key)
        if buf is None:
            buf = bytearray()
            buffers[key] = buf
        buf += seg[1:]
        if remain == 1:
            complete = buffers.pop(key, None)
            if not complete: continue
            arr = np.frombuffer(bytes(complete), dtype=np.uint8)
            img = cv2.imdecode(arr, 1)
            if img is not None:
                frames_dict[key] = img
    sock.close()

def make_mosaic(images, tile_w=TILE_W, tile_h=TILE_H):
    if not images:
        return np.zeros((tile_h, tile_w, 3), dtype=np.uint8)
    tiles = [cv2.resize(img, (tile_w, tile_h)) for img in images]
    n = len(tiles)
    cols = int(math.ceil(math.sqrt(n)))
    rows = int(math.ceil(n / cols))
    while len(tiles) < rows * cols:
        tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))
    rows_img = [np.hstack(tiles[r*cols:(r+1)*cols]) for r in range(rows)]
    return np.vstack(rows_img)

def mixer_loop(frames_dict, frame_queue, stop_event):
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    while not stop_event.is_set():
        imgs = list(frames_dict.values())
        mosaic = make_mosaic(imgs)
        ok, enc = cv2.imencode(".jpg", mosaic, encode_param)
        if ok:
            try:
                frame_queue.put(enc.tobytes(), timeout=0.05)
            except queue.Full:
                pass
        time.sleep(0.03)  # ~33 fps target

# ====================== Audio Uplink, Mixer & Broadcast ======================

def audio_uplink_receiver(audio_store, stop_event):
    """
    Receive raw PCM int16 mono frames from clients on AUDIO_UPLINK_PORT.
    Packet format (network byte order):
        [uint64 timestamp_ns][uint32 seq][payload PCM int16 * AUDIO_SAMPLES]
    Store: audio_store[(ip,port)] = (timestamp_ns, np.ndarray[int16])
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", AUDIO_UPLINK_PORT))
    sock.settimeout(0.5)
    print(f"[A-UP] Listening on port {AUDIO_UPLINK_PORT}")

    header_size = 8 + 4
    while not stop_event.is_set():
        try:
            pkt, (ip, port) = sock.recvfrom(4096)  # small packets
        except socket.timeout:
            continue
        if len(pkt) < header_size:  # ignore malformed
            continue
        ts_ns, seq = struct.unpack("!QI", pkt[:header_size])
        # remainder: PCM int16 mono
        payload = np.frombuffer(pkt[header_size:], dtype=np.int16)
        if payload.size != AUDIO_SAMPLES:
            # ignore inconsistent block sizes
            continue
        audio_store[(ip, port)] = (ts_ns, payload)
    sock.close()

def audio_mixer_loop(audio_store, mix_queue, stop_event):
    """
    Mix most-recent frames from all talkers (within max age) every AUDIO_DT_MS.
    Put mixed PCM int16 into mix_queue.
    """
    frame_interval = AUDIO_DT_MS / 1000.0
    max_age_ns = AUDIO_PAYLOAD_MAX_AGE_MS * 1_000_000
    silence = np.zeros((AUDIO_SAMPLES,), dtype=np.int16)

    next_time = time.perf_counter()
    while not stop_event.is_set():
        now_ns = time.time_ns()
        # collect fresh frames
        frames = []
        for (_k, (ts_ns, block)) in list(audio_store.items()):
            if now_ns - ts_ns <= max_age_ns:
                frames.append(block.astype(np.int32))
        if not frames:
            mixed = silence
        else:
            acc = np.sum(frames, axis=0)
            # hard clip to int16
            acc = np.clip(acc, -32768, 32767).astype(np.int16)
            mixed = acc
        try:
            mix_queue.put(mixed.tobytes(), timeout=0.02)
        except queue.Full:
            pass

        # pace the loop
        next_time += frame_interval
        delay = next_time - time.perf_counter()
        if delay > 0:
            time.sleep(delay)
        else:
            next_time = time.perf_counter()

def audio_send_loop(pm_audio, mix_queue, stop_event):
    """
    Broadcast mixed PCM frames to all active audio peers on AUDIO_DOWNLINK_PORT.
    Packet format:
        [uint64 timestamp_ns][uint32 seq][PCM int16 * AUDIO_SAMPLES]
    """
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
            # send to client's advertised audio port
            sock.sendto(payload, (ip, port))
    sock.close()

# ====================== Video broadcaster (unchanged) ======================

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

    frames_dict = {}
    audio_store = {}

    # Threads
    threading.Thread(target=control_plane, args=(pm_video, pm_audio, stop_event), daemon=True).start()
    threading.Thread(target=uplink_receiver, args=(frames_dict, stop_event), daemon=True).start()
    threading.Thread(target=mixer_loop, args=(frames_dict, frame_queue, stop_event), daemon=True).start()
    threading.Thread(target=video_send_loop, args=(fs, pm_video, frame_queue, stop_event), daemon=True).start()

    threading.Thread(target=audio_uplink_receiver, args=(audio_store, stop_event), daemon=True).start()
    threading.Thread(target=audio_mixer_loop, args=(audio_store, audio_mix_queue, stop_event), daemon=True).start()
    threading.Thread(target=audio_send_loop, args=(pm_audio, audio_mix_queue, stop_event), daemon=True).start()

    print(f"[CTRL] Listening on port {CTRL_PORT}")
    print(f"[UPLINK] Listening on port {UPLINK_PORT}")
    print(f"[A-UP] Listening on port {AUDIO_UPLINK_PORT}")
    print(f"[A-DOWN] Broadcasting from port {AUDIO_DOWNLINK_PORT} (to clients' audio ports)")
    print("[INFO] AV mixer broadcasting... Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

    stop_event.set()
    time.sleep(0.2)
    sock.close()
    print("[INFO] Server stopped.")

if __name__ == "__main__":
    main()
