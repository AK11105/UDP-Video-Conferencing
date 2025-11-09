#!/usr/bin/env python
from __future__ import division
import cv2, numpy as np, socket, struct, threading, queue, time, argparse, math
from .shared.constants import *

# ------------------- helper functions ------------------- #

def segment_send(sock, img_bytes, target):
    """Segment a JPEG into UDP-sized chunks and send to target."""
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
    """Continuously receive UDP datagrams into a queue."""
    while not stop_event.is_set():
        try:
            seg, _ = sock.recvfrom(MAX_DGRAM)
            packet_queue.put(seg)
        except:
            continue

def heartbeats(server_host, my_port, stop_event):
    """Send JOIN / HEARTBEAT / LEAVE to server control port."""
    ctrl = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    server = (server_host, CTRL_PORT)
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
    """
    Capture local webcam, encode to JPEG, and send upstream to server for mixing.
    """
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print("[WARN] No local camera available for uplink.")
        return

    uplink = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    target = (server_host, UPLINK_PORT)
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]

    while not stop_event.is_set():
        ok, frame = cap.read()
        if not ok:
            time.sleep(0.05)
            continue
        ok, enc = cv2.imencode(".jpg", frame, encode_param)
        if not ok:
            continue
        segment_send(uplink, enc.tobytes(), target)
        time.sleep(0.03)  # ~33 fps
    cap.release()
    uplink.close()

def bind_udp(preferred_port: int):
    """Bind UDP port (auto fallback to ephemeral if busy) and return actual port."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if preferred_port == 0:
        sock.bind(("0.0.0.0", 0))
    else:
        try:
            sock.bind(("0.0.0.0", preferred_port))
        except OSError:
            sock.bind(("0.0.0.0", 0))
            print(f"[WARN] Port {preferred_port} busy, using ephemeral instead.")
    actual_port = sock.getsockname()[1]
    return sock, actual_port


# ------------------- main ------------------- #

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default="127.0.0.1", help="Server IP/hostname")
    parser.add_argument("--port", type=int, default=DATA_PORT, help="Local UDP port for receiving (0=auto)")
    args = parser.parse_args()

    sock, my_port = bind_udp(args.port)
    print(f"[INFO] Client listening on UDP {my_port}, server={args.server}")

    packet_queue, stop_event = queue.Queue(), threading.Event()

    threading.Thread(target=receive_packets, args=(sock, packet_queue, stop_event), daemon=True).start()
    threading.Thread(target=heartbeats, args=(args.server, my_port, stop_event), daemon=True).start()
    threading.Thread(target=capture_and_uplink, args=(args.server, stop_event), daemon=True).start()

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
