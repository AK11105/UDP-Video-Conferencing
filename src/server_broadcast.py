#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, math, threading, queue, time
from concurrent.futures import ThreadPoolExecutor
from .shared.constants import *

# ------------------- participant registry ------------------- #

class ParticipantManager:
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

# ------------------- frame segmentation ------------------- #

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

# ------------------- control plane ------------------- #

def control_plane(pm, stop_event):
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
        if len(msg) != 2:
            continue
        cmd, port = msg[0], int(msg[1])
        if cmd in {"JOIN", "HEARTBEAT"}:
            pm.upsert(ip, port)
            if cmd == "JOIN":
                print(f"[CTRL] JOIN from {ip}:{port}")
        elif cmd == "LEAVE":
            pm.remove(ip, port)
            print(f"[CTRL] LEAVE from {ip}:{port}")
    sock.close()

# ------------------- uplink receiver ------------------- #

def uplink_receiver(frames_dict, stop_event):
    """
    Receive JPEG segments from all clients and store their last complete frame.
    """
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
        if not seg:
            continue

        remain = seg[0]
        key = (ip, port)
        buf = buffers.get(key)
        if buf is None:
            buf = bytearray()
            buffers[key] = buf
        buf += seg[1:]

        if remain == 1:
            # Pop to avoid BufferError
            complete = buffers.pop(key, None)
            if not complete:
                continue
            arr = np.frombuffer(bytes(complete), dtype=np.uint8)
            img = cv2.imdecode(arr, 1)
            if img is not None:
                frames_dict[key] = img
    sock.close()

# ------------------- mixer ------------------- #

def make_mosaic(images, tile_w=TILE_W, tile_h=TILE_H):
    """Assemble participant frames into a grid mosaic."""
    if not images:
        return np.zeros((tile_h, tile_w, 3), dtype=np.uint8)

    tiles = [cv2.resize(img, (tile_w, tile_h)) for img in images]
    n = len(tiles)
    cols = int(math.ceil(math.sqrt(n)))
    rows = int(math.ceil(n / cols))

    while len(tiles) < rows * cols:
        tiles.append(np.zeros((tile_h, tile_w, 3), dtype=np.uint8))

    row_imgs = []
    for r in range(rows):
        row_imgs.append(np.hstack(tiles[r * cols:(r + 1) * cols]))
    return np.vstack(row_imgs)

def mixer_loop(frames_dict, frame_queue, stop_event):
    """Builds mosaics from all active participant frames and sends to broadcaster queue."""
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
        time.sleep(0.03)

# ------------------- broadcast ------------------- #

def send_loop(fs, pm, frame_queue, stop_event):
    executor = ThreadPoolExecutor(max_workers=SEND_WORKERS)
    while not stop_event.is_set():
        try:
            img_bytes = frame_queue.get(timeout=0.1)
        except queue.Empty:
            continue
        for peer in pm.active():
            executor.submit(fs.send_to, img_bytes, peer)

# ------------------- main ------------------- #

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    fs = FrameSegment(sock)
    pm = ParticipantManager()
    frame_queue = queue.Queue(maxsize=4)
    stop_event = threading.Event()

    frames_dict = {}

    threading.Thread(target=control_plane, args=(pm, stop_event), daemon=True).start()
    threading.Thread(target=uplink_receiver, args=(frames_dict, stop_event), daemon=True).start()
    threading.Thread(target=mixer_loop, args=(frames_dict, frame_queue, stop_event), daemon=True).start()
    threading.Thread(target=send_loop, args=(fs, pm, frame_queue, stop_event), daemon=True).start()

    print("[INFO] Multiparty mosaic broadcasting... Ctrl+C to stop.")
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
