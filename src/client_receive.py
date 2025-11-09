#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, threading, queue, time, argparse, math
from .shared.constants import *

# ------------------- helpers ------------------- #

def segment_send(sock, img_bytes, target):
    size = len(img_bytes)
    count = int(math.ceil(size / float(MAX_IMAGE_DGRAM)))
    start = 0
    remaining = count
    while remaining:
        end = min(size, start + MAX_IMAGE_DGRAM)
        sock.sendto(struct.pack("B", remaining) + img_bytes[start:end], target)
        start = end
        remaining -= 1

def receive_packets(sock, packet_queue, stop_event):
    while not stop_event.is_set():
        try:
            seg, _ = sock.recvfrom(MAX_DGRAM)
            packet_queue.put(seg)
        except:
            continue

def heartbeats(server_host, my_port, stop_event):
    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)
    # JOIN with the actual bound port
    ctrl.sendto(f"JOIN {my_port}".encode(), server)
    try:
        while not stop_event.is_set():
            time.sleep(HEARTBEAT_EVERY)
            ctrl.sendto(f"HEARTBEAT {my_port}".encode(), server)
    finally:
        try:
            ctrl.sendto(f"LEAVE {my_port}".encode(), server)
        except:
            pass
        ctrl.close()

def capture_and_uplink(server_host, stop_event):
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # DSHOW is friendlier on Windows
    if not cap.isOpened():
        print("[WARN] No local camera available for uplink.")
        return

    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, UPLINK_PORT)
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]

    try:
        while not stop_event.is_set():
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.05); continue
            ok, enc = cv2.imencode(".jpg", frame, encode_param)
            if not ok:
                continue
            segment_send(uplink, enc.tobytes(), target)
            time.sleep(0.03)  # ~33 fps
    finally:
        cap.release()
        uplink.close()

def bind_udp(preferred_port: int):
    """
    Bind preferred_port; if preferred_port==0, bind ephemeral.
    Return (sock, actual_port).
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            # Fallback to ephemeral if requested port is busy
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Port {preferred_port} busy, using ephemeral instead.")
    actual_port = sock.getsockname()[1]
    return sock, actual_port

# ------------------- main ------------------- #

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", required=True, help="Server IP/host (Tailscale IP)")
    parser.add_argument("--port", type=int, default=DATA_PORT, help="Local UDP port for receiving (0=auto)")
    args = parser.parse_args()

    # Defensive: if someone pasted extra tokens after the IP, keep only the first token
    server_host = args.server.strip().split()[0]

    sock, my_port = bind_udp(args.port)
    print(f"[INFO] Client listening on UDP {my_port}, server={server_host}")

    packet_queue, stop_event = queue.Queue(), threading.Event()

    threading.Thread(target=receive_packets, args=(sock, packet_queue, stop_event), daemon=True).start()
    threading.Thread(target=heartbeats, args=(server_host, my_port, stop_event), daemon=True).start()
    threading.Thread(target=capture_and_uplink, args=(server_host, stop_event), daemon=True).start()

    dat = b""
    print("[INFO] Receiving mosaic video (press 'q' to quit).")
    try:
        while True:
            try:
                seg = packet_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            remain = struct.unpack("B", seg[0:1])[0]
            dat += seg[1:]
            if remain == 1:
                arr = np.frombuffer(dat, dtype=np.uint8)
                img = cv2.imdecode(arr, 1)
                dat = b""
                if img is not None:
                    cv2.imshow("Multiparty Stream", img)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
    except KeyboardInterrupt:
        pass

    stop_event.set()
    sock.close()
    cv2.destroyAllWindows()
    print("[INFO] Client stopped.")

if __name__ == "__main__":
    main()
